-- André Mendes Rooms — Migration 006: ambiente de cada fotografia
-- Opcional para corrigir casos em que o agrupamento gratuito por similaridade
-- visual não identifica que fotos diferentes são do mesmo cômodo.
-- Não altera registros existentes, disponibilidade, fotos ou publicação.
-- RLS existente em property_photos continua responsável pela autorização.

alter table public.property_photos
  add column if not exists room_group text;

-- Restringe tamanho das etiquetas sem impedir os valores nulos existentes.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'property_photos_room_group_length'
      and conrelid = 'public.property_photos'::regclass
  ) then
    alter table public.property_photos
      add constraint property_photos_room_group_length
      check (room_group is null or char_length(room_group) between 1 and 60);
  end if;
end
$$;

-- Confirma a coluna sem consultar dados particulares.
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'property_photos'
  and column_name = 'room_group';
