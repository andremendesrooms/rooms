import { NextRequest, NextResponse } from 'next/server';
import {
  authorizePermanentDeletion,
  PermanentDeletionError,
  preflightPropertyPhotos,
  processDeletionJob,
} from '@/lib/server/permanent-deletion';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CONFIRM_PHRASE = 'EXCLUIR DEFINITIVAMENTE';

function respond(payload: Record<string, unknown>, status: number) {
  return NextResponse.json(payload, { status, headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!/^[a-zA-Z0-9_-]{3,100}$/.test(id))
      return respond({ error: 'Referência de imóvel inválida.' }, 400);
    const length = Number(request.headers.get('content-length') || 0);
    if (length > 8_192) return respond({ error: 'Solicitação inválida.' }, 413);

    // Nenhuma operação destrutiva antes de verificar sessão e papel de super_admin.
    const { service, authClient, url } = await authorizePermanentDeletion(request);

    let body: unknown;
    try { body = await request.json(); } catch {
      return respond({ error: 'Envie as duas confirmações e a versão do imóvel.' }, 400);
    }
    if (!body || typeof body !== 'object') return respond({ error: 'Confirmação inválida.' }, 400);

    const data = body as Record<string, unknown>;
    const reference = data.confirmReference;
    const phrase = data.confirmPhrase;
    const expected = data.expectedUpdatedAt;
    if (reference !== id || phrase !== CONFIRM_PHRASE ||
        typeof expected !== 'string' || !Number.isFinite(Date.parse(expected))) {
      return respond({ error: 'As confirmações não correspondem à referência do imóvel.' }, 400);
    }

    const { data: property, error: propertyError } = await service.from('properties')
      .select('id,status,hidden,updated_at').eq('id', id).maybeSingle();
    if (propertyError) return respond({ error: 'Não foi possível verificar o imóvel.' }, 503);
    if (!property) return respond({ error: 'Imóvel não encontrado.' }, 404);
    if (property.status !== 'archived' || property.hidden !== true) {
      return respond({ error: 'Arquive e oculte o imóvel antes de excluí-lo definitivamente.' }, 409);
    }
    if (!property.updated_at || Date.parse(property.updated_at) !== Date.parse(expected)) {
      return respond({ error: 'O imóvel mudou desde que você abriu a tela. Atualize e tente novamente.' }, 409);
    }

    // Confere os caminhos das fotos SEM apagá-las. Se o banco contiver URLs
    // não gerenciadas, falha antes de excluir o cadastro.
    await preflightPropertyPhotos(service, id, url);

    // Esta RPC só existe após a migration 007. Ela impõe autorização
    // super_admin, arquivamento, referência exata e versão também no banco,
    // e exclui metadados e imóvel em uma transação.
    const { data: deletion, error: deletionError } = await authClient.rpc(
      'admin_permanently_delete_archived_property',
      {
        p_property_id: id,
        p_confirmed_reference: reference,
        p_expected_updated_at: expected,
      },
    );
    if (deletionError) {
      console.error('[permanent-deletion] Falha na função transacional', deletionError.code);
      if (deletionError.code === '42883' || deletionError.code === 'PGRST202')
        return respond({ error: 'A exclusão definitiva ainda não foi habilitada no banco. Nenhum dado foi apagado.' }, 503);
      if (deletionError.code === '42501')
        return respond({ error: 'Seu perfil não tem autorização para exclusão definitiva.' }, 403);
      return respond({ error: 'A exclusão foi bloqueada por uma alteração ou vínculo no banco. Nenhum dado foi apagado.' }, 409);
    }
    const jobId = deletion?.job_id;
    if (deletion?.deleted !== true || typeof jobId !== 'string') {
      return respond({ error: 'O resultado da exclusão não pôde ser confirmado. Confira o banco antes de repetir.' }, 500);
    }

    const cleanup = await processDeletionJob(service, jobId, url);
    return respond({ deleted: true, cleanupComplete: cleanup.complete, message: cleanup.message },
      cleanup.complete ? 200 : 202);
  } catch (cause) {
    if (cause instanceof PermanentDeletionError)
      return respond({ error: cause.message }, cause.status);
    console.error('[permanent-deletion] Falha não prevista',
      cause instanceof Error ? cause.message : 'unknown');
    return respond({ error: 'Não foi possível concluir a exclusão. Confira o painel antes de tentar novamente.' }, 500);
  }
}
