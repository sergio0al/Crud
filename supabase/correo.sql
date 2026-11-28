-- =====================================================================
-- Notificaciones por correo (se envían desde el Gmail del owner con su script de Google).
-- Los avisos se apuntan en una cola al ocurrir (triggers) y cada 2 minutos la Edge Function
-- "correo" los envía agrupados: un solo correo por persona con todo lo que tenga pendiente.
-- Cada usuario elige qué le llega por correo en Configuración → Notificaciones
-- (perfiles.tema → notificaciones → correo → <tipo>; por defecto, nada).
--
-- Antes: el owner debe tener conectado Classroom con la versión del script que incluye doPost.
-- Pegar en Supabase → SQL Editor → Run. Se puede ejecutar más de una vez.
-- =====================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- ---------- Configuración privada (solo la ve el servidor) ----------
create table if not exists public.correo_config (
  clave text primary key,
  valor text not null
);
alter table public.correo_config enable row level security;
revoke all on public.correo_config from anon, authenticated;
-- Secreto que comparten la tarea programada y la Edge Function
insert into public.correo_config (clave, valor)
values ('secreto', replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''))
on conflict (clave) do nothing;

-- ---------- Cola de correos ----------
create table if not exists public.correos_pendientes (
  id           uuid primary key default gen_random_uuid(),
  destinatario uuid not null references auth.users (id) on delete cascade,
  tipo         text not null,
  proyecto_id  uuid references public.proyectos (id) on delete cascade,
  texto        text not null,
  creado       timestamptz not null default now(),
  enviado_en   timestamptz,
  intentos     integer not null default 0,
  error        text
);
create index if not exists correos_pendientes_cola_idx on public.correos_pendientes (creado) where enviado_en is null;
alter table public.correos_pendientes enable row level security;
revoke all on public.correos_pendientes from anon, authenticated;

