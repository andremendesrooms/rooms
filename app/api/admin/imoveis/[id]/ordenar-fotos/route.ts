import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// A chave da Anthropic é exclusiva do servidor. Nunca usar NEXT_PUBLIC_.
type Photo = { id: string; url: string; sort_order: number };
const MAX_ANALYSIS = 30;
const DEFAULT_MODEL = 'claude-sonnet-4-6';

function reply(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: { 'Cache-Control': 'no-store' } });
}

function extractOrder(raw: string, allowed: string[]): string[] | null {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  try {
    const obj = JSON.parse(raw.slice(start, end + 1));
    const proposed = obj?.ordered_ids;
    if (!Array.isArray(proposed)) return null;
    const wanted = new Set(allowed);
    if (proposed.length !== allowed.length ||
        new Set(proposed).size !== allowed.length ||
        proposed.some((s: unknown) => typeof s !== 'string' || !wanted.has(s))) {
      return null;
    }
    return proposed;
  } catch {
    return null;
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!/^[A-Za-z0-9_-]{3,100}$/.test(id)) return reply('Referência inválida.', 400);

  if (process.env.ENABLE_PAID_PHOTO_ANALYSIS !== 'true') return reply('Análise paga desativada. Use a organização gratuita no painel.', 503);
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return reply('IA não configurada. As fotos foram preservadas na ordem original.', 503);
  }

  const token = request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) return reply('Entre novamente no painel para organizar as fotos.', 401);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return reply('Configuração do Supabase incompleta.', 503);
  const supabase = createClient(url, anonKey, {
    global: { headers: { Authorization: 'Bearer ' + token } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: auth, error: authError } = await supabase.auth.getUser(token);
  if (authError || !auth.user) return reply('Sessão inválida.', 401);

  const { data: member, error: memberError } = await supabase.from('admin_users')
    .select('role').eq('id', auth.user.id).eq('active', true).maybeSingle();
  if (memberError || !member || !['super_admin', 'manager'].includes(member.role)) {
    return reply('Seu perfil não pode organizar fotografias.', 403);
  }

  const { data: property, error: propertyError } = await supabase.from('properties')
    .select('id').eq('id', id).maybeSingle();
  if (propertyError || !property) return reply('Imóvel não encontrado.', 404);

  const { data, error: photosError } = await supabase.from('property_photos')
    .select('id,url,sort_order').eq('property_id', id)
    .order('sort_order', { ascending: true }).limit(MAX_ANALYSIS + 1);
  if (photosError) return reply('Falha ao consultar fotografias.', 500);

  const photos = (data ?? []) as Photo[];
  if (photos.length < 2) return NextResponse.json({ ordered: photos.length, skipped: true });
  if (photos.length > MAX_ANALYSIS) {
    return reply('Esta versão analisa até 30 fotografias por imóvel. Nenhuma ordem foi alterada.', 422);
  }

  // Não aceita URLs arbitrárias: evita a IA receber conteúdo de outros projetos.
  const domain = new URL(url).hostname;
  const prefix = '/storage/v1/object/public/property-images/properties/' + id + '/';
  const trusted = photos.every((photo) => {
    try {
      const u = new URL(photo.url);
      return u.protocol === 'https:' && u.hostname === domain &&
        u.pathname.startsWith(prefix) && !u.username && !u.password;
    } catch { return false; }
  });
  if (!trusted) return reply('Há fotos com endereços não gerenciados. Revise a galeria.', 422);

  const images = photos.flatMap((p, index) => [
    { type: 'text', text: 'Fotografia ' + (index + 1) + '; identificador: ' + p.id },
    { type: 'image', source: { type: 'url', url: p.url } },
  ]);
  const instructions = [
    'Você organiza a galeria de um anúncio REAL de aluguel residencial em Londres.',
    'Analise as fotos recebidas, sem inventar características do imóvel.',
    'Priorize como capa a foto mais convidativa e informativa sobre o espaço:',
    'boa iluminação, nitidez, amplitude realista, composição, ambiente bem apresentado.',
    'Evite capa com banheiro, close-up, duplicatas, foto borrada ou foto enganosa quando houver alternativa.',
    'A ordem restante deve apresentar uma visita visual coerente, diversificando ambientes.',
    'NÃO privilegie imagens apenas por cores exageradas ou promessas que não apareçam nas fotos.',
    'Retorne SOMENTE JSON válido, sem Markdown:',
    '{"ordered_ids":["id da capa","id da segunda foto", "..."],"reason":"resumo curto"}.',
    'Use TODOS e SOMENTE os IDs fornecidos, uma vez cada.',
  ].join(' ');

  let response: Response;
  try {
    response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_VISION_MODEL || DEFAULT_MODEL,
        max_tokens: 1400,
        temperature: 0,
        messages: [{ role: 'user', content: [
          { type: 'text', text: instructions },
          ...images,
        ] }],
      }),
      signal: AbortSignal.timeout(45000),
      cache: 'no-store',
    });
  } catch {
    return reply('A análise de imagens não terminou. A ordem anterior foi mantida.', 504);
  }
  if (!response.ok) {
    console.error('[photo-order] Anthropic respondeu', response.status);
    return reply(response.status === 402 || response.status === 429
      ? 'Créditos ou limite de uso da IA indisponíveis; ordem original mantida.'
      : 'A IA não conseguiu analisar as fotos. Ordem original mantida.', 502);
  }

  let ranked: string[] | null = null;
  try {
    const body = await response.json();
    const answer = (body.content ?? []).filter(
      (block: { type?: string; text?: string }) => block.type === 'text'
    ).map((block: { text: string }) => block.text).join('\n');
    ranked = extractOrder(answer, photos.map(p => p.id));
  } catch {
    return reply('A resposta da IA não pôde ser interpretada. Ordem original mantida.', 502);
  }
  if (!ranked) return reply('A IA não retornou uma ordem válida. Nenhuma foto foi alterada.', 502);

  // Em caso de falha, apenas a ordenação pode ter sido parcialmente alterada;
  // as fotos nunca são apagadas nem sobrescritas.
  for (const [index, photoId] of ranked.entries()) {
    const { error } = await supabase.from('property_photos')
      .update({ sort_order: index })
      .eq('property_id', id).eq('id', photoId);
    if (error) {
      console.error('[photo-order] Falha ao gravar ordenação', error.code);
      return reply('Houve falha ao salvar parte da ordem. Revise a galeria antes de tentar novamente.', 500);
    }
  }
  return NextResponse.json({ ordered: ranked.length, coverId: ranked[0] }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
