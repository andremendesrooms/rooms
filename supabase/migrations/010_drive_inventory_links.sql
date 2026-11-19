-- André Mendes Rooms | 010 | Índice privado entre inventário e Google Drive.
-- Metadados e referências somente. Nenhuma foto é publicada ou transferida.
create table if not exists public.inventory_source_records (
 source_id text not null,
 row_number integer not null check (row_number >= 0),
 snapshot_date date not null,
 landlord_name text not null,
 postcode text not null,
 unit_label text,
 property_type text,
 price_text text,
 availability_text text,
 source_payload jsonb not null,
 created_at timestamptz not null default now(),
 primary key (source_id,row_number)
);
create table if not exists public.drive_media_folders (
 folder_id text primary key,
 source_id text not null,
 source_row_number integer,
 landlord_name text,
 postcode text,
 unit_label text,
 drive_path text not null,
 image_count integer not null default 0 check (image_count >= 0),
 match_status text not null default 'needs_review'
   check (match_status in ('exact','postcode_only','ambiguous','no_inventory_match','needs_review')),
 linked_property_id text references public.properties(id) on delete set null,
 last_checked_at timestamptz not null default now(),
 constraint drive_media_folders_inventory_fkey
   foreign key(source_id,source_row_number)
   references public.inventory_source_records(source_id,row_number)
);
create table if not exists public.drive_media_files (
 drive_file_id text primary key,
 folder_id text not null references public.drive_media_folders(folder_id) on delete cascade,
 original_filename text not null,
 mime_type text not null,
 transfer_status text not null default 'pending'
   check (transfer_status in ('pending','uploaded','review','failed')),
 storage_path text,
 listed_at timestamptz not null default now()
);
create index if not exists drive_media_folders_record_idx
 on public.drive_media_folders(source_id,source_row_number);
create index if not exists drive_media_folders_status_idx
 on public.drive_media_folders(match_status);
create index if not exists drive_media_files_folder_idx
 on public.drive_media_files(folder_id,transfer_status);
alter table public.inventory_source_records enable row level security;
alter table public.drive_media_folders enable row level security;
alter table public.drive_media_files enable row level security;
revoke all on public.inventory_source_records, public.drive_media_folders,
 public.drive_media_files from public, anon, authenticated;
grant select,insert,update on public.inventory_source_records,
 public.drive_media_folders,public.drive_media_files to authenticated;
create policy inventory_source_records_admin_select
 on public.inventory_source_records for select to authenticated
 using ((select public.current_admin_role()) in ('super_admin','manager'));
create policy inventory_source_records_admin_insert
 on public.inventory_source_records for insert to authenticated
 with check ((select public.current_admin_role()) in ('super_admin','manager'));
create policy inventory_source_records_admin_update
 on public.inventory_source_records for update to authenticated
 using ((select public.current_admin_role()) in ('super_admin','manager'))
 with check ((select public.current_admin_role()) in ('super_admin','manager'));
create policy drive_media_folders_admin_select
 on public.drive_media_folders for select to authenticated
 using ((select public.current_admin_role()) in ('super_admin','manager'));
create policy drive_media_folders_admin_insert
 on public.drive_media_folders for insert to authenticated
 with check ((select public.current_admin_role()) in ('super_admin','manager'));
create policy drive_media_folders_admin_update
 on public.drive_media_folders for update to authenticated
 using ((select public.current_admin_role()) in ('super_admin','manager'))
 with check ((select public.current_admin_role()) in ('super_admin','manager'));
create policy drive_media_files_admin_select
 on public.drive_media_files for select to authenticated
 using ((select public.current_admin_role()) in ('super_admin','manager'));
create policy drive_media_files_admin_insert
 on public.drive_media_files for insert to authenticated
 with check ((select public.current_admin_role()) in ('super_admin','manager'));
create policy drive_media_files_admin_update
 on public.drive_media_files for update to authenticated
 using ((select public.current_admin_role()) in ('super_admin','manager'))
 with check ((select public.current_admin_role()) in ('super_admin','manager'));
