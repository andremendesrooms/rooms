import 'server-only';
import { createClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';

const BUCKET = 'property-images';
const MAX_PREFLIGHT_PHOTOS = 500;
const CHUNK_SIZE = 100;

export class PermanentDeletionError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'PermanentDeletionError';
  }
}

function fail(status: number, message: string): never {
  throw new PermanentDeletionError(status, message);
}

function createService() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !secret) fail(503, 'Exclusão definitiva ainda não configurada no servidor. Nenhum dado foi apagado.');
  return { url, service: createClient(url, secret, {
    auth: { autoRefreshToken: false, persistSession: false },
  }) };
}

export async function authorizePermanentDeletion(request: NextRequest) {
  const origin = request.headers.get('origin');
  if (origin && origin !== request.nextUrl.origin) {
    fail(403, 'A origem desta solicitação não foi autorizada.');
  }
  const bearer = request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
  if (!bearer) fail(401, 'Sua sessão expirou. Entre novamente no painel.');

  const { url, service } = createService();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!anon) fail(503, 'A configuração do servidor está incompleta.');

  const authClient = createClient(url, anon, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: 'Bearer ' + bearer } },
  });
  const { data: session, error: authError } = await authClient.auth.getUser(bearer);
  if (authError || !session.user) fail(401, 'Sessão inválida. Entre novamente.');

  // Consulta privilegiada no servidor: não confia em roles fornecidos pelo cliente.
  const { data: member, error: memberError } = await service.from('admin_users')
    .select('role,active').eq('id', session.user.id).eq('active', true).maybeSingle();
  if (memberError || member?.role !== 'super_admin') {
    fail(403, 'Somente o administrador principal pode excluir definitivamente.');
  }
  return { service, authClient, url, userId: session.user.id };
}

export function photoStoragePath(photoUrl: string, propertyId: string, supabaseUrl: string) {
  const url = new URL(photoUrl);
  const supabase = new URL(supabaseUrl);
  const prefix = '/storage/v1/object/public/' + BUCKET + '/properties/' + propertyId + '/';
  const suffix = url.pathname.startsWith(prefix) ? url.pathname.slice(prefix.length) : '';
  if (url.origin !== supabase.origin || url.search || url.hash ||
      url.username || url.password || !/^[A-Za-z0-9_-]+\.(jpg|jpeg|png|webp)$/i.test(suffix)) {
    fail(422, 'Há fotografias fora do armazenamento controlado. Nenhum imóvel foi apagado; revise as fotos primeiro.');
  }
  return 'properties/' + propertyId + '/' + suffix;
}

export async function preflightPropertyPhotos(
  service: ReturnType<typeof createService>['service'],
  propertyId: string,
  supabaseUrl: string,
) {
  const { data, error } = await service.from('property_photos')
    .select('url').eq('property_id', propertyId).limit(MAX_PREFLIGHT_PHOTOS + 1);
  if (error) fail(503, 'Não foi possível conferir as fotografias. Nenhum dado foi apagado.');
  if ((data?.length ?? 0) > MAX_PREFLIGHT_PHOTOS) {
    fail(422, 'Este imóvel tem mais fotos que o limite de segurança. A exclusão foi bloqueada.');
  }
  for (const row of data ?? []) photoStoragePath(row.url, propertyId, supabaseUrl);
}

// A função SQL remove dados em uma única transação; esta fila guarda as fotos
// ainda por excluir se ocorrer um erro na comunicação com o Storage.
export async function processDeletionJob(
  service: ReturnType<typeof createService>['service'],
  jobId: string,
  supabaseUrl: string,
): Promise<{ complete: boolean; message: string }> {
  const { data: job, error } = await service.from('property_permanent_deletion_jobs')
    .select('id,property_id,photo_urls').eq('id', jobId).maybeSingle();
  if (error) return { complete: false, message: 'A limpeza de fotos ficou pendente; confira a configuração da fila.' };
  if (!job) return { complete: true, message: 'Nenhum arquivo pendente.' };

  try {
    const urls = job.photo_urls as string[];
    if (!Array.isArray(urls) || urls.length > MAX_PREFLIGHT_PHOTOS) {
      throw new Error('Quantidade de fotos fora do limite');
    }
    const paths = urls.map((url) => photoStoragePath(url, job.property_id, supabaseUrl));
    for (let offset = 0; offset < paths.length; offset += CHUNK_SIZE) {
      const batch = paths.slice(offset, offset + CHUNK_SIZE);
      const { error: removeError } = await service.storage.from(BUCKET).remove(batch);
      if (removeError) throw removeError;
    }
    const { error: cleanupError } = await service.from('property_permanent_deletion_jobs')
      .delete().eq('id', job.id);
    if (cleanupError) throw cleanupError;
    return { complete: true, message: 'Imóvel e fotografias removidos definitivamente.' };
  } catch (e) {
    console.error('[permanent-deletion] Storage cleanup pending for job', job.id,
      e instanceof Error ? e.message : 'unknown error');
    await service.from('property_permanent_deletion_jobs')
      .update({ last_error: 'Falha ao remover fotos; nova tentativa necessária.' })
      .eq('id', job.id);
    return {
      complete: false,
      message: 'Cadastro excluído do banco. A remoção de alguns arquivos ficou pendente; use “Concluir limpeza pendente”.',
    };
  }
}

export async function retryPendingDeletionJobs(
  service: ReturnType<typeof createService>['service'],
  url: string,
) {
  const { data, error } = await service.from('property_permanent_deletion_jobs')
    .select('id').order('created_at', { ascending: true }).limit(10);
  if (error) fail(503, 'Não foi possível consultar a fila de limpeza de fotos.');
  let complete = 0, pending = 0;
  for (const job of data ?? []) {
    const result = await processDeletionJob(service, job.id, url);
    result.complete ? complete++ : pending++;
  }
  return { examined: data?.length ?? 0, complete, pending };
}
