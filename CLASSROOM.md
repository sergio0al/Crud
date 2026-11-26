# Conectar Google Classroom

La app crea un proyecto en **Por hacer** por cada correo de Classroom de **"Nueva tarea"** que te llegue a Gmail.
Para leer tu Gmail se usa un pequeño script de Google (gratis, se ejecuta en tu cuenta de Google).

## 1. Crear el script

1. Entra en <https://script.google.com> con la cuenta de Gmail donde recibes los correos de Classroom.
2. Pulsa **Nuevo proyecto** y ponle un nombre, por ejemplo `Classroom → Proyectos`.
3. Borra lo que haya y pega todo el contenido de [`google-apps-script/Classroom.gs`](google-apps-script/Classroom.gs).
4. Cambia esta línea por una clave tuya (letras y números):
   ```js
   const TOKEN = 'cambia-esta-clave';
   ```
5. Guarda (Ctrl + S).

## 2. Dar permisos y probar

1. Arriba, en el desplegable de funciones, elige **probar** y pulsa **Ejecutar**.
2. Google pedirá permisos para leer tu Gmail: **Revisar permisos → tu cuenta → Configuración avanzada → Ir a … → Permitir**.
3. Abajo, en el **Registro de ejecución**, verás las tareas encontradas en JSON. Si sale `[]` es que no hay correos de "Nueva tarea" en los últimos 60 días.

## 3. Publicarlo como aplicación web

1. **Implementar → Nueva implementación**.
2. En el engranaje, elige **Aplicación web**.
3. **Ejecutar como:** Yo. **Quién tiene acceso:** Cualquier persona.
4. Pulsa **Implementar** y copia la URL (termina en `/exec`).
5. Añade tu clave al final:
   ```
   https://script.google.com/macros/s/XXXXXXXX/exec?token=TU_CLAVE
   ```

## 4. Conectarlo en la app

Entra en la app con tu cuenta y ve a **Integraciones → Classroom** (en móvil: **Cuenta → Google Classroom**),
pega la URL completa (con `?token=`) y pulsa **Conectar**.

La URL se envía al servidor de Supabase y se guarda en una tabla privada (`classroom_privado`) a la que la web
no tiene acceso. A partir de ahí, la Edge Function `classroom` es la única que la usa para pedir las tareas:
**el navegador nunca vuelve a recibir la URL ni el token**. Cada usuario conecta su propio Classroom.

## Cómo funciona

- La app comprueba los correos **al abrirse y cada 5 minutos**, y con el botón **Comprobar ahora**.
- Cada tarea nueva se crea con: título del correo, curso, fecha de entrega (si viene en el correo; si no, la fecha del correo),
  texto del correo como descripción y un botón **Abrir en Classroom**.
- Si la entrega es en 2 días o menos, la prioridad es **Alta**; si no, **Media**.
- Una tarea ya importada no se vuelve a crear, aunque la borres del tablero.
- Puedes seguir creando proyectos a mano con **Nuevo proyecto**.

## Si cambias el script

Después de editar `Classroom.gs` hay que publicar otra vez: **Implementar → Gestionar implementaciones → editar (lápiz) →
Versión: Nueva versión → Implementar**. La URL no cambia.

## Seguridad

- La URL con el token **solo está en el servidor** (Supabase). No aparece en el código de la web, ni en Vercel,
  ni en el navegador, ni en la base de datos accesible desde la app.
- El token sigue protegiendo el script de Google: sin él, el script no devuelve nada.
- Si crees que el token se ha filtrado, cambia el `TOKEN` en el script, publica una versión nueva y vuelve a
  conectar la URL nueva desde la app.
