-- André Mendes Rooms | baseline 003 | auditoria de preço/status e updated_at.
-- Funções privilegiadas em schema não exposto; nunca em rotas de usuário.
create schema if not exists app_private;
revoke all on schema app_private from public,anon,authenticated;

create or replace function app_private.set_updated_at()
returns trigger language plpgsql set search_path=''
as $$
begin
 new.updated_at := now();
 return new;
end;
$$;

create or replace function app_private.record_price_update()
returns trigger language plpgsql security definer set search_path=''
as $$
declare
 warn numeric;
 critical numeric;
 change_pct numeric;
 level text := 'none';
 requested_price numeric;
begin
 if new.price is distinct from old.price then
   select coalesce(s.price_alert_warning_pct,35),
          coalesce(s.price_alert_critical_pct,50)
   into warn,critical
   from public.admin_settings s where s.id = true;
   warn := coalesce(warn,35); critical := coalesce(critical,50);
   requested_price := new.price;
   if old.price is not null and old.price > 0 and new.price is not null then
     change_pct := abs(new.price-old.price)/old.price * 100;
   end if;
   if change_pct is not null and change_pct >= critical then
      level := 'critical_price_change';
      new.pending_price := requested_price;
      new.pending_price_flagged_at := now();
      new.price := old.price;
      new.hidden := true;
      new.validation_status := 'flagged';
   elsif change_pct is not null and change_pct >= warn then
      level := 'check_price';
   end if;
   insert into public.price_history(property_id,old_price,new_price,change_pct,alert_level)
   values (new.id,old.price,requested_price,change_pct,level);
 end if;
 return new;
end;
$$;

create or replace function app_private.record_status_update()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
 if new.status is distinct from old.status then
  insert into public.status_history(property_id,old_status,new_status)
  values(new.id,old.status,new.status);
 end if;
 return new;
end;
$$;

create or replace function app_private.record_property_change()
returns trigger language plpgsql security definer set search_path=''
as $$
declare
 f text;
 old_val text;
 new_val text;
 source text;
begin
 source := case when (select auth.uid()) is null then 'sync' else 'manual' end;
 foreach f in array array[
   'price','status','available_from','featured','priority','landlord_id',
   'assigned_agent','commission_type','commission_value','hidden',
   'validation_status','pending_price'
 ] loop
   old_val := to_jsonb(old)->>f;
   new_val := to_jsonb(new)->>f;
   if old_val is distinct from new_val then
      insert into public.change_log(property_id,changed_by,field_changed,old_value,new_value,change_source)
      values (new.id,(select auth.uid()),f,old_val,new_val,source);
   end if;
 end loop;
 return new;
end;
$$;

create or replace function app_private.stamp_availability_confirmation()
returns trigger language plpgsql set search_path=''
as $$
begin
 if new.availability_confirmed_at is distinct from old.availability_confirmed_at
    and new.availability_confirmed_at is not null then
   new.last_verified_by := (select auth.uid());
 end if;
 return new;
end;
$$;

create trigger trg_admin_users_updated_at
before update on public.admin_users for each row
execute function app_private.set_updated_at();
create trigger trg_landlords_updated_at
before update on public.landlords for each row
execute function app_private.set_updated_at();
create trigger trg_properties_10_price
before update on public.properties for each row
execute function app_private.record_price_update();
create trigger trg_properties_20_stamp
before update on public.properties for each row
execute function app_private.stamp_availability_confirmation();
create trigger trg_properties_30_updated
before update on public.properties for each row
execute function app_private.set_updated_at();
create trigger trg_properties_40_changes
after update on public.properties for each row
execute function app_private.record_property_change();
create trigger trg_properties_50_status
after update on public.properties for each row
execute function app_private.record_status_update();
