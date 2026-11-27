/**
 * Lee los correos de Google Classroom de "Nueva tarea" de tu Gmail
 * y los devuelve en JSON para que la app los convierta en proyectos.
 * También mira en Classroom qué tareas has entregado, para pasarlas a Hecho.
 *
 * Instrucciones completas en CLASSROOM.md (raíz del proyecto).
 */

// ⚠️ Cambia esta clave por una tuya (letras y números, sin espacios).
// La misma clave irá al final de la URL: ...?token=TU_CLAVE
const TOKEN = 'cambia-esta-clave';

// Cuántos días hacia atrás buscar correos
const DIAS = 60;

// Acepta los avisos directos de Classroom y también los reenviados desde otra cuenta
const BUSQUEDA =
  '(subject:"Nueva tarea" OR subject:"New assignment") classroom.google.com newer_than:' + DIAS + 'd';

const MESES = {
  ene: 0, enero: 0, jan: 0, january: 0,
  feb: 1, febrero: 1, february: 1,
  mar: 2, marzo: 2, march: 2,
  abr: 3, abril: 3, apr: 3, april: 3,
  may: 4, mayo: 4,
  jun: 5, junio: 5, june: 5,
  jul: 6, julio: 6, july: 6,
  ago: 7, agosto: 7, aug: 7, august: 7,
  sep: 8, sept: 8, septiembre: 8, setiembre: 8, september: 8,
  oct: 9, octubre: 9, october: 9,
  nov: 10, noviembre: 10, november: 10,
  dic: 11, diciembre: 11, dec: 11, december: 11,
};

function doGet(e) {
  if (!e || !e.parameter || e.parameter.token !== TOKEN) {
    return json({ error: 'No autorizado: revisa el token de la URL' });
  }
  if (e.parameter.accion === 'crearDoc') return json(crearDocumento(e.parameter));
  return json({ tareas: leerTareas(), entregadas: entregadasSiSePuede() });
}

/**
 * Tareas de Classroom que ya has entregado (o que el profesor ha devuelto), para pasarlas a Hecho.
 * Necesita el servicio avanzado "Google Classroom API" (Servicios → + → Google Classroom API).
 * Si no está activado devuelve null y la app sigue funcionando igual.
 */
function entregadasSiSePuede() {
  try {
    return leerEntregadas();
  } catch (err) {
    return null;
  }
}

// Recorre todas las páginas de una lista de la API de Classroom
function todasLasPaginas(pedir, campo) {
  const lista = [];
  let pagina;
  do {
    const r = pedir(pagina ? { pageToken: pagina } : {});
    (r[campo] || []).forEach(function (x) { lista.push(x); });
    pagina = r.nextPageToken;
  } while (pagina && lista.length < 2000);
  return lista;
}

function leerEntregadas() {
  const entregadas = [];
  const cursos = todasLasPaginas(function (p) {
    return Classroom.Courses.list(Object.assign({ studentId: 'me', courseStates: ['ACTIVE'], pageSize: 100 }, p));
  }, 'courses');
  cursos.forEach(function (curso) {
    let entregas;
    try {
      entregas = todasLasPaginas(function (p) {
        return Classroom.Courses.CourseWork.StudentSubmissions.list(
          curso.id, '-', Object.assign({ userId: 'me', states: ['TURNED_IN', 'RETURNED'], pageSize: 100 }, p));
      }, 'studentSubmissions');
    } catch (err) {
      Logger.log('No se pudieron leer las entregas de ' + curso.name + ': ' + err.message);
      return; // clase sin permiso (por ejemplo, donde no eres alumno): se salta
    }
    if (!entregas.length) return;
    const trabajos = {};
    todasLasPaginas(function (p) {
      return Classroom.Courses.CourseWork.list(curso.id, Object.assign({ pageSize: 100 }, p));
    }, 'courseWork').forEach(function (t) { trabajos[t.id] = t; });
    entregas.forEach(function (e) {
      const t = trabajos[e.courseWorkId];
      if (t) entregadas.push({ titulo: t.title || '', curso: curso.name || '', enlace: t.alternateLink || '', estado: e.state });
    });
  });
  return entregadas;
}

// Carpeta de Drive donde se guardan los archivos creados desde la app
const CARPETA_DOCS = 'Proyectos';

/**
 * Crea un archivo de Google para una tarea y devuelve su enlace.
 * p.tipo: 'documento' (Docs, por defecto), 'hoja' (Sheets) o 'presentacion' (Slides).
 */
