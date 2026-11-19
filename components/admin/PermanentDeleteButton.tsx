'use client';

import { useState } from 'react';
import { adminSupabase } from '@/lib/supabase-admin';

type Property = {
  id: string;
  title?: string | null;
  status: string;
  hidden: boolean;
  updated_at: string | null;
};

export default function PermanentDeleteButton({
  property,
  onDeleted,
}: {
  property: Property;
  onDeleted: (message: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function deleteForever() {
    if (busy || property.status !== 'archived' || !property.hidden ||
        !property.updated_at) return;
    setError('');

    // PRIMEIRA confirmação: advertência explícita de irreversibilidade.
    const accepted = window.confirm(
      'ATENÇÃO: EXCLUSÃO PERMANENTE.\n\n' +
      'Imóvel: ' + (property.title || property.id) + '\n' +
      'Referência: ' + property.id + '\n\n' +
      'Isso removerá o cadastro e as fotografias do Supabase. ' +
      'Você NÃO poderá restaurar o imóvel pelo painel.\n\n' +
      'Deseja continuar para a segunda confirmação?',
    );
    if (!accepted) return;

    // SEGUNDA confirmação: deve digitar exatamente a referência do imóvel.
    const typed = window.prompt(
      'SEGUNDA E ÚLTIMA CONFIRMAÇÃO\n\n' +
      'Digite a referência EXATA abaixo para excluir permanentemente:\n\n' +
      property.id,
    );
    if (typed === null) return;
    if (typed !== property.id) {
      setError('A referência digitada não confere. Nenhum dado foi excluído.');
      return;
    }

    setBusy(true);
    try {
      const { data, error: authError } = await adminSupabase.auth.getSession();
      if (authError || !data.session?.access_token)
        throw new Error('Sua sessão expirou. Entre novamente no painel.');

      const response = await fetch(
        '/api/admin/imoveis/' + encodeURIComponent(property.id) + '/excluir-permanentemente',
        {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + data.session.access_token,
            'Content-Type': 'application/json',
          },
          cache: 'no-store',
          body: JSON.stringify({
            confirmReference: typed,
            confirmPhrase: 'EXCLUIR DEFINITIVAMENTE',
            expectedUpdatedAt: property.updated_at,
          }),
        },
      );

      const result = await response.json().catch(() => ({})) as {
        deleted?: boolean;
        cleanupComplete?: boolean;
        message?: string;
        error?: string;
      };
      if (!response.ok && response.status !== 202)
        throw new Error(result.error || 'Exclusão bloqueada. Nenhum dado foi apagado.');
      if (!result.deleted) {
        throw new Error('A exclusão não foi confirmada. Confira o banco antes de repetir.');
      }
      onDeleted(result.message ||
        (result.cleanupComplete
          ? 'Cadastro e fotografias excluídos definitivamente.'
          : 'Cadastro excluído. Limpeza de fotos pendente.'));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível concluir a operação.');
    } finally {
      setBusy(false);
    }
  }

  if (property.status !== 'archived' || !property.hidden) return null;
  return (
    <div className="space-y-2">
      <button type="button" disabled={busy || !property.updated_at}
        onClick={() => void deleteForever()}
        className="rounded-lg border border-red-600 bg-red-50 px-3 py-2 text-xs font-bold text-red-800 disabled:opacity-50">
        {busy ? 'Excluindo...' : 'Excluir permanentemente'}
      </button>
      {error && <p role="alert" className="text-xs text-red-800">{error}</p>}
    </div>
  );
}
