-- =====================================================================
-- Moodle: enlace del calendario (con su authtoken) guardado SOLO en el servidor.
-- Ninguna de estas tablas tiene políticas RLS: desde la web no se pueden leer ni escribir.
-- Solo la Edge Function "moodle" (con la clave de servicio) accede a ellas.
-- =====================================================================

create table if not exists public.moodle_privado (
  user_id uuid primary key references auth.users (id) on delete cascade,
  url     text not null,
  creado  timestamptz not null default now()
);
alter table public.moodle_privado enable row level security;
revoke all on public.moodle_privado from anon, authenticated;

-- Eventos de Moodle ya importados (para no duplicar aunque se borre la tarea)
create table if not exists public.moodle_importados (
  user_id uuid not null references auth.users (id) on delete cascade,
  uid     text not null,
  primary key (user_id, uid)
);
alter table public.moodle_importados enable row level security;
revoke all on public.moodle_importados from anon, authenticated;
