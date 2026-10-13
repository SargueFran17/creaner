/**
 * CREANER CITAS · v1
 * Sistema de reservas para negocios con cita. Un único script para todos los clientes:
 * cada negocio tiene su propia hoja de Google (en su cuenta) con este código pegado.
 *
 * Instalación (resumen; guía completa en GUIA.md):
 *   1. Hoja de cálculo nueva en la cuenta del negocio → Extensiones → Apps Script.
 *   2. Pega este archivo como Code.gs y Panel.html como archivo HTML "Panel".
 *   3. Ejecuta la función `configurar` una vez y acepta los permisos.
 *   4. Rellena las pestañas (Config, Servicios, Profesionales, Horario, Cerrados).
 *   5. Implementar → Nueva implementación → Aplicación web
 *      (Ejecutar como: Yo · Quién tiene acceso: Cualquier usuario).
 *   6. Copia la URL /exec en la web del negocio (data-api del widget).
 *
 * Endpoints (GET salvo indicación):
 *   ?accion=config                                  servicios, profesionales y ajustes públicos
 *   ?accion=dias&servicio=ID&profesional=ID|cualquiera   días con hueco en los próximos N días
 *   ?accion=horas&fecha=AAAA-MM-DD&servicio=ID&profesional=ID|cualquiera   horas libres
 *   ?accion=cita&id=ID&t=TOKEN                      página para que el cliente cambie o cancele su cita
 *   ?accion=cancelar&id=ID&t=TOKEN                  (antiguo) solo cancelar; se mantiene para emails ya enviados
 *   ?accion=panel                                   panel del negocio (pide PIN)
 *   POST {accion:"reservar", ...}                   crea la cita (cuerpo JSON como text/plain)
 *   POST {accion:"estilo"|"cita_*"|"opinion"|"panel_*", ...}  API de las páginas de la web del negocio
 *        (cita.html, opinion.html, panel.html con https://creaner.es/citas/paginas.js). Ver api_().
 *
 * Recordatorios: un activador horario (enviarRecordatorios) manda un email al cliente
 * RECORDATORIO_HORAS antes de su cita. Se instala con `configurar` o desde el menú.
 */

var VERSION = '1.6';
var HOJAS = {
  config: 'Config',
  servicios: 'Servicios',
  profesionales: 'Profesionales',
  horario: 'Horario',
  cerrados: 'Cerrados',
  citas: 'Citas',
  opiniones: 'Opiniones'
};
var CAB_CITAS = ['ID', 'Creada', 'Fecha', 'Hora', 'Fin', 'Servicio ID', 'Servicio', 'Profesional ID', 'Profesional',
  'Nombre', 'Teléfono', 'Email', 'Notas', 'Estado', 'Token', 'Evento calendario', 'Recordatorio', 'Reseña'];
var COL_RECORDATORIO = 17; // columna Q de la pestaña Citas
var COL_RESENA = 18;       // columna R: cuándo se pidió la opinión/reseña
var CAB_OPINIONES = ['Fecha', 'Cita ID', 'Nombre', 'Servicio', 'Profesional', 'Puntuación (1-5)', 'Comentario', 'Se puede publicar'];

/* ======================= MENÚ Y CONFIGURACIÓN INICIAL ======================= */

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Creaner Citas')
    .addItem('Configurar hoja (solo la primera vez)', 'configurar')
    .addItem('Enviarme un email de prueba', 'emailDePrueba')
    .addItem('Ver enlace del panel', 'mostrarEnlacePanel')
    .addSeparator()
    .addItem('Activar recordatorios automáticos', 'activarRecordatorios')
    .addItem('Enviarme un recordatorio de prueba', 'recordatorioDePrueba')
    .addItem('Enviarme una petición de opinión de prueba', 'opinionDePrueba')
    .addToUi();
}

/** Crea las pestañas con cabeceras y datos de ejemplo. No borra nada que ya exista. */
function configurar() {
  var ss = SpreadsheetApp.getActive();
  ss.setSpreadsheetTimeZone('Europe/Madrid');

  crearHoja_(ss, HOJAS.config, ['Ajuste', 'Valor', 'Explicación'], [
    ['NEGOCIO', 'Nombre del negocio', 'Aparece en emails y en el panel'],
    ['EMAIL_NEGOCIO', Session.getActiveUser().getEmail() || 'tu@email.com', 'Recibe un aviso de cada cita nueva o cancelada'],
    ['TELEFONO_NEGOCIO', '600 000 000', 'Se muestra al cliente en el email'],
    ['DIRECCION', 'Calle, número, ciudad', 'Se muestra al cliente en el email'],
    ['INTERVALO_MIN', '30', 'Cada cuántos minutos empiezan los huecos (15, 20, 30…)'],
    ['ANTELACION_MIN_HORAS', '2', 'Horas mínimas de antelación para reservar'],
    ['DIAS_VISTA', '30', 'Cuántos días hacia delante se puede reservar'],
    ['CANCELACION_HORAS', '24', 'Hasta cuántas horas antes puede cancelar el cliente'],
    ['RECORDATORIO_HORAS', '26', 'Cuántas horas antes de la cita se envía el recordatorio al cliente. Ponlo por encima de CANCELACION_HORAS para que aún pueda cancelar desde el email. 0 = sin recordatorios'],
    ['PIN_PANEL', String(Math.floor(100000 + Math.random() * 900000)), 'PIN del panel del negocio. Cámbialo si quieres'],
    ['CALENDARIO', 'NO', 'SI = añadir cada cita al Google Calendar de esta cuenta'],
    ['URL_WEB', '', 'Dirección /exec de la implementación (Implementar → Gestionar implementaciones)'],
    ['COLOR_PRINCIPAL', '#0d1d38', 'Color de la marca del negocio (cabecera del panel, botones y emails). Formato #RRGGBB'],
    ['COLOR_ACENTO', '#e0b03f', 'Color secundario para detalles. Formato #RRGGBB'],
    ['LOGO_URL', '', 'Opcional: dirección de una imagen del logo (PNG o SVG) para el panel y los emails'],
    ['SALUDO', '', 'Opcional: título del panel, p. ej. "Hola, Jorge". Vacío = nombre del negocio'],
    ['FONDO_PANEL', '', 'Opcional: color de fondo del panel. Formato #RRGGBB'],
    ['WEB_NEGOCIO', '', 'Dirección de la web del negocio (p. ej. https://negocio.com/). Si tiene cita.html, opinion.html y panel.html, los enlaces llevan allí en vez de a Google'],
    ['RESENA_URL', '', 'Enlace para dejar reseña en Google (perfil de empresa → Pedir reseñas). Vacío = el cliente puntúa en una página propia y se guarda en Opiniones'],
    ['RESENA_HORAS', '2', 'Horas después de la cita para pedir la opinión. 0 = no pedir opiniones']
  ]);
  crearHoja_(ss, HOJAS.servicios, ['ID', 'Nombre', 'Duración (min)', 'Precio (€)', 'Categoría', 'Activo'], [
    ['corte', 'Corte', '30', '12', 'Pelo', 'SI'],
    ['corte-barba', 'Corte + barba', '45', '18', 'Pelo', 'SI'],
    ['barba', 'Arreglo de barba', '20', '8', 'Barba', 'SI']
  ]);
  crearHoja_(ss, HOJAS.profesionales, ['ID', 'Nombre', 'Servicios (IDs separados por comas o TODOS)', 'Activo'], [
    ['ana', 'Ana', 'TODOS', 'SI'],
    ['luis', 'Luis', 'corte, corte-barba', 'SI']
  ]);
  crearHoja_(ss, HOJAS.horario, ['Profesional (ID o TODOS)', 'Día', 'Inicio', 'Fin'], [
    ['TODOS', 'Lunes', '10:00', '14:00'], ['TODOS', 'Lunes', '16:30', '20:00'],
    ['TODOS', 'Martes', '10:00', '14:00'], ['TODOS', 'Martes', '16:30', '20:00'],
    ['TODOS', 'Miércoles', '10:00', '14:00'], ['TODOS', 'Miércoles', '16:30', '20:00'],
    ['TODOS', 'Jueves', '10:00', '14:00'], ['TODOS', 'Jueves', '16:30', '20:00'],
    ['TODOS', 'Viernes', '10:00', '20:00'],
    ['TODOS', 'Sábado', '10:00', '14:00']
  ]);
  crearHoja_(ss, HOJAS.cerrados, ['Desde (AAAA-MM-DD)', 'Hasta (AAAA-MM-DD)', 'Profesional (ID o TODOS)', 'Motivo'], [
    ['2026-12-25', '2026-12-25', 'TODOS', 'Navidad']
  ]);
  crearHoja_(ss, HOJAS.citas, CAB_CITAS, []);
  crearHoja_(ss, HOJAS.opiniones, CAB_OPINIONES, []);
  asegurarColumnaRecordatorio_();
  instalarActivador_();

  SpreadsheetApp.getUi().alert('Creaner Citas',
    'Hoja configurada. Rellena Config, Servicios, Profesionales, Horario y Cerrados, y después publica el script como aplicación web.',
    SpreadsheetApp.getUi().ButtonSet.OK);
}

function crearHoja_(ss, nombre, cabecera, filas) {
  var sh = ss.getSheetByName(nombre);
  if (sh) return sh;
  sh = ss.insertSheet(nombre);
  var ncol = cabecera.length;
  sh.getRange(1, 1, 1000, ncol).setNumberFormat('@'); // todo como texto: evita que Sheets convierta fechas y horas
  sh.getRange(1, 1, 1, ncol).setValues([cabecera]).setFontWeight('bold').setBackground('#0d1d38').setFontColor('#ffffff');
  if (filas.length) sh.getRange(2, 1, filas.length, ncol).setValues(filas);
  sh.setFrozenRows(1);
  sh.autoResizeColumns(1, ncol);
  return sh;
}

/** Para las pruebas del menú: avisa claramente si no hay email del negocio. */
function emailNegocioOAviso_(c) {
  if (c.EMAIL_NEGOCIO) return true;
  SpreadsheetApp.getUi().alert('Creaner Citas', 'Falta el email del negocio. Escríbelo en la pestaña Config, en la fila EMAIL_NEGOCIO (columna Valor).',
    SpreadsheetApp.getUi().ButtonSet.OK);
  return false;
}

