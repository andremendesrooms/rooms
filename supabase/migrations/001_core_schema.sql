-- André Mendes Rooms | baseline 001 | schema de produção seguro
-- Compatível com campos utilizados pelo site/painel; sem cópia de dados de teste.
create table if not exists public.admin_users (
 id uuid primary key references auth.users(id) on delete cascade,
 name text not null,
 email text not null unique,
 role text not null check (role in ('super_admin','manager','agent')),
 active boolean not null default true,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.landlords (
 id uuid primary key default gen_random_uuid(),
 name text not null,
 contact_phone text,
 contact_email text,
 notes text,
 staleness_alert_days integer,
 staleness_critical_days integer,
 staleness_auto_hide_days integer,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.admin_settings (
 id boolean primary key default true check (id is true),
 whatsapp_number text,
 whatsapp_message_template text default 'Olá, vi o imóvel {id} no site e gostaria de saber se ainda está disponível.',
 price_alert_warning_pct numeric not null default 35,
 price_alert_critical_pct numeric not null default 50,
 staleness_alert_days integer not null default 3,
 staleness_critical_days integer not null default 7,
 staleness_auto_hide_days integer,
 updated_at timestamptz not null default now(),
 check (price_alert_warning_pct >= 0 and price_alert_critical_pct >= price_alert_warning_pct)
);
create table if not exists public.properties (
 id text primary key,
 type text not null,
 subtype text,
 title text,
 price numeric check (price is null or price > 0),
 price_frequency text check (price_frequency in ('week','month')),
 pending_price numeric check (pending_price is null or pending_price > 0),
 pending_price_flagged_at timestamptz,
 bedrooms integer check (bedrooms is null or bedrooms >= 0),
 bathrooms integer check (bathrooms is null or bathrooms >= 0),
 occupancy text check (occupancy in ('single','couple','family')),
 postcode text,
 address text,
 unit_label text,
 region text,
 london_zone integer,
 nearest_station text,
 latitude numeric,
 longitude numeric,
 show_exact_location boolean not null default false,
 available_from date,
 minimum_stay text,
 move_in_conditions text,
 deposit numeric check (deposit is null or deposit >= 0),
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
 priority integer check (priority in (1,2,3)),
 priority_tier text,
 status text not null default 'inactive' check (status in ('available','reserved','rented','inactive','archived')),
 validation_status text not null default 'incomplete' check (validation_status in ('ok','incomplete','flagged')),
 hidden boolean not null default true,
 landlord_id uuid references public.landlords(id),
 assigned_agent uuid references public.admin_users(id),
 commission_type text,
 commission_value numeric,
 internal_notes text,
 availability_confirmed_at timestamptz,
 last_verified_by uuid references public.admin_users(id),
 staleness_alert_days integer,
 staleness_critical_days integer,
 staleness_auto_hide_days integer,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 last_sync_at timestamptz,
 constraint properties_publication_gate check (
   not (status = 'available' and hidden is false) or
   (validation_status = 'ok' and pending_price is null and
    price > 0 and postcode is not null and btrim(postcode) <> '' and
    available_from is not null and btrim(type) <> '')
 )
);
create table if not exists public.property_photos (
 id uuid primary key default gen_random_uuid(),
 property_id text not null references public.properties(id) on delete cascade,
 url text not null,
 sort_order integer not null default 0,
 created_at timestamptz not null default now(),
 unique(property_id,url)
);
create table if not exists public.price_history (
 id uuid primary key default gen_random_uuid(),
 property_id text not null references public.properties(id) on delete cascade,
 old_price numeric,
 new_price numeric,
 change_pct numeric,
 alert_level text check(alert_level in ('none','check_price','critical_price_change')),
 changed_at timestamptz not null default now()
);
create table if not exists public.status_history (
 id uuid primary key default gen_random_uuid(),
 property_id text not null references public.properties(id) on delete cascade,
 old_status text,
 new_status text,
 changed_at timestamptz not null default now()
);
create table if not exists public.change_log (
 id uuid primary key default gen_random_uuid(),
 property_id text not null references public.properties(id) on delete cascade,
 changed_by uuid references public.admin_users(id),
 field_changed text not null,
 old_value text,
 new_value text,
 change_source text not null check (change_source in ('sync','manual','photo_import')),
 changed_at timestamptz not null default now()
);
create index if not exists properties_catalog_idx on public.properties(status,hidden,validation_status,featured,created_at desc);
create index if not exists properties_postcode_idx on public.properties(postcode);
create index if not exists property_photos_property_order_idx on public.property_photos(property_id,sort_order,created_at);
-- Sem acesso anon por padrão; políticas/grants explícitos na migration 002.
alter table public.admin_users enable row level security;
alter table public.landlords enable row level security;
alter table public.admin_settings enable row level security;
alter table public.properties enable row level security;
alter table public.property_photos enable row level security;
alter table public.price_history enable row level security;
alter table public.status_history enable row level security;
alter table public.change_log enable row level security;
revoke all on public.admin_users, public.landlords, public.admin_settings,
 public.properties, public.property_photos, public.price_history,
 public.status_history, public.change_log from public, anon, authenticated;
