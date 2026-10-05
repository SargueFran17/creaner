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
 *   ?accion=cancelar&id=ID&t=TOKEN                  página para que el cliente cancele
 *   ?accion=panel                                   panel del negocio (pide PIN)
 *   POST {accion:"reservar", ...}                   crea la cita (cuerpo JSON como text/plain)
 */

var VERSION = '1.0';
var HOJAS = {
  config: 'Config',
  servicios: 'Servicios',
  profesionales: 'Profesionales',
  horario: 'Horario',
  cerrados: 'Cerrados',
  citas: 'Citas'
};
var CAB_CITAS = ['ID', 'Creada', 'Fecha', 'Hora', 'Fin', 'Servicio ID', 'Servicio', 'Profesional ID', 'Profesional',
  'Nombre', 'Teléfono', 'Email', 'Notas', 'Estado', 'Token', 'Evento calendario'];

/* ======================= MENÚ Y CONFIGURACIÓN INICIAL ======================= */

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Creaner Citas')
    .addItem('Configurar hoja (solo la primera vez)', 'configurar')
    .addItem('Enviarme un email de prueba', 'emailDePrueba')
    .addItem('Ver enlace del panel', 'mostrarEnlacePanel')
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
    ['PIN_PANEL', String(Math.floor(100000 + Math.random() * 900000)), 'PIN del panel del negocio. Cámbialo si quieres'],
    ['CALENDARIO', 'NO', 'SI = añadir cada cita al Google Calendar de esta cuenta']
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

function emailDePrueba() {
  var c = leerConfig_();
  MailApp.sendEmail({ to: c.EMAIL_NEGOCIO, subject: 'Prueba de Creaner Citas', htmlBody: '<p>Si te llega este email, los avisos funcionan.</p>', name: c.NEGOCIO });
  SpreadsheetApp.getUi().alert('Email enviado a ' + c.EMAIL_NEGOCIO + '. Mira también en Spam.');
}

function mostrarEnlacePanel() {
  var url = ScriptApp.getService().getUrl();
  var msg = url ? ('Panel del negocio:\n' + url + '?accion=panel\n\nPIN: el de la pestaña Config (PIN_PANEL).')
                : 'Primero publica el script: Implementar → Nueva implementación → Aplicación web.';
  SpreadsheetApp.getUi().alert('Creaner Citas', msg, SpreadsheetApp.getUi().ButtonSet.OK);
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
  return c;
}

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
  return json_({ ok: false, error: 'Acción no reconocida.' });
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
      libre.profesional, libre.profesionalNombre, nombre, telefono, email, notas, 'Confirmada', token, eventoId]);
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
  return '<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#1c1f24">' +
    '<h2 style="margin:0 0 12px">' + esc_(titulo) + '</h2>' + cuerpo +
    '<p style="color:#888;font-size:12px;margin-top:24px">Reservas gestionadas con Creaner</p></div>';
}

function avisar_(cfg, c, token) {
  var linea = '<p><b>' + esc_(c.servicio) + '</b> con ' + esc_(c.profesional) + '<br>' +
    esc_(fechaBonita_(c.fecha)) + ' a las ' + esc_(c.hora) + '</p>';
  try {
    MailApp.sendEmail({
      to: cfg.EMAIL_NEGOCIO, name: 'Reservas ' + (cfg.NEGOCIO || ''), replyTo: c.email || undefined,
      subject: 'Nueva cita: ' + c.servicio + ' · ' + fechaBonita_(c.fecha) + ' ' + c.hora,
      htmlBody: plantilla_('Nueva cita', linea + '<p>' + esc_(c.nombre) + ' · ' + esc_(c.telefono) +
        (c.email ? ' · ' + esc_(c.email) : '') + '</p>' + (c.notas ? '<p>Notas: ' + esc_(c.notas) + '</p>' : ''))
    });
  } catch (x) { console.error('Aviso al negocio', x); }
  if (!c.email) return;
  var url = ScriptApp.getService().getUrl() + '?accion=cancelar&id=' + encodeURIComponent(c.id) + '&t=' + token;
  try {
    MailApp.sendEmail({
      to: c.email, name: cfg.NEGOCIO, replyTo: cfg.EMAIL_NEGOCIO,
      subject: 'Tu cita en ' + cfg.NEGOCIO + ' está confirmada',
      htmlBody: plantilla_('¡Cita confirmada!', '<p>Hola ' + esc_(c.nombre) + ',</p>' + linea +
        (cfg.DIRECCION ? '<p>📍 ' + esc_(cfg.DIRECCION) + '</p>' : '') +
        (cfg.TELEFONO_NEGOCIO ? '<p>📞 ' + esc_(cfg.TELEFONO_NEGOCIO) + '</p>' : '') +
        '<p>¿No puedes venir? <a href="' + url + '">Cancela tu cita aquí</a>' +
        (cfg.CANCELACION_HORAS ? ' (hasta ' + cfg.CANCELACION_HORAS + ' h antes)' : '') + '.</p>')
    });
  } catch (x) { console.error('Confirmación al cliente', x); }
}

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
      var url = ScriptApp.getService().getUrl() + '?accion=cancelar&id=' + encodeURIComponent(id) + '&t=' + encodeURIComponent(token) + '&confirmar=1';
      html = '<h2>¿Cancelar tu cita?</h2>' + desc +
        '<p><a href="' + url + '" target="_top" style="display:inline-block;background:#1c1f24;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none">Sí, cancelar la cita</a></p>';
    }
  }
  return HtmlService.createHtmlOutput('<div style="font-family:Arial,sans-serif;max-width:480px;margin:40px auto;padding:0 16px;color:#1c1f24">' +
    '<p style="color:#888;font-size:13px">' + esc_(cfg.NEGOCIO) + '</p>' + html + '</div>')
    .setTitle('Tu cita · ' + (cfg.NEGOCIO || '')).addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/* ================================ PANEL DEL NEGOCIO ================================ */
/* El panel se sirve desde el propio script (?accion=panel) y llama a estas funciones con
   google.script.run. Los datos solo se devuelven si el PIN coincide con PIN_PANEL. */

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
