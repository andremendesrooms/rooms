'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { adminSupabase } from '@/lib/supabase-admin';
import PropertyPhotosEditor from '@/components/admin/PropertyPhotosEditor';

type Draft = {
  id: string; title: string | null; type: string; postcode: string | null;
  address: string | null; unit_label: string | null; region: string | null;
  price: number | null; price_frequency: 'week' | 'month' | null;
  bedrooms: number | null; occupancy: 'single' | 'couple' | 'family' | null;
  available_from: string | null; description: string | null;
  status: string; hidden: boolean; validation_status: string;
  pending_price: number | null; updated_at: string;
};

const types = ['Single Room', 'Double Room', 'En-suite', 'Studio', 'Flat', 'House'];
const blankForm = {
  title: '', type: '', postcode: '', unit_label: '', address: '',
  region: '', price: '', price_frequency: 'week', bedrooms: '',
  occupancy: '', available_from: '', description: '',
};
type Form = typeof blankForm;

const inputStyle = 'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-3';
const labelStyle = 'block text-sm font-medium text-ink';

function asForm(d: Draft): Form {
  return {
    title: d.title ?? '', type: d.type, postcode: d.postcode ?? '',
    unit_label: d.unit_label ?? '', address: d.address ?? '',
    region: d.region ?? '', price: d.price == null ? '' : String(d.price),
    price_frequency: d.price_frequency ?? 'week',
    bedrooms: d.bedrooms == null ? '' : String(d.bedrooms),
    occupancy: d.occupancy ?? '', available_from: d.available_from ?? '',
    description: d.description ?? '',
  };
}

