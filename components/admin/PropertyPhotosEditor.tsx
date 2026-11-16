'use client';

import Image from 'next/image';
import { ChangeEvent, useCallback, useEffect, useRef, useState } from 'react';
import { adminSupabase } from '@/lib/supabase-admin';
import { isTrustedPropertyPhotoUrl } from '@/lib/photo-url';
import { rankPhotosFree } from '@/lib/photo-rank-free';

type Photo = {
  id: string;
  url: string;
  sort_order: number;
  room_group?: string | null;
};

const BUCKET = 'property-images';
const MAX_FILES = 30;
const MAX_BYTES = 8 * 1024 * 1024;
const ROOM_GROUPS = [
  { value: '', label: 'Automático (por semelhança)' },
  { value: 'Quarto 1', label: 'Quarto 1' },
  { value: 'Quarto 2', label: 'Quarto 2' },
  { value: 'Quarto 3', label: 'Quarto 3' },
  { value: 'Suíte', label: 'Suíte' },
  { value: 'Sala', label: 'Sala' },
  { value: 'Cozinha', label: 'Cozinha' },
  { value: 'Banheiro 1', label: 'Banheiro 1' },
  { value: 'Banheiro 2', label: 'Banheiro 2' },
  { value: 'Corredor/entrada', label: 'Corredor/entrada' },
  { value: 'Varanda/externo', label: 'Varanda/externo' },
  { value: 'Outros', label: 'Outros' },
];

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

