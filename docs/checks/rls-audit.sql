-- Inspeção SOMENTE LEITURA para homologação. Não executada por esta entrega.
-- Revisar os resultados com o responsável pelo Supabase antes de qualquer lançamento.
select schemaname, viewname, definition
from pg_views
where schemaname = 'public' and viewname = 'properties_public';

select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('properties', 'property_photos', 'admin_users', 'audit_log');

select n.nspname, c.relname, c.relrowsecurity, c.relforcerowsecurity
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname in ('properties', 'property_photos', 'admin_users');

select event_object_table, trigger_name, action_timing, event_manipulation, action_statement
from information_schema.triggers
where event_object_schema = 'public' and event_object_table in ('properties', 'property_photos');
