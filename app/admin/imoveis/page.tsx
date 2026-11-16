'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { adminSupabase } from '@/lib/supabase-admin';
import PropertyQuickActions, { type EditableProperty } from '@/components/admin/PropertyQuickActions';

type AdminProperty = EditableProperty & {
  title: string | null;
  region: string | null;
  price_frequency: string | null;
};

type Filter = 'ativos' | 'publicados' | 'ocultos' | 'alugados' | 'arquivados' | 'todos';
const PAGE_SIZE = 50;

function priceLabel(price: number | null, frequency: string | null) {
  if (price == null) return 'Preço a confirmar';
  const amount = new Intl.NumberFormat('en-GB', {
    style: 'currency', currency: 'GBP', maximumFractionDigits: 0,
  }).format(price);
  return amount + (frequency === 'week' ? '/semana' : frequency === 'month' ? '/mês' : '');
}

function isPublic(p: AdminProperty) {
  return p.status === 'available' && !p.hidden && p.validation_status === 'ok';
}

function statusName(p: AdminProperty): { text: string; css: string } {
  if (p.status === 'archived')
    return { text: 'Arquivado', css: 'bg-slate-100 text-slate-700' };
  if (p.status === 'rented')
    return { text: 'Alugado', css: 'bg-indigo-50 text-indigo-800' };
  if (isPublic(p))
    return { text: 'Publicado', css: 'bg-green-100 text-green-900' };
  if (p.status === 'inactive')
    return { text: 'Rascunho', css: 'bg-slate-100 text-slate-700' };
  return { text: 'Oculto', css: 'bg-amber-100 text-amber-900' };
}

