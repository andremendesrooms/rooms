-- André Mendes Rooms — EXCLUSÃO DEFINITIVA CONTROLADA (migration 007)
--
-- NÃO EXECUTAR sem revisão no projeto Supabase correto.
-- Não exclui nenhum registro ao instalar. Apenas cria função e fila privada.
-- Exclusão real exige chamada explícita como usuário autenticado super_admin,
-- imóvel arquivado + oculto e referência/versão conferidas.
--
-- A função apaga metadados de fotos e imóvel EM UMA TRANSAÇÃO. Se alguma
-- foreign key, trigger ou constraint impedir, tudo faz rollback.
-- Os ARQUIVOS do Storage são removidos pela aplicação no servidor depois;
-- se a rede falhar, a fila privada guarda os caminhos para nova tentativa.

create table if not exists public.property_permanent_deletion_jobs (
  id uuid primary key default gen_random_uuid(),
  property_id text not null,
  requested_by uuid not null,
  photo_urls text[] not null default array[]::text[],
  created_at timestamptz not null default now(),
  last_error text null
);

alter table public.property_permanent_deletion_jobs enable row level security;
revoke all on table public.property_permanent_deletion_jobs from public, anon, authenticated;
grant select, insert, update, delete on table public.property_permanent_deletion_jobs to service_role;
-- Nenhuma policy é criada: somente serviço do servidor pode ler/remover jobs.

create or replace function public.admin_permanently_delete_archived_property(
  p_property_id text,
  p_expected_updated_at timestamptz,
  p_confirmed_reference text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_actor uuid;
  v_status text;
  v_hidden boolean;
  v_updated_at timestamptz;
  v_urls text[];
  v_job_id uuid;
  v_removed integer;
begin
  v_actor := (select auth.uid());
  if v_actor is null
    or not exists (
      select 1 from public.admin_users
      where id = v_actor and active is true and role = 'super_admin'
    ) then
    raise exception 'Somente o administrador principal pode excluir definitivamente.'
      using errcode = '42501';
  end if;

  if p_property_id is null or length(p_property_id) < 3
    or p_confirmed_reference is distinct from p_property_id then
    raise exception 'A referência de confirmação não confere.'
      using errcode = '22023';
  end if;

  select status, hidden, updated_at
    into v_status, v_hidden, v_updated_at
    from public.properties
   where id = p_property_id
   for update;

  if not found then
    raise exception 'Imóvel não encontrado.' using errcode = 'P0002';
  end if;

  if v_status is distinct from 'archived' or v_hidden is distinct from true then
    raise exception 'Somente imóveis arquivados e ocultos podem ser excluídos definitivamente.'
      using errcode = 'P0001';
  end if;

  if p_expected_updated_at is null
    or v_updated_at is distinct from p_expected_updated_at then
    raise exception 'Este imóvel mudou desde que a tela foi aberta. Atualize antes de excluir.'
      using errcode = '40001';
  end if;

  select coalesce(array_agg(url order by id), array[]::text[])
    into v_urls
    from public.property_photos
   where property_id = p_property_id;

  -- Registro privado de limpeza. A aplicação só o apaga após remover os
  -- arquivos do bucket; em falha, pode processar novamente com segurança.
  insert into public.property_permanent_deletion_jobs
    (property_id, requested_by, photo_urls)
  values (p_property_id, v_actor, v_urls)
  returning id into v_job_id;

  delete from public.property_photos
   where property_id = p_property_id;

  delete from public.properties
   where id = p_property_id;
  get diagnostics v_removed = row_count;
  if v_removed <> 1 then
    raise exception 'A exclusão não foi concluída; nenhuma alteração foi confirmada.'
      using errcode = 'P0001';
  end if;

  return jsonb_build_object('deleted', true, 'job_id', v_job_id);
end;
$function$;

revoke all on function public.admin_permanently_delete_archived_property(text,timestamptz,text)
  from public, anon;
grant execute on function public.admin_permanently_delete_archived_property(text,timestamptz,text)
  to authenticated;

-- Nenhuma exclusão acontece ao executar esta migration.