async function fetchPropertyPhotos(propertyId: string): Promise<{
  data: Photo[]; error: string | null; supportsGroups: boolean;
}> {
  const enriched = await adminSupabase.from('property_photos')
    .select('id,url,sort_order,room_group').eq('property_id', propertyId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  if (!enriched.error) {
    return { data: (enriched.data ?? []) as Photo[], error: null, supportsGroups: true };
  }
  // Código antigo continua funcionando antes da migração opcional 006.
  const missingColumn = enriched.error.code === '42703' ||
    enriched.error.message.toLowerCase().includes('room_group');
  if (!missingColumn) {
    return { data: [], error: enriched.error.message, supportsGroups: false };
  }
  const legacy = await adminSupabase.from('property_photos')
    .select('id,url,sort_order').eq('property_id', propertyId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  return {
    data: (legacy.data ?? []) as Photo[],
    error: legacy.error?.message ?? null,
    supportsGroups: false,
  };
}

export default function PropertyPhotosEditor({ propertyId }: { propertyId: string }) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [supportsGroups, setSupportsGroups] = useState(false);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // A escolha de pasta exige autorização explícita no navegador.
  // O site não pode acessar sozinho as pastas do computador.
  useEffect(() => {
    if (loading) return;
    folderInputRef.current?.setAttribute('webkitdirectory', '');
    folderInputRef.current?.setAttribute('directory', '');
  }, [loading]);

  const reload = useCallback(async () => {
    const result = await fetchPropertyPhotos(propertyId);
    if (result.error) {
      setError('Não foi possível consultar as fotografias. Detalhe: ' + result.error);
      return;
    }
    setError('');
    setSupportsGroups(result.supportsGroups);
    setPhotos(result.data.filter(photo => isTrustedPropertyPhotoUrl(photo.url)));
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


  // Sem API paga: comparação de características fotográficas diretamente
  // no navegador. Não tenta reconhecer tipos de cômodo nem analisar o imóvel.
  async function rankFree(): Promise<string> {
    try {
      const { data: identity } = await adminSupabase.auth.getUser();
      if (!identity.user) return 'A sessão expirou. Entre novamente no painel.';
      const { data: member } = await adminSupabase.from('admin_users')
        .select('role').eq('id', identity.user.id).eq('active', true).maybeSingle();
      if (!member || !['super_admin','manager'].includes(member.role)) {
        return 'Seu perfil não permite reorganizar fotografias.';
      }
      // Carrega de novo porque fotos recém enviadas podem não estar no estado React.
      const fetched = await fetchPropertyPhotos(propertyId);
      if (fetched.error) return 'Erro ao consultar fotos; a ordem não foi modificada.';
      const current = fetched.data;
      if (current.length < 2) return 'Não é necessário organizar uma galeria com menos de 2 fotos.';
      if (current.length > 30) {
        return 'Há mais de 30 fotos neste imóvel. A seleção automática gratuita está limitada a 30 por imóvel.';
      }
      if (!current.every(photo => isTrustedPropertyPhotoUrl(photo.url))) {
        return 'Existem fotos com URLs não reconhecidas. Não alteramos a ordem.';
      }
      const result = await rankPhotosFree(current.map(photo => ({
        id: photo.id, source: photo.url, roomGroup: photo.room_group,
      })));
      if (result.analyzed < 2) {
        return 'Não foi possível analisar fotos suficientes (rede ou CORS). A ordem foi mantida.';
      }
      if (current.every((photo, index) => photo.id === result.order[index])) {
        await reload();
        return 'A sequência já está adequada aos critérios gratuitos de qualidade.';
      }
      // Nunca altera status, preço ou conteúdo dos arquivos. Somente sort_order.
      // Se a atualização falhar no meio, recarrega a lista e informa o problema.
      for (const [index, photoId] of result.order.entries()) {
        const { error: writeError } = await adminSupabase.from('property_photos')
          .update({ sort_order: index }).eq('id', photoId).eq('property_id', propertyId);
        if (writeError) {
          await reload();
          return 'Não foi possível concluir a reorganização. Confira as permissões e a ordem atual.';
        }
      }
      await reload();
      return 'Capa e ordem ajustadas sem API paga: ' + result.analyzed +
        ' fotografias analisadas.' +
        (result.skipped ? ' ' + result.skipped + ' imagens ficaram no fim por não poderem ser analisadas.' : '');
    } catch {
      return 'Falha ao analisar imagens localmente. Confira a conexão e tente novamente.';
    }
  }

  async function reorderExisting() {
    if (busy) return;
    setBusy(true);
    setError('');
    setNotice('Analisando nitidez, iluminação e composição, sem API paga...');
    const message = await rankFree();
    setNotice(message);
    setBusy(false);
  }

  async function makeCover(photoId: string) {
    if (busy || photos.length < 2 || photos[0]?.id === photoId) return;
    if (!window.confirm('Definir esta fotografia como capa do anúncio? Se o imóvel estiver publicado, a mudança ficará visível aos clientes.')) return;
    setBusy(true);
    setError('');
    setNotice('Atualizando a fotografia principal...');
    try {
      const { data: identity } = await adminSupabase.auth.getUser();
      const { data: member } = await adminSupabase.from('admin_users')
        .select('role').eq('id', identity.user?.id ?? '').eq('active', true).maybeSingle();
      if (!identity.user || !member || !['super_admin','manager'].includes(member.role)) {
        setNotice('Sessão sem autorização para alterar a capa.');
        return;
      }
      const fetched = await fetchPropertyPhotos(propertyId);
      if (fetched.error) {
        setNotice('Falha ao consultar a galeria. A ordem não foi alterada.');
        return;
      }
      const full = fetched.data;
      const selected = full.find(p => p.id === photoId);
      if (!selected) {
        setNotice('A foto não foi encontrada. Atualize a página.');
        return;
      }
      const order = [selected, ...full.filter(p => p.id !== photoId)];
      for (const [index, photo] of order.entries()) {
        const { error: writeError } = await adminSupabase.from('property_photos')
          .update({ sort_order: index }).eq('id', photo.id).eq('property_id', propertyId);
        if (writeError) {
          setNotice('A atualização foi interrompida. Confira a ordem atual.');
          await reload();
          return;
        }
      }
      await reload();
      setNotice('Foto principal definida manualmente. A próxima importação com seleção automática poderá escolher outra capa.');
    } catch {
      setNotice('Não foi possível definir a capa. Confira a conexão.');
    } finally {
      setBusy(false);
    }
  }

  async function assignRoom(photoId: string, roomGroup: string) {
    if (busy || !supportsGroups) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const { data: identity } = await adminSupabase.auth.getUser();
      const { data: member } = await adminSupabase.from('admin_users')
        .select('role').eq('id', identity.user?.id ?? '')
        .eq('active', true).maybeSingle();
      if (!identity.user || !member || !['super_admin', 'manager'].includes(member.role)) {
        setError('Seu perfil não pode alterar os ambientes.');
        return;
      }
      const { error: updateError } = await adminSupabase.from('property_photos')
        .update({ room_group: roomGroup || null })
        .eq('id', photoId).eq('property_id', propertyId);
      if (updateError) {
        setError('Não foi possível salvar o ambiente: ' + updateError.message);
        return;
      }
      await reload();
      setNotice('Ambiente salvo. Use “Reorganizar fotos automaticamente (grátis)” para reunir as fotos do mesmo ambiente.');
    } catch {
      setError('Erro ao salvar ambiente. Tente novamente.');
    } finally {
      setBusy(false);
    }
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
        setNotice(attached + ' foto(s) vinculada(s). Analisando qualidade visual sem API paga...');
        const resultMessage = await rankFree();
        setNotice(attached + ' foto(s) vinculada(s) ao imóvel ' + propertyId + '. ' +
          (isPublic ? 'Fotos de imóveis publicados podem aparecer no catálogo. ' :
            'O imóvel continua oculto/inativo. ') + resultMessage);
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
                  <p className="mt-1 text-xs text-slate-soft">
                    {index === 0 ? 'Foto 1 · Capa atual' : 'Foto ' + (index + 1)}
                  </p>
                  {supportsGroups && (
                    <label className="mt-2 block text-xs text-slate-soft">
                      Ambiente
                      <select value={photo.room_group ?? ''}
                        aria-label={'Ambiente da foto ' + (index + 1)}
                        onChange={(e) => void assignRoom(photo.id, e.target.value)}
                        disabled={busy}
                        className="mt-1 block w-full rounded-md border border-slate-300 bg-white p-2 text-xs text-ink">
                        {ROOM_GROUPS.map(group =>
                          <option key={group.value} value={group.value}>{group.label}</option>
                        )}
                      </select>
                    </label>
                  )}
                  {index !== 0 && (
                    <button type="button" disabled={busy}
                      onClick={() => void makeCover(photo.id)}
                      className="mt-1 rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-ink disabled:opacity-60">
                      Definir como capa
                    </button>
                  )}
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
                {busy ? 'Analisando fotos...' : 'Reorganizar fotos automaticamente (grátis)'}
              </button>
              <p className="mt-2 text-xs text-slate-soft">
                Esta seleção é gratuita e realizada no navegador. Mantém fotos
                visualmente semelhantes juntas. Não identifica cômodos com certeza.
                {supportsGroups
                  ? ' Se algum ambiente ficar misturado, identifique o ambiente das fotos acima e clique novamente.'
                  : ' Você pode habilitar rótulos de ambiente no Supabase com a migração 006.'}
              </p>
            </div>
          )}
          <p className="mt-3 text-xs text-slate-soft">
            Após enviar novas fotos, a classificação visual gratuita tentará escolher
            automaticamente a capa e a sequência; nenhuma chave de API é necessária.
            Não reconhece tipos de ambiente, portanto confira a capa escolhida.
            Nesta versão, não é possível excluir fotos pelo painel.
          </p>
        </>
      )}
    </section>
  );
}
