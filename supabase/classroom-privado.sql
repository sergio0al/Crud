-- =====================================================================
-- URL de Classroom (con su token) guardada SOLO en el servidor.
-- La tabla tiene RLS activado y ninguna política: desde la web no se puede leer ni escribir.
-- Solo la Edge Function "classroom" (con la clave de servicio) accede a ella.
-- =====================================================================

create table if not exists public.classroom_privado (
  user_id uuid primary key references auth.users (id) on delete cascade,
  url     text not null,
  creado  timestamptz not null default now()
);
alter table public.classroom_privado enable row level security;
revoke all on public.classroom_privado from anon, authenticated;

-- Mover las URLs que hubiera en los perfiles y quitar esa columna (era visible desde la web)
insert into public.classroom_privado (user_id, url)
select id, classroom_url from public.perfiles where classroom_url is not null
on conflict (user_id) do nothing;

alter table public.perfiles drop column if exists classroom_url;

revoke update on public.perfiles from authenticated, anon;
grant update (nombre, tema) on public.perfiles to authenticated;
