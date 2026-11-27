-- =====================================================================
-- Documento de Google de cada tarea (se crea desde el panel de la tarea).
-- Pegar en Supabase → SQL Editor → Run. Se puede ejecutar más de una vez.
-- =====================================================================

alter table public.proyectos add column if not exists documento text
  check (documento is null or documento like 'https://docs.google.com/%');
