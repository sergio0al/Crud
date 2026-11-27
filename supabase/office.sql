-- =====================================================================
-- Documentos de Word (Office 365 / OneDrive) para cada tarea.
-- Pegar en Supabase → SQL Editor → Run. Se puede ejecutar más de una vez.
-- =====================================================================

-- Enlace del documento de Word de la tarea (además del de Google)
alter table public.proyectos add column if not exists documento_word text
  check (documento_word is null or documento_word like 'https://%');

-- Conexión con Microsoft de cada usuario. Guarda el refresh token: SOLO en el servidor.
-- RLS activado y sin políticas: desde la web no se puede leer ni escribir.
-- Solo la Edge Function "microsoft" (con la clave de servicio) accede a ella.
create table if not exists public.microsoft_privado (
  user_id       uuid primary key references auth.users (id) on delete cascade,
  refresh_token text not null,
  cuenta        text not null default '',
  creado        timestamptz not null default now()
);
alter table public.microsoft_privado enable row level security;
revoke all on public.microsoft_privado from anon, authenticated;

-- Inicios de sesión con Microsoft en curso (el "state" de OAuth, caduca a los 10 minutos)
create table if not exists public.microsoft_estados (
  estado  text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  volver  text not null,
  creado  timestamptz not null default now()
);
alter table public.microsoft_estados enable row level security;
revoke all on public.microsoft_estados from anon, authenticated;
