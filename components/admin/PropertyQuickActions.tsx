'use client';

import { useState } from 'react';
import { adminSupabase } from '@/lib/supabase-admin';
import { publicationChange, type PublicationAction, type PublicationRecord } from '@/lib/publication';

export type EditableProperty = PublicationRecord & {
  id: string;
  updated_at: string | null;
};

const descriptions: Record<PublicationAction, string> = {
  hide: 'Ocultar este imóvel agora? Ele deixará de aparecer no catálogo público, sem perder dados nem fotografias.',
  rent: 'Marcar este imóvel como alugado? Ele será retirado do catálogo e poderá ser reativado posteriormente.',
  archive: 'Excluir este imóvel da lista operacional? Ele será ARQUIVADO, ficará oculto dos clientes e poderá ser restaurado com todas as fotos e informações.',
  restore: 'Restaurar este imóvel como RASCUNHO OCULTO? Ele não será publicado automaticamente.',
  publish: 'Publicar ou reexibir este imóvel REAL no catálogo agora? Confira a disponibilidade com o responsável.',
};

export default function PropertyQuickActions({
  property,
  onChanged,
}: {
  property: EditableProperty;
  onChanged: (message: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function change(action: PublicationAction) {
    if (busy) return;
    setError('');

    // Apenas "publicar" pode deixar algo visível aos clientes e exige confirmação adicional.
    const verified = action === 'publish' &&
      window.confirm('Você conferiu com a fonte comercial que o imóvel é REAL, está DISPONÍVEL e que preço, fotos e condições estão corretos?');
    if (action === 'publish' && !verified) return;

    let patch: ReturnType<typeof publicationChange>;
    try {
      patch = publicationChange(property, action, verified);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Ação não permitida.');
      return;
    }
    if (!window.confirm(descriptions[action])) return;

    setBusy(true);
    try {
      const { data: identity, error: authError } = await adminSupabase.auth.getUser();
      if (authError || !identity.user) throw new Error('Sua sessão expirou. Entre novamente.');
      const { data: member, error: memberError } = await adminSupabase.from('admin_users')
        .select('role').eq('id', identity.user.id).eq('active', true).maybeSingle();
      if (memberError || !member || !['super_admin', 'manager'].includes(member.role)) {
        throw new Error('Somente administradores e gerentes podem alterar imóveis.');
      }
      if (!property.updated_at) throw new Error('Atualize o cadastro antes de alterar.');

      // RLS e triggers do banco continuam aplicáveis. Operação protegida
      // contra alterações concorrentes; nunca utiliza service_role.
      const { data, error: writeError } = await adminSupabase.from('properties')
        .update(patch)
        .eq('id', property.id)
        .eq('status', property.status)
        .eq('hidden', property.hidden)
        .eq('validation_status', property.validation_status)
        .eq('updated_at', property.updated_at)
        .select('id').maybeSingle();
      if (writeError) {
        throw new Error('Não foi possível concluir a operação. Confira o status e as permissões no Supabase.');
      }
      if (!data) {
        throw new Error('O imóvel foi atualizado em outra sessão. Atualize a lista e tente novamente.');
      }
      onChanged(action === 'archive'
        ? 'Imóvel excluído da lista operacional (arquivado). Pode ser recuperado na aba Arquivados.'
        : action === 'restore'
          ? 'Imóvel restaurado como rascunho oculto. Revise antes de publicar.'
          : action === 'hide'
            ? 'Imóvel oculto no catálogo.'
            : action === 'rent'
              ? 'Imóvel marcado como alugado e oculto.'
              : 'Imóvel publicado. Confirme como aparece no catálogo.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha de conexão. Tente novamente.');
    } finally {
      setBusy(false);
    }
  }

  const archived = property.status === 'archived';
  const publicNow = property.status === 'available' &&
    property.hidden === false && property.validation_status === 'ok';

  return (
    <div className="mt-4 space-y-2">
      <div className="flex flex-wrap gap-2" aria-label={'Ações para ' + property.id}>
        {archived ? (
          <button type="button" disabled={busy}
            onClick={() => void change('restore')}
            className="rounded-lg border border-route-green px-3 py-2 text-xs font-semibold text-route-green disabled:opacity-50">
            Restaurar
          </button>
        ) : (
          <>
            {!publicNow ? (
              <button type="button" disabled={busy}
                onClick={() => void change('publish')}
                className="rounded-lg bg-route-green px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">
                Mostrar / publicar
              </button>
            ) : (
              <button type="button" disabled={busy}
                onClick={() => void change('hide')}
                className="rounded-lg border border-amber-500 px-3 py-2 text-xs font-semibold text-amber-800 disabled:opacity-50">
                Ocultar
              </button>
            )}
            {property.status !== 'rented' && (
              <button type="button" disabled={busy}
                onClick={() => void change('rent')}
                className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-ink disabled:opacity-50">
                Alugado
              </button>
            )}
            <button type="button" disabled={busy}
              onClick={() => void change('archive')}
              className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 disabled:opacity-50">
              Excluir
            </button>
          </>
        )}
        {busy && <span role="status" className="self-center text-xs text-slate-soft">Atualizando...</span>}
      </div>
      {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
    </div>
  );
}