function crearDocumento(p) {
  const titulo = (p.titulo || 'Documento').slice(0, 200);
  const nombre = p.asignatura ? titulo + ' · ' + p.asignatura : titulo;
  const lineas = [p.asignatura, p.fecha ? 'Entrega: ' + p.fecha : ''].filter(Boolean);
  let id, url;

  if (p.tipo === 'hoja') {
    const hoja = SpreadsheetApp.create(nombre);
    const pestana = hoja.getSheets()[0];
    pestana.setName('Entrega');
    pestana.getRange('A1').setValue(titulo).setFontWeight('bold').setFontSize(14);
    lineas.forEach(function (l, i) { pestana.getRange(i + 2, 1).setValue(l).setFontColor('#666666'); });
    pestana.autoResizeColumn(1);
    id = hoja.getId(); url = hoja.getUrl();
  } else if (p.tipo === 'presentacion') {
    const presentacion = SlidesApp.create(nombre);
    const portada = presentacion.getSlides()[0];
    const tituloForma = portada.getPlaceholder(SlidesApp.PlaceholderType.CENTERED_TITLE) || portada.getPlaceholder(SlidesApp.PlaceholderType.TITLE);
    const subtitulo = portada.getPlaceholder(SlidesApp.PlaceholderType.SUBTITLE);
    if (tituloForma) tituloForma.asShape().getText().setText(titulo);
    if (subtitulo) subtitulo.asShape().getText().setText(lineas.join('\n'));
    presentacion.saveAndClose();
    id = presentacion.getId(); url = presentacion.getUrl();
  } else {
    const doc = DocumentApp.create(nombre);
    const cuerpo = doc.getBody();
    cuerpo.appendParagraph(titulo).setHeading(DocumentApp.ParagraphHeading.TITLE);
    if (p.asignatura) cuerpo.appendParagraph(p.asignatura).setHeading(DocumentApp.ParagraphHeading.SUBTITLE);
    if (p.fecha) cuerpo.appendParagraph('Entrega: ' + p.fecha);
    cuerpo.appendParagraph('');
    doc.saveAndClose();
    id = doc.getId(); url = doc.getUrl();
  }

  // Moverlo a la carpeta "Proyectos" (se crea si no existe)
  const carpetas = DriveApp.getFoldersByName(CARPETA_DOCS);
  const carpeta = carpetas.hasNext() ? carpetas.next() : DriveApp.createFolder(CARPETA_DOCS);
  DriveApp.getFileById(id).moveTo(carpeta);

  return { id: id, url: url };
}

/**
 * Ejecuta esta función desde el editor para dar los permisos de Docs, Sheets, Slides y Drive.
 * Crea un archivo de prueba de cada tipo en la carpeta "Proyectos" (puedes borrarlos después).
 */
function probarDocumento() {
  ['documento', 'hoja', 'presentacion'].forEach(function (tipo) {
    Logger.log(tipo + ': ' + JSON.stringify(crearDocumento({ titulo: 'Prueba', asignatura: 'Asignatura de prueba', tipo: tipo })));
  });
}

/** Ejecuta esta función desde el editor para dar permisos y ver el resultado en el registro. */
function probar() {
  Logger.log(JSON.stringify(leerTareas(), null, 2));
}

/** Ejecuta esta función para dar el permiso de Classroom y ver qué tareas tienes entregadas. */
function probarEntregadas() {
  Logger.log(JSON.stringify(leerEntregadas(), null, 2));
}

function leerTareas() {
  const tareas = [];
  GmailApp.search(BUSQUEDA, 0, 100).forEach(function (hilo) {
    hilo.getMessages().forEach(function (m) {
      const asunto = m.getSubject();
      if (!/(nueva tarea|new assignment)/i.test(asunto)) return;
      const cuerpo = m.getPlainBody() || '';
      // Debe venir de Classroom (directo) o contener el aviso de Classroom (reenviado)
      if (!/classroom\.google\.com/i.test(m.getFrom()) && !/classroom\.google\.com/i.test(cuerpo)) return;

      const recibido = m.getDate();
      const partes = analizarCuerpo(cuerpo);
      tareas.push({
        id: m.getId(),
        // El asunto a veces llega recortado con "…": se prefiere el título del cuerpo
        titulo: partes.titulo || extraerTitulo(asunto),
        curso: partes.curso || extraerCurso(cuerpo),
        profesor: partes.profesor,
        entrega: extraerEntrega(cuerpo, recibido),
        enlace: extraerEnlace(cuerpo),
        texto: partes.contenido,
        recibido: recibido.toISOString(),
      });
    });
  });
  return tareas;
}

function extraerTitulo(asunto) {
  asunto = asunto.replace(/^\s*((fwd?|rv|re|reenviado)\s*:\s*)+/i, ''); // quita "Fwd:", "RV:"...
  const entreComillas = asunto.match(/["“«](.+?)["”»]/);
  if (entreComillas) return entreComillas[1].trim();
  const trasDosPuntos = asunto.split(':').slice(1).join(':').trim();
  return trasDosPuntos || asunto.trim();
}

function extraerCurso(cuerpo) {
  const m = cuerpo.match(/(?:nueva tarea en|new assignment in|publicó .*? en|posted .*? in)\s+([^\n]+)/i);
  return m ? m[1].replace(/[.:]\s*$/, '').trim() : '';
}

