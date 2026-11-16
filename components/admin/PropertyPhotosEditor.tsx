'use client';

import Image from 'next/image';
import { ChangeEvent, useCallback, useEffect, useRef, useState } from 'react';
import { adminSupabase } from '@/lib/supabase-admin';
import { isTrustedPropertyPhotoUrl } from '@/lib/photo-url';

type Photo = {
  id: string;
  url: string;
  sort_order: number;
};

const BUCKET = 'property-images';
const MAX_FILES = 30;
const MAX_BYTES = 8 * 1024 * 1024;
const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export default function PropertyPhotosEditor({ propertyId }: { propertyId: string }) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const folderInputRef = useRef<HTMLInputElement>(null);

  // A escolha de pasta exige autorização explícita no navegador.
  // O site não pode acessar sozinho as pastas do computador.
  useEffect(() => {
    folderInputRef.current?.setAttribute('webkitdirectory', '');
    folderInputRef.current?.setAttribute('directory', '');
  }, []);

  const reload = useCallback(async () => {
    const { data, error: listError } = await adminSupabase
      .from('property_photos')
      .select('id,url,sort_order')
      .eq('property_id', propertyId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    if (listError) {
      console.error('[admin/photos] Falha ao consultar fotografias:', listError.code, listError.message);
      setError('Não foi possível consultar as fotografias. Código: ' +
        (listError.code || 'desconhecido') + '. Detalhe: ' + listError.message);
      return;
    }
    setError('');
    setPhotos((data ?? []).filter(
      (item): item is Photo => isTrustedPropertyPhotoUrl(item.url)
    ));
  }, [propertyId]);

  useEffect(() => {
    let active = true;
    async function load() {
      const { data: identity, error: authError } = await adminSupabase.auth.getUser();
      if (!active) return;
      if (authError || !identity.user) {
        setError('Sua sessão expirou. Entre novamente no painel.');
        setLoading(false);
        return;
      }
      const { data: admin, error: roleError } = await adminSupabase
        .from('admin_users').select('role')
        .eq('id', identity.user.id).eq('active', true).maybeSingle();
      if (!active) return;
      if (roleError || !admin || !['super_admin','manager'].includes(admin.role)) {
        setError('Seu perfil não tem acesso ao gerenciamento de fotografias.');
        setLoading(false);
        return;
      }
      await reload();
      if (active) setLoading(false);
    }
    void load().catch(() => {
      if (active) {
        setError('Falha ao carregar fotos. Confira a conexão com o Supabase.');
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, [propertyId, reload]);

  function chooseFiles(event: ChangeEvent<HTMLInputElement>) {
    setNotice('');
    setError('');
    setConfirmed(false);
    const selected = Array.from(event.target.files ?? []).filter(
      (file) => EXTENSIONS[file.type] !== undefined
    );
    if (selected.length === 0) {
      setError('Nenhuma fotografia JPG, PNG ou WEBP encontrada na seleção.');
      setFiles([]);
      return;
    }
    if (selected.length > MAX_FILES) {
      setError('Selecione no máximo ' + MAX_FILES + ' fotos por envio.');
      setFiles([]);
      return;
    }
    const invalid = selected.find((file) =>
      !EXTENSIONS[file.type] || file.size <= 0 || file.size > MAX_BYTES
    );
    if (invalid) {
      setError('Use somente fotos JPG, PNG ou WEBP com até 8 MB cada.');
      setFiles([]);
      return;
    }
    setFiles(selected);
  }


  async function rankWithAi(): Promise<string> {
    try {
      const { data } = await adminSupabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return 'A sessão expirou; a ordem das fotos foi mantida.';
      const response = await fetch('/api/admin/imoveis/' + encodeURIComponent(propertyId) + '/ordenar-fotos', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token },
        cache: 'no-store',
      });
      const result = await response.json().catch(() => ({})) as {
        ordered?: number; skipped?: boolean; error?: string;
      };
      if (!response.ok) {
        return result.error || 'A IA não conseguiu ordenar as fotos. A ordem original foi mantida.';
      }
      await reload();
      return result.skipped
        ? 'Apenas uma foto: não é necessário reorganizar.'
        : 'IA concluiu a seleção automática da capa e a ordem de ' +
          (result.ordered ?? 0) + ' fotografias.';
    } catch {
      return 'A análise por IA não foi concluída. As fotos enviadas foram preservadas.';
    }
  }

  async function reorderExisting() {
    if (busy) return;
    setBusy(true);
    setError('');
    setNotice('Analisando fotos com a IA...');
    const message = await rankWithAi();
    setNotice(message);
    setBusy(false);
  }

  async function uploadPhotos() {
    if (busy || !confirmed || files.length === 0) return;
    setError('');
    setNotice('');
    setBusy(true);
    let attached = 0;
    try {
      const { data: identity } = await adminSupabase.auth.getUser();
      if (!identity.user) {
        setError('Sua sessão expirou. Entre novamente no painel.');
        return;
      }
      const { data: admin } = await adminSupabase.from('admin_users')
        .select('role').eq('id', identity.user.id).eq('active', true).maybeSingle();
      if (!admin || !['super_admin','manager'].includes(admin.role)) {
        setError('Seu perfil não pode enviar fotografias.');
        return;
      }
      const { data: property, error: propertyError } = await adminSupabase
        .from('properties').select('id,status,hidden,validation_status')
        .eq('id', propertyId).maybeSingle();
      if (propertyError || !property) {
        setError('Não foi possível confirmar o imóvel de destino. Nenhuma foto foi enviada.');
        return;
      }
      const isPublic = property.status === 'available' &&
        property.hidden === false && property.validation_status === 'ok';
      if (isPublic && !window.confirm(
        'ATENÇÃO: este imóvel está publicado. Após enviar as fotos, elas poderão aparecer imediatamente no catálogo público. Confirmar o envio?'
      )) return;

      let nextOrder = photos.reduce((n, image) => Math.max(n, image.sort_order), -1) + 1;
      for (const file of files) {
        const extension = EXTENSIONS[file.type];
        if (!extension || file.size > MAX_BYTES) {
          setError('Arquivo inválido. Envio interrompido.');
          break;
        }
        // Nomes sem dados pessoais ou nome original; nunca sobrescreve.
        const path = 'properties/' + propertyId + '/' + crypto.randomUUID() + '.' + extension;
        const { error: uploadError } = await adminSupabase.storage
          .from(BUCKET).upload(path, file, {
            contentType: file.type,
            cacheControl: '3600',
            upsert: false,
          });
        if (uploadError) {
          setError('Não foi possível enviar a foto. Verifique se o bucket property-images e as permissões de Storage estão configurados no Supabase. Detalhe: ' + uploadError.message);
          break;
        }
        const { data: urlData } = adminSupabase.storage.from(BUCKET).getPublicUrl(path);
        if (!isTrustedPropertyPhotoUrl(urlData.publicUrl)) {
          setError('A foto foi enviada, mas seu endereço não foi reconhecido. Não tente repetir o envio antes de revisar a configuração.');
          break;
        }
        const { error: linkError } = await adminSupabase.from('property_photos')
          .insert({
            property_id: propertyId,
            url: urlData.publicUrl,
            sort_order: nextOrder++,
          });
        if (linkError) {
          setError('A foto foi enviada ao Storage, mas não foi vinculada ao imóvel. Verifique a tabela property_photos antes de tentar novamente.');
          break;
        }
        attached++;
      }
      await reload();
      if (attached > 0) {
        setNotice(attached + ' foto(s) vinculada(s). Analisando ordem visual...');
        const aiMessage = await rankWithAi();
        setNotice(attached + ' foto(s) vinculada(s) ao imóvel ' + propertyId + '. ' +
          (isPublic ? 'Fotos de imóveis publicados podem aparecer no catálogo. ' :
            'O imóvel continua oculto/inativo. ') + aiMessage);
        setFiles([]);
        setConfirmed(false);
      }
    } catch {
      setError('Falha durante o envio. Confira a lista antes de tentar novamente para evitar duplicatas.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-8 rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-ink">Fotografias do imóvel</h2>
      <p className="mt-2 text-sm text-slate-soft">
        Associe fotos somente depois de conferir o imóvel, o postcode e a unidade.
        Fotos de pastas antigas não comprovam disponibilidade. Não envie documentos pessoais.
      </p>
      <p className="mt-2 text-sm font-medium text-ink">
        Imóvel selecionado: <span className="font-mono">{propertyId}</span>
      </p>
      {loading ? <p className="mt-5 text-sm">Carregando fotografias...</p> : (
        <>
          {photos.length ? (
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {photos.map((photo, index) => (
                <div key={photo.id}>
                  <div className="relative aspect-square overflow-hidden rounded-lg bg-slate-100">
                    <Image src={photo.url} alt={'Fotografia ' + (index + 1) + ' do imóvel ' + propertyId}
                      fill className="object-cover" sizes="(max-width: 640px) 50vw, 200px" />
                  </div>
                  <p className="mt-1 text-xs text-slate-soft">Foto {index + 1}</p>
                </div>
              ))}
            </div>
          ) : <p className="mt-4 text-sm text-slate-soft">Nenhuma foto vinculada ainda.</p>}

          <div className="mt-6">
            <label htmlFor="property-photo-files" className="block text-sm font-medium text-ink">
              Selecionar fotografias
            </label>
            <input id="property-photo-files" type="file"
              accept="image/jpeg,image/png,image/webp" multiple
              disabled={busy} onChange={chooseFiles}
              className="mt-2 block w-full rounded-lg border border-slate-300 bg-white p-3 text-sm" />
            <div className="mt-4">
              <label htmlFor="property-photo-folder" className="block text-sm font-medium text-ink">
                Ou selecionar uma pasta de fotos deste imóvel
              </label>
              <input ref={folderInputRef} id="property-photo-folder" type="file"
                accept="image/jpeg,image/png,image/webp" multiple disabled={busy}
                onChange={chooseFiles}
                className="mt-2 block w-full rounded-lg border border-slate-300 bg-white p-3 text-sm" />
              <p className="mt-2 text-xs text-slate-soft">
                Escolha a pasta correspondente à unidade deste cadastro. O navegador só
                poderá ler a pasta que você selecionar. Arquivos que não sejam imagens
                são ignorados; confirme a correspondência antes de enviar.
              </p>
            </div>
            <p className="mt-2 text-xs text-slate-soft">
              Até 30 arquivos por vez; JPG, PNG ou WEBP; máximo de 8 MB por foto.
              Fotos entram diretamente no catálogo se este imóvel já estiver publicado.
            </p>
          </div>
          {files.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium">{files.length} foto(s) selecionada(s):</p>
              <ul className="mt-2 list-inside list-disc text-sm text-slate-soft">
                {files.map((file, index) => <li key={index}>{file.name}</li>)}
              </ul>
            </div>
          )}
          <label className="mt-5 flex items-start gap-3 text-sm text-ink">
            <input type="checkbox" checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              disabled={busy || files.length === 0}
              className="mt-1" />
            Confirmo que estas fotos pertencem exatamente ao imóvel indicado acima.
            Sei que fotos de imóveis publicados ficam visíveis aos clientes após o envio.
          </label>
          {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
          {notice && <p role="status" className="mt-4 text-sm text-green-800">{notice}</p>}
          <button type="button" onClick={() => void uploadPhotos()}
            disabled={loading || busy || !confirmed || files.length === 0}
            className="mt-5 w-full rounded-lg bg-ink px-5 py-3 font-semibold text-white disabled:opacity-60">
            {busy ? 'Enviando fotografias...' : 'Adicionar fotos ao imóvel'}
          </button>
          {photos.length >= 2 && (
            <div className="mt-4">
              <button type="button" onClick={() => void reorderExisting()}
                disabled={loading || busy}
                className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-ink disabled:opacity-60">
                {busy ? 'Analisando fotos...' : 'Reorganizar fotos existentes com IA'}
              </button>
              <p className="mt-2 text-xs text-slate-soft">
                A IA usa créditos de API por análise. O botão é útil para organizar fotos
                já enviadas; não é necessário executar novamente a cada visita.
              </p>
            </div>
          )}
          <p className="mt-3 text-xs text-slate-soft">
            Após enviar novas fotos, a IA tentará escolher automaticamente a capa e
            a sequência. Sem a chave de API configurada, a ordem original permanece.
            Nesta versão, não é possível excluir fotos pelo painel.
          </p>
        </>
      )}
    </section>
  );
}