-- ---------- Ayudas ----------
-- Apunta un correo solo si esa persona quiere ese tipo de aviso por correo
create or replace function public.encolar_correo(destinatario uuid, tipo text, proyecto uuid, texto text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if destinatario is null then return; end if;
  if coalesce((select (tema -> 'notificaciones' -> 'correo' ->> tipo)::boolean from perfiles where id = destinatario), false) then
    insert into correos_pendientes (destinatario, tipo, proyecto_id, texto) values (destinatario, tipo, proyecto, texto);
  end if;
end;
$$;

-- Quién se entera de lo que pasa en una tarea: su dueño o los miembros de su tabla
create or replace function public.interesados(p public.proyectos)
returns setof uuid language sql stable security definer set search_path = public as $$
  select p.user_id where p.tablero_id is null
  union
  select m.user_id from tablero_miembros m where p.tablero_id is not null and m.tablero_id = p.tablero_id;
$$;

create or replace function public.nombre_de(u uuid)
returns text language sql stable security definer set search_path = public as $$
  select coalesce(nullif((select nombre from perfiles where id = u), ''), 'Alguien');
$$;

create or replace function public.nombre_estado(e text)
returns text language sql immutable as $$
  select case e when 'por_hacer' then 'Por hacer' when 'en_curso' then 'En curso' when 'en_revision' then 'En revisión'
                when 'pruebas' then 'Pruebas' when 'hecho' then 'Hecho' else e end;
$$;

-- ---------- Triggers ----------
-- Tarea nueva: de Classroom/Moodle (para su dueño) o en una tabla compartida (para los demás miembros)
create or replace function public.correo_tarea_nueva()
returns trigger language plpgsql security definer set search_path = public as $$
declare u uuid; tabla text;
begin
  if new.tablero_id is not null then
    select nombre into tabla from tableros where id = new.tablero_id;
    for u in select public.interesados(new) loop
      if u is distinct from auth.uid() then
        perform encolar_correo(u, 'tablas', new.id, nombre_de(auth.uid()) || ' creó una tarea en ' || coalesce(tabla, 'una tabla compartida'));
      end if;
    end loop;
  elsif new.origen ->> 'tipo' in ('classroom', 'moodle') then
    perform encolar_correo(new.user_id, new.origen ->> 'tipo',
      new.id, 'Nueva tarea de ' || case new.origen ->> 'tipo' when 'classroom' then 'Classroom' else 'Moodle' end);
  end if;
  return new;
end;
$$;
drop trigger if exists correo_tarea_nueva on public.proyectos;
create trigger correo_tarea_nueva after insert on public.proyectos
  for each row execute function public.correo_tarea_nueva();

-- Te asignan una tarea
create or replace function public.correo_asignacion()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.asignado is not null and new.asignado is distinct from old.asignado and new.asignado is distinct from auth.uid() then
    perform encolar_correo(new.asignado, 'asignaciones', new.id, nombre_de(auth.uid()) || ' te asignó esta tarea');
  end if;
  return new;
end;
$$;
drop trigger if exists correo_asignacion on public.proyectos;
create trigger correo_asignacion after update of asignado on public.proyectos
  for each row execute function public.correo_asignacion();

-- Cambio de estado (necesita actividad.sql)
create or replace function public.correo_cambio_estado()
returns trigger language plpgsql security definer set search_path = public as $$
declare p proyectos; u uuid;
begin
  select * into p from proyectos where id = new.proyecto_id;
  if not found then return new; end if;
  for u in select public.interesados(p) loop
    if u is distinct from new.user_id then
      perform encolar_correo(u, 'estados', p.id,
        case when new.user_id is null then 'Pasó sola a ' else nombre_de(new.user_id) || ' la movió a ' end || nombre_estado(new.a));
    end if;
  end loop;
  return new;
end;
$$;
drop trigger if exists correo_cambio_estado on public.cambios_estado;
create trigger correo_cambio_estado after insert on public.cambios_estado
  for each row execute function public.correo_cambio_estado();

-- Comentario de otra persona
create or replace function public.correo_comentario()
returns trigger language plpgsql security definer set search_path = public as $$
declare p proyectos; u uuid;
begin
  select * into p from proyectos where id = new.proyecto_id;
  if not found then return new; end if;
  for u in select public.interesados(p) loop
    if u is distinct from new.user_id then
      perform encolar_correo(u, 'comentarios', p.id, nombre_de(new.user_id) || ' comentó: «' || left(new.texto, 160) || '»');
    end if;
  end loop;
  return new;
end;
$$;
drop trigger if exists correo_comentario on public.comentarios;
create trigger correo_comentario after insert on public.comentarios
  for each row execute function public.correo_comentario();

-- Entregas de hoy y mañana (lo llama la tarea programada de cada mañana)
create or replace function public.encolar_entregas()
returns void language plpgsql security definer set search_path = public as $$
declare p proyectos; u uuid; hoy date := (now() at time zone 'Europe/Madrid')::date;
begin
  for p in select * from proyectos where estado <> 'hecho' and fecha in (hoy, hoy + 1) loop
    for u in select public.interesados(p) loop
      perform encolar_correo(u, 'entregas', p.id, case when p.fecha = hoy then 'Se entrega hoy' else 'Se entrega mañana' end);
    end loop;
  end loop;
end;
$$;

revoke all on function public.encolar_correo(uuid, text, uuid, text), public.interesados(public.proyectos),
  public.encolar_entregas() from anon, authenticated;

-- ---------- Tareas programadas ----------
-- Cada 2 minutos: enviar lo pendiente (la Edge Function comprueba el secreto)
do $$
begin
  perform cron.unschedule('enviar-correos') where exists (select 1 from cron.job where jobname = 'enviar-correos');
  perform cron.unschedule('entregas-del-dia') where exists (select 1 from cron.job where jobname = 'entregas-del-dia');
end $$;

select cron.schedule('enviar-correos', '*/2 * * * *', $cron$
  select net.http_post(
    url := 'https://yrjzdawpehngqrbfjyep.supabase.co/functions/v1/correo',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object('accion', 'enviar', 'secreto', (select valor from public.correo_config where clave = 'secreto'))
  )
  where exists (select 1 from public.correos_pendientes where enviado_en is null and intentos < 3);
$cron$);

-- Cada día a las 7:00 (hora UTC; 8:00 en España en invierno): avisos de entregas
select cron.schedule('entregas-del-dia', '0 7 * * *', $cron$ select public.encolar_entregas(); $cron$);

-- Limpieza: los correos enviados hace más de 30 días se borran
delete from public.correos_pendientes where enviado_en < now() - interval '30 days';