export default function AdminImoveisPage() {
  const router = useRouter();
  const [rows, setRows] = useState<AdminProperty[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('ativos');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [canManage, setCanManage] = useState(false);
  const [canDeletePermanently, setCanDeletePermanently] = useState(false);
  const [cleaning, setCleaning] = useState(false);

  const load = useCallback(async (reset: boolean, currentCount = 0) => {
    reset ? setLoading(true) : setLoadingMore(true);
    setError('');
    try {
      const { data: identity, error: authError } = await adminSupabase.auth.getUser();
      if (authError || !identity.user) {
        router.replace('/admin/login');
        return;
      }
      const { data: member, error: memberError } = await adminSupabase
        .from('admin_users').select('role')
        .eq('id', identity.user.id).eq('active', true).maybeSingle();
      if (memberError || !member ||
        !['super_admin', 'manager', 'agent'].includes(member.role)) {
        router.replace('/admin/login');
        return;
      }
      setCanManage(['super_admin', 'manager'].includes(member.role));
      setCanDeletePermanently(member.role === 'super_admin');
      // Keep archived records available for recovery. RLS decides which rows
      // the signed-in user is allowed to read.
      const start = reset ? 0 : currentCount;
      const { data, error: queryError } = await adminSupabase.from('properties')
        .select('id,title,type,postcode,region,price,price_frequency,status,available_from,hidden,validation_status,pending_price,updated_at')
        .order('updated_at', { ascending: false })
        .order('id', { ascending: true })
        .range(start, start + PAGE_SIZE);
      if (queryError) throw new Error('Não foi possível consultar os imóveis. Confira as permissões no Supabase.');
      const received = (data ?? []) as AdminProperty[];
      setRows((previous) => reset
        ? received.slice(0, PAGE_SIZE)
        : [...previous, ...received.slice(0, PAGE_SIZE).filter(
            (p) => !previous.some((existing) => existing.id === p.id),
          )]);
      setHasMore(received.length > PAGE_SIZE);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível conectar ao Supabase.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [router]);

  useEffect(() => { void load(true); }, [load]);

  const visible = useMemo(() => rows.filter((property) => {
    if (filter === 'ativos' && property.status === 'archived') return false;
    if (filter === 'arquivados' && property.status !== 'archived') return false;
    if (filter === 'publicados' && !isPublic(property)) return false;
    if (filter === 'ocultos' && !(property.hidden && property.status !== 'rented' && property.status !== 'archived')) return false;
    if (filter === 'alugados' && property.status !== 'rented') return false;
    const term = search.toLocaleLowerCase('pt-BR').trim();
    if (!term) return true;
    return [property.id, property.title, property.type, property.postcode, property.region, property.status]
      .some((value) => (value || '').toLocaleLowerCase('pt-BR').includes(term));
  }), [rows, search, filter]);

  function onChanged(message: string) {
    setNotice(message);
    void load(true);
  }

  async function cleanPendingPhotos() {
    if (cleaning) return;
    setCleaning(true);
    setError('');
    try {
      const { data, error: sessionError } = await adminSupabase.auth.getSession();
      if (sessionError || !data.session?.access_token)
        throw new Error('Sua sessão expirou. Entre novamente.');
      const response = await fetch('/api/admin/imoveis/limpar-exclusoes', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + data.session.access_token },
        cache: 'no-store',
      });
      const result = await response.json() as {
        examined?: number; complete?: number; pending?: number; error?: string;
      };
      if (!response.ok) throw new Error(result.error || 'Não foi possível concluir a limpeza.');
      setNotice('Limpeza verificada: ' + (result.complete ?? 0) +
        ' concluída(s), ' + (result.pending ?? 0) + ' pendente(s) nesta execução.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao verificar limpeza.');
    } finally {
      setCleaning(false);
    }
  }

  const options: Array<{ value: Filter; label: string }> = [
    { value: 'ativos', label: 'Todos, exceto arquivados' },
    { value: 'publicados', label: 'Publicados' },
    { value: 'ocultos', label: 'Ocultos e rascunhos' },
    { value: 'alugados', label: 'Alugados' },
    { value: 'arquivados', label: 'Arquivados (recuperáveis)' },
    { value: 'todos', label: 'Todos os registros' },
  ];

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      <Link href="/admin" className="text-sm text-slate-soft underline">Voltar ao painel</Link>
      <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-route-gold">Gestão de imóveis</p>
          <h1 className="mt-2 font-display text-4xl text-ink">Seu catálogo, sob controle.</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-soft">
            Cadastre, edite, oculte ou retire anúncios em poucos cliques.
            A exclusão arquiva o imóvel e permite recuperar todas as informações e fotos.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canDeletePermanently && (
            <button type="button" disabled={cleaning} onClick={() => void cleanPendingPhotos()}
              className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-ink disabled:opacity-50">
              {cleaning ? 'Conferindo limpeza...' : 'Concluir limpeza pendente'}
            </button>
          )}
          {canManage && (
            <Link href="/admin/imoveis/novo"
              className="inline-flex min-h-11 items-center rounded-xl bg-ink px-5 py-3 text-sm font-semibold text-white">
              + Cadastrar imóvel
            </Link>
          )}
        </div>
      </div>

      {notice && (
        <div role="status" className="mt-5 flex items-start justify-between gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-900">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice('')}
            aria-label="Fechar confirmação" className="font-semibold">×</button>
        </div>
      )}
      {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p>}

      <div className="mt-7 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-[minmax(0,1fr)_260px]">
        <div>
          <label htmlFor="admin-property-search" className="mb-1 block text-sm font-medium">
            Buscar imóvel
          </label>
          <input id="admin-property-search" type="search" value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Postcode, título ou referência (ex.: SW16)"
            className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm" />
        </div>
        <div>
          <label htmlFor="admin-property-status" className="mb-1 block text-sm font-medium">
            Situação
          </label>
          <select id="admin-property-status" value={filter}
            onChange={(event) => setFilter(event.target.value as Filter)}
            className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm">
            {options.map((option) =>
              <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-soft">
        <p>{loading ? 'Carregando...' : visible.length + ' imóveis exibidos'}</p>
        {hasMore && <p>A busca filtra os imóveis carregados. Use “Carregar mais” para ver os demais.</p>}
      </div>

      {loading && <p className="mt-8 text-slate-soft">Carregando seus imóveis...</p>}
      {!loading && !error && rows.length === 0 && (
        <p className="mt-8 rounded-xl border border-slate-200 bg-white p-6 text-slate-soft">
          Nenhum imóvel acessível ao seu perfil. Cadastre um rascunho para começar.
        </p>
      )}
      {!loading && !error && visible.length === 0 && rows.length > 0 && (
        <p className="mt-8 rounded-xl border border-slate-200 bg-white p-6 text-slate-soft">
          Nenhum imóvel encontrado neste filtro.
        </p>
      )}

      {!loading && (
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {visible.map((property) => {
            const state = statusName(property);
            return (
              <article key={property.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <h2 className="min-w-0 flex-1 text-lg font-semibold text-ink">
                    {property.title || property.type || 'Imóvel sem título'}
                  </h2>
                  <span className={state.css + ' rounded-full px-3 py-1 text-xs font-semibold'}>
                    {state.text}
                  </span>
                </div>
                <p className="mt-1 break-all font-mono text-xs text-slate-soft">{property.id}</p>
                <p className="mt-3 text-sm text-slate-soft">
                  {[property.postcode, property.region].filter(Boolean).join(' · ') || 'Localização a confirmar'}
                </p>
                <p className="mt-1 text-xl font-semibold text-ink">
                  {priceLabel(property.price, property.price_frequency)}
                </p>
                <p className="mt-2 text-xs text-slate-soft">
                  {property.available_from ? 'Disponível a partir de ' + property.available_from : 'Data a confirmar'}
                  {property.hidden ? ' · Oculto dos clientes' : ''}
                </p>
                {canManage && (
                  <>
                    <Link href={'/admin/imoveis/' + encodeURIComponent(property.id)}
                      className="mt-4 inline-flex min-h-10 items-center rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white">
                      Editar dados e fotos
                    </Link>
                    <PropertyQuickActions property={property}
                      canDeletePermanently={canDeletePermanently}
                      onChanged={onChanged} />
                  </>
                )}
              </article>
            );
          })}
        </div>
      )}

      {!loading && !error && hasMore && (
        <div className="mt-7 text-center">
          <button type="button" disabled={loadingMore}
            onClick={() => void load(false, rows.length)}
            className="rounded-xl border border-ink bg-white px-6 py-3 text-sm font-semibold text-ink disabled:opacity-50">
            {loadingMore ? 'Carregando...' : 'Carregar mais imóveis'}
          </button>
        </div>
      )}

      {!loading && <p className="mt-7 text-xs text-slate-soft">
        Somente usuários autorizados podem alterar anúncios. A exclusão definitiva só aparece
        para o administrador principal, em imóveis arquivados, e exige duas confirmações.
        Os arquivos podem precisar de limpeza adicional se a conexão com o Storage falhar.
      </p>}
    </section>
  );
}
