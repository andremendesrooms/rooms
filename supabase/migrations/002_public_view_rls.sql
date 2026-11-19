-- André Mendes Rooms | baseline 002 | Auth, autorização e catálogo público.
-- Acesso de produção exige usuário no Supabase Auth + registro admin_users ativo.
create or replace function public.current_admin_role()
returns text language sql stable security definer set search_path = ''
as $$
 select au.role from public.admin_users au
 where au.id = (select auth.uid()) and au.active = true
 limit 1;
$$;
revoke all on function public.current_admin_role() from public, anon, authenticated;
grant execute on function public.current_admin_role() to authenticated;

-- Página pública só recebe colunas permitidas e imóveis confirmados.
-- security_barrier evita reordenação perigosa de predicados; a view, controlada
-- pelo proprietário do banco, lê a tabela privada sob filtros estritos.
-- Nunca substituir por SELECT * nem conceder acesso público à base properties.
create or replace view public.properties_public with (security_barrier = true) as
select
 p.id,p.type,p.subtype,p.title,p.price,p.price_frequency,
 p.bedrooms,p.bathrooms,p.occupancy,
 case when p.show_exact_location then p.postcode else split_part(p.postcode,' ',1) end as postcode,
 p.region,p.london_zone,p.nearest_station,p.available_from,
 p.minimum_stay,p.move_in_conditions,p.deposit,
 p.bills_included,p.furnished,p.garden,p.balcony,p.parking,p.gym,
 p.concierge,p.lift,p.description,p.featured,p.status,p.created_at,p.updated_at
from public.properties p
where p.status = 'available' and p.hidden is false
  and p.validation_status = 'ok'
  and p.pending_price is null
  and p.price > 0 and p.available_from is not null;
revoke all on public.properties_public from public,anon,authenticated;
grant select on public.properties_public to anon,authenticated;

grant select on public.admin_users to authenticated;
grant insert,update,delete on public.admin_users to authenticated;
create policy admin_users_self_select on public.admin_users
for select to authenticated
using (id = (select auth.uid()) or (select public.current_admin_role()) in ('super_admin','manager'));
create policy admin_users_super_admin_insert on public.admin_users
for insert to authenticated with check ((select public.current_admin_role()) = 'super_admin');
create policy admin_users_super_admin_update on public.admin_users
for update to authenticated
using ((select public.current_admin_role()) = 'super_admin')
with check ((select public.current_admin_role()) = 'super_admin');
create policy admin_users_super_admin_delete on public.admin_users
for delete to authenticated using ((select public.current_admin_role()) = 'super_admin');

grant select,insert,update on public.properties to authenticated;
create policy properties_select_admin on public.properties
for select to authenticated using (
 (select public.current_admin_role()) in ('super_admin','manager')
 or ((select public.current_admin_role()) = 'agent' and assigned_agent = (select auth.uid()))
);
create policy properties_insert_admin on public.properties
for insert to authenticated with check ((select public.current_admin_role()) in ('super_admin','manager'));
create policy properties_update_admin on public.properties
for update to authenticated
using ((select public.current_admin_role()) in ('super_admin','manager'))
with check ((select public.current_admin_role()) in ('super_admin','manager'));

grant select on public.property_photos to anon,authenticated;
grant insert,update,delete on public.property_photos to authenticated;
create policy photos_select_public_or_admin on public.property_photos
for select to anon,authenticated using (
 property_id in (select id from public.properties_public)
 or ((select public.current_admin_role()) in ('super_admin','manager'))
);
create policy photos_insert_admin on public.property_photos for insert to authenticated
with check ((select public.current_admin_role()) in ('super_admin','manager'));
create policy photos_update_admin on public.property_photos for update to authenticated
using ((select public.current_admin_role()) in ('super_admin','manager'))
with check ((select public.current_admin_role()) in ('super_admin','manager'));
create policy photos_delete_admin on public.property_photos for delete to authenticated
using ((select public.current_admin_role()) in ('super_admin','manager'));

-- Dados comerciais internos: nenhum acesso de visitante ou de agente.
grant select,insert,update on public.landlords,public.admin_settings to authenticated;
create policy landlords_read_internal on public.landlords for select to authenticated
using ((select public.current_admin_role()) in ('super_admin','manager'));
create policy landlords_insert_internal on public.landlords for insert to authenticated
with check ((select public.current_admin_role()) in ('super_admin','manager'));
create policy landlords_update_internal on public.landlords for update to authenticated
using ((select public.current_admin_role()) in ('super_admin','manager'))
with check ((select public.current_admin_role()) in ('super_admin','manager'));
create policy admin_settings_read_internal on public.admin_settings for select to authenticated
using ((select public.current_admin_role()) in ('super_admin','manager'));
create policy admin_settings_insert_internal on public.admin_settings for insert to authenticated
with check ((select public.current_admin_role()) = 'super_admin');
create policy admin_settings_update_internal on public.admin_settings for update to authenticated
using ((select public.current_admin_role()) = 'super_admin')
with check ((select public.current_admin_role()) = 'super_admin');

grant select on public.price_history,public.status_history,public.change_log to authenticated;
create policy price_history_read_internal on public.price_history for select to authenticated
using ((select public.current_admin_role()) in ('super_admin','manager'));
create policy status_history_read_internal on public.status_history for select to authenticated
using ((select public.current_admin_role()) in ('super_admin','manager'));
create policy change_log_read_internal on public.change_log for select to authenticated
using ((select public.current_admin_role()) in ('super_admin','manager'));
