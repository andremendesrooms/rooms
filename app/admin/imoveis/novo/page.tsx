'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { adminSupabase } from '@/lib/supabase-admin';

const PROPERTY_TYPES = [
  'Single Room',
  'Double Room',
  'En-suite',
  'Studio',
  'Flat',
  'House',
] as const;

const initial = {
  title: '',
  type: '',
  postcode: '',
  unit_label: '',
  address: '',
  region: '',
  price: '',
  price_frequency: 'week',
  bedrooms: '',
  occupancy: '',
  available_from: '',
  description: '',
};

export default function NovoImovelPage() {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [createdId, setCreatedId] = useState('');

  useEffect(() => {
    let alive = true;
    async function check() {
      try {
        const { data, error: authError } = await adminSupabase.auth.getUser();
        if (!data.user || authError) {
          router.replace('/admin/login');
          return;
        }
        const { data: user, error: userError } = await adminSupabase
          .from('admin_users')
          .select('role')
          .eq('id', data.user.id)
          .eq('active', true)
          .maybeSingle();
        if (alive && !userError && user &&
          ['super_admin', 'manager'].includes(user.role)) {
          setAllowed(true);
        }
      } finally {
        if (alive) setChecking(false);
      }
    }
    void check();
    return () => { alive = false; };
  }, [router]);

  function update(field: keyof typeof initial, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setCreatedId('');

    const postcode = form.postcode.trim().toUpperCase();
    if (!form.type || (!postcode && !form.address.trim())) {
      setError('Informe o tipo e o postcode ou endereço.');
      return;
    }
    if (form.price.trim() && (!Number.isFinite(Number(form.price)) || Number(form.price) <= 0)) {
      setError('O preço precisa ser maior que zero.');
      return;
    }
    if (form.bedrooms.trim() &&
        (!Number.isInteger(Number(form.bedrooms)) || Number(form.bedrooms) < 0)) {
      setError('Informe uma quantidade válida de quartos.');
      return;
    }

    setSaving(true);
    try {
      const { data: identity } = await adminSupabase.auth.getUser();
      if (!identity.user) {
        router.replace('/admin/login');
        return;
      }
      const { data: membership } = await adminSupabase.from('admin_users')
        .select('role')
        .eq('id', identity.user.id)
        .eq('active', true)
        .maybeSingle();
      if (!membership || !['super_admin', 'manager'].includes(membership.role)) {
        setError('Seu usuário não tem permissão para cadastrar imóveis.');
        return;
      }

      // ID interno automático; nenhuma referência deve ser digitada pelo usuário.
      const area = postcode.replace(/\s.*/, '').replace(/[^A-Z0-9]/g, '').slice(0, 6) || 'LON';
      const id = `AM-${area}-${crypto.randomUUID().replace(/-/g, '').slice(0, 16).toUpperCase()}`;

      const { error: insertError } = await adminSupabase.from('properties').insert({
        id,
        type: form.type,
        title: form.title.trim() || null,
        postcode: postcode || null,
        address: form.address.trim() || null,
        unit_label: form.unit_label.trim() || null,
        region: form.region.trim() || null,
        price: form.price.trim() ? Number(form.price) : null,
        price_frequency: form.price.trim() ? form.price_frequency : null,
        bedrooms: form.bedrooms.trim() ? Number(form.bedrooms) : null,
        occupancy: form.occupancy || null,
        available_from: form.available_from || null,
        description: form.description.trim() || null,
        status: 'inactive',
        hidden: true,
        validation_status: 'incomplete',
        featured: false,
      });
      if (insertError) {
        console.error('[admin] erro ao criar rascunho', insertError.code, insertError.message);
        setError('Não foi possível salvar o rascunho. Verifique os campos e as permissões do seu usuário.');
        return;
      }
      setCreatedId(id);
      setForm(initial);
    } catch {
      setError('Falha de conexão. Confira sua internet e tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  const inputClass = 'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-3';
  const labelClass = 'block text-sm font-medium text-ink';

  if (checking) return <p className="mx-auto max-w-3xl px-4 py-12">Verificando acesso...</p>;
  if (!allowed) return (
    <section className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-semibold">Acesso restrito</h1>
      <p className="mt-2 text-slate-soft">Somente administradores e gerentes podem cadastrar imóveis.</p>
      <Link href="/admin/imoveis" className="mt-4 inline-block underline">Voltar para os imóveis</Link>
    </section>
  );

  return (
    <section className="mx-auto max-w-3xl px-4 py-12">
      <Link href="/admin/imoveis" className="text-sm underline">Voltar aos imóveis</Link>
      <h1 className="mt-5 font-display text-3xl text-ink">Cadastrar imóvel</h1>
      <p className="mt-3 text-sm text-slate-soft">
        Este formulário salva um rascunho interno. O imóvel permanece oculto e
        inativo até a revisão dos dados e a publicação autorizada.
      </p>

      {createdId && (
        <div role="status" className="mt-6 rounded-xl border border-green-300 bg-green-50 p-5 text-green-900">
          <p className="font-semibold">Rascunho salvo. O imóvel não foi publicado.</p>
          <p className="mt-2 font-mono text-sm">Referência: {createdId}</p>
          <Link href="/admin/imoveis" className="mt-3 inline-block text-sm underline">
            Ver na lista de imóveis
          </Link>
        </div>
      )}

      <form onSubmit={save} className="mt-7 space-y-6 rounded-2xl bg-white p-6 shadow-sm">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="type" className={labelClass}>Tipo de imóvel *</label>
            <select id="type" className={inputClass} value={form.type}
              onChange={(e) => update('type', e.target.value)} required>
              <option value="">Selecione...</option>
              {PROPERTY_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="title" className={labelClass}>Título do anúncio</label>
            <input id="title" className={inputClass} value={form.title}
              onChange={(e) => update('title', e.target.value)}
              placeholder="Ex.: Quarto casal em Streatham" />
          </div>
          <div>
            <label htmlFor="postcode" className={labelClass}>Postcode</label>
            <input id="postcode" className={inputClass} value={form.postcode}
              onChange={(e) => update('postcode', e.target.value)}
              placeholder="Ex.: SW16 5LN" />
          </div>
          <div>
            <label htmlFor="unit" className={labelClass}>Unidade / quarto</label>
            <input id="unit" className={inputClass} value={form.unit_label}
              onChange={(e) => update('unit_label', e.target.value)}
              placeholder="Ex.: Room 2, Suite 1" />
          </div>
          <div>
            <label htmlFor="address" className={labelClass}>Endereço (interno nesta etapa)</label>
            <input id="address" className={inputClass} value={form.address}
              onChange={(e) => update('address', e.target.value)} />
          </div>
          <div>
            <label htmlFor="region" className={labelClass}>Região</label>
            <input id="region" className={inputClass} value={form.region}
              onChange={(e) => update('region', e.target.value)}
              placeholder="Ex.: Streatham" />
          </div>
          <div>
            <label htmlFor="price" className={labelClass}>Aluguel em £</label>
            <input id="price" type="number" min="0.01" step="0.01" className={inputClass}
              value={form.price} onChange={(e) => update('price', e.target.value)}
              placeholder="Ex.: 270" />
          </div>
          <div>
            <label htmlFor="frequency" className={labelClass}>Periodicidade do aluguel</label>
            <select id="frequency" className={inputClass} value={form.price_frequency}
              onChange={(e) => update('price_frequency', e.target.value)}>
              <option value="week">Semanal</option>
              <option value="month">Mensal</option>
            </select>
          </div>
          <div>
            <label htmlFor="bedrooms" className={labelClass}>Quantidade de quartos</label>
            <input id="bedrooms" type="number" min="0" step="1" className={inputClass}
              value={form.bedrooms} onChange={(e) => update('bedrooms', e.target.value)} />
          </div>
          <div>
            <label htmlFor="occupancy" className={labelClass}>Ocupação</label>
            <select id="occupancy" className={inputClass} value={form.occupancy}
              onChange={(e) => update('occupancy', e.target.value)}>
              <option value="">Não informado</option>
              <option value="single">Uma pessoa</option>
              <option value="couple">Casal</option>
              <option value="family">Família</option>
            </select>
          </div>
          <div>
            <label htmlFor="date" className={labelClass}>Disponível a partir de</label>
            <input id="date" type="date" className={inputClass} value={form.available_from}
              onChange={(e) => update('available_from', e.target.value)} />
          </div>
        </div>
        <div>
          <label htmlFor="description" className={labelClass}>Descrição / observações</label>
          <textarea id="description" rows={4} className={inputClass} value={form.description}
            onChange={(e) => update('description', e.target.value)} />
        </div>
        <p className="text-sm text-slate-soft">
          O sistema gera a referência automaticamente. Preços, disponibilidade e
          localização deverão ser confirmados antes da publicação.
        </p>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <button type="submit" disabled={saving}
          className="w-full rounded-lg bg-ink px-5 py-3 font-semibold text-white disabled:opacity-60">
          {saving ? 'Salvando...' : 'Salvar rascunho oculto'}
        </button>
      </form>
    </section>
  );
}
