-- André Mendes Rooms | migração 008
-- Retira a view SECURITY DEFINER e cria um catálogo público de dados mínimos,
-- atualizado exclusivamente por trigger interno em imóveis aprovados.
-- Não adiciona imóveis nem altera o banco de testes.

-- O acesso ao papel administrativo é resolvido fora do schema exposto na API.
create or replace function app_private.current_admin_role()
returns text language sql stable security definer set search_path = ''
as $$
 select a.role from public.admin_users a
 where a.id = (select auth.uid()) and a.active = true limit 1;
$$;
revoke all on function app_private.current_admin_role() from public,anon,authenticated;
grant usage on schema app_private to authenticated;
grant execute on function app_private.current_admin_role() to authenticated;
create or replace function public.current_admin_role()
returns text language sql stable security invoker set search_path = ''
as $$
 select app_private.current_admin_role();
$$;
revoke all on function public.current_admin_role() from public,anon,authenticated;
grant execute on function public.current_admin_role() to authenticated;

-- Substituir view privilegiada por tabela pública de somente leitura.
drop policy photos_select_public_or_admin on public.property_photos;
drop view public.properties_public;

create table public.properties_public (
 id text primary key references public.properties(id) on delete cascade,
 type text not null,
 subtype text,
 title text,
 price numeric,
 price_frequency text,
 bedrooms integer,
 bathrooms integer,
 occupancy text,
 postcode text,
 region text,
 london_zone integer,
 nearest_station text,
 available_from date,
 minimum_stay text,
 move_in_conditions text,
 deposit numeric,
 bills_included boolean,
 furnished boolean,
 garden boolean,
 balcony boolean,
 parking boolean,
 gym boolean,
 concierge boolean,
 lift boolean,
 description text,
 featured boolean not null default false,
 status text not null,
 created_at timestamptz not null,
 updated_at timestamptz not null
);
alter table public.properties_public enable row level security;
revoke all on public.properties_public from public,anon,authenticated;
grant select on public.properties_public to anon,authenticated;
create policy public_catalog_read_only on public.properties_public
for select to anon,authenticated using (true);
create index properties_public_search_idx
 on public.properties_public(status,type,region,featured,created_at desc);

create policy photos_select_public_or_admin on public.property_photos
for select to anon,authenticated using (
 property_id in (select id from public.properties_public)
 or ((select public.current_admin_role()) in ('super_admin','manager'))
);

-- O trigger é a única rotina que pode gravar na tabela de catálogo.
create or replace function app_private.sync_public_property()
returns trigger language plpgsql security definer set search_path=''
as $$
declare
 v_id text;
begin
 if tg_op = 'DELETE' then
   delete from public.properties_public where id=old.id;
   return old;
 end if;
 if tg_op = 'UPDATE' and old.id is distinct from new.id then
   delete from public.properties_public where id=old.id;
 end if;
 v_id := new.id;
 delete from public.properties_public where id=v_id;
 if new.status='available' and new.hidden=false
    and new.validation_status='ok' and new.pending_price is null
    and new.price is not null and new.price>0
    and new.available_from is not null then
   insert into public.properties_public (
    id,type,subtype,title,price,price_frequency,bedrooms,bathrooms,occupancy,
    postcode,region,london_zone,nearest_station,available_from,minimum_stay,
    move_in_conditions,deposit,bills_included,furnished,garden,balcony,
    parking,gym,concierge,lift,description,featured,status,created_at,updated_at
   ) values (
    new.id,new.type,new.subtype,new.title,new.price,new.price_frequency,
    new.bedrooms,new.bathrooms,new.occupancy,
    case when new.show_exact_location then new.postcode
         else split_part(new.postcode,' ',1) end,
    new.region,new.london_zone,new.nearest_station,new.available_from,
    new.minimum_stay,new.move_in_conditions,new.deposit,new.bills_included,
    new.furnished,new.garden,new.balcony,new.parking,new.gym,new.concierge,
    new.lift,new.description,new.featured,new.status,new.created_at,new.updated_at
   );
 end if;
 return new;
end;
$$;
revoke all on function app_private.sync_public_property() from public,anon,authenticated;
create trigger trg_properties_60_sync_public
after insert or update or delete on public.properties
for each row execute function app_private.sync_public_property();

-- A única sincronização histórica possível neste momento não movimenta dados,
-- já que o banco não contém registros. Declarada para upgrades futuros.
insert into public.properties_public (
 id,type,subtype,title,price,price_frequency,bedrooms,bathrooms,occupancy,
 postcode,region,london_zone,nearest_station,available_from,minimum_stay,
 move_in_conditions,deposit,bills_included,furnished,garden,balcony,
 parking,gym,concierge,lift,description,featured,status,created_at,updated_at
)
select id,type,subtype,title,price,price_frequency,bedrooms,bathrooms,occupancy,
 case when show_exact_location then postcode else split_part(postcode,' ',1) end,
 region,london_zone,nearest_station,available_from,minimum_stay,
 move_in_conditions,deposit,bills_included,furnished,garden,balcony,
 parking,gym,concierge,lift,description,featured,status,created_at,updated_at
from public.properties
where status='available' and hidden=false and validation_status='ok'
 and pending_price is null and price>0 and available_from is not null;

notify pgrst, 'reload schema';
