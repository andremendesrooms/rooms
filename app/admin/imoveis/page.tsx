'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { adminSupabase } from '@/lib/supabase-admin';

type AdminProperty = {
  id: string;
  title: string | null;
  type: string | null;
  postcode: string | null;
  region: string | null;
  price: number | null;
  price_frequency: string | null;
  status: string | null;
  available_from: string | null;
  hidden: boolean | null;
  validation_status: string | null;
  updated_at: string | null;
};

function priceLabel(price: number | null, frequency: string | null) {
  if (price == null) return 'Não informado';
  const amount = new Intl.NumberFormat('en-GB', {
    style: 'currency', currency: 'GBP', maximumFractionDigits: 0,
  }).format(price);
  const cadence = frequency === 'week' ? '/semana' : frequency === 'month' ? '/mês' : '';
  return amount + cadence;
}

export default function AdminImoveisPage() {
  const router = useRouter();
  const [rows, setRows] = useState<AdminProperty[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [truncated, setTruncated] = useState(false);
  const [canCreate, setCanCreate] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const { data: identity, error: authError } = await adminSupabase.auth.getUser();
        if (authError || !identity.user) {
          router.replace('/admin/login');
          return;
        }

        const { data: member, error: memberError } = await adminSupabase
          .from('admin_users')
          .select('id,role')
          .eq('id', identity.user.id)
          .eq('active', true)
          .maybeSingle();
        if (memberError || !member ||
            !['super_admin', 'manager', 'agent'].includes(member.role)) {
          router.replace('/admin/login');
          return;
        }
        if (active) setCanCreate(['super_admin', 'manager'].includes(member.role));

        // Esta tela é SOMENTE leitura. O Supabase/RLS determina as propriedades
        // autorizadas para cada função. Nunca usar service_role no navegador.
        const { data: properties, error: queryError } = await adminSupabase
          .from('properties')
          .select('id,title,type,postcode,region,price,price_frequency,status,available_from,hidden,validation_status,updated_at')
          .order('updated_at', { ascending: false })
          .limit(101);

        if (!active) return;
        if (queryError) {
          setError('Não foi possível carregar os imóveis. Confira as permissões de leitura no Supabase.');
          return;
        }

        setRows((properties || []).slice(0, 100) as AdminProperty[]);
        setTruncated((properties || []).length > 100);
      } catch {
        if (active) setError('Não foi possível conectar ao Supabase. Confira sua conexão.');
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [router]);

  const visible = useMemo(() => rows.filter((property) => {
    const term = search.toLocaleLowerCase('pt-BR').trim();
    if (!term) return true;
    return [property.id, property.title, property.type, property.postcode, property.region, property.status]
      .some((v) => (v || '').toLocaleLowerCase('pt-BR').includes(term));
  }), [rows, search]);

  return (
    <section className="mx-auto max-w-6xl px-4 py-10">
      <Link href="/admin" className="text-sm underline">Voltar ao painel</Link>
      <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-ink">Imóveis cadastrados</h1>
          <p className="mt-2 text-sm text-slate-soft">
            Consulta de imóveis e edição dos rascunhos ocultos. A publicação permanece desabilitada.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-white px-4 py-2 text-sm text-ink">
            {loading ? 'Carregando...' : `${visible.length} imóveis exibidos`}
          </span>
          {canCreate && (
            <Link href="/admin/imoveis/novo"
              className="rounded-lg bg-ink px-4 py-3 text-sm font-semibold text-white">
              Cadastrar imóvel
            </Link>
          )}
        </div>
      </div>

      {!loading && !error && (
        <div className="mt-7">
          <label htmlFor="admin-property-search" className="mb-2 block text-sm font-medium">
            Pesquisar por referência, endereço postal, tipo ou região
          </label>
          <input
            id="admin-property-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ex.: SW16 ou AM-NW9"
            className="w-full max-w-xl rounded-xl border border-slate-300 bg-white px-4 py-3"
          />
        </div>
      )}

      {loading && <p className="mt-10 text-slate-soft">Carregando imóveis autorizados...</p>}
      {error && <p role="alert" className="mt-8 rounded-lg bg-red-50 p-4 text-red-700">{error}</p>}
      {!loading && !error && rows.length === 0 && (
        <p className="mt-10 text-slate-soft">Nenhum imóvel visível para seu perfil.</p>
      )}
      {!loading && !error && (
        <>
          {truncated && (
            <p className="mt-5 text-sm text-amber-700">
              Esta versão mostra apenas os 100 imóveis mais recentemente atualizados.
            </p>
          )}
          <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
            {visible.map((property) => (
              <article key={property.id} className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h2 className="text-lg font-semibold text-ink">
                    {property.title || property.type || 'Imóvel sem título'}
                  </h2>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-ink">
                    {property.status || 'Sem status'}
                  </span>
                </div>
                <p className="mt-1 font-mono text-xs text-slate-soft">{property.id}</p>
                <p className="mt-3 text-sm text-slate-soft">
                  {[property.postcode, property.region].filter(Boolean).join(' · ') || 'Localização não informada'}
                </p>
                <p className="mt-2 text-xl font-semibold text-ink">
                  {priceLabel(property.price, property.price_frequency)}
                </p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-soft">
                  <span>Entrada: {property.available_from || 'Não informada'}</span>
                  {property.hidden === true && (
                    <span className="rounded-full bg-amber-100 px-2 py-1 text-amber-900">
                      Oculto no catálogo
                    </span>
                  )}
                </div>
                {canCreate && property.status === 'inactive' &&
                  property.hidden === true && property.validation_status === 'incomplete' && (
                    <Link href={`/admin/imoveis/${encodeURIComponent(property.id)}`}
                      className="mt-4 inline-block rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-ink">
                      Editar rascunho
                    </Link>
                  )}
              </article>
            ))}
          </div>
          {rows.length > 0 && visible.length === 0 && (
            <p className="mt-6 text-slate-soft">Nenhum imóvel corresponde à pesquisa.</p>
          )}
        </>
      )}
    </section>
  );
}