function emailDePrueba() {
  var c = leerConfig_();
  if (!emailNegocioOAviso_(c)) return;
  MailApp.sendEmail({ to: c.EMAIL_NEGOCIO, subject: 'Prueba de Creaner Citas', htmlBody: '<p>Si te llega este email, los avisos funcionan.</p>', name: c.NEGOCIO });
  SpreadsheetApp.getUi().alert('Email enviado a ' + c.EMAIL_NEGOCIO + '. Mira también en Spam.' + avisoConfig_(c));
}

function mostrarEnlacePanel() {
  var c = leerConfig_();
  var base = (c.URL_WEB || '').replace(/\?.*$/, '');
  var web = webNegocio_(c);
  var enlace = web ? web + 'panel.html' : (base ? base + '?accion=panel' : '');
  if (enlace) guardarAjuste_('ENLACE_PANEL', enlace, 'Enlace del panel del negocio (se entra con PIN_PANEL). Guárdalo en favoritos del móvil');
  var msg = enlace
    ? ('Panel del negocio:\n' + enlace + '\n\nTambién lo tienes en la pestaña Config, fila ENLACE_PANEL.\nPIN: el de la pestaña Config (PIN_PANEL).')
    : 'Pega en Config → URL_WEB la dirección de tu implementación (Implementar → Gestionar implementaciones → URL que termina en /exec). ' +
      'El panel será esa dirección + ?accion=panel';
  SpreadsheetApp.getUi().alert('Creaner Citas', msg, SpreadsheetApp.getUi().ButtonSet.OK);
}

/** Crea o actualiza una fila de la pestaña Config. */
function guardarAjuste_(clave, valor, explicacion) {
  var sh = SpreadsheetApp.getActive().getSheetByName(HOJAS.config);
  if (!sh) return;
  var claves = sh.getRange(1, 1, Math.max(sh.getLastRow(), 1), 1).getDisplayValues();
  for (var i = 1; i < claves.length; i++) {
    if (String(claves[i][0]).trim() === clave) { sh.getRange(i + 1, 2).setValue(valor); return; }
  }
  sh.appendRow([clave, valor, explicacion || '']);
}

/** URL pública del script: la de Config (URL_WEB) si está; si no, la que da Google. */
function urlWeb_() {
  var c = leerConfig_();
  return (c.URL_WEB || '').replace(/\?.*$/, '') || ScriptApp.getService().getUrl();
}

/* =============================== LECTURA DE DATOS =============================== */

function tz_() { return SpreadsheetApp.getActive().getSpreadsheetTimeZone() || 'Europe/Madrid'; }

function filas_(nombre) {
  var sh = SpreadsheetApp.getActive().getSheetByName(nombre);
  if (!sh || sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).getDisplayValues()
    .filter(function (r) { return r.join('').trim() !== ''; });
}

function leerConfig_() {
  var c = {};
  filas_(HOJAS.config).forEach(function (r) { c[String(r[0]).trim()] = String(r[1]).trim(); });
  c.INTERVALO_MIN = parseInt(c.INTERVALO_MIN, 10) || 30;
  c.ANTELACION_MIN_HORAS = parseFloat(c.ANTELACION_MIN_HORAS) || 0;
  c.DIAS_VISTA = parseInt(c.DIAS_VISTA, 10) || 30;
  c.CANCELACION_HORAS = parseFloat(c.CANCELACION_HORAS) || 0;
  // Email del negocio: si falta o no es válido en Config, se usa el de la cuenta de Google dueña del script.
  if (!esEmail_(c.EMAIL_NEGOCIO)) {
    c.EMAIL_CONFIG_VACIO = true;
    c.EMAIL_NEGOCIO = esEmail_(c.EMAIL) ? c.EMAIL : '';
    if (!c.EMAIL_NEGOCIO) { try { c.EMAIL_NEGOCIO = Session.getEffectiveUser().getEmail() || ''; } catch (x) {} }
  }
  // Si la hoja es anterior a la v1.3 y no tiene el ajuste, se usan 26 h (2 más que el plazo de cancelación habitual).
  c.RESENA_HORAS = (c.RESENA_HORAS === undefined || c.RESENA_HORAS === '') ? 2 : (parseFloat(c.RESENA_HORAS) || 0);
  c.RECORDATORIO_HORAS = (c.RECORDATORIO_HORAS === undefined || c.RECORDATORIO_HORAS === '') ? 26 : (parseFloat(c.RECORDATORIO_HORAS) || 0);
  return c;
}

function esEmail_(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v || '').trim()); }

function si_(v) { return /^(s[ií]|yes|true|1|x)$/i.test(String(v).trim()); }

function leerServicios_() {
  return filas_(HOJAS.servicios).filter(function (r) { return si_(r[5]); }).map(function (r) {
    return { id: String(r[0]).trim(), nombre: r[1], duracion: parseInt(r[2], 10) || 30, precio: r[3], categoria: r[4] };
  });
}

function leerProfesionales_() {
  return filas_(HOJAS.profesionales).filter(function (r) { return si_(r[3]); }).map(function (r) {
    var s = String(r[2]).trim();
    return { id: String(r[0]).trim(), nombre: r[1], todos: /^todos$/i.test(s),
      servicios: s.split(',').map(function (x) { return x.trim(); }).filter(String) };
  });
}

function haceServicio_(p, sid) { return p.todos || p.servicios.indexOf(sid) > -1; }

function normDia_(s) {
  return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}
var DIAS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];

/** Acepta AAAA-MM-DD o DD/MM/AAAA y devuelve AAAA-MM-DD. */
function normFecha_(s) {
  s = String(s).trim();
  var m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return m[1] + '-' + pad_(m[2]) + '-' + pad_(m[3]);
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return m[3] + '-' + pad_(m[2]) + '-' + pad_(m[1]);
  return '';
}
function pad_(n) { n = String(n); return n.length < 2 ? '0' + n : n; }
function aMin_(hhmm) { var p = String(hhmm).trim().split(':'); return parseInt(p[0], 10) * 60 + (parseInt(p[1], 10) || 0); }
function aHora_(min) { return pad_(Math.floor(min / 60)) + ':' + pad_(min % 60); }
function diaSemana_(fecha) { var p = fecha.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]).getDay(); }
function sumarDias_(fecha, n) {
  var p = fecha.split('-'); var d = new Date(+p[0], +p[1] - 1, +p[2] + n);
  return d.getFullYear() + '-' + pad_(d.getMonth() + 1) + '-' + pad_(d.getDate());
}

/** Citas confirmadas agrupadas por fecha → profesional → [ [ini, fin], ... ] */
function ocupacion_() {
  var occ = {};
  filas_(HOJAS.citas).forEach(function (r) {
    if (String(r[13]).trim() !== 'Confirmada') return;
    var f = normFecha_(r[2]); if (!f) return;
    occ[f] = occ[f] || {};
    (occ[f][r[7]] = occ[f][r[7]] || []).push([aMin_(r[3]), aMin_(r[4])]);
  });
  return occ;
}

function cerradoPara_(fecha, proId, cerrados) {
  return cerrados.some(function (r) {
    var d = normFecha_(r[0]), h = normFecha_(r[1]) || d;
    var quien = String(r[2]).trim();
    return d && fecha >= d && fecha <= h && (/^todos$/i.test(quien) || quien === '' || quien === proId);
  });
}

/* =========================== CÁLCULO DE DISPONIBILIDAD =========================== */

/** Devuelve [{hora, profesional}] libres para una fecha, servicio y profesional (o 'cualquiera'). */
function huecos_(fecha, servicioId, proId, ctx) {
  var serv = ctx.servicios.filter(function (s) { return s.id === servicioId; })[0];
  if (!serv) return [];
  var pros = ctx.pros.filter(function (p) {
    return haceServicio_(p, servicioId) && (proId === 'cualquiera' || p.id === proId);
  });
  var dia = DIAS[diaSemana_(fecha)];
  var ahora = Utilities.formatDate(new Date(), ctx.tz, 'yyyy-MM-dd HH:mm');
  var limite = new Date(new Date().getTime() + ctx.cfg.ANTELACION_MIN_HORAS * 3600000);
  var limiteTxt = Utilities.formatDate(limite, ctx.tz, 'yyyy-MM-dd HH:mm');
  var porHora = {};

  pros.forEach(function (p) {
    if (cerradoPara_(fecha, p.id, ctx.cerrados)) return;
    var tramos = ctx.horario.filter(function (r) {
      var quien = String(r[0]).trim();
      return normDia_(r[1]) === dia && (/^todos$/i.test(quien) || quien === p.id);
    });
    var ocupado = (ctx.occ[fecha] && ctx.occ[fecha][p.id]) || [];
    tramos.forEach(function (t) {
      var ini = aMin_(t[2]), fin = aMin_(t[3]);
      for (var m = ini; m + serv.duracion <= fin; m += ctx.cfg.INTERVALO_MIN) {
        var cuando = fecha + ' ' + aHora_(m);
        if (cuando < limiteTxt || cuando < ahora) continue;
        var choca = ocupado.some(function (o) { return m < o[1] && m + serv.duracion > o[0]; });
        if (!choca && !porHora[aHora_(m)]) porHora[aHora_(m)] = p;
      }
    });
  });
  return Object.keys(porHora).sort().map(function (h) {
    return { hora: h, profesional: porHora[h].id, profesionalNombre: porHora[h].nombre };
  });
}

function contexto_() {
  return {
    tz: tz_(), cfg: leerConfig_(), servicios: leerServicios_(), pros: leerProfesionales_(),
    horario: filas_(HOJAS.horario), cerrados: filas_(HOJAS.cerrados), occ: ocupacion_()
  };
}

