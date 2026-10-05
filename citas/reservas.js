/*!
 * Creaner Citas · widget de reserva v1
 * Uso en la web del negocio:
 *   <div id="creaner-citas" data-api="URL_DEL_SCRIPT/exec"></div>
 *   <script src="https://creaner.es/citas/reservas.js" defer></script>
 * Colores y tipografía: define estas variables CSS en la web del negocio (opcional):
 *   #creaner-citas { --cc-accent:#2f6157; --cc-ink:#1c2420; --cc-bg:#ffffff; --cc-soft:#eef2ef;
 *                    --cc-line:#d8e0db; --cc-radius:14px; --cc-font:inherit; }
 * data-api="demo" muestra datos de ejemplo sin conexión (para enseñar a clientes).
 * data-privacidad="URL" enlaza la política de privacidad del negocio en el paso de datos.
 */
(function () {
  'use strict';
  var root = document.getElementById('creaner-citas');
  if (!root) return;
  var API = root.getAttribute('data-api') || '';
  var PRIV = root.getAttribute('data-privacidad') || '';
  var DEMO = API === 'demo';

  var css = '' +
    '#creaner-citas{--cc-accent:#0d1d38;--cc-ink:#14181e;--cc-muted:#5d6672;--cc-bg:#fff;--cc-soft:#f1f3f6;--cc-line:#dde1e7;--cc-radius:14px;--cc-font:inherit;--cc-bad:#a2463a}' +
    '#creaner-citas .cc{font-family:var(--cc-font);color:var(--cc-ink);background:var(--cc-bg);border:1px solid var(--cc-line);border-radius:calc(var(--cc-radius) + 6px);overflow:hidden;max-width:100%}' +
    '#creaner-citas .cc-head{padding:16px 18px 12px;border-bottom:1px solid var(--cc-line)}' +
    '#creaner-citas .cc-title{margin:0;font-size:20px;font-weight:600}' +
    '#creaner-citas .cc-steps{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:12px 0 0;padding:0;list-style:none}' +
    '#creaner-citas .cc-steps li{font-size:11px;color:var(--cc-muted);display:flex;flex-direction:column;gap:5px}' +
    '#creaner-citas .cc-steps li:before{content:"";height:3px;border-radius:2px;background:var(--cc-line)}' +
    '#creaner-citas .cc-steps li.on{color:var(--cc-ink);font-weight:600}' +
    '#creaner-citas .cc-steps li.on:before,#creaner-citas .cc-steps li.done:before{background:var(--cc-accent)}' +
    '#creaner-citas .cc-body{padding:16px 18px 18px;display:flex;flex-direction:column;gap:12px;min-height:340px}' +
    '#creaner-citas .cc-lbl{font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--cc-muted);margin:0}' +
    '#creaner-citas .cc-list{display:flex;flex-direction:column;gap:6px}' +
    '#creaner-citas button{font:inherit;color:inherit;cursor:pointer}' +
    '#creaner-citas .cc-opt{display:grid;grid-template-columns:1fr auto;gap:2px 12px;text-align:left;border:1px solid var(--cc-line);background:var(--cc-bg);border-radius:var(--cc-radius);padding:11px 13px;min-height:48px}' +
    '#creaner-citas .cc-opt b{font-weight:600}' +
    '#creaner-citas .cc-opt span{grid-column:1;font-size:13px;color:var(--cc-muted)}' +
    '#creaner-citas .cc-opt em{grid-row:1/span 2;grid-column:2;align-self:center;font-style:normal;font-weight:600;font-variant-numeric:tabular-nums}' +
    '#creaner-citas .cc-opt[aria-pressed=true]{border-color:var(--cc-accent);box-shadow:inset 0 0 0 1px var(--cc-accent);background:var(--cc-soft)}' +
    '#creaner-citas .cc-days{display:flex;gap:6px;overflow-x:auto;padding-bottom:4px;scrollbar-width:thin}' +
    '#creaner-citas .cc-day{flex:0 0 58px;border:1px solid var(--cc-line);background:var(--cc-bg);border-radius:12px;padding:7px 0;display:flex;flex-direction:column;align-items:center;font-size:12px;line-height:1.25}' +
    '#creaner-citas .cc-day b{font-size:18px;font-variant-numeric:tabular-nums}' +
    '#creaner-citas .cc-day:disabled{opacity:.35;cursor:not-allowed}' +
    '#creaner-citas .cc-day[aria-pressed=true]{background:var(--cc-accent);border-color:var(--cc-accent);color:#fff}' +
    '#creaner-citas .cc-slots{display:grid;grid-template-columns:repeat(auto-fill,minmax(72px,1fr));gap:6px}' +
    '#creaner-citas .cc-slot{border:1px solid var(--cc-line);background:var(--cc-bg);border-radius:10px;padding:9px 0;font-variant-numeric:tabular-nums;min-height:42px}' +
    '#creaner-citas .cc-slot[aria-pressed=true]{background:var(--cc-accent);border-color:var(--cc-accent);color:#fff}' +
    '#creaner-citas .cc-f{display:flex;flex-direction:column;gap:5px}' +
    '#creaner-citas .cc-f label{font-size:13px;font-weight:600}' +
    '#creaner-citas .cc-f input,#creaner-citas .cc-f textarea{font:inherit;font-size:16px;border:1px solid var(--cc-line);border-radius:12px;padding:10px 12px;background:var(--cc-bg);color:var(--cc-ink);width:100%;box-sizing:border-box}' +
    '#creaner-citas .cc-f textarea{min-height:64px;resize:vertical}' +
    '#creaner-citas .cc-check{display:flex;gap:8px;align-items:flex-start;font-size:13px;color:var(--cc-muted)}' +
    '#creaner-citas .cc-check input{margin-top:3px;accent-color:var(--cc-accent)}' +
    '#creaner-citas .cc-sum{background:var(--cc-soft);border-radius:12px;padding:10px 12px;font-size:14px;display:flex;flex-direction:column;gap:2px}' +
    '#creaner-citas .cc-foot{display:flex;gap:8px;margin-top:auto}' +
    '#creaner-citas .cc-btn{flex:1;border:0;border-radius:999px;background:var(--cc-accent);color:#fff;font-weight:600;padding:12px 16px;min-height:46px}' +
    '#creaner-citas .cc-btn:disabled{background:var(--cc-line);color:var(--cc-muted);cursor:not-allowed}' +
    '#creaner-citas .cc-back{flex:0 0 auto;background:transparent;color:var(--cc-muted);box-shadow:inset 0 0 0 1px var(--cc-line)}' +
    '#creaner-citas .cc-err{color:var(--cc-bad);font-size:13px;margin:0;min-height:1em}' +
    '#creaner-citas .cc-wait{color:var(--cc-muted);font-size:14px;padding:18px 0;text-align:center}' +
    '#creaner-citas .cc-done{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:10px}' +
    '#creaner-citas .cc-seal{width:60px;height:60px;border-radius:50%;background:var(--cc-soft);color:var(--cc-accent);display:grid;place-items:center;font-size:26px;font-weight:700}' +
    '#creaner-citas .cc-done h3{margin:0;font-size:22px}' +
    '#creaner-citas .cc-done p{margin:0;color:var(--cc-muted);font-size:14px;max-width:34ch}' +
    '#creaner-citas :focus-visible{outline:2px solid var(--cc-accent);outline-offset:2px}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  var DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  var DIASL = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  var S = { paso: 0, cfg: null, servicio: null, pro: 'cualquiera', dias: null, fecha: null, horas: null, hora: null,
            nombre: '', telefono: '', email: '', notas: '', ok: null, cargando: false, error: '' };

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function d8(f) { var p = f.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function bonita(f) { var d = d8(f); return DIASL[d.getDay()] + ' ' + d.getDate() + ' de ' + MESES[d.getMonth()]; }

  /* ---------- acceso a datos (API real o demo) ---------- */
  function get(params) {
    if (DEMO) return Promise.resolve(demo(params));
    var q = Object.keys(params).map(function (k) { return k + '=' + encodeURIComponent(params[k]); }).join('&');
    return fetch(API + '?' + q).then(function (r) { return r.json(); });
  }
  function post(body) {
    if (DEMO) return new Promise(function (ok) { setTimeout(function () { ok({ ok: true, cita: { id: 'DEMO' } }); }, 500); });
    return fetch(API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json(); });
  }
  function demo(p) {
    if (p.accion === 'config') return { ok: true, negocio: 'Negocio de ejemplo', servicios: [
      { id: 'corte', nombre: 'Corte', duracion: 30, precio: '12', categoria: '' },
      { id: 'corte-barba', nombre: 'Corte + barba', duracion: 45, precio: '18', categoria: '' }],
      profesionales: [{ id: 'ana', nombre: 'Ana', servicios: 'TODOS' }, { id: 'luis', nombre: 'Luis', servicios: 'TODOS' }] };
    var hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    if (p.accion === 'dias') { var out = []; for (var i = 0; i < 21; i++) { var d = new Date(hoy); d.setDate(hoy.getDate() + i); out.push({ fecha: iso(d), libre: d.getDay() !== 0 && i > 0 }); } return { ok: true, dias: out }; }
    if (p.accion === 'horas') { var h = []; ['10:00', '10:30', '11:30', '12:00', '13:00', '17:00', '17:30', '18:30', '19:00'].forEach(function (x, i) { if ((i + p.fecha.length) % 4) h.push({ hora: x, profesional: 'ana', profesionalNombre: 'Ana' }); }); return { ok: true, horas: h }; }
  }
  function iso(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }

  /* ---------- lógica ---------- */
  function prosPara(sid) {
    return (S.cfg.profesionales || []).filter(function (p) { return p.servicios === 'TODOS' || (p.servicios || []).indexOf(sid) > -1; });
  }
  function cargarDias() {
    S.dias = null; S.fecha = null; S.horas = null; S.hora = null; draw();
    get({ accion: 'dias', servicio: S.servicio.id, profesional: S.pro }).then(function (r) {
      if (!r.ok) throw new Error(r.error);
      S.dias = r.dias;
      var primero = r.dias.filter(function (d) { return d.libre; })[0];
      if (primero) { S.fecha = primero.fecha; cargarHoras(); } else draw();
    }).catch(fallo);
  }
  function cargarHoras() {
    S.horas = null; S.hora = null; draw();
    get({ accion: 'horas', fecha: S.fecha, servicio: S.servicio.id, profesional: S.pro }).then(function (r) {
      if (!r.ok) throw new Error(r.error); S.horas = r.horas; draw();
    }).catch(fallo);
  }
  function fallo(e) { S.error = 'No hemos podido conectar. Revisa tu conexión e inténtalo de nuevo.'; S.cargando = false; draw(); if (window.console) console.error(e); }

  function enviar() {
    S.nombre = val('cc-nombre'); S.telefono = val('cc-tel'); S.email = val('cc-email'); S.notas = val('cc-notas');
    var acepto = document.getElementById('cc-ok');
    if (!S.nombre || S.telefono.replace(/\D/g, '').length < 9) { S.error = 'Pon tu nombre y un teléfono válido.'; draw(); return; }
    if (acepto && !acepto.checked) { S.error = 'Tienes que aceptar el uso de tus datos para reservar.'; draw(); return; }
    S.cargando = true; S.error = ''; draw();
    var h = S.horas.filter(function (x) { return x.hora === S.hora; })[0];
    post({ accion: 'reservar', servicio: S.servicio.id, profesional: S.pro === 'cualquiera' ? (h ? h.profesional : 'cualquiera') : S.pro,
           fecha: S.fecha, hora: S.hora, nombre: S.nombre, telefono: S.telefono, email: S.email, notas: S.notas })
      .then(function (r) {
        S.cargando = false;
        if (r.ok) { S.ok = r.cita; S.paso = 4; draw(); return; }
        S.error = r.error || 'No se ha podido reservar.';
        if (r.ocupada) { S.paso = 2; cargarHoras(); return; }
        draw();
      }).catch(fallo);
  }
  function val(id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; }

  /* ---------- pintado ---------- */
  function draw() {
    var foco = document.activeElement && document.activeElement.id;
    var b = '';
    if (!S.cfg) b = S.error ? err() : '<p class="cc-wait">Cargando…</p>';
    else if (S.paso === 4) b = pasoHecho();
    else b = [pasoServicio, pasoPro, pasoDia, pasoDatos][S.paso]();
    var steps = ['Servicio', 'Profesional', 'Día y hora', 'Tus datos'].map(function (t, i) {
      return '<li class="' + (S.paso === 4 || i < S.paso ? 'done' : i === S.paso ? 'on' : '') + '">' + t + '</li>';
    }).join('');
    root.innerHTML = '<div class="cc"><div class="cc-head"><h2 class="cc-title">Reserva tu cita</h2><ol class="cc-steps">' + steps +
      '</ol></div><div class="cc-body">' + b + '</div></div>';
    if (foco && document.getElementById(foco)) document.getElementById(foco).focus();
  }
  function err() { return '<p class="cc-err" aria-live="polite">' + esc(S.error) + '</p>'; }
  function precio(s) { return s.precio !== '' && s.precio != null ? esc(s.precio) + ' €' : ''; }

  function pasoServicio() {
    var porCat = {};
    S.cfg.servicios.forEach(function (s) { (porCat[s.categoria || ''] = porCat[s.categoria || ''] || []).push(s); });
    var h = '';
    Object.keys(porCat).forEach(function (c) {
      h += '<p class="cc-lbl">' + esc(c || '¿Qué te hacemos?') + '</p><div class="cc-list">' + porCat[c].map(function (s) {
        return '<button type="button" class="cc-opt" data-a="srv" data-id="' + esc(s.id) + '" aria-pressed="' + (S.servicio && S.servicio.id === s.id) + '"><b>' +
          esc(s.nombre) + '</b><span>' + esc(s.duracion) + ' min</span><em>' + precio(s) + '</em></button>';
      }).join('') + '</div>';
    });
    return h + err();
  }
  function pasoPro() {
    var pros = prosPara(S.servicio.id);
    var h = '<p class="cc-lbl">¿Con quién?</p><div class="cc-list">' +
      '<button type="button" class="cc-opt" data-a="pro" data-id="cualquiera" aria-pressed="' + (S.pro === 'cualquiera') + '"><b>Me da igual</b><span>La primera hora libre</span><em></em></button>' +
      pros.map(function (p) {
        return '<button type="button" class="cc-opt" data-a="pro" data-id="' + esc(p.id) + '" aria-pressed="' + (S.pro === p.id) + '"><b>' + esc(p.nombre) + '</b><span></span><em></em></button>';
      }).join('') + '</div>';
    return h + resumen(false) + err() + '<div class="cc-foot"><button type="button" class="cc-btn cc-back" data-a="atras">Atrás</button><button type="button" class="cc-btn" data-a="sig">Continuar</button></div>';
  }
  function pasoDia() {
    var h = '<p class="cc-lbl">Día</p>';
    if (!S.dias) h += '<p class="cc-wait">Buscando días libres…</p>';
    else {
      h += '<div class="cc-days">' + S.dias.map(function (d) {
        var x = d8(d.fecha);
        return '<button type="button" class="cc-day" data-a="dia" data-f="' + d.fecha + '" aria-pressed="' + (S.fecha === d.fecha) + '"' + (d.libre ? '' : ' disabled') +
          ' aria-label="' + esc(bonita(d.fecha)) + (d.libre ? '' : ', sin huecos') + '">' + DIAS[x.getDay()] + '<b>' + x.getDate() + '</b></button>';
      }).join('') + '</div>';
      if (!S.dias.some(function (d) { return d.libre; })) h += '<p class="cc-wait">No quedan huecos en los próximos días. Llama al negocio y te buscamos uno.</p>';
      else if (S.fecha) {
        h += '<p class="cc-lbl">Hora · ' + esc(bonita(S.fecha)) + '</p>';
        if (!S.horas) h += '<p class="cc-wait">Buscando horas…</p>';
        else if (!S.horas.length) h += '<p class="cc-wait">Este día ya está completo. Prueba otro.</p>';
        else h += '<div class="cc-slots">' + S.horas.map(function (x) {
          return '<button type="button" class="cc-slot" data-a="hora" data-h="' + x.hora + '" aria-pressed="' + (S.hora === x.hora) + '">' + x.hora + '</button>';
        }).join('') + '</div>';
      }
    }
    return h + err() + '<div class="cc-foot"><button type="button" class="cc-btn cc-back" data-a="atras">Atrás</button><button type="button" class="cc-btn" data-a="sig"' +
      (S.hora ? '' : ' disabled') + '>' + (S.hora ? 'Continuar · ' + S.hora : 'Elige una hora') + '</button></div>';
  }
  function pasoDatos() {
    return resumen(true) +
      '<div class="cc-f"><label for="cc-nombre">Nombre</label><input id="cc-nombre" autocomplete="name" value="' + esc(S.nombre) + '"></div>' +
      '<div class="cc-f"><label for="cc-tel">Teléfono</label><input id="cc-tel" type="tel" autocomplete="tel" value="' + esc(S.telefono) + '"></div>' +
      '<div class="cc-f"><label for="cc-email">Email (para recibir la confirmación)</label><input id="cc-email" type="email" autocomplete="email" value="' + esc(S.email) + '"></div>' +
      '<div class="cc-f"><label for="cc-notas">Algo que debamos saber (opcional)</label><textarea id="cc-notas">' + esc(S.notas) + '</textarea></div>' +
      '<label class="cc-check"><input type="checkbox" id="cc-ok"> <span>Acepto que ' + esc(S.cfg.negocio || 'el negocio') + ' use mis datos solo para gestionar esta cita' +
      (PRIV ? ' (<a href="' + esc(PRIV) + '" target="_blank" rel="noopener">política de privacidad</a>)' : '') + '.</span></label>' +
      err() + '<div class="cc-foot"><button type="button" class="cc-btn cc-back" data-a="atras">Atrás</button><button type="button" class="cc-btn" data-a="enviar"' +
      (S.cargando ? ' disabled' : '') + '>' + (S.cargando ? 'Reservando…' : 'Confirmar cita') + '</button></div>';
  }
  function pasoHecho() {
    return '<div class="cc-done"><div class="cc-seal" aria-hidden="true">✓</div><h3>¡Cita confirmada!</h3><p><b>' + esc(S.servicio.nombre) + '</b><br>' +
      esc(bonita(S.fecha)) + ' a las ' + esc(S.hora) + '</p><p>' + (S.email ? 'Te hemos enviado la confirmación a ' + esc(S.email) + '.' : 'Guarda esta información. ¡Te esperamos!') +
      (DEMO ? '<br><i>Demo: esta reserva no se ha guardado.</i>' : '') + '</p><button type="button" class="cc-btn cc-back" data-a="otra">Hacer otra reserva</button></div>';
  }
  function resumen(conHora) {
    var pro = S.pro === 'cualquiera' ? '' : (prosPara(S.servicio.id).filter(function (p) { return p.id === S.pro; })[0] || {}).nombre;
    return '<div class="cc-sum"><span><b>' + esc(S.servicio.nombre) + '</b> · ' + esc(S.servicio.duracion) + ' min' + (precio(S.servicio) ? ' · ' + precio(S.servicio) : '') + '</span>' +
      (conHora ? '<span>' + (pro ? esc(pro) + ' · ' : '') + esc(bonita(S.fecha)) + ' · ' + esc(S.hora) + '</span>' : '') + '</div>';
  }

  root.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b || b.disabled) return;
    var a = b.getAttribute('data-a'); S.error = '';
    if (a === 'srv') {
      S.servicio = S.cfg.servicios.filter(function (s) { return s.id === b.getAttribute('data-id'); })[0];
      S.pro = 'cualquiera';
      if (prosPara(S.servicio.id).length > 1) { S.paso = 1; draw(); } else { S.paso = 2; cargarDias(); }
    } else if (a === 'pro') { S.pro = b.getAttribute('data-id'); draw(); }
    else if (a === 'dia') { S.fecha = b.getAttribute('data-f'); cargarHoras(); }
    else if (a === 'hora') { S.hora = b.getAttribute('data-h'); draw(); }
    else if (a === 'sig') { if (S.paso === 1) { S.paso = 2; cargarDias(); } else { S.paso = 3; draw(); } }
    else if (a === 'atras') { S.paso = S.paso === 2 && prosPara(S.servicio.id).length <= 1 ? 0 : S.paso - 1; draw(); }
    else if (a === 'enviar') enviar();
    else if (a === 'otra') { S.paso = 0; S.servicio = null; S.fecha = null; S.hora = null; S.ok = null; draw(); }
  });
  root.addEventListener('input', function (e) {
    var id = e.target.id;
    if (id === 'cc-nombre') S.nombre = e.target.value; else if (id === 'cc-tel') S.telefono = e.target.value;
    else if (id === 'cc-email') S.email = e.target.value; else if (id === 'cc-notas') S.notas = e.target.value;
  });

  draw();
  if (!API) { root.innerHTML = '<p class="cc-wait">Falta configurar data-api.</p>'; return; }
  get({ accion: 'config' }).then(function (r) {
    if (!r.ok) throw new Error(r.error);
    S.cfg = r; draw();
  }).catch(fallo);
})();
