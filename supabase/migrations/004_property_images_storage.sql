-- André Mendes Rooms — upload de fotografias por imóvel
-- Aplicar uma única vez no Supabase SQL Editor. Idempotente.
-- Este script NÃO altera properties, status, preço, acesso público ou registros existentes.
-- Fotos ficam em bucket público para que o catálogo Next.js possa exibi-las;
-- qualquer pessoa que conheça a URL completa de uma foto consegue acessá-la.
-- Nunca carregar documentos pessoais ou fotos confidenciais neste bucket.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'property-images',
  'property-images',
  true,
  10485760,
  array['image/jpeg','image/png','image/webp']::text[]
)
on conflict (id) do nothing;

-- Não mudar um bucket existente silenciosamente: confirmar que é público.
do $$
begin
  if not exists (
    select 1 from storage.buckets
    where id = 'property-images' and public = true
  ) then
    raise exception 'Bucket property-images já existe, mas não é público. Revise a configuração antes de continuar.';
  end if;
end
$$;

-- Admins e gerentes podem criar fotos; agents e visitantes não podem enviar.
-- Caminho obrigatório: properties/<property_id>/<uuid>.<extension>
-- Não há políticas de UPDATE/DELETE: evita sobrescrita/exclusão acidental.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'amr_property_images_insert_v1'
  ) then
    create policy amr_property_images_insert_v1
      on storage.objects
      for insert to authenticated
      with check (
        bucket_id = 'property-images'
        and (select public.current_admin_role()) in ('super_admin', 'manager')
        and (storage.foldername(name))[1] = 'properties'
        and array_length(storage.foldername(name), 1) = 2
        and lower(storage.extension(name)) in ('jpg','jpeg','png','webp')
        and exists (
          select 1
          from public.properties p
          where p.id = (storage.foldername(name))[2]
        )
      );
  end if;
end
$$;

-- Conferência sem alterar registros.
select id, public, file_size_limit, allowed_mime_types
from storage.buckets
where id = 'property-images';