/**
 * Formato real de los avisos de Classroom (texto plano):
 *   Ajustes de notificaciones <...>
 *   M0612 Programació web 2627 DAW2 <...>      ← curso
 *   Nueva tarea
 *   La caja fuerte                             ← título completo
 *   Fecha de entrega: 24 nov                   ← opcional
 *   (texto de la tarea, opcional)
 *   Ver detalles <...>
 *   Publicado el 4:44 p. m., nov 16 (CET) por Carlos ...   ← profesor
 */
function analizarCuerpo(cuerpo) {
  const lineas = cuerpo
    .replace(/\r/g, '')
    .split('\n')
    .map(function (l) { return l.replace(/<https?:[^>]*>/g, '').replace(/\s*<\s*$/, '').replace(/\s+/g, ' ').trim(); })
    .filter(function (l) { return l && l !== '<' && l !== '>'; });

  const i = lineas.findIndex(function (l) { return /^(nueva tarea|new assignment)$/i.test(l); });
  if (i === -1) return { titulo: '', curso: '', profesor: '', contenido: '' };

  const curso = i > 0 && !/^(ajustes de notificaciones|notification settings)$/i.test(lineas[i - 1]) ? lineas[i - 1] : '';
  const titulo = lineas[i + 1] || '';

  const contenido = [];
  let profesor = '';
  for (let j = i + 2; j < lineas.length; j++) {
    const l = lineas[j];
    const publicado = l.match(/^(?:publicado|posted)\b.*?\b(?:por|by)\s+(.+)$/i);
    if (publicado) { profesor = publicado[1].trim(); break; }
    if (/^(ver detalles|view details|abrir|open)$/i.test(l)) continue;
    if (/^(fecha de entrega|fecha límite|due)\b/i.test(l)) continue;
    if (/^(google llc|si no quieres|if you don't want|recibes este|you received)/i.test(l)) break;
    contenido.push(l);
  }
  return { titulo: titulo, curso: curso, profesor: profesor, contenido: contenido.join('\n').slice(0, 2000) };
}

/** Prefiere el enlace a la tarea ("Ver detalles") y descarta el de ajustes de notificaciones */
function extraerEnlace(cuerpo) {
  const enlaces = cuerpo.match(/https:\/\/classroom\.google\.com\/[^\s<>)\]"]+/g) || [];
  const tarea = enlaces.find(function (u) { return /\/c\/[^/]+\/a\//.test(u) || /\/details/.test(u); });
  const otro = enlaces.find(function (u) { return !/\/s\?|notification|settings/i.test(u); });
  return tarea || otro || 'https://classroom.google.com/';
}

/** Busca "Fecha de entrega: 5 dic", "Entrega: 5 de diciembre de 2026", "Due: Dec 5"... y devuelve AAAA-MM-DD */
function extraerEntrega(cuerpo, recibido) {
  const lineas = cuerpo.matchAll(/(?:fecha de entrega|fecha límite|entrega|vence|due(?: date)?)\s*:?\s*([^\n]+)/gi);
  for (const linea of lineas) {
    const fecha = leerFecha(linea[1].toLowerCase(), recibido);
    if (fecha) return fecha;
  }
  return null;
}

function leerFecha(texto, recibido) {
  // "5 dic", "5 de diciembre de 2026"
  let m = texto.match(/(\d{1,2})\s*(?:de\s+)?([a-záéíóú]+)\.?(?:\s*(?:de\s+)?(\d{4}))?/);
  let dia, mes, anio;
  if (m && MESES[m[2]] !== undefined) {
    dia = +m[1]; mes = MESES[m[2]]; anio = m[3] && +m[3];
  } else {
    // "dec 5", "december 5, 2026"
    m = texto.match(/([a-z]+)\.?\s+(\d{1,2})(?:,?\s*(\d{4}))?/);
    if (!m || MESES[m[1]] === undefined) return null;
    dia = +m[2]; mes = MESES[m[1]]; anio = m[3] && +m[3];
  }

  if (!anio) {
    anio = recibido.getFullYear();
    // Si la fecha queda muy en el pasado respecto al correo, es del año siguiente
    if (new Date(anio, mes, dia) < new Date(recibido.getTime() - 30 * 86400000)) anio++;
  }
  return anio + '-' + String(mes + 1).padStart(2, '0') + '-' + String(dia).padStart(2, '0');
}

function limpiar(cuerpo) {
  let texto = cuerpo.split(/\n\s*(?:Google LLC|Si no quieres recibir|If you don't want|Recibes este correo|You received this)/i)[0];
  texto = texto.replace(/https?:\/\/\S+/g, '').replace(/\n{3,}/g, '\n\n').trim();
  return texto.slice(0, 2000);
}

function json(datos) {
  return ContentService.createTextOutput(JSON.stringify(datos)).setMimeType(ContentService.MimeType.JSON);
}