export default function EditarImovelPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [draft, setDraft] = useState<Draft | null>(null);
  const [form, setForm] = useState<Form>(blankForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [confirmedPublicChange, setConfirmedPublicChange] = useState(false);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const { data: userData, error: userError } = await adminSupabase.auth.getUser();
        if (userError || !userData.user) {
          router.replace('/admin/login');
          return;
        }
        const { data: member, error: roleError } = await adminSupabase
          .from('admin_users').select('role').eq('id', userData.user.id)
          .eq('active', true).maybeSingle();
        if (roleError || !member || !['super_admin', 'manager'].includes(member.role)) {
          if (alive) setError('Somente administradores e gerentes podem editar imóveis.');
          return;
        }
        const { data, error: queryError } = await adminSupabase
          .from('properties')
          .select('id,title,type,postcode,address,unit_label,region,price,price_frequency,bedrooms,occupancy,available_from,description,status,hidden,validation_status,pending_price,updated_at')
          .eq('id', id).maybeSingle();

        if (!alive) return;
        if (queryError || !data) {
          setError('O imóvel não foi encontrado ou não está autorizado para seu perfil.');
          return;
        }
        const record = data as Draft;
        setDraft(record);
        setForm(asForm(record));
      } catch {
        if (alive) setError('Não foi possível consultar o Supabase.');
      } finally {
        if (alive) setLoading(false);
      }
    }
    void load();
    return () => { alive = false; };
  }, [id, router]);

  function update(field: keyof Form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setSuccess('');
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft || saving) return;
    setError('');
    setSuccess('');

    const publicNow = draft.status === 'available' &&
      draft.hidden === false && draft.validation_status === 'ok';
    if (publicNow && !confirmedPublicChange) {
      setError('Confirme que entendeu que estas alterações podem aparecer imediatamente no catálogo público.');
      return;
    }

    const postcode = form.postcode.trim().toUpperCase();
    if (!form.type || (!postcode && !form.address.trim())) {
      setError('Informe o tipo do imóvel e um postcode ou endereço.');
      return;
    }
    const priceValue = form.price.trim() ? Number(form.price) : null;
    if (priceValue !== null && (!Number.isFinite(priceValue) || priceValue <= 0)) {
      setError('O aluguel deve ser um número maior que zero.');
      return;
    }
    if (publicNow && priceValue === null) {
      setError('O preço é obrigatório para editar um imóvel publicado. Se precisar retirar o preço do anúncio, primeiro altere sua situação em um fluxo de publicação apropriado.');
      return;
    }
    const bedroomsValue = form.bedrooms.trim() ? Number(form.bedrooms) : null;
    if (bedroomsValue !== null &&
        (!Number.isInteger(bedroomsValue) || bedroomsValue < 0)) {
      setError('Informe uma quantidade válida de quartos.');
      return;
    }
    if (publicNow && !window.confirm('Este imóvel está visível no catálogo. Salvar agora pode alterar o anúncio dos clientes. Confirma a gravação?')) {
      return;
    }
    setSaving(true);
    try {
      const { data: identity } = await adminSupabase.auth.getUser();
      if (!identity.user) {
        router.replace('/admin/login');
        return;
      }
      const { data: member } = await adminSupabase.from('admin_users')
        .select('role').eq('id', identity.user.id).eq('active', true).maybeSingle();
      if (!member || !['super_admin', 'manager'].includes(member.role)) {
        setError('Acesso não autorizado.');
        return;
      }

      // Não altera status, validação nem visibilidade. Para anúncios públicos, 
      // alterações de descrição, preço e disponibilidade podem ficar visíveis 
      // imediatamente. Triggers do banco protegem alterações críticas de preço.
      // Exige que o registro não tenha mudado desde que foi carregado.
      const { data, error: writeError } = await adminSupabase.from('properties')
        .update({
          type: form.type,
          title: form.title.trim() || null,
          postcode: postcode || null,
          address: form.address.trim() || null,
          unit_label: form.unit_label.trim() || null,
          region: form.region.trim() || null,
          price: priceValue,
          price_frequency: priceValue === null ? null : form.price_frequency,
          bedrooms: bedroomsValue,
          occupancy: form.occupancy || null,
          available_from: form.available_from || null,
          description: form.description.trim() || null,
        })
        .eq('id', draft.id)
        .eq('status', draft.status)
        .eq('hidden', draft.hidden)
        .eq('validation_status', draft.validation_status)
        .eq('updated_at', draft.updated_at)
        .select('id,title,type,postcode,address,unit_label,region,price,price_frequency,bedrooms,occupancy,available_from,description,status,hidden,validation_status,pending_price,updated_at')
        .maybeSingle();

      if (writeError) {
        setError('Não foi possível salvar. Verifique os campos e sua autorização.');
        return;
      }
      if (!data) {
        setError('O imóvel foi alterado por outra sessão ou suas condições de publicação mudaram. Volte à lista e abra-o novamente.');
        return;
      }
      const saved = data as Draft;
      setDraft(saved);
      setForm(asForm(saved));
      setConfirmedPublicChange(false);
      setSuccess(saved.pending_price !== null
        ? 'Alterações salvas. Existe um preço pendente de revisão; confira o valor antes de novas mudanças. A situação de publicação não foi alterada.'
        : publicNow
          ? 'Alterações gravadas. Os novos dados podem aparecer no catálogo público. O status e a visibilidade não foram modificados.'
          : 'Alterações salvas. O status e a visibilidade do imóvel não foram modificados.');
    } catch {
      setError('Falha de conexão. Confira sua internet e tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  const isPublic = Boolean(draft && draft.status === 'available' &&
    draft.hidden === false && draft.validation_status === 'ok');

  if (loading) return <section className="mx-auto max-w-3xl px-4 py-12">Verificando acesso e carregando imóvel...</section>;

  return (
    <section className="mx-auto max-w-3xl px-4 py-12">
      <Link href="/admin/imoveis" className="text-sm underline">Voltar à lista de imóveis</Link>
      <h1 className="mt-5 font-display text-3xl text-ink">{isPublic ? 'Editar imóvel publicado' : 'Editar imóvel'}</h1>
      {error && <p role="alert" className="mt-5 rounded-lg bg-red-50 p-4 text-sm text-red-800">{error}</p>}
      {draft && (
        <>
          <p className="mt-2 font-mono text-xs text-slate-soft">Referência: {draft.id}</p>
          <p className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
            {isPublic
              ? 'Atenção: este imóvel está publicado. Ao salvar, alterações de preço, localização, descrição e disponibilidade podem aparecer imediatamente para clientes. Confira os dados com o responsável antes de salvar.'
              : 'Este imóvel não está publicado nesta situação. Esta tela não altera status, validação nem visibilidade.'}
            {' '}Situação atual: {draft.status}; oculto: {draft.hidden ? 'sim' : 'não'}.
          </p>
          {draft.pending_price !== null && (
            <p className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
              Existe um preço pendente de revisão: £{draft.pending_price}.
              Não publique este imóvel até confirmar o valor.
            </p>
          )}
          {success && <p role="status" className="mt-5 rounded-lg bg-green-50 p-4 text-sm text-green-900">{success}</p>}
          <form onSubmit={save} className="mt-6 space-y-5 rounded-2xl bg-white p-6 shadow-sm">
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="type" className={labelStyle}>Tipo de imóvel *</label>
                <select id="type" className={inputStyle} required value={form.type}
                  onChange={(e) => update('type', e.target.value)}>
                  <option value="">Selecione</option>
                  {[...new Set([...types, form.type])].filter(Boolean).map((type) =>
                    <option key={type} value={type}>{type}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="title" className={labelStyle}>Título</label>
                <input id="title" className={inputStyle} value={form.title}
                  onChange={(e) => update('title', e.target.value)} />
              </div>
              <div>
                <label htmlFor="postcode" className={labelStyle}>Postcode</label>
                <input id="postcode" className={inputStyle} value={form.postcode}
                  onChange={(e) => update('postcode', e.target.value)} />
              </div>
              <div>
                <label htmlFor="unit" className={labelStyle}>Unidade / quarto</label>
                <input id="unit" className={inputStyle} value={form.unit_label}
                  onChange={(e) => update('unit_label', e.target.value)} />
              </div>
              <div>
                <label htmlFor="address" className={labelStyle}>Endereço (interno)</label>
                <input id="address" className={inputStyle} value={form.address}
                  onChange={(e) => update('address', e.target.value)} />
              </div>
              <div>
                <label htmlFor="region" className={labelStyle}>Região</label>
                <input id="region" className={inputStyle} value={form.region}
                  onChange={(e) => update('region', e.target.value)} />
              </div>
              <div>
                <label htmlFor="price" className={labelStyle}>Aluguel em £</label>
                <input id="price" type="number" min="0.01" step="0.01"
                  className={inputStyle} value={form.price}
                  onChange={(e) => update('price', e.target.value)} />
              </div>
              <div>
                <label htmlFor="frequency" className={labelStyle}>Periodicidade</label>
                <select id="frequency" className={inputStyle} value={form.price_frequency}
                  onChange={(e) => update('price_frequency', e.target.value)}>
                  <option value="week">Semanal</option>
                  <option value="month">Mensal</option>
                </select>
              </div>
              <div>
                <label htmlFor="bedrooms" className={labelStyle}>Quantidade de quartos</label>
                <input id="bedrooms" type="number" min="0" step="1"
                  className={inputStyle} value={form.bedrooms}
                  onChange={(e) => update('bedrooms', e.target.value)} />
              </div>
              <div>
                <label htmlFor="occupancy" className={labelStyle}>Ocupação</label>
                <select id="occupancy" className={inputStyle} value={form.occupancy}
                  onChange={(e) => update('occupancy', e.target.value)}>
                  <option value="">Não informado</option>
                  <option value="single">Uma pessoa</option>
                  <option value="couple">Casal</option>
                  <option value="family">Família</option>
                </select>
              </div>
              <div>
                <label htmlFor="date" className={labelStyle}>Disponível a partir de</label>
                <input id="date" type="date" className={inputStyle}
                  value={form.available_from}
                  onChange={(e) => update('available_from', e.target.value)} />
              </div>
            </div>
            <div>
              <label htmlFor="description" className={labelStyle}>Descrição / observações</label>
              <textarea id="description" rows={4} className={inputStyle}
                value={form.description}
                onChange={(e) => update('description', e.target.value)} />
            </div>
            {isPublic && (
              <label className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
                <input type="checkbox" checked={confirmedPublicChange}
                  onChange={(e) => setConfirmedPublicChange(e.target.checked)}
                  className="mt-1" />
                Confirmo que conferi os dados com a fonte comercial e entendo que
                salvar pode atualizar o anúncio visível aos clientes.
              </label>
            )}
            <button type="submit" disabled={saving || (isPublic && !confirmedPublicChange)}
              className="w-full rounded-lg bg-ink px-5 py-3 font-semibold text-white disabled:opacity-60">
              {saving ? 'Salvando...' : isPublic ? 'Salvar alterações do imóvel publicado' : 'Salvar alterações do imóvel'}
            </button>
          </form>
          <PropertyPhotosEditor propertyId={draft.id} />
        </>
      )}
    </section>
  );
}
