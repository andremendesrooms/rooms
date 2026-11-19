-- André Mendes Rooms | migração 009
-- Índices de referências internas identificadas pelo advisor Supabase.
create index if not exists properties_landlord_id_idx
 on public.properties (landlord_id);
create index if not exists properties_assigned_agent_idx
 on public.properties (assigned_agent);
create index if not exists properties_last_verified_by_idx
 on public.properties (last_verified_by);
create index if not exists price_history_property_id_idx
 on public.price_history (property_id);
create index if not exists status_history_property_id_idx
 on public.status_history (property_id);
create index if not exists change_log_property_id_idx
 on public.change_log (property_id);
create index if not exists change_log_changed_by_idx
 on public.change_log (changed_by);
