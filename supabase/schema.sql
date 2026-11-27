-- =====================================================================
-- Gestión de proyectos · esquema de Supabase
-- Cada usuario ve SOLO su tablero. El owner (hola@alonso.com) gestiona cuentas.
-- Pegar entero en Supabase → SQL Editor → Run.
-- =====================================================================

-- ---------- Perfiles (1 por usuario de Auth) ----------
create table if not exists public.perfiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  email         text not null,
  nombre        text not null default '',
  rol           text not null default 'usuario' check (rol in ('owner', 'usuario')),
  tema          jsonb,
  creado        timestamptz not null default now()
);

-- ---------- Proyectos ----------
create table if not exists public.proyectos (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  numero      integer not null,
  titulo      text not null check (length(trim(titulo)) > 0),
  descripcion text not null default '',
  fecha       date not null,
  estado      text not null default 'por_hacer'
              check (estado in ('por_hacer', 'en_curso', 'en_revision', 'pruebas', 'hecho')),
  prioridad   text not null default 'media' check (prioridad in ('baja', 'media', 'alta')),
  origen      jsonb,
  creado      timestamptz not null default now(),
  actualizado timestamptz
);
create index if not exists proyectos_user_idx on public.proyectos (user_id);

-- ---------- Comentarios ----------
create table if not exists public.comentarios (
  id          uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null references public.proyectos (id) on delete cascade,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  texto       text not null check (length(trim(texto)) > 0),
  creado      timestamptz not null default now()
);
create index if not exists comentarios_proyecto_idx on public.comentarios (proyecto_id);

-- ---------- Correos de Classroom ya importados (para no duplicar) ----------
create table if not exists public.classroom_importados (
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  mensaje_id text not null,
  primary key (user_id, mensaje_id)
);

-- ---------- ¿El usuario actual es owner? ----------
create or replace function public.es_owner()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from perfiles where id = auth.uid() and rol = 'owner');
$$;

-- ---------- Crear el perfil automáticamente al crear un usuario ----------
create or replace function public.crear_perfil()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into perfiles (id, email, nombre, rol)
  values (
    new.id,
    new.email,
    coalesce(nullif(new.raw_user_meta_data ->> 'nombre', ''), split_part(new.email, '@', 1)),
    case when lower(new.email) = 'hola@alonso.com' then 'owner' else 'usuario' end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists al_crear_usuario on auth.users;
create trigger al_crear_usuario
  after insert on auth.users
  for each row execute function public.crear_perfil();

-- =====================================================================
-- Seguridad (RLS)
-- =====================================================================
alter table public.perfiles             enable row level security;
alter table public.proyectos            enable row level security;
alter table public.comentarios          enable row level security;
alter table public.classroom_importados enable row level security;

-- Perfiles: cada uno ve el suyo; el owner ve todos (para la página Usuarios)
drop policy if exists "ver perfil" on public.perfiles;
create policy "ver perfil" on public.perfiles
  for select to authenticated
  using (id = auth.uid() or public.es_owner());

drop policy if exists "editar mi perfil" on public.perfiles;
create policy "editar mi perfil" on public.perfiles
  for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- Nadie puede cambiarse el rol ni el correo desde la app: solo estas columnas
revoke update on public.perfiles from authenticated, anon;
grant update (nombre, tema) on public.perfiles to authenticated;

-- Proyectos: solo los propios (tablero privado)
drop policy if exists "mis proyectos" on public.proyectos;
create policy "mis proyectos" on public.proyectos
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Comentarios: solo en mis proyectos
drop policy if exists "mis comentarios" on public.comentarios;
create policy "mis comentarios" on public.comentarios
  for all to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.proyectos p where p.id = proyecto_id and p.user_id = auth.uid())
  );

-- Importados de Classroom: solo los propios
drop policy if exists "mis importados" on public.classroom_importados;
create policy "mis importados" on public.classroom_importados
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

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
