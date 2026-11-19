-- André Mendes Rooms — Migration 005
-- Corrige erro 42501: permission denied for view properties_public
-- no painel de fotos, autenticado via Supabase Auth.
-- A policy photos_select_public consulta properties_public; a migration 003
-- concedeu SELECT em property_photos para authenticated mas não nessa view.
-- properties_public já é a view do catálogo público; não contém campos internos.
-- Esta migração NÃO altera dados, RLS, status nem torna rascunhos públicos.

grant select on public.properties_public to authenticated;

-- Esperado: true
select has_table_privilege('authenticated', 'public.properties_public', 'SELECT')
  as authenticated_can_read_public_catalog;