function hoy_(tz) { return Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd'); }

/* ================================== ENDPOINTS ================================== */

function doGet(e) {
  var q = (e && e.parameter) || {};
  try {
    switch (q.accion) {
      case 'config': return json_(apiConfig_());
      case 'dias': return json_(apiDias_(q.servicio, q.profesional || 'cualquiera'));
      case 'horas': return json_(apiHoras_(q.fecha, q.servicio, q.profesional || 'cualquiera'));
      case 'cita': return paginaCita_(q.id, q.t);
      case 'opinion': return paginaOpinion_(q.id, q.t, q.n);
      case 'cancelar': return paginaCancelar_(q.id, q.t, q.confirmar === '1');
      case 'panel': return HtmlService.createHtmlOutputFromFile('Panel')
        .setTitle('Panel de citas').addMetaTag('viewport', 'width=device-width, initial-scale=1');
      default: return json_({ ok: true, sistema: 'Creaner Citas', version: VERSION });
    }
  } catch (err) {
    return json_({ ok: false, error: 'Error del servidor: ' + err.message });
  }
}

function doPost(e) {
  var datos = {};
  try { datos = JSON.parse(e.postData.contents || '{}'); } catch (x) { return json_({ ok: false, error: 'Datos no válidos.' }); }
  if (datos.accion === 'reservar') return json_(reservar_(datos));
  try {
    var r = api_(datos);
    return json_(r === undefined ? { ok: false, error: 'Acción no reconocida.' } : r);
  } catch (err) {
    return json_({ ok: false, error: err.message });
  }
}

/** API de las páginas alojadas en la web del negocio (paginas.js). Todo por POST para no dejar PIN ni tokens en URLs de registros. */
function api_(d) {
  switch (d.accion) {
    case 'estilo':
      var e = panelEstilo(), c = leerConfig_();
      e.ok = true; e.telefono = c.TELEFONO_NEGOCIO || ''; e.horas = c.CANCELACION_HORAS;
      return e;
    case 'cita_info': return { ok: true, cita: datosCita_(d.id, d.t) };
    case 'cita_dias': return { ok: true, dias: citaDias(d.id, d.t) };
    case 'cita_horas': return { ok: true, horas: citaHoras(d.id, d.t, d.fecha) };
    case 'cita_cambiar': return citaCambiar(d.id, d.t, d.fecha, d.hora);
    case 'cita_cancelar': citaCancelar(d.id, d.t); return { ok: true };
    case 'opinion':
      if (d.comentario === undefined) return registrarPuntuacion_(d.id, d.t, d.n);
      guardarOpinion(d.id, d.t, d.n, d.comentario, d.publicar); return { ok: true };
    case 'panel_citas': return conPin_(d.pin, function () { return { ok: true, datos: panelCitas(d.pin, d.desde, d.hasta) }; });
    case 'panel_cancelar': return conPin_(d.pin, function () { panelCancelar(d.pin, d.id); return { ok: true }; });
    case 'panel_cerrar': return conPin_(d.pin, function () { panelCerrar(d.pin, d.desde, d.hasta, d.motivo); return { ok: true }; });
  }
}

/** Frena a quien pruebe PINs: tras 8 fallos en 15 min, el panel se bloquea 15 min. */
function conPin_(pin, fn) {
  var cache = CacheService.getScriptCache(), fallos = parseInt(cache.get('pin_fallos') || '0', 10);
  if (fallos >= 8) return { ok: false, bloqueado: true, error: 'Demasiados intentos. Espera 15 minutos.' };
  try {
    return fn();
  } catch (err) {
    if (/PIN/.test(err.message)) { cache.put('pin_fallos', String(fallos + 1), 900); return { ok: false, pin: true, error: 'PIN incorrecto.' }; }
    throw err;
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function apiConfig_() {
  var cfg = leerConfig_();
  return {
    ok: true, negocio: cfg.NEGOCIO, telefono: cfg.TELEFONO_NEGOCIO, direccion: cfg.DIRECCION,
    diasVista: cfg.DIAS_VISTA, cancelacionHoras: cfg.CANCELACION_HORAS,
    servicios: leerServicios_(),
    profesionales: leerProfesionales_().map(function (p) {
      return { id: p.id, nombre: p.nombre, servicios: p.todos ? 'TODOS' : p.servicios };
    })
  };
}

function apiDias_(servicioId, proId) {
  var ctx = contexto_();
  var hoy = hoy_(ctx.tz), out = [];
  for (var i = 0; i < ctx.cfg.DIAS_VISTA; i++) {
    var f = sumarDias_(hoy, i);
    out.push({ fecha: f, libre: huecos_(f, servicioId, proId, ctx).length > 0 });
  }
  return { ok: true, dias: out };
}

function apiHoras_(fecha, servicioId, proId) {
  fecha = normFecha_(fecha);
  if (!fecha) return { ok: false, error: 'Fecha no válida.' };
  return { ok: true, fecha: fecha, horas: huecos_(fecha, servicioId, proId, contexto_()) };
}

/* ================================== RESERVAR ================================== */

function reservar_(d) {
  var nombre = String(d.nombre || '').trim().slice(0, 80);
  var telefono = String(d.telefono || '').replace(/[^\d+ ]/g, '').trim().slice(0, 20);
  var email = String(d.email || '').trim().slice(0, 120);
  var notas = String(d.notas || '').trim().slice(0, 300);
  var fecha = normFecha_(d.fecha), hora = String(d.hora || '').trim();
  if (!nombre || telefono.replace(/\D/g, '').length < 9) return { ok: false, error: 'Pon tu nombre y un teléfono válido.' };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { ok: false, error: 'El email no parece correcto.' };
  if (!fecha || !/^\d{2}:\d{2}$/.test(hora)) return { ok: false, error: 'Elige día y hora.' };

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) return { ok: false, error: 'Mucha gente reservando a la vez. Inténtalo en unos segundos.' };
  try {
    var ctx = contexto_();
    var serv = ctx.servicios.filter(function (s) { return s.id === d.servicio; })[0];
    if (!serv) return { ok: false, error: 'Ese servicio ya no está disponible.' };
    var libre = huecos_(fecha, serv.id, d.profesional || 'cualquiera', ctx)
      .filter(function (h) { return h.hora === hora; })[0];
    if (!libre) return { ok: false, ocupada: true, error: 'Justo se ha ocupado esa hora. Elige otra, por favor.' };

    var id = Utilities.formatDate(new Date(), ctx.tz, 'yyMMdd') + '-' + Utilities.getUuid().slice(0, 6).toUpperCase();
    var token = Utilities.getUuid().replace(/-/g, '');
    var fin = aHora_(aMin_(hora) + serv.duracion);
    var eventoId = '';
    if (si_(ctx.cfg.CALENDARIO)) {
      try {
        var cal = CalendarApp.getDefaultCalendar();
        var ini = Utilities.parseDate(fecha + ' ' + hora, ctx.tz, 'yyyy-MM-dd HH:mm');
        var end = Utilities.parseDate(fecha + ' ' + fin, ctx.tz, 'yyyy-MM-dd HH:mm');
        eventoId = cal.createEvent(serv.nombre + ' · ' + nombre, ini, end, {
          description: 'Profesional: ' + libre.profesionalNombre + '\nTeléfono: ' + telefono +
            (email ? '\nEmail: ' + email : '') + (notas ? '\nNotas: ' + notas : '') + '\nReserva ' + id
        }).getId();
      } catch (x) { /* el calendario es opcional: la cita se guarda igualmente */ }
    }
    var sh = SpreadsheetApp.getActive().getSheetByName(HOJAS.citas);
    sh.appendRow([id, Utilities.formatDate(new Date(), ctx.tz, 'yyyy-MM-dd HH:mm'), fecha, hora, fin, serv.id, serv.nombre,
      libre.profesional, libre.profesionalNombre, nombre, telefono, email, notas, 'Confirmada', token, eventoId, '']);
    SpreadsheetApp.flush();

    var cita = { id: id, fecha: fecha, hora: hora, servicio: serv.nombre, precio: serv.precio,
      profesional: libre.profesionalNombre, nombre: nombre, telefono: telefono, email: email, notas: notas };
    avisar_(ctx.cfg, cita, token);
    return { ok: true, cita: cita };
  } finally {
    lock.releaseLock();
  }
}

/* =================================== EMAILS =================================== */

function fechaBonita_(fecha) {
  var p = fecha.split('-'), d = new Date(+p[0], +p[1] - 1, +p[2]);
  var meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  var dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  return dias[d.getDay()] + ' ' + d.getDate() + ' de ' + meses[d.getMonth()];
}

function esc_(s) { return String(s || '').replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

function plantilla_(titulo, cuerpo) {
  var c = leerConfig_(), col = color_(c.COLOR_PRINCIPAL, '#1c1f24');
  var logo = /^https:\/\//.test(c.LOGO_URL || '') ? '<img src="' + esc_(c.LOGO_URL) + '" alt="' + esc_(c.NEGOCIO) + '" style="max-height:48px;margin-bottom:16px">' : '';
  return '<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#1c1f24">' +
    '<div style="height:4px;background:' + col + ';border-radius:2px;margin-bottom:20px"></div>' + logo +
    '<h2 style="margin:0 0 12px;color:' + col + '">' + esc_(titulo) + '</h2>' + cuerpo +
    '<p style="color:#888;font-size:12px;margin-top:24px">Reservas gestionadas con Creaner</p></div>';
}

function lineaCita_(servicio, profesional, fecha, hora) {
  return '<p><b>' + esc_(servicio) + '</b> con ' + esc_(profesional) + '<br>' +
    esc_(fechaBonita_(fecha)) + ' a las ' + esc_(hora) + '</p>';
}

function urlCancelar_(id, token) {
  return urlWeb_() + '?accion=cancelar&id=' + encodeURIComponent(id) + '&t=' + token;
}

/** Página donde el cliente cambia o cancela su cita. */
function urlGestion_(id, token) {
  var web = webNegocio_();
  if (web) return web + 'cita.html?id=' + encodeURIComponent(id) + '&t=' + token;
  return urlWeb_() + '?accion=cita&id=' + encodeURIComponent(id) + '&t=' + token;
}

/** Web del negocio con / final, o '' si no está configurada. */
function webNegocio_(cfg) {
  var w = String((cfg || leerConfig_()).WEB_NEGOCIO || '').trim().replace(/[?#].*$/, '').replace(/[^\/]+\.html?$/i, '');
  if (!/^https:\/\/[^\s]+$/.test(w)) return '';
  return /\/$/.test(w) ? w : w + '/';
}

function lineaGestion_(cfg, url, texto) {
  return '<p>' + texto + ' <a href="' + url + '">Cambia o cancela tu cita aquí</a>' +
    (cfg.CANCELACION_HORAS ? ' (hasta ' + cfg.CANCELACION_HORAS + ' h antes)' : '') + '.</p>';
}

function avisar_(cfg, c, token) {
  var linea = lineaCita_(c.servicio, c.profesional, c.fecha, c.hora);
  try {
    MailApp.sendEmail({
      to: cfg.EMAIL_NEGOCIO, name: 'Reservas ' + (cfg.NEGOCIO || ''), replyTo: c.email || undefined,
      subject: 'Nueva cita: ' + c.servicio + ' · ' + fechaBonita_(c.fecha) + ' ' + c.hora,
      htmlBody: plantilla_('Nueva cita', linea + '<p>' + esc_(c.nombre) + ' · ' + esc_(c.telefono) +
        (c.email ? ' · ' + esc_(c.email) : '') + '</p>' + (c.notas ? '<p>Notas: ' + esc_(c.notas) + '</p>' : ''))
    });
  } catch (x) { console.error('Aviso al negocio', x); }
  if (!c.email) return;
  var url = urlGestion_(c.id, token);
  try {
    MailApp.sendEmail({
      to: c.email, name: cfg.NEGOCIO, replyTo: cfg.EMAIL_NEGOCIO,
      subject: 'Cita confirmada en ' + cfg.NEGOCIO + ': ' + fechaBonita_(c.fecha) + ' a las ' + c.hora,
      htmlBody: plantilla_('¡Cita confirmada!', '<p>Hola ' + esc_(c.nombre) + ',</p>' + linea +
        (cfg.DIRECCION ? '<p>📍 ' + esc_(cfg.DIRECCION) + '</p>' : '') +
        (cfg.TELEFONO_NEGOCIO ? '<p>📞 ' + esc_(cfg.TELEFONO_NEGOCIO) + '</p>' : '') +
        lineaGestion_(cfg, url, '¿Te ha surgido algo?'))
    });
  } catch (x) { console.error('Confirmación al cliente', x); }
}

/* ================================= RECORDATORIOS ================================= */
/* Un activador de Google ejecuta enviarRecordatorios() cada hora. Manda el recordatorio a
   las citas confirmadas que empiezan dentro de RECORDATORIO_HORAS y apunta en la columna
   "Recordatorio" cuándo se envió, para no repetirlo. */

var RECORDATORIO_SILENCIO = [22, 8];      // no se envían emails de 22:00 a 8:00
var RECORDATORIO_MARGEN_RESERVA_H = 6;   // si reservó hace menos de 6 h, ya tiene la confirmación reciente
var CUPO_RESERVADO_CONFIRMACIONES = 5;   // emails diarios que se guardan para confirmaciones de reservas nuevas

/** Menú: instala el activador horario y añade la columna Recordatorio si falta. */
function activarRecordatorios() {
  asegurarColumnaRecordatorio_();
  var nuevo = instalarActivador_();
  var horas = leerConfig_().RECORDATORIO_HORAS;
  SpreadsheetApp.getUi().alert('Creaner Citas',
    (nuevo ? 'Recordatorios activados.' : 'Los recordatorios ya estaban activados.') +
    (horas ? ' Cada cliente recibirá un email unas ' + horas + ' h antes de su cita (nunca entre las 22:00 y las 8:00).'
           : ' Ojo: RECORDATORIO_HORAS está en 0 en Config, así que no se enviará ninguno hasta que lo cambies.'),
    SpreadsheetApp.getUi().ButtonSet.OK);
}

/** Crea el activador horario si no existe. Devuelve true si lo ha creado ahora. */
function instalarActivador_() {
  var existe = ScriptApp.getProjectTriggers().some(function (t) {
    return t.getHandlerFunction() === 'enviarRecordatorios';
  });
  if (existe) return false;
  ScriptApp.newTrigger('enviarRecordatorios').timeBased().everyHours(1).create();
  return true;
}

/** Hojas creadas con la v1.2 o anterior no tienen la columna: se añade sin tocar los datos. */
function asegurarColumnaRecordatorio_() {
  var sh = SpreadsheetApp.getActive().getSheetByName(HOJAS.citas);
  if (!sh) return null;
  asegurarColumna_(sh, COL_RECORDATORIO, 'Recordatorio');
  asegurarColumna_(sh, COL_RESENA, 'Reseña');
  return sh;
}

function asegurarColumna_(sh, col, nombre) {
  if (sh.getMaxColumns() < col) sh.insertColumnsAfter(sh.getMaxColumns(), col - sh.getMaxColumns());
  var cab = sh.getRange(1, col);
  if (String(cab.getValue()).trim() !== nombre) {
    cab.setValue(nombre).setFontWeight('bold').setBackground('#0d1d38').setFontColor('#ffffff');
    sh.getRange(2, col, Math.max(sh.getMaxRows() - 1, 1), 1).setNumberFormat('@');
  }
}

/** Lo ejecuta el activador cada hora: recordatorios antes de la cita y petición de opinión después. */
function enviarRecordatorios() {
  var cfg = leerConfig_();
  if (!cfg.RECORDATORIO_HORAS && !cfg.RESENA_HORAS) return;
  var tz = tz_();
  var horaLocal = parseInt(Utilities.formatDate(new Date(), tz, 'H'), 10);
  if (horaLocal >= RECORDATORIO_SILENCIO[0] || horaLocal < RECORDATORIO_SILENCIO[1]) return;

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return; // otra ejecución está en marcha; la siguiente lo recogerá
  try {
    var sh = asegurarColumnaRecordatorio_();
    if (!sh) return;
    if (cfg.RECORDATORIO_HORAS) recordatorios_(cfg, tz, sh);
    if (cfg.RESENA_HORAS) pedirOpiniones_(cfg, tz, sh);
  } finally {
    lock.releaseLock();
  }
}

function recordatorios_(cfg, tz, sh) {
    var vals = sh.getDataRange().getDisplayValues();
    var ahora = Date.now(), enviados = 0;
    for (var i = 1; i < vals.length; i++) {
      var r = vals[i];
      if (String(r[13]).trim() !== 'Confirmada' || String(r[COL_RECORDATORIO - 1] || '').trim()) continue;
      var fecha = normFecha_(r[2]), hora = String(r[3]).trim();
      if (!fecha || !/^\d{1,2}:\d{2}$/.test(hora)) continue;
      var inicio = Utilities.parseDate(fecha + ' ' + hora, tz, 'yyyy-MM-dd HH:mm').getTime();
      var faltanH = (inicio - ahora) / 3600000;
      if (faltanH <= 0 || faltanH > cfg.RECORDATORIO_HORAS) continue;

      var email = String(r[11] || '').trim();
      if (!email) { sh.getRange(i + 1, COL_RECORDATORIO).setValue('Sin email'); continue; }

      var creada = null;
      try { creada = Utilities.parseDate(String(r[1]).trim(), tz, 'yyyy-MM-dd HH:mm').getTime(); } catch (x) {}
      if (creada && (ahora - creada) / 3600000 < RECORDATORIO_MARGEN_RESERVA_H) continue; // se revisa en la próxima hora

      if (MailApp.getRemainingDailyQuota() <= CUPO_RESERVADO_CONFIRMACIONES) {
        console.warn('Recordatorios pausados: queda poco cupo de emails hoy.');
        break;
      }
      try {
        mandarRecordatorio_(cfg, tz, {
          id: r[0], fecha: fecha, hora: hora, servicio: r[6], profesional: r[8], nombre: r[9], email: email, token: r[14]
        }, faltanH);
        sh.getRange(i + 1, COL_RECORDATORIO).setValue('Enviado ' + Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd HH:mm'));
        enviados++;
      } catch (x) {
        console.error('Recordatorio ' + r[0], x); // sin marca: se reintenta en la próxima hora
      }
    }
    if (enviados) console.log('Recordatorios enviados: ' + enviados);
}

/** "hoy", "mañana" o la fecha completa. */
function cuandoTexto_(fecha, tz) {
  var hoy = hoy_(tz);
  if (fecha === hoy) return 'hoy';
  if (fecha === sumarDias_(hoy, 1)) return 'mañana';
  return 'el ' + fechaBonita_(fecha);
}

function mandarRecordatorio_(cfg, tz, c, faltanH, destino) {
  var cuando = cuandoTexto_(c.fecha, tz);
  var puedeCancelar = c.token && faltanH >= cfg.CANCELACION_HORAS;
  var noPuedes = puedeCancelar
    ? lineaGestion_(cfg, urlGestion_(c.id, c.token), '¿Al final no te viene bien?')
    : '<p>¿Al final no puedes venir? Avísanos cuanto antes' +
      (cfg.TELEFONO_NEGOCIO ? ' llamando al <b>' + esc_(cfg.TELEFONO_NEGOCIO) + '</b> o' : '') +
      ' respondiendo a este email, y así otra persona podrá aprovechar el hueco.</p>';
  MailApp.sendEmail({
    to: destino || c.email, name: cfg.NEGOCIO, replyTo: cfg.EMAIL_NEGOCIO,
    subject: 'Recordatorio: tu cita en ' + cfg.NEGOCIO + ' es ' + cuando + ' a las ' + c.hora,
    htmlBody: plantilla_('Te esperamos ' + cuando, '<p>Hola ' + esc_(c.nombre) + ',</p>' +
      '<p>Te recordamos tu cita:</p>' + lineaCita_(c.servicio, c.profesional, c.fecha, c.hora) +
      (cfg.DIRECCION ? '<p>📍 ' + esc_(cfg.DIRECCION) + '</p>' : '') +
      (cfg.TELEFONO_NEGOCIO ? '<p>📞 ' + esc_(cfg.TELEFONO_NEGOCIO) + '</p>' : '') + noPuedes)
  });
}

/** Menú: envía al email del negocio un recordatorio de ejemplo para ver cómo le llega al cliente. */
function recordatorioDePrueba() {
  var cfg = leerConfig_(), tz = tz_();
  if (!emailNegocioOAviso_(cfg)) return;
  var serv = leerServicios_()[0] || { nombre: 'Servicio de prueba' };
  var pro = leerProfesionales_()[0] || { nombre: 'Profesional' };
  mandarRecordatorio_(cfg, tz, { id: 'PRUEBA', fecha: sumarDias_(hoy_(tz), 1), hora: '10:00', servicio: serv.nombre,
    profesional: pro.nombre, nombre: 'Cliente de prueba', token: 'prueba' }, cfg.RECORDATORIO_HORAS || 26, cfg.EMAIL_NEGOCIO);
  SpreadsheetApp.getUi().alert('Recordatorio de prueba enviado a ' + cfg.EMAIL_NEGOCIO + '. Mira también en Spam.' + avisoConfig_(cfg));
}

function avisoConfig_(c) {
  return c.EMAIL_CONFIG_VACIO ? '\n\nOjo: en Config no hay un EMAIL_NEGOCIO válido, así que se ha usado el de esta cuenta. Escríbelo en Config para que los avisos lleguen al email correcto.' : '';
}

/* ======================= CAMBIAR O CANCELAR (PÁGINA DEL CLIENTE) ======================= */
/* ?accion=cita muestra la cita y deja cambiar día/hora o cancelar. La página llama a
   citaDias / citaHoras / citaCambiar / citaCancelar con google.script.run; todas
   comprueban el token de la cita. El cambio se hace en la misma fila y dentro de un
   bloqueo: la hora antigua solo se libera cuando la nueva ya está guardada. */

function validarCita_(id, token) {
  var f = id ? buscarCita_(String(id)) : null;
  if (!f || !token || f.r[14] !== String(token)) throw new Error('Enlace no válido.');
  if (String(f.r[13]).trim() !== 'Confirmada') throw new Error('Esta cita ya no está activa.');
  return f;
}

function horasHastaCita_(f, tz) {
  var inicio = Utilities.parseDate(normFecha_(f.r[2]) + ' ' + f.r[3], tz, 'yyyy-MM-dd HH:mm');
  return (inicio.getTime() - Date.now()) / 3600000;
}

function exigirPlazo_(f, cfg, tz) {
  if (horasHastaCita_(f, tz) < cfg.CANCELACION_HORAS) {
    throw new Error('Faltan menos de ' + cfg.CANCELACION_HORAS + ' h para tu cita y ya no se puede cambiar online. Llama al ' + (cfg.TELEFONO_NEGOCIO || 'negocio') + '.');
  }
}

/** Contexto de disponibilidad sin contar la propia cita (para poder moverla a un hueco que la solape). */
function contextoSinCita_(f) {
  var ctx = contexto_();
  var fecha = normFecha_(f.r[2]), lista = ctx.occ[fecha] && ctx.occ[fecha][f.r[7]];
  if (lista) {
    var ini = aMin_(f.r[3]), fin = aMin_(f.r[4]), quitada = false;
    ctx.occ[fecha][f.r[7]] = lista.filter(function (o) {
      if (!quitada && o[0] === ini && o[1] === fin) { quitada = true; return false; }
      return true;
    });
  }
  return ctx;
}

/** Mismo profesional si sigue activo; si no, cualquiera que haga el servicio. */
function proParaCambio_(f, ctx) {
  return ctx.pros.some(function (p) { return p.id === f.r[7]; }) ? f.r[7] : 'cualquiera';
}

function citaDias(id, token) {
  var cfg = leerConfig_(), tz = tz_(), f = validarCita_(id, token);
  exigirPlazo_(f, cfg, tz);
  var ctx = contextoSinCita_(f), pro = proParaCambio_(f, ctx), hoy = hoy_(tz), out = [];
  for (var i = 0; i < cfg.DIAS_VISTA; i++) {
    var d = sumarDias_(hoy, i);
    if (huecos_(d, f.r[5], pro, ctx).length) out.push({ fecha: d, txt: fechaBonita_(d) });
  }
  return out;
}

function citaHoras(id, token, fecha) {
  var cfg = leerConfig_(), tz = tz_(), f = validarCita_(id, token);
  exigirPlazo_(f, cfg, tz);
  fecha = normFecha_(fecha);
  if (!fecha) throw new Error('Fecha no válida.');
  var ctx = contextoSinCita_(f), actual = normFecha_(f.r[2]) + ' ' + f.r[3];
  return huecos_(fecha, f.r[5], proParaCambio_(f, ctx), ctx)
    .filter(function (h) { return fecha + ' ' + h.hora !== actual; })
    .map(function (h) { return h.hora; });
}

function citaCambiar(id, token, fecha, hora) {
  var cfg = leerConfig_(), tz = tz_();
  fecha = normFecha_(fecha); hora = String(hora || '').trim();
  if (!fecha || !/^\d{2}:\d{2}$/.test(hora)) throw new Error('Elige día y hora.');
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) throw new Error('Mucha gente reservando a la vez. Inténtalo en unos segundos.');
  try {
    var f = validarCita_(id, token); // se vuelve a leer dentro del bloqueo
    exigirPlazo_(f, cfg, tz);
    var ctx = contextoSinCita_(f);
    var serv = ctx.servicios.filter(function (x) { return x.id === f.r[5]; })[0];
    if (!serv) throw new Error('Este servicio ya no se puede reservar online. Llama al ' + (cfg.TELEFONO_NEGOCIO || 'negocio') + '.');
    var libre = huecos_(fecha, serv.id, proParaCambio_(f, ctx), ctx).filter(function (h) { return h.hora === hora; })[0];
    if (!libre) return { ok: false, ocupada: true, error: 'Justo se ha ocupado esa hora. Elige otra, por favor.' };

    var antes = { fecha: normFecha_(f.r[2]), hora: f.r[3] };
    var fin = aHora_(aMin_(hora) + serv.duracion);
    f.sh.getRange(f.fila, 3, 1, 3).setValues([[fecha, hora, fin]]);
    f.sh.getRange(f.fila, 8, 1, 2).setValues([[libre.profesional, libre.profesionalNombre]]);
    if (f.sh.getMaxColumns() >= COL_RECORDATORIO) f.sh.getRange(f.fila, COL_RECORDATORIO).setValue(''); // nuevo recordatorio para la nueva hora
    if (f.r[15]) {
      try {
        var ev = CalendarApp.getDefaultCalendar().getEventById(f.r[15]);
        if (ev) ev.setTime(Utilities.parseDate(fecha + ' ' + hora, tz, 'yyyy-MM-dd HH:mm'), Utilities.parseDate(fecha + ' ' + fin, tz, 'yyyy-MM-dd HH:mm'));
      } catch (x) {}
    }
    SpreadsheetApp.flush();
    avisarCambio_(cfg, f.r, antes, { fecha: fecha, hora: hora, profesional: libre.profesionalNombre }, token);
    return { ok: true, txt: fechaBonita_(fecha) + ' a las ' + hora, profesional: libre.profesionalNombre };
  } finally {
    lock.releaseLock();
  }
}

function citaCancelar(id, token) {
  var cfg = leerConfig_(), tz = tz_();
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) throw new Error('Inténtalo de nuevo en unos segundos.');
  try {
    var f = validarCita_(id, token);
    exigirPlazo_(f, cfg, tz);
    cancelarFila_(f, cfg);
    return true;
  } finally {
    lock.releaseLock();
  }
}

function avisarCambio_(cfg, r, antes, nueva, token) {
  var de = esc_(fechaBonita_(antes.fecha)) + ' a las ' + esc_(antes.hora);
  try {
    MailApp.sendEmail({
      to: cfg.EMAIL_NEGOCIO, name: 'Reservas ' + (cfg.NEGOCIO || ''), replyTo: r[11] || undefined,
      subject: 'Cita cambiada: ' + r[6] + ' · ahora ' + fechaBonita_(nueva.fecha) + ' ' + nueva.hora,
      htmlBody: plantilla_('Cita cambiada', '<p>' + esc_(r[9]) + ' (' + esc_(r[10]) + ') ha cambiado su cita de <b>' + esc_(r[6]) + '</b>.</p>' +
        '<p>Antes: <s>' + de + '</s><br>Ahora: <b>' + esc_(fechaBonita_(nueva.fecha)) + ' a las ' + esc_(nueva.hora) + '</b> con ' + esc_(nueva.profesional) + '</p>')
    });
  } catch (x) { console.error('Aviso de cambio al negocio', x); }
  if (!r[11]) return;
  try {
    MailApp.sendEmail({
      to: r[11], name: cfg.NEGOCIO, replyTo: cfg.EMAIL_NEGOCIO,
      subject: 'Cita cambiada en ' + cfg.NEGOCIO + ': ahora el ' + fechaBonita_(nueva.fecha) + ' a las ' + nueva.hora,
      htmlBody: plantilla_('Cita cambiada', '<p>Hola ' + esc_(r[9]) + ',</p><p>Tu cita queda así:</p>' +
        lineaCita_(r[6], nueva.profesional, nueva.fecha, nueva.hora) +
        (cfg.DIRECCION ? '<p>📍 ' + esc_(cfg.DIRECCION) + '</p>' : '') +
        lineaGestion_(cfg, urlGestion_(r[0], token), '¿Necesitas cambiarla otra vez?'))
    });
  } catch (x) { console.error('Confirmación de cambio al cliente', x); }
}

/** Estado de una cita para la página del cliente (sin datos si el token no coincide). */
function datosCita_(id, token) {
  var cfg = leerConfig_(), tz = tz_();
  var f = id ? buscarCita_(String(id)) : null;
  var datos;
  if (!f || !token || f.r[14] !== String(token)) datos = { estado: 'invalido' };
  else if (String(f.r[13]).trim() !== 'Confirmada') datos = { estado: 'cancelada' };
  else {
    var faltan = horasHastaCita_(f, tz);
    datos = { estado: faltan <= 0 ? 'pasada' : (faltan < cfg.CANCELACION_HORAS ? 'tarde' : 'ok'),
      id: f.r[0], t: f.r[14], servicio: f.r[6], profesional: f.r[8], nombre: f.r[9],
      txt: fechaBonita_(normFecha_(f.r[2])) + ' a las ' + f.r[3] };
  }
  datos.negocio = cfg.NEGOCIO || ''; datos.telefono = cfg.TELEFONO_NEGOCIO || ''; datos.horas = cfg.CANCELACION_HORAS;
  return datos;
}

function paginaCita_(id, token) {
  var cfg = leerConfig_();
  var col = color_(cfg.COLOR_PRINCIPAL, '#1c1f24'), fondo = color_(cfg.FONDO_PANEL, '#f4f5f7');
  var datos = datosCita_(id, token);
  var logo = /^https:\/\//.test(cfg.LOGO_URL || '') ? cfg.LOGO_URL : '';
  var html = HTML_CITA_
    .replace(/__COLOR__/g, col).replace(/__FONDO__/g, fondo)
    .replace('__LOGO__', logo ? '<img src="' + esc_(logo) + '" alt="" style="max-height:44px;max-width:200px;display:block;margin:0 auto 10px">' : '')
    .replace('__DATOS__', JSON.stringify(datos).replace(/</g, '\\u003c'));
  return HtmlService.createHtmlOutput(html).setTitle('Tu cita · ' + (cfg.NEGOCIO || ''))
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

var HTML_CITA_ = '<!doctype html><html lang="es"><head><base target="_top"><meta charset="utf-8"><style>' +
  '*{box-sizing:border-box}body{margin:0;background:__FONDO__;color:#1c1f24;font:16px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif}' +
  '.w{max-width:480px;margin:0 auto;padding:28px 16px 48px}.neg{text-align:center;color:#6b7280;font-size:13px;letter-spacing:.08em;text-transform:uppercase;margin:0 0 14px}' +
  '.card{background:#fff;border:1px solid #e3e6ea;border-radius:16px;padding:20px}h1{font-size:22px;margin:0 0 6px}' +
  '.cita{background:__FONDO__;border-radius:12px;padding:12px 14px;margin:14px 0}.cita b{display:block}' +
  '.btn{display:block;width:100%;border:0;border-radius:999px;background:__COLOR__;color:#fff;font:inherit;font-weight:600;padding:13px;min-height:48px;cursor:pointer;margin-top:10px}' +
  '.btn.sec{background:transparent;color:#1c1f24;box-shadow:inset 0 0 0 1px #cfd4da}.btn:disabled{opacity:.5;cursor:wait}' +
  '.lbl{font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;margin:16px 0 8px}' +
  '.dias{display:flex;gap:6px;overflow-x:auto;padding-bottom:6px}.dia{flex:0 0 64px;border:1px solid #dde1e7;background:#fff;border-radius:12px;padding:8px 0;text-align:center;font:inherit;font-size:12px;cursor:pointer}' +
  '.dia b{display:block;font-size:18px}.horas{display:grid;grid-template-columns:repeat(auto-fill,minmax(76px,1fr));gap:6px}' +
  '.hora{border:1px solid #dde1e7;background:#fff;border-radius:10px;padding:10px 0;font:inherit;cursor:pointer;min-height:44px}' +
  '.sel{background:__COLOR__!important;border-color:__COLOR__!important;color:#fff}.err{color:#a2463a;font-size:14px;min-height:1em;margin:10px 0 0}' +
  '.muted{color:#6b7280;font-size:14px}a{color:inherit}' +
  '</style></head><body><div class="w">__LOGO__<p class="neg" id="neg"></p><div class="card" id="app"></div></div><script>' +
  '(function(){var D=__DATOS__,app=document.getElementById("app"),sel={};' +
  'document.getElementById("neg").textContent=D.negocio;' +
  'function e(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;","\\"":"&quot;"}[c]})}' +
  'var tel=D.telefono?\' Llama al <a href="tel:\'+e(D.telefono.replace(/\\s/g,""))+\'"><b>\'+e(D.telefono)+"</b></a>.":"";' +
  'var caja=function(){return \'<div class="cita"><b>\'+e(D.servicio)+"</b>con "+e(D.profesional)+"<br>"+e(D.txt)+"</div>"};' +
  'function run(fn,args,ok){var r=google.script.run.withSuccessHandler(ok).withFailureHandler(function(x){err(x.message||String(x))});r[fn].apply(r,args)}' +
  'function err(m){var n=document.getElementById("err");if(n)n.textContent=m;else app.innerHTML="<h1>No se ha podido</h1><p>"+e(m)+"</p>";' +
  'Array.prototype.forEach.call(app.querySelectorAll("button"),function(b){b.disabled=false})}' +
  'function inicio(){if(D.estado==="invalido"){app.innerHTML="<h1>Enlace no válido</h1><p class=muted>No encontramos esta cita.</p>";return}' +
  'if(D.estado==="cancelada"){app.innerHTML="<h1>Cita cancelada</h1><p class=muted>Esta cita ya está cancelada.</p>";return}' +
  'if(D.estado==="pasada"){app.innerHTML="<h1>Esta cita ya ha pasado</h1>"+caja();return}' +
  'if(D.estado==="tarde"){app.innerHTML="<h1>Tu cita</h1>"+caja()+"<p>Faltan menos de "+e(D.horas)+" h y ya no se puede cambiar ni cancelar online."+tel+"</p>";return}' +
  'app.innerHTML="<h1>Hola, "+e(D.nombre)+"</h1><p class=muted>Esta es tu cita:</p>"+caja()+' +
  '\'<button class="btn" id="bc">Cambiar día u hora</button><button class="btn sec" id="bx">Cancelar la cita</button><p class="err" id="err"></p>\';' +
  'document.getElementById("bc").onclick=dias;document.getElementById("bx").onclick=confirmarCancelar}' +
  'function dias(){this&&(this.disabled=true);run("citaDias",[D.id,D.t],function(l){sel={};' +
  'if(!l.length){app.innerHTML="<h1>Sin huecos</h1><p>No quedan huecos libres en los próximos días."+tel+\'</p><button class="btn sec" id="vol">Volver</button>\';document.getElementById("vol").onclick=inicio;return}' +
  'var DS=["dom","lun","mar","mié","jue","vie","sáb"];' +
  'app.innerHTML="<h1>Elige el nuevo día</h1>"+caja()+\'<p class="lbl">Día</p><div class="dias">\'+l.map(function(d){var p=d.fecha.split("-"),x=new Date(+p[0],p[1]-1,+p[2]);' +
  'return \'<button class="dia" data-f="\'+d.fecha+\'" title="\'+e(d.txt)+\'">\'+DS[x.getDay()]+"<b>"+x.getDate()+"</b></button>"}).join("")+' +
  '\'</div><div id="hs"></div><button class="btn" id="ok" disabled>Confirmar el cambio</button><button class="btn sec" id="vol">Volver</button><p class="err" id="err"></p>\';' +
  'document.getElementById("vol").onclick=inicio;document.getElementById("ok").onclick=cambiar;' +
  'Array.prototype.forEach.call(app.querySelectorAll(".dia"),function(b){b.onclick=function(){horas(b)}})})}' +
  'function horas(b){Array.prototype.forEach.call(app.querySelectorAll(".dia"),function(x){x.classList.toggle("sel",x===b)});sel={fecha:b.getAttribute("data-f"),txt:b.title};' +
  'document.getElementById("ok").disabled=true;var hs=document.getElementById("hs");hs.innerHTML=\'<p class="muted">Buscando horas…</p>\';' +
  'run("citaHoras",[D.id,D.t,sel.fecha],function(l){hs.innerHTML=\'<p class="lbl">Hora</p><div class="horas">\'+l.map(function(h){return \'<button class="hora">\'+h+"</button>"}).join("")+"</div>";' +
  'Array.prototype.forEach.call(hs.querySelectorAll(".hora"),function(h){h.onclick=function(){Array.prototype.forEach.call(hs.querySelectorAll(".hora"),function(x){x.classList.toggle("sel",x===h)});' +
  'sel.hora=h.textContent;var ok=document.getElementById("ok");ok.disabled=false;ok.textContent="Cambiar al "+sel.txt+" a las "+sel.hora}})})}' +
  'function cambiar(){var ok=document.getElementById("ok");ok.disabled=true;ok.textContent="Guardando…";' +
  'run("citaCambiar",[D.id,D.t,sel.fecha,sel.hora],function(r){if(!r.ok){err(r.error);var b=app.querySelector(".dia.sel");if(b)horas(b);return}' +
  'D.txt=r.txt;D.profesional=r.profesional;app.innerHTML="<h1>¡Cita cambiada!</h1>"+caja()+"<p class=muted>Te hemos enviado la confirmación por email. ¡Te esperamos!</p>"})}' +
  'function confirmarCancelar(){app.innerHTML="<h1>¿Cancelar tu cita?</h1>"+caja()+\'<button class="btn" id="si">Sí, cancelar la cita</button><button class="btn sec" id="no">No, mantenerla</button><p class="err" id="err"></p>\';' +
  'document.getElementById("no").onclick=inicio;document.getElementById("si").onclick=function(){this.disabled=true;this.textContent="Cancelando…";' +
  'run("citaCancelar",[D.id,D.t],function(){app.innerHTML="<h1>Cita cancelada</h1>"+caja()+"<p class=muted>Hemos avisado a "+e(D.negocio)+". ¡Gracias por avisar!</p>"})}}' +
  'inicio()})();</script></body></html>';

/* ============================ OPINIONES Y RESEÑAS ============================ */
/* RESENA_HORAS después de cada cita se pide opinión al cliente, una sola vez por email:
   - con RESENA_URL: botón para dejar la reseña en Google;
   - sin RESENA_URL: 5 estrellas que llevan a ?accion=opinion y se guardan en la pestaña Opiniones.
   Se pide a todos por igual (Google no permite pedir reseñas solo a los clientes contentos). */

var RESENA_MAX_H = 48; // no pedir opinión de citas de hace más de 48 h (p. ej. citas pasadas a mano)

function pedirOpiniones_(cfg, tz, sh) {
  var vals = sh.getDataRange().getDisplayValues();
  var ahora = Date.now(), enviados = 0, yaPedido = {};
  for (var k = 1; k < vals.length; k++) {
    if (/^Enviad/.test(String(vals[k][COL_RESENA - 1] || ''))) yaPedido[String(vals[k][11]).trim().toLowerCase()] = true;
  }
  for (var i = 1; i < vals.length; i++) {
    var r = vals[i];
    if (String(r[13]).trim() !== 'Confirmada' || String(r[COL_RESENA - 1] || '').trim()) continue;
    var fecha = normFecha_(r[2]), fin = String(r[4]).trim();
    if (!fecha || !/^\d{1,2}:\d{2}$/.test(fin)) continue;
    var pasadasH = (ahora - Utilities.parseDate(fecha + ' ' + fin, tz, 'yyyy-MM-dd HH:mm').getTime()) / 3600000;
    if (pasadasH < cfg.RESENA_HORAS) continue;
    if (pasadasH > RESENA_MAX_H) { sh.getRange(i + 1, COL_RESENA).setValue('No enviada (cita antigua)'); continue; }
    var email = String(r[11] || '').trim();
    if (!email) { sh.getRange(i + 1, COL_RESENA).setValue('Sin email'); continue; }
    if (yaPedido[email.toLowerCase()]) { sh.getRange(i + 1, COL_RESENA).setValue('Ya pedida antes'); continue; }
    if (MailApp.getRemainingDailyQuota() <= CUPO_RESERVADO_CONFIRMACIONES) { console.warn('Opiniones pausadas: poco cupo de emails.'); break; }
    try {
      mandarPeticionOpinion_(cfg, { id: r[0], token: r[14], servicio: r[6], profesional: r[8], nombre: r[9], email: email });
      sh.getRange(i + 1, COL_RESENA).setValue('Enviada ' + Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd HH:mm') + (cfg.RESENA_URL ? ' (Google)' : ' (propia)'));
      yaPedido[email.toLowerCase()] = true;
      enviados++;
    } catch (x) { console.error('Opinión ' + r[0], x); }
  }
  if (enviados) console.log('Peticiones de opinión enviadas: ' + enviados);
}

function mandarPeticionOpinion_(cfg, c, destino) {
  var col = color_(cfg.COLOR_PRINCIPAL, '#1c1f24');
  var cuerpo = '<p>Hola ' + esc_(c.nombre) + ',</p><p>Gracias por venir a ' + esc_(cfg.NEGOCIO) + '. ¿Qué tal tu <b>' + esc_(String(c.servicio).toLowerCase()) +
    '</b> con ' + esc_(c.profesional) + '?</p>';
  if (/^https:\/\//.test(cfg.RESENA_URL || '')) {
    cuerpo += '<p>Si tienes un minuto, tu reseña en Google nos ayuda muchísimo a que más gente nos conozca:</p>' +
      '<p><a href="' + esc_(cfg.RESENA_URL) + '" style="display:inline-block;background:' + col + ';color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:bold">Dejar mi reseña en Google</a></p>';
  } else {
    var web = webNegocio_(cfg);
    var base = (web ? web + 'opinion.html?id=' : urlWeb_() + '?accion=opinion&id=') + encodeURIComponent(c.id) + '&t=' + c.token + '&n=';
    var estrellas = [1, 2, 3, 4, 5].map(function (n) {
      return '<a href="' + base + n + '" style="font-size:34px;line-height:1;color:#e0a92e;text-decoration:none;padding:0 3px" title="' + n + ' de 5">★</a>';
    }).join('');
    cuerpo += '<p>Puntúa tu visita tocando una estrella (5 = genial). Solo te llevará un segundo:</p><p>' + estrellas + '</p>';
  }
  MailApp.sendEmail({
    to: destino || c.email, name: cfg.NEGOCIO, replyTo: cfg.EMAIL_NEGOCIO,
    subject: '¿Qué tal tu visita a ' + cfg.NEGOCIO + '?',
    htmlBody: plantilla_('¿Qué tal fue?', cuerpo)
  });
}

function hojaOpiniones_() {
  var ss = SpreadsheetApp.getActive();
  return ss.getSheetByName(HOJAS.opiniones) || crearHoja_(ss, HOJAS.opiniones, CAB_OPINIONES, []);
}

/** Crea o actualiza la opinión de una cita. Devuelve true si es nueva. */
function guardarOpinionFila_(r, datos) {
  var sh = hojaOpiniones_(), tz = tz_();
  var vals = sh.getDataRange().getDisplayValues();
  for (var i = 1; i < vals.length; i++) {
    if (vals[i][1] === r[0]) {
      if (datos.n) sh.getRange(i + 1, 6).setValue(String(datos.n));
      if (datos.comentario !== undefined) sh.getRange(i + 1, 7, 1, 2).setValues([[datos.comentario, datos.publicar ? 'SI' : 'NO']]);
      return false;
    }
  }
  sh.appendRow([Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd HH:mm'), r[0], r[9], r[6], r[8], String(datos.n || ''),
    datos.comentario || '', datos.publicar ? 'SI' : 'NO']);
  return true;
}

function citaPorToken_(id, token) {
  var f = id ? buscarCita_(String(id)) : null;
  return (f && token && f.r[14] === String(token)) ? f : null;
}

function avisarOpinion_(cfg, r, n, comentario) {
  try {
    MailApp.sendEmail({ to: cfg.EMAIL_NEGOCIO, name: 'Opiniones ' + (cfg.NEGOCIO || ''),
      subject: (comentario ? 'Nuevo comentario de ' : 'Nueva opinión: ' + n + '/5 de ') + r[9],
      htmlBody: plantilla_('Opinión de un cliente', '<p><b>' + esc_(r[9]) + '</b> · ' + esc_(r[6]) + ' con ' + esc_(r[8]) + ' (' + esc_(fechaBonita_(normFecha_(r[2]))) + ')</p>' +
        '<p style="font-size:22px;color:#e0a92e">' + '★★★★★'.slice(0, n) + '<span style="color:#ccc">' + '★★★★★'.slice(n) + '</span></p>' +
        (comentario ? '<p>“' + esc_(comentario) + '”</p>' : '') + '<p style="color:#888;font-size:13px">Todas las opiniones están en la pestaña Opiniones de tu hoja.</p>') });
  } catch (x) { console.error('Aviso de opinión', x); }
}

/** Página a la que llevan las estrellas del email: guarda la puntuación al momento y deja añadir un comentario. */
/** Guarda la puntuación de una estrella del email (la primera vez avisa al negocio). */
function registrarPuntuacion_(id, token, n) {
  var cfg = leerConfig_(), f = citaPorToken_(id, token);
  n = Math.max(1, Math.min(5, parseInt(n, 10) || 0));
  var datos = { ok: true, negocio: cfg.NEGOCIO || '', valido: !!f, n: n };
  if (f) {
    var lock = LockService.getScriptLock(); lock.tryLock(10000);
    var nueva;
    try { nueva = guardarOpinionFila_(f.r, { n: n }); } finally { lock.releaseLock(); }
    if (nueva) avisarOpinion_(cfg, f.r, n, '');
    datos.id = f.r[0]; datos.t = f.r[14]; datos.nombre = f.r[9]; datos.profesional = f.r[8];
  }
  return datos;
}

function paginaOpinion_(id, token, n) {
  var cfg = leerConfig_();
  var datos = registrarPuntuacion_(id, token, n);
  var col = color_(cfg.COLOR_PRINCIPAL, '#1c1f24'), fondo = color_(cfg.FONDO_PANEL, '#f4f5f7');
  var logo = /^https:\/\//.test(cfg.LOGO_URL || '') ? cfg.LOGO_URL : '';
  var html = HTML_OPINION_.replace(/__COLOR__/g, col).replace(/__FONDO__/g, fondo)
    .replace('__LOGO__', logo ? '<img src="' + esc_(logo) + '" alt="" style="max-height:44px;max-width:200px;display:block;margin:0 auto 10px">' : '')
    .replace('__DATOS__', JSON.stringify(datos).replace(/</g, '\\u003c'));
  return HtmlService.createHtmlOutput(html).setTitle('Tu opinión · ' + (cfg.NEGOCIO || ''))
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/** Lo llama la página de opinión al enviar el comentario (o al cambiar la puntuación). */
function guardarOpinion(id, token, n, comentario, publicar) {
  var cfg = leerConfig_(), f = citaPorToken_(id, token);
  if (!f) throw new Error('Enlace no válido.');
  n = Math.max(1, Math.min(5, parseInt(n, 10) || 5));
  comentario = String(comentario || '').trim().slice(0, 600);
  var lock = LockService.getScriptLock(); lock.tryLock(10000);
  try { guardarOpinionFila_(f.r, { n: n, comentario: comentario, publicar: !!publicar }); } finally { lock.releaseLock(); }
  if (comentario) avisarOpinion_(cfg, f.r, n, comentario);
  return true;
}

/** Menú: envía al email del negocio la petición de opinión tal como la verá el cliente. */
function opinionDePrueba() {
  var cfg = leerConfig_();
  if (!emailNegocioOAviso_(cfg)) return;
  var serv = leerServicios_()[0] || { nombre: 'Servicio' }, pro = leerProfesionales_()[0] || { nombre: 'Profesional' };
  mandarPeticionOpinion_(cfg, { id: 'PRUEBA', token: 'prueba', servicio: serv.nombre, profesional: pro.nombre, nombre: 'Cliente de prueba' }, cfg.EMAIL_NEGOCIO);
  SpreadsheetApp.getUi().alert('Petición de opinión de prueba enviada a ' + cfg.EMAIL_NEGOCIO + '.' +
    (cfg.RESENA_URL ? ' Lleva al enlace de reseñas de Google.' : ' Como no hay RESENA_URL, lleva a la página propia (las estrellas de la prueba no guardan nada).'));
}

var HTML_OPINION_ = '<!doctype html><html lang="es"><head><base target="_top"><meta charset="utf-8"><style>' +
  '*{box-sizing:border-box}body{margin:0;background:__FONDO__;color:#1c1f24;font:16px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif}' +
  '.w{max-width:480px;margin:0 auto;padding:28px 16px 48px}.neg{text-align:center;color:#6b7280;font-size:13px;letter-spacing:.08em;text-transform:uppercase;margin:0 0 14px}' +
  '.card{background:#fff;border:1px solid #e3e6ea;border-radius:16px;padding:20px}h1{font-size:22px;margin:0 0 6px}.muted{color:#6b7280;font-size:14px}' +
  '.st{display:flex;gap:4px;margin:12px 0}.st button{border:0;background:none;font-size:38px;line-height:1;color:#d6d9de;cursor:pointer;padding:0 2px}.st button.on{color:#e0a92e}' +
  'textarea{width:100%;min-height:96px;font:inherit;font-size:16px;border:1px solid #dde1e7;border-radius:12px;padding:10px 12px;resize:vertical}' +
  'label.ck{display:flex;gap:8px;align-items:flex-start;font-size:14px;color:#4b5563;margin:12px 0}label.ck input{margin-top:3px}' +
  '.btn{display:block;width:100%;border:0;border-radius:999px;background:__COLOR__;color:#fff;font:inherit;font-weight:600;padding:13px;min-height:48px;cursor:pointer;margin-top:6px}.btn:disabled{opacity:.5}' +
  '.err{color:#a2463a;font-size:14px;min-height:1em;margin:10px 0 0}' +
  '</style></head><body><div class="w">__LOGO__<p class="neg" id="neg"></p><div class="card" id="app"></div></div><script>' +
  '(function(){var D=__DATOS__,app=document.getElementById("app"),n=D.n;document.getElementById("neg").textContent=D.negocio;' +
  'function e(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;","\\"":"&quot;"}[c]})}' +
  'if(!D.valido){app.innerHTML="<h1>Enlace no válido</h1><p class=muted>No encontramos esta visita.</p>";return}' +
  'app.innerHTML="<h1>¡Gracias, "+e(D.nombre)+"!</h1><p class=muted>Hemos guardado tu puntuación. Puedes cambiarla aquí:</p>"+' +
  '\'<div class="st" id="st">\'+[1,2,3,4,5].map(function(i){return \'<button type="button" data-n="\'+i+\'" aria-label="\'+i+\' de 5">★</button>\'}).join("")+"</div>"+' +
  '\'<p style="margin:14px 0 6px;font-weight:600">¿Quieres contarnos algo más? (opcional)</p><textarea id="tx" maxlength="600" placeholder="Qué te gustó, qué mejorarías…"></textarea>\'+' +
  '\'<label class="ck"><input type="checkbox" id="pb"> Podéis mostrar mi opinión en la web con mi nombre de pila.</label>\'+' +
  '\'<button class="btn" id="ok">Enviar</button><p class="err" id="err"></p>\';' +
  'function pinta(){Array.prototype.forEach.call(document.querySelectorAll("#st button"),function(b){b.classList.toggle("on",+b.getAttribute("data-n")<=n)})}pinta();' +
  'Array.prototype.forEach.call(document.querySelectorAll("#st button"),function(b){b.onclick=function(){n=+b.getAttribute("data-n");pinta()}});' +
  'document.getElementById("ok").onclick=function(){var b=this;b.disabled=true;b.textContent="Enviando…";' +
  'google.script.run.withSuccessHandler(function(){app.innerHTML="<h1>¡Recibido!</h1><p>Gracias por tu opinión. A "+e(D.profesional)+" le ayuda mucho saber qué tal fue.</p>"})' +
  '.withFailureHandler(function(x){b.disabled=false;b.textContent="Enviar";document.getElementById("err").textContent=x.message||String(x)})' +
  '.guardarOpinion(D.id,D.t,n,document.getElementById("tx").value,document.getElementById("pb").checked)}})();</script></body></html>';

/* ============================ CANCELACIÓN POR EL CLIENTE ============================ */

function buscarCita_(id) {
  var sh = SpreadsheetApp.getActive().getSheetByName(HOJAS.citas);
  var vals = sh.getDataRange().getDisplayValues();
  for (var i = 1; i < vals.length; i++) if (vals[i][0] === id) return { sh: sh, fila: i + 1, r: vals[i] };
  return null;
}

function cancelarFila_(f, cfg) {
  f.sh.getRange(f.fila, 14).setValue('Cancelada');
  if (f.r[15]) { try { var ev = CalendarApp.getDefaultCalendar().getEventById(f.r[15]); if (ev) ev.deleteEvent(); } catch (x) {} }
  try {
    MailApp.sendEmail({ to: cfg.EMAIL_NEGOCIO, name: 'Reservas ' + (cfg.NEGOCIO || ''),
      subject: 'Cita cancelada: ' + f.r[6] + ' · ' + fechaBonita_(normFecha_(f.r[2])) + ' ' + f.r[3],
      htmlBody: plantilla_('Cita cancelada', '<p>' + esc_(f.r[9]) + ' (' + esc_(f.r[10]) + ') ha cancelado su cita de <b>' +
        esc_(f.r[6]) + '</b> del ' + esc_(fechaBonita_(normFecha_(f.r[2]))) + ' a las ' + esc_(f.r[3]) + '.</p>') });
  } catch (x) {}
}

function paginaCancelar_(id, token, confirmar) {
  var cfg = leerConfig_(), tz = tz_();
  var f = id ? buscarCita_(id) : null;
  var html;
  if (!f || !token || f.r[14] !== token) html = '<h2>Enlace no válido</h2><p>No encontramos esta cita.</p>';
  else if (f.r[13] === 'Cancelada') html = '<h2>Cita ya cancelada</h2><p>Esta cita ya estaba cancelada.</p>';
  else {
    var inicio = Utilities.parseDate(normFecha_(f.r[2]) + ' ' + f.r[3], tz, 'yyyy-MM-dd HH:mm');
    var horasQueFaltan = (inicio.getTime() - Date.now()) / 3600000;
    var desc = '<p><b>' + esc_(f.r[6]) + '</b> con ' + esc_(f.r[8]) + '<br>' + esc_(fechaBonita_(normFecha_(f.r[2]))) + ' a las ' + esc_(f.r[3]) + '</p>';
    if (horasQueFaltan < cfg.CANCELACION_HORAS) {
      html = '<h2>Ya no se puede cancelar online</h2>' + desc + '<p>Faltan menos de ' + cfg.CANCELACION_HORAS +
        ' h. Llama al negocio: <b>' + esc_(cfg.TELEFONO_NEGOCIO) + '</b>.</p>';
    } else if (confirmar) {
      var lock = LockService.getScriptLock(); lock.tryLock(10000);
      try { cancelarFila_(f, cfg); } finally { lock.releaseLock(); }
      html = '<h2>Cita cancelada</h2>' + desc + '<p>Hemos avisado a ' + esc_(cfg.NEGOCIO) + '. ¡Gracias por avisar!</p>';
    } else {
      var url = urlWeb_() + '?accion=cancelar&id=' + encodeURIComponent(id) + '&t=' + encodeURIComponent(token) + '&confirmar=1';
      html = '<h2>¿Cancelar tu cita?</h2>' + desc +
        '<p><a href="' + url + '" target="_top" style="display:inline-block;background:' + color_(cfg.COLOR_PRINCIPAL, '#1c1f24') + ';color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none">Sí, cancelar la cita</a></p>';
    }
  }
  return HtmlService.createHtmlOutput('<div style="font-family:Arial,sans-serif;max-width:480px;margin:40px auto;padding:0 16px;color:#1c1f24">' +
    '<p style="color:#888;font-size:13px">' + esc_(cfg.NEGOCIO) + '</p>' + html + '</div>')
    .setTitle('Tu cita · ' + (cfg.NEGOCIO || '')).addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/* ================================ PANEL DEL NEGOCIO ================================ */
/* El panel se sirve desde el propio script (?accion=panel) y llama a estas funciones con
   google.script.run. Los datos solo se devuelven si el PIN coincide con PIN_PANEL. */

/** Colores y logo del negocio para el panel. No devuelve datos privados, por eso no pide PIN. */
function panelEstilo() {
  var c = leerConfig_();
  return { negocio: c.NEGOCIO || 'Citas', color: color_(c.COLOR_PRINCIPAL, '#0d1d38'),
           acento: color_(c.COLOR_ACENTO, '#e0b03f'), logo: /^https:\/\//.test(c.LOGO_URL || '') ? c.LOGO_URL : '',
           saludo: String(c.SALUDO || '').slice(0, 60), fondo: color_(c.FONDO_PANEL, '') };
}

function color_(v, porDefecto) { v = String(v || '').trim(); return /^#[0-9a-fA-F]{6}$/.test(v) ? v : porDefecto; }

function comprobarPin_(pin) {
  var cfg = leerConfig_();
  if (!cfg.PIN_PANEL || String(pin || '').trim() !== cfg.PIN_PANEL) throw new Error('PIN incorrecto.');
  return cfg;
}

function panelCitas(pin, desde, hasta) {
  var cfg = comprobarPin_(pin);
  desde = normFecha_(desde); hasta = normFecha_(hasta);
  var citas = filas_(HOJAS.citas).filter(function (r) {
    var f = normFecha_(r[2]); return f && f >= desde && f <= hasta;
  }).map(function (r) {
    return { id: r[0], fecha: normFecha_(r[2]), hora: r[3], fin: r[4], servicio: r[6], profesional: r[8],
      nombre: r[9], telefono: r[10], email: r[11], notas: r[12], estado: r[13] };
  }).sort(function (a, b) { return (a.fecha + a.hora).localeCompare(b.fecha + b.hora); });
  var cerrados = filas_(HOJAS.cerrados).map(function (r) {
    return { desde: normFecha_(r[0]), hasta: normFecha_(r[1]) || normFecha_(r[0]), quien: r[2], motivo: r[3] };
  });
  return { negocio: cfg.NEGOCIO, citas: citas, cerrados: cerrados };
}

function panelCancelar(pin, id) {
  var cfg = comprobarPin_(pin);
  var lock = LockService.getScriptLock(); lock.tryLock(10000);
  try {
    var f = buscarCita_(id);
    if (!f) throw new Error('Cita no encontrada.');
    if (f.r[13] !== 'Cancelada') cancelarFila_(f, cfg);
    return true;
  } finally { lock.releaseLock(); }
}

function panelCerrar(pin, desde, hasta, motivo) {
  comprobarPin_(pin);
  desde = normFecha_(desde); hasta = normFecha_(hasta) || desde;
  if (!desde) throw new Error('Fecha no válida.');
  SpreadsheetApp.getActive().getSheetByName(HOJAS.cerrados)
    .appendRow([desde, hasta, 'TODOS', String(motivo || 'Cerrado').slice(0, 80)]);
  return true;
}
