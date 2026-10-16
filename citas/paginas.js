/*!
 * Creaner Citas · páginas del cliente y del negocio v1
 * Se alojan en la web del propio negocio para que no aparezca el aviso de Google Apps Script.
 * Uso (una página por archivo en la web del negocio):
 *   cita.html     → <div id="creaner-pagina" data-pagina="cita"    data-api="URL_DEL_SCRIPT/exec"></div>
 *   opinion.html  → <div id="creaner-pagina" data-pagina="opinion" data-api="URL_DEL_SCRIPT/exec"></div>
 *   panel.html    → <div id="creaner-pagina" data-pagina="panel"   data-api="URL_DEL_SCRIPT/exec"></div>
 *   y en las tres: <script src="https://creaner.es/citas/paginas.js" defer></script>
 * Colores y logo salen de la hoja del negocio (Config: COLOR_PRINCIPAL, FONDO_PANEL, LOGO_URL, SALUDO).
 * Para que las páginas lleven la identidad de la web aunque la hoja no esté personalizada, el div acepta
 * (y mandan sobre la hoja): data-color="#0a3a57" data-fondo="#f3f7f9" data-logo="logo.svg"
 * data-fuente='"Figtree", sans-serif' (carga la fuente con su <link> en la propia página).
 */
(function () {
  'use strict';
  var root = document.getElementById('creaner-pagina');
  if (!root) return;
  var API = root.getAttribute('data-api') || '';
  var PAGINA = root.getAttribute('data-pagina') || 'cita';
  var Q = {};
  location.search.replace(/^\?/, '').split('&').forEach(function (kv) {
    if (!kv) return;
    var i = kv.indexOf('=');
    Q[decodeURIComponent(i < 0 ? kv : kv.slice(0, i))] = decodeURIComponent(i < 0 ? '' : kv.slice(i + 1).replace(/\+/g, ' '));
  });
  var E = { color: '#1c1f24', fondo: '#f4f5f7', negocio: '', logo: '', saludo: '', telefono: '', horas: 24 };
  function hex(v) { v = String(v || '').trim(); return /^#[0-9a-fA-F]{6}$/.test(v) ? v : ''; }
  // Identidad de la web (data-*): manda sobre la hoja
  var WEB = { color: hex(root.getAttribute('data-color')), fondo: hex(root.getAttribute('data-fondo')),
    logo: root.getAttribute('data-logo') || '', fuente: (root.getAttribute('data-fuente') || '').replace(/[;{}<>]/g, '') };
  if (WEB.fuente) root.style.fontFamily = WEB.fuente;

  /* ----------------------------------- utilidades ----------------------------------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function post(body) {
    return fetch(API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json(); })
      .then(function (r) { if (!r || (r.ok === false && !r.ocupada && !r.pin)) throw new Error((r && r.error) || 'Error inesperado.'); return r; });
  }
  function textoSobre(hex) {
    var n = parseInt(String(hex).slice(1), 16), r = (n >> 16 & 255) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255;
    function l(v) { return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }
    return (.2126 * l(r) + .7152 * l(g) + .0722 * l(b)) > .45 ? '#14181e' : '#ffffff';
  }
  function $(id) { return document.getElementById(id); }
  function cada(sel, fn, base) { Array.prototype.forEach.call((base || root).querySelectorAll(sel), fn); }
  function telHtml() {
    return E.telefono ? ' Llama al <a href="tel:' + esc(E.telefono.replace(/\s/g, '')) + '"><b>' + esc(E.telefono) + '</b></a>.' : '';
  }

  var css =
    '#creaner-pagina{--cp-c:#1c1f24;--cp-on:#fff;--cp-bg:#f4f5f7;--cp-line:#e3e6ea;--cp-muted:#6b7280;--cp-bad:#a2463a;' +
    'font:16px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;color:#1c1f24;background:var(--cp-bg);min-height:100vh}' +
    '#creaner-pagina *{box-sizing:border-box}#creaner-pagina [hidden]{display:none!important}' +
    '#creaner-pagina .cp-w{max-width:480px;margin:0 auto;padding:28px 16px 48px}' +
    '#creaner-pagina .cp-logo{display:block;max-height:46px;max-width:200px;margin:0 auto 10px}' +
    '#creaner-pagina .cp-neg{text-align:center;color:var(--cp-muted);font-size:13px;letter-spacing:.08em;text-transform:uppercase;margin:0 0 14px}' +
    '#creaner-pagina .cp-card{background:#fff;border:1px solid var(--cp-line);border-radius:16px;padding:20px}' +
    '#creaner-pagina h1{font-size:22px;line-height:1.25;margin:0 0 6px}' +
    '#creaner-pagina .cp-muted{color:var(--cp-muted);font-size:14px}' +
    '#creaner-pagina .cp-cita{background:var(--cp-bg);border-radius:12px;padding:12px 14px;margin:14px 0}#creaner-pagina .cp-cita b{display:block}' +
    '#creaner-pagina .cp-btn{display:block;width:100%;border:0;border-radius:999px;background:var(--cp-c);color:var(--cp-on);font:inherit;font-weight:600;padding:13px;min-height:48px;cursor:pointer;margin-top:10px}' +
    '#creaner-pagina .cp-sec{background:transparent;color:#1c1f24;box-shadow:inset 0 0 0 1px #cfd4da}#creaner-pagina .cp-btn:disabled{opacity:.5;cursor:wait}' +
    '#creaner-pagina .cp-lbl{font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--cp-muted);margin:16px 0 8px}' +
    '#creaner-pagina .cp-dias{display:flex;gap:6px;overflow-x:auto;padding-bottom:6px}' +
    '#creaner-pagina .cp-dia{flex:0 0 64px;border:1px solid #dde1e7;background:#fff;border-radius:12px;padding:8px 0;text-align:center;font:inherit;font-size:12px;cursor:pointer;color:inherit}#creaner-pagina .cp-dia b{display:block;font-size:18px}' +
    '#creaner-pagina .cp-horas{display:grid;grid-template-columns:repeat(auto-fill,minmax(76px,1fr));gap:6px}' +
    '#creaner-pagina .cp-hora{border:1px solid #dde1e7;background:#fff;border-radius:10px;padding:10px 0;font:inherit;cursor:pointer;min-height:44px;color:inherit}' +
    '#creaner-pagina .cp-sel{background:var(--cp-c)!important;border-color:var(--cp-c)!important;color:var(--cp-on)!important}' +
    '#creaner-pagina .cp-err{color:var(--cp-bad);font-size:14px;min-height:1em;margin:10px 0 0}' +
    '#creaner-pagina a{color:inherit}' +
    '#creaner-pagina .cp-st{display:flex;gap:4px;margin:12px 0}#creaner-pagina .cp-st button{border:0;background:none;font-size:38px;line-height:1;color:#d6d9de;cursor:pointer;padding:0 2px}#creaner-pagina .cp-st button.on{color:#e0a92e}' +
    '#creaner-pagina textarea,#creaner-pagina input[type=text],#creaner-pagina input[type=password],#creaner-pagina input[type=date]{width:100%;font:inherit;font-size:16px;border:1px solid #dde1e7;border-radius:12px;padding:10px 12px;background:#fff;color:inherit}' +
    '#creaner-pagina textarea{min-height:96px;resize:vertical}' +
    '#creaner-pagina label.cp-ck{display:flex;gap:8px;align-items:flex-start;font-size:14px;color:#4b5563;margin:12px 0}#creaner-pagina label.cp-ck input{margin-top:3px}' +
    /* panel */
    '#creaner-pagina .cp-ph{background:var(--cp-c);color:var(--cp-on);padding:20px 16px 16px}#creaner-pagina .cp-pw{max-width:760px;margin:0 auto}' +
    '#creaner-pagina .cp-ph small{font-size:11px;letter-spacing:.14em;text-transform:uppercase;opacity:.7}#creaner-pagina .cp-ph h1{margin:4px 0 0;font-size:22px}' +
    '#creaner-pagina .cp-nav{display:flex;gap:8px;align-items:center;margin-top:14px;flex-wrap:wrap}' +
    '#creaner-pagina .cp-nav button{border:1px solid currentColor;background:transparent;color:var(--cp-on);border-radius:999px;padding:8px 14px;font:inherit;font-size:13px;cursor:pointer;min-height:40px}' +
    '#creaner-pagina .cp-rng{flex:1;text-align:center;font-size:14px;opacity:.8;min-width:140px}#creaner-pagina .cp-sum{font-size:13px;opacity:.75;margin-top:8px}' +
    '#creaner-pagina .cp-pm{max-width:760px;margin:0 auto;padding:20px 16px 60px}' +
    '#creaner-pagina .cp-day{background:#fff;border:1px solid var(--cp-line);border-radius:14px;margin-bottom:14px;overflow:hidden}' +
    '#creaner-pagina .cp-dh{display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border-bottom:1px solid var(--cp-line);gap:10px}#creaner-pagina .cp-dh h2{margin:0;font-size:16px}' +
    '#creaner-pagina .cp-tag{font-size:11px;font-weight:600;border-radius:999px;padding:3px 9px;background:var(--cp-bg);color:var(--cp-muted)}#creaner-pagina .cp-tag.cp-closed{background:#fbe9e7;color:var(--cp-bad)}' +
    '#creaner-pagina .cp-ap{display:grid;grid-template-columns:64px 1fr auto;gap:12px;padding:12px 16px;border-top:1px solid var(--cp-line);align-items:start}#creaner-pagina .cp-ap:first-of-type{border-top:0}' +
    '#creaner-pagina .cp-ap .t{font-weight:700;font-variant-numeric:tabular-nums}#creaner-pagina .cp-ap .t span{display:block;font-weight:400;font-size:12px;color:var(--cp-muted)}' +
    '#creaner-pagina .cp-ap .n{font-weight:600}#creaner-pagina .cp-ap .d{font-size:13px;color:var(--cp-muted)}#creaner-pagina .cp-ap.cp-cx{opacity:.5}#creaner-pagina .cp-ap.cp-cx .n{text-decoration:line-through}' +
    '#creaner-pagina .cp-x{border:1px solid #dde1e7;background:#fff;border-radius:999px;padding:6px 12px;font:inherit;font-size:13px;cursor:pointer;color:inherit}' +
    '#creaner-pagina .cp-empty{padding:12px 16px;color:var(--cp-muted);font-size:14px}' +
    '#creaner-pagina .cp-closer{background:#fff;border:1px solid var(--cp-line);border-radius:14px;padding:14px 16px;margin-bottom:14px;display:grid;grid-template-columns:1fr 1fr;gap:10px}' +
    '#creaner-pagina .cp-closer>*{min-width:0}' +
    '#creaner-pagina .cp-closer label{display:block;font-size:13px;font-weight:600;margin-bottom:4px}#creaner-pagina .cp-closer .cp-btn{margin:0;align-self:end}' +
    '#creaner-pagina .cp-status{text-align:center;color:var(--cp-muted);padding:40px 0}' +
    '#creaner-pagina .cp-tabs{display:flex;gap:6px;margin-top:14px}#creaner-pagina .cp-tabs button{border:0;background:transparent;color:var(--cp-on);opacity:.7;font:inherit;font-size:14px;font-weight:600;padding:8px 14px;border-radius:999px;cursor:pointer;min-height:40px}' +
    '#creaner-pagina .cp-tabs button[aria-selected=true]{opacity:1;box-shadow:inset 0 0 0 1px currentColor}' +
    '#creaner-pagina .cp-kpis{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px;margin-bottom:14px}' +
    '#creaner-pagina .cp-kpi{background:#fff;border:1px solid var(--cp-line);border-radius:14px;padding:14px}' +
    '#creaner-pagina .cp-kpi small{display:block;font-size:12px;font-weight:600;color:var(--cp-muted);text-transform:uppercase;letter-spacing:.06em}' +
    '#creaner-pagina .cp-kpi b{display:block;font-size:28px;line-height:1.15;margin:6px 0 2px;font-variant-numeric:tabular-nums}' +
    '#creaner-pagina .cp-kpi span{font-size:13px;color:var(--cp-muted)}' +
    '#creaner-pagina .cp-box{background:#fff;border:1px solid var(--cp-line);border-radius:14px;padding:14px 16px;margin-bottom:14px}#creaner-pagina .cp-box h2{font-size:16px;margin:0 0 12px}' +
    '#creaner-pagina .cp-bars{display:flex;align-items:flex-end;gap:6px;height:150px;padding-top:18px}' +
    '#creaner-pagina .cp-bar{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;min-width:0}' +
    '#creaner-pagina .cp-bar i{display:block;width:100%;max-width:34px;background:var(--cp-c);border-radius:4px 4px 0 0;min-height:2px;opacity:.55}#creaner-pagina .cp-bar.cp-now i{opacity:1}' +
    '#creaner-pagina .cp-bar em{font-style:normal;font-size:12px;font-weight:600;font-variant-numeric:tabular-nums;margin-bottom:4px;min-height:1em}' +
    '#creaner-pagina .cp-bar span{font-size:11px;color:var(--cp-muted);margin-top:6px;white-space:nowrap}' +
    '#creaner-pagina .cp-hb{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:4px 10px;align-items:center;margin-bottom:10px;font-size:14px}' +
    '#creaner-pagina .cp-hb .tr{grid-column:1/-1;height:8px;background:var(--cp-bg);border-radius:4px;overflow:hidden}#creaner-pagina .cp-hb .tr i{display:block;height:100%;background:var(--cp-c);border-radius:4px}' +
    '#creaner-pagina .cp-nota{font-size:12px;color:var(--cp-muted);margin:4px 0 0}' +
    '#creaner-pagina .cp-fil{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px}#creaner-pagina .cp-fil button{border:1px solid #cfd4da;background:#fff;color:inherit;border-radius:999px;padding:7px 14px;font:inherit;font-size:14px;cursor:pointer;min-height:38px}' +
    '#creaner-pagina .cp-fil button[aria-pressed=true]{background:var(--cp-c);border-color:var(--cp-c);color:var(--cp-on)}' +
    '#creaner-pagina .cp-closer select{width:100%;font:inherit;font-size:16px;border:1px solid #dde1e7;border-radius:12px;padding:10px 12px;background:#fff;color:inherit}' +
    '#creaner-pagina .cp-tag.cp-off{background:#fff4e0;color:#8a5a00}' +
    '#creaner-pagina .cp-sol-acc{display:flex;gap:6px;flex-wrap:wrap;margin:4px 0 12px}#creaner-pagina a.cp-x{text-decoration:none;display:inline-block}' +
    '#creaner-pagina .cp-sol-ed{display:grid;grid-template-columns:1fr 1fr;gap:10px}#creaner-pagina .cp-sol-ed>*{min-width:0}#creaner-pagina .cp-sol-ed label{display:block;font-size:13px;font-weight:600;margin-bottom:4px}' +
    '#creaner-pagina .cp-sol-ed select,#creaner-pagina .cp-sol-ed input{width:100%;font:inherit;font-size:16px;border:1px solid #dde1e7;border-radius:12px;padding:9px 11px;background:#fff;color:inherit}' +
    '#creaner-pagina .cp-sol textarea{min-height:60px}' +
    '#creaner-pagina .cp-pin{background:#fff;border:1px solid var(--cp-line);border-radius:14px;padding:20px;max-width:360px;margin:20px auto}#creaner-pagina .cp-pin label{font-weight:600;display:block;margin-bottom:6px}';

  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  if (!document.querySelector('meta[name=viewport]')) {
    var mv = document.createElement('meta'); mv.name = 'viewport'; mv.content = 'width=device-width, initial-scale=1'; document.head.appendChild(mv);
  }
  root.innerHTML = '<div class="cp-w"><p class="cp-neg">Cargando…</p></div>';

  function aplicarEstilo(e) {
    E.color = WEB.color || e.color || E.color; E.fondo = WEB.fondo || e.fondo || E.fondo; E.negocio = e.negocio || ''; E.logo = WEB.logo || e.logo || '';
    E.saludo = e.saludo || ''; E.telefono = e.telefono || ''; if (e.horas != null) E.horas = e.horas;
    E.citas = e.citas !== false; E.presupuestos = !!e.presupuestos;
    root.style.setProperty('--cp-c', E.color); root.style.setProperty('--cp-on', textoSobre(E.color)); root.style.setProperty('--cp-bg', E.fondo);
    document.body.style.margin = '0'; document.body.style.background = E.fondo;
  }
  function cabecera() {
    return (E.logo ? '<img class="cp-logo" src="' + esc(E.logo) + '" alt="' + esc(E.negocio) + '" style="filter:none">' : '') +
      '<p class="cp-neg">' + esc(E.negocio) + '</p>';
  }
  function marco(htmlCard) { root.innerHTML = '<div class="cp-w">' + cabecera() + '<div class="cp-card" id="cp-app">' + htmlCard + '</div></div>'; }

  if (!API) { root.innerHTML = '<div class="cp-w"><div class="cp-card">Falta data-api en la página.</div></div>'; return; }
  post({ accion: 'estilo' }).then(function (e) {
    aplicarEstilo(e);
    if (PAGINA === 'panel') panel(); else if (PAGINA === 'opinion') opinion(); else cita();
  }).catch(function (x) {
    root.innerHTML = '<div class="cp-w"><div class="cp-card"><h1>No se ha podido cargar</h1><p class="cp-muted">' + esc(x.message) + '</p></div></div>';
  });

  /* ------------------------------- CAMBIAR O CANCELAR ------------------------------- */
  function cita() {
    var D = null, sel = {};
    document.title = 'Tu cita · ' + E.negocio;
    function caja() { return '<div class="cp-cita"><b>' + esc(D.servicio) + '</b>con ' + esc(D.profesional) + '<br>' + esc(D.txt) + '</div>'; }
    function err(m) {
      var n = $('cp-err'); if (n) n.textContent = m; else marco('<h1>No se ha podido</h1><p>' + esc(m) + '</p>');
      cada('button', function (b) { b.disabled = false; });
    }
    function inicio() {
      if (D.estado === 'invalido') return marco('<h1>Enlace no válido</h1><p class="cp-muted">No encontramos esta cita.</p>');
      if (D.estado === 'cancelada') return marco('<h1>Cita cancelada</h1><p class="cp-muted">Esta cita ya está cancelada.</p>');
      if (D.estado === 'pasada') return marco('<h1>Esta cita ya ha pasado</h1>' + caja());
      if (D.estado === 'tarde') return marco('<h1>Tu cita</h1>' + caja() + '<p>Faltan menos de ' + esc(D.horas) + ' h y ya no se puede cambiar ni cancelar online.' + telHtml() + '</p>');
      marco('<h1>Hola, ' + esc(D.nombre) + '</h1><p class="cp-muted">Esta es tu cita:</p>' + caja() +
        '<button class="cp-btn" id="cp-bc">Cambiar día u hora</button><button class="cp-btn cp-sec" id="cp-bx">Cancelar la cita</button><p class="cp-err" id="cp-err"></p>');
      $('cp-bc').onclick = dias; $('cp-bx').onclick = confirmarCancelar;
    }
    function dias() {
      $('cp-bc').disabled = true; $('cp-bc').textContent = 'Buscando huecos…';
      post({ accion: 'cita_dias', id: D.id, t: D.t }).then(function (r) {
        var l = r.dias; sel = {};
        if (!l.length) { marco('<h1>Sin huecos</h1><p>No quedan huecos libres en los próximos días.' + telHtml() + '</p><button class="cp-btn cp-sec" id="cp-vol">Volver</button>'); $('cp-vol').onclick = inicio; return; }
        var DS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
        marco('<h1>Elige el nuevo día</h1>' + caja() + '<p class="cp-lbl">Día</p><div class="cp-dias">' + l.map(function (d) {
          var p = d.fecha.split('-'), x = new Date(+p[0], p[1] - 1, +p[2]);
          return '<button class="cp-dia" data-f="' + d.fecha + '" title="' + esc(d.txt) + '">' + DS[x.getDay()] + '<b>' + x.getDate() + '</b></button>';
        }).join('') + '</div><div id="cp-hs"></div><button class="cp-btn" id="cp-ok" disabled>Confirmar el cambio</button>' +
          '<button class="cp-btn cp-sec" id="cp-vol">Volver</button><p class="cp-err" id="cp-err"></p>');
        $('cp-vol').onclick = inicio; $('cp-ok').onclick = cambiar;
        cada('.cp-dia', function (b) { b.onclick = function () { horas(b); }; });
      }).catch(function (x) { err(x.message); });
    }
    function horas(b) {
      cada('.cp-dia', function (x) { x.classList.toggle('cp-sel', x === b); });
      sel = { fecha: b.getAttribute('data-f'), txt: b.title };
      $('cp-ok').disabled = true; $('cp-ok').textContent = 'Confirmar el cambio';
      var hs = $('cp-hs'); hs.innerHTML = '<p class="cp-muted">Buscando horas…</p>';
      post({ accion: 'cita_horas', id: D.id, t: D.t, fecha: sel.fecha }).then(function (r) {
        if (!r.horas.length) { hs.innerHTML = '<p class="cp-muted">Ya no quedan horas libres ese día.</p>'; return; }
        hs.innerHTML = '<p class="cp-lbl">Hora</p><div class="cp-horas">' + r.horas.map(function (h) { return '<button class="cp-hora">' + esc(h) + '</button>'; }).join('') + '</div>';
        cada('.cp-hora', function (h) {
          h.onclick = function () {
            cada('.cp-hora', function (x) { x.classList.toggle('cp-sel', x === h); }, hs);
            sel.hora = h.textContent;
            var ok = $('cp-ok'); ok.disabled = false; ok.textContent = 'Cambiar al ' + sel.txt + ' a las ' + sel.hora;
          };
        }, hs);
      }).catch(function (x) { err(x.message); });
    }
    function cambiar() {
      var ok = $('cp-ok'); ok.disabled = true; ok.textContent = 'Guardando…';
      post({ accion: 'cita_cambiar', id: D.id, t: D.t, fecha: sel.fecha, hora: sel.hora }).then(function (r) {
        if (!r.ok) { err(r.error); var b = root.querySelector('.cp-dia.cp-sel'); if (b) horas(b); return; }
        D.txt = r.txt; D.profesional = r.profesional;
        marco('<h1>¡Cita cambiada!</h1>' + caja() + '<p class="cp-muted">Te hemos enviado la confirmación por email. ¡Te esperamos!</p>');
      }).catch(function (x) { err(x.message); });
    }
    function confirmarCancelar() {
      marco('<h1>¿Cancelar tu cita?</h1>' + caja() + '<button class="cp-btn" id="cp-si">Sí, cancelar la cita</button><button class="cp-btn cp-sec" id="cp-no">No, mantenerla</button><p class="cp-err" id="cp-err"></p>');
      $('cp-no').onclick = inicio;
      $('cp-si').onclick = function () {
        this.disabled = true; this.textContent = 'Cancelando…';
        post({ accion: 'cita_cancelar', id: D.id, t: D.t }).then(function () {
          marco('<h1>Cita cancelada</h1>' + caja() + '<p class="cp-muted">Hemos avisado a ' + esc(E.negocio) + '. ¡Gracias por avisar!</p>');
        }).catch(function (x) { err(x.message); });
      };
    }
    post({ accion: 'cita_info', id: Q.id, t: Q.t }).then(function (r) { D = r.cita; inicio(); })
      .catch(function (x) { marco('<h1>No se ha podido cargar tu cita</h1><p class="cp-muted">' + esc(x.message) + '</p>'); });
  }

  /* ------------------------------------ OPINIÓN ------------------------------------ */
  function opinion() {
    document.title = 'Tu opinión · ' + E.negocio;
    var n = Math.max(1, Math.min(5, parseInt(Q.n, 10) || 5));
    marco('<p class="cp-muted">Guardando tu puntuación…</p>');
    post({ accion: 'opinion', id: Q.id, t: Q.t, n: n }).then(function (D) {
      if (!D.valido) return marco('<h1>Enlace no válido</h1><p class="cp-muted">No encontramos esta visita.</p>');
      marco('<h1>¡Gracias, ' + esc(D.nombre) + '!</h1><p class="cp-muted">Hemos guardado tu puntuación. Puedes cambiarla aquí:</p>' +
        '<div class="cp-st" id="cp-st">' + [1, 2, 3, 4, 5].map(function (i) { return '<button type="button" data-n="' + i + '" aria-label="' + i + ' de 5">★</button>'; }).join('') + '</div>' +
        '<p style="margin:14px 0 6px;font-weight:600">¿Quieres contarnos algo más? (opcional)</p><textarea id="cp-tx" maxlength="600" placeholder="Qué te gustó, qué mejorarías…"></textarea>' +
        '<label class="cp-ck"><input type="checkbox" id="cp-pb"> Podéis mostrar mi opinión en la web con mi nombre de pila.</label>' +
        '<button class="cp-btn" id="cp-ok">Enviar</button><p class="cp-err" id="cp-err"></p>');
      function pinta() { cada('#cp-st button', function (b) { b.classList.toggle('on', +b.getAttribute('data-n') <= n); }); }
      pinta();
      cada('#cp-st button', function (b) { b.onclick = function () { n = +b.getAttribute('data-n'); pinta(); }; });
      $('cp-ok').onclick = function () {
        var b = this; b.disabled = true; b.textContent = 'Enviando…';
        post({ accion: 'opinion', id: Q.id, t: Q.t, n: n, comentario: $('cp-tx').value, publicar: $('cp-pb').checked }).then(function () {
          marco('<h1>¡Recibido!</h1><p>Gracias por tu opinión. A ' + esc(D.profesional) + ' le ayuda mucho saber qué tal fue.</p>');
        }).catch(function (x) { b.disabled = false; b.textContent = 'Enviar'; $('cp-err').textContent = x.message; });
      };
    }).catch(function (x) { marco('<h1>No se ha podido guardar</h1><p class="cp-muted">' + esc(x.message) + '</p>'); });
  }

  /* ------------------------------------- PANEL ------------------------------------- */
  function panel() {
    var pin = '', start = hoy();
    var DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    var MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    function hoy() { var d = new Date(); d.setHours(0, 0, 0, 0); return d; }
    function pad(x) { return (x < 10 ? '0' : '') + x; }
    function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
    function add(d, k) { var x = new Date(d); x.setDate(x.getDate() + k); return x; }
    function corto(d) { return d.getDate() + ' ' + MESES[d.getMonth()]; }
    document.title = 'Panel · ' + E.negocio;
    var robots = document.createElement('meta'); robots.name = 'robots'; robots.content = 'noindex, nofollow'; document.head.appendChild(robots);

    root.innerHTML = '<header class="cp-ph"><div class="cp-pw">' +
      (E.logo ? '<img src="' + esc(E.logo) + '" alt="" style="max-height:40px;max-width:200px;display:block;margin-bottom:10px">' : '') +
      '<small>Panel privado · no compartas este enlace ni el PIN</small><h1 id="cp-title">' + esc(E.saludo || E.negocio || 'Citas') + '</h1>' +
      '<div class="cp-tabs" id="cp-tabs" role="tablist" hidden>' +
      (E.citas ? '<button type="button" role="tab" data-v="agenda">Agenda</button>' : '') +
      (E.presupuestos ? '<button type="button" role="tab" data-v="solicitudes">Solicitudes</button>' : '') +
      '<button type="button" role="tab" data-v="stats">Estadísticas</button></div>' +
      '<div class="cp-nav" id="cp-nav" hidden><button type="button" id="cp-prev">‹ Anterior</button><div class="cp-rng" id="cp-rng">—</div>' +
      '<button type="button" id="cp-next">Siguiente ›</button><button type="button" id="cp-today">Hoy</button></div>' +
      '<div class="cp-sum" id="cp-sum"></div></div></header><main class="cp-pm" id="cp-main"></main>';
    var filtro = 'todos';
    try { filtro = localStorage.getItem('cp-filtro-' + API) || 'todos'; } catch (x) {}
    var main = $('cp-main'), vista = E.citas ? 'agenda' : (E.presupuestos ? 'solicitudes' : 'stats'), mes = new Date(start.getFullYear(), start.getMonth(), 1);
    var MESES_L = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    $('cp-prev').onclick = function () { if (vista === 'agenda') start = add(start, -7); else mes = new Date(mes.getFullYear(), mes.getMonth() - 1, 1); cargar(); };
    $('cp-next').onclick = function () { if (vista === 'agenda') start = add(start, 7); else mes = new Date(mes.getFullYear(), mes.getMonth() + 1, 1); cargar(); };
    $('cp-today').onclick = function () { start = hoy(); mes = new Date(start.getFullYear(), start.getMonth(), 1); cargar(); };
    function marcarTab() {
      cada('#cp-tabs button', function (b) { b.setAttribute('aria-selected', b.getAttribute('data-v') === vista); });
      $('cp-prev').textContent = vista === 'agenda' ? '‹ Anterior' : '‹ Mes anterior'; $('cp-next').textContent = vista === 'agenda' ? 'Siguiente ›' : 'Mes siguiente ›';
      $('cp-today').textContent = vista === 'agenda' ? 'Hoy' : 'Este mes';
    }
    function tab(v) { vista = v; marcarTab(); cargar(); }
    cada('#cp-tabs button', function (b) { b.onclick = function () { tab(b.getAttribute('data-v')); }; });
    marcarTab();

    function pedirPin(msg) {
      $('cp-nav').hidden = true; $('cp-tabs').hidden = true; $('cp-sum').textContent = '';
      main.innerHTML = '<form class="cp-pin" id="cp-pf"><label for="cp-pin">PIN del panel</label>' +
        '<input id="cp-pin" type="password" inputmode="numeric" autocomplete="current-password" required>' +
        '<button class="cp-btn" type="submit">Entrar</button><p class="cp-err">' + esc(msg || '') + '</p></form>';
      $('cp-pin').focus();
      $('cp-pf').onsubmit = function (e) { e.preventDefault(); pin = $('cp-pin').value.trim(); cargar(); };
    }
    function cargar() {
      if (vista === 'stats') return cargarStats();
      if (vista === 'solicitudes') return cargarSolicitudes();
      var fin = add(start, 6);
      $('cp-rng').textContent = corto(start) + ' – ' + corto(fin);
      main.innerHTML = '<div class="cp-status">Cargando citas…</div>';
      post({ accion: 'panel_citas', pin: pin, desde: iso(start), hasta: iso(fin) }).then(function (r) {
        if (r.pin || r.bloqueado) { pin = ''; return pedirPin(r.bloqueado ? r.error : 'PIN incorrecto. Inténtalo de nuevo.'); }
        pintar(r.datos);
      }).catch(function (x) { main.innerHTML = '<div class="cp-status">No se han podido cargar las citas. ' + esc(x.message) + '</div>'; });
    }
    function delDia(k, cerrados) { return cerrados.filter(function (c) { return c.desde && k >= c.desde && k <= c.hasta; }); }
    function esTodos(q) { q = String(q || '').trim(); return !q || /^todos$/i.test(q); }
    function accion(body) {
      body.pin = pin;
      post(body).then(function (r) { if (r.pin || r.bloqueado) { pin = ''; return pedirPin(r.error); } cargar(); })
        .catch(function (x) { $('cp-sum').textContent = 'Error: ' + x.message; });
    }

    /* ---------- Solicitudes de presupuesto ---------- */
    var filtroSol = 'abiertas', SOL = null;
    var COLOR_EST = { 'Nueva': '#fbe9e7;color:#a2463a', 'Contactado': '#fff4e0;color:#8a5a00', 'Presupuesto enviado': '#e8f0fe;color:#1a4fa0',
      'Aceptado': '#e6f4ea;color:#1e6b34', 'Terminado': '#eef0f3;color:#3b4350', 'Perdido': '#f1f1f1;color:#7a7a7a' };
    function cargarSolicitudes() {
      $('cp-nav').hidden = true; $('cp-tabs').hidden = false;
      main.innerHTML = '<div class="cp-status">Cargando solicitudes…</div>';
      post({ accion: 'panel_solicitudes', pin: pin }).then(function (r) {
        if (r.pin || r.bloqueado) { pin = ''; return pedirPin(r.bloqueado ? r.error : 'PIN incorrecto. Inténtalo de nuevo.'); }
        SOL = r.datos; pintarSolicitudes();
      }).catch(function (x) { main.innerHTML = '<div class="cp-status">No se han podido cargar. ' + esc(x.message) + '</div>'; });
    }
    function fechaCorta(f) { var p = String(f).split(' '), d = p[0].split('-'); return d.length === 3 ? (+d[2]) + ' ' + MESES[+d[1] - 1] + (p[1] ? ' · ' + p[1] : '') : f; }
    function pintarSolicitudes() {
      var l = SOL.solicitudes, nuevas = l.filter(function (s) { return s.estado === 'Nueva'; }).length;
      $('cp-sum').textContent = nuevas ? nuevas + (nuevas === 1 ? ' solicitud nueva sin contestar' : ' solicitudes nuevas sin contestar') : 'Todo contestado';
      var grupos = { abiertas: ['Nueva', 'Contactado', 'Presupuesto enviado', 'Aceptado'], terminadas: ['Terminado'], perdidas: ['Perdido'] };
      var vis = l.filter(function (s) { return filtroSol === 'todas' || grupos[filtroSol].indexOf(s.estado) > -1; });
      var html = '<div class="cp-fil" role="group" aria-label="Mostrar">' + [['abiertas', 'Abiertas'], ['terminadas', 'Terminadas'], ['perdidas', 'Perdidas'], ['todas', 'Todas']].map(function (x) {
        return '<button type="button" data-s="' + x[0] + '" aria-pressed="' + (filtroSol === x[0]) + '">' + x[1] + '</button>'; }).join('') + '</div>';
      if (!vis.length) html += '<div class="cp-box cp-muted">' + (l.length ? 'No hay solicitudes en este grupo.' : 'Aún no ha llegado ninguna solicitud. Aparecerán aquí en cuanto alguien rellene el formulario de la web.') + '</div>';
      vis.forEach(function (s) {
        var tel = String(s.telefono).replace(/\D/g, ''), wa = 'https://wa.me/' + (tel.length === 9 ? '34' + tel : tel);
        html += '<section class="cp-box cp-sol" data-id="' + esc(s.id) + '">' +
          '<div class="cp-dh" style="padding:0;border:0;margin-bottom:6px"><h2 style="margin:0">' + esc(s.nombre) + '</h2>' +
          '<span class="cp-tag" style="background:' + (COLOR_EST[s.estado] || '') + '">' + esc(s.estado) + '</span></div>' +
          '<p class="cp-muted" style="margin:0 0 8px">' + esc(fechaCorta(s.fecha)) + ' · <b style="color:#1c1f24">' + esc(s.trabajo || 'Presupuesto') + '</b>' + (s.zona ? ' · ' + esc(s.zona) : '') + '</p>' +
          (s.mensaje ? '<p style="margin:0 0 8px;white-space:pre-line">“' + esc(s.mensaje) + '”</p>' : '') +
          (s.fotos.length ? '<p style="margin:0 0 8px;font-size:14px">' + s.fotos.map(function (u, i) { return '<a href="' + esc(u) + '" target="_blank" rel="noopener">Foto ' + (i + 1) + '</a>'; }).join(' · ') + '</p>' : '') +
          '<div class="cp-sol-acc"><a class="cp-x" href="tel:' + esc(tel) + '">Llamar ' + esc(s.telefono) + '</a> <a class="cp-x" href="' + wa + '" target="_blank" rel="noopener">WhatsApp</a>' +
          (s.email ? ' <a class="cp-x" href="mailto:' + esc(s.email) + '">Email</a>' : '') + '</div>' +
          '<div class="cp-sol-ed"><div><label>Estado</label><select data-k="estado">' + SOL.estados.map(function (e) { return '<option' + (e === s.estado ? ' selected' : '') + '>' + esc(e) + '</option>'; }).join('') + '</select></div>' +
          '<div><label>Importe (€)</label><input data-k="importe" type="text" inputmode="decimal" value="' + esc(s.importe) + '" placeholder="Opcional"></div>' +
          '<div style="grid-column:1/-1"><label>Notas</label><textarea data-k="notas" rows="2" placeholder="Solo las ves tú">' + esc(s.notas) + '</textarea></div></div>' +
          '<button type="button" class="cp-btn" data-guardar>Guardar</button><p class="cp-err" data-msg></p>' +
          (s.opinion ? '<p class="cp-nota">Opinión: ' + esc(s.opinion) + '</p>' : '') + '</section>';
      });
      main.innerHTML = html;
      cada('.cp-fil button', function (b) { b.onclick = function () { filtroSol = b.getAttribute('data-s'); pintarSolicitudes(); }; }, main);
      cada('.cp-sol', function (card) {
        card.querySelector('[data-guardar]').onclick = function () {
          var b = this, msg = card.querySelector('[data-msg]'), cambios = {};
          cada('[data-k]', function (el) { cambios[el.getAttribute('data-k')] = el.value; }, card);
          var termina = cambios.estado === 'Terminado';
          b.disabled = true; b.textContent = 'Guardando…';
          post({ accion: 'panel_solicitud', pin: pin, id: card.getAttribute('data-id'), cambios: cambios }).then(function (r) {
            if (r.pin || r.bloqueado) { pin = ''; return pedirPin(r.error); }
            SOL.solicitudes = SOL.solicitudes.map(function (s) { return s.id === r.solicitud.id ? r.solicitud : s; });
            pintarSolicitudes();
            if (termina && /^Enviada/.test(r.solicitud.opinion || '')) $('cp-sum').textContent = 'Guardado. Le hemos pedido su opinión a ' + r.solicitud.nombre + '.';
          }).catch(function (x) { b.disabled = false; b.textContent = 'Guardar'; msg.textContent = x.message; });
        };
      }, main);
    }
    function cargarStats() {
      var m = mes.getFullYear() + '-' + pad(mes.getMonth() + 1);
      $('cp-rng').textContent = MESES_L[mes.getMonth()] + ' ' + mes.getFullYear();
      main.innerHTML = '<div class="cp-status">Calculando estadísticas…</div>';
      post({ accion: 'panel_estadisticas', pin: pin, mes: m }).then(function (r) {
        if (r.pin || r.bloqueado) { pin = ''; return pedirPin(r.bloqueado ? r.error : 'PIN incorrecto. Inténtalo de nuevo.'); }
        pintarStats(r.datos);
      }).catch(function (x) { main.innerHTML = '<div class="cp-status">No se han podido calcular. ' + esc(x.message) + '</div>'; });
    }
    // En español, 1.450 lleva punto (toLocaleString no lo pone con 4 cifras)
    function euros(n) { n = Math.round(n * 100) / 100; var p = (n % 1 ? n.toFixed(2) : String(n)).split('.'); return p[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (p[1] ? ',' + p[1] : '') + ' €'; }
    function nombreMes(m) { var p = m.split('-'); return MESES_L[+p[1] - 1]; }
    function pintarStats(d) {
      $('cp-nav').hidden = false; $('cp-tabs').hidden = false;
      var a = d.actual, b = d.anterior, ant = nombreMes(d.mesAnterior);
      var esActual = d.enCurso;
      var dif = a.atendidas - b.atendidas;
      $('cp-sum').textContent = esActual ? 'Mes en curso: datos hasta hoy' : 'Mes completo';
      var totalCitas = a.atendidas + a.pendientes + a.canceladas;
      var pc = totalCitas ? Math.round(a.canceladas / totalCitas * 100) : 0;
      function kpi(t, v, sub) { return '<div class="cp-kpi"><small>' + t + '</small><b>' + v + '</b><span>' + sub + '</span></div>'; }
      function lista(t, items) {
        if (!items.length) return '';
        var mx = items[0].n;
        return '<section class="cp-box"><h2>' + t + '</h2>' + items.map(function (x) {
          return '<div class="cp-hb"><span>' + esc(x.nombre) + '</span><b>' + x.n + '</b><div class="tr"><i style="width:' + Math.round(x.n / mx * 100) + '%"></i></div></div>';
        }).join('') + '</section>';
      }
      var html = '';
      if (d.presupuestos) {
        var q = d.presupuestos.actual, qa = d.presupuestos.anterior, difq = q.recibidas - qa.recibidas;
        var cerradas = q.aceptadas + q.perdidas;
        html += (d.citas ? '<h2 style="font-size:16px;margin:0 0 10px">Presupuestos</h2>' : '') + '<div class="cp-kpis">' +
          kpi('Solicitudes recibidas', q.recibidas, (difq === 0 ? 'Igual que en ' : Math.abs(difq) + (difq > 0 ? ' más que en ' : ' menos que en ')) + ant) +
          kpi('Aceptadas', q.aceptadas, cerradas ? Math.round(q.aceptadas / cerradas * 100) + ' % de las ya decididas' : 'Aún sin decidir') +
          kpi('Importe aceptado', euros(q.importe), 'Según el importe apuntado en cada solicitud') +
          kpi('Sin contestar', q.sinContestar, q.abiertas + (q.abiertas === 1 ? ' solicitud abierta' : ' solicitudes abiertas')) +
          '</div>';
        html += lista('Trabajos más pedidos', d.presupuestos.trabajos) + lista('Por zona', d.presupuestos.zonas);
        if (d.citas) html += '<h2 style="font-size:16px;margin:18px 0 10px">Citas</h2>';
      }
      if (!d.citas) {
        html += '<div class="cp-kpis">' + kpi('Nota media', d.opiniones.mediaMes != null ? String(d.opiniones.mediaMes).replace('.', ',') + ' ★' : '—',
          d.opiniones.mes ? d.opiniones.mes + (d.opiniones.mes === 1 ? ' opinión' : ' opiniones') + ' este mes' :
          (d.opiniones.total ? 'Sin opiniones este mes · ' + String(d.opiniones.mediaTotal).replace('.', ',') + ' ★ en total' : 'Aún sin opiniones')) + '</div>';
        main.innerHTML = html; return;
      }
      html += '<div class="cp-kpis">' +
        kpi('Citas atendidas', a.atendidas, (dif === 0 ? 'Igual que en ' : Math.abs(dif) + (dif > 0 ? ' más que en ' : ' menos que en ')) + ant +
          (d.enCurso ? ' (del 1 al ' + d.diaHoy + ')' : '') +
          (a.pendientes ? ' · ' + a.pendientes + ' por venir' : '')) +
        kpi('Reservas por la web', a.reservasWeb, a.fueraHorario ? a.fueraHorario + ' hechas con el local cerrado' : 'Hechas desde la web') +
        kpi('Ingresos estimados', euros(a.ingresos), a.previstos ? '+ ' + euros(a.previstos) + ' en citas por venir' : 'De las citas atendidas') +
        kpi('Clientes nuevos', a.clientesNuevos, a.clientesRepetidos + (a.clientesRepetidos === 1 ? ' cliente repetía' : ' clientes repetían')) +
        kpi('Cancelaciones', a.canceladas, totalCitas ? pc + ' % de las citas del mes' : 'Sin citas este mes') +
        kpi('Nota media', d.opiniones.mediaMes != null ? String(d.opiniones.mediaMes).replace('.', ',') + ' ★' : '—',
          d.opiniones.mes ? d.opiniones.mes + (d.opiniones.mes === 1 ? ' opinión' : ' opiniones') + ' este mes' :
          (d.opiniones.total ? 'Sin opiniones este mes · ' + String(d.opiniones.mediaTotal).replace('.', ',') + ' ★ en total' : 'Aún sin opiniones')) +
        '</div>';
      var max = Math.max.apply(null, d.semanas.map(function (s) { return s.n; }).concat([1]));
      var ultima = d.semanas.length - 1;
      html += '<section class="cp-box"><h2>Citas por semana</h2><div class="cp-bars" role="img" aria-label="Citas por semana, últimas 8 semanas">' +
        d.semanas.map(function (s, i) {
          var p = s.desde.split('-'), et = (+p[2]) + ' ' + MESES[+p[1] - 1];
          var mostrar = i === ultima || (s.n === max && s.n > 0);
          return '<div class="cp-bar' + (i === ultima ? ' cp-now' : '') + '" title="Semana del ' + et + ': ' + s.n + (s.n === 1 ? ' cita' : ' citas') + '">' +
            '<em>' + (mostrar ? s.n : '') + '</em><i style="height:' + Math.round(s.n / max * 100) + '%"></i><span>' + et + '</span></div>';
        }).join('') + '</div><p class="cp-nota">Citas confirmadas de cada semana (lunes a domingo).</p></section>';
      html += lista('Servicios más pedidos', d.servicios);
      if (d.profesionales.length > 1) html += lista('Citas por profesional', d.profesionales);
      html += '<p class="cp-nota">Los ingresos se calculan con los precios de la pestaña Servicios. "Con el local cerrado" = reservas hechas fuera del horario del negocio.</p>';
      main.innerHTML = html;
    }
    function pintar(data) {
      $('cp-nav').hidden = false; $('cp-tabs').hidden = false;
      var pros = data.profesionales || [], varios = pros.length > 1;
      var nombrePro = {}; pros.forEach(function (p) { nombrePro[p.id] = p.nombre; });
      if (!varios || (filtro !== 'todos' && !nombrePro[filtro])) filtro = 'todos';
      var citas = data.citas.filter(function (c) { return filtro === 'todos' || c.profesionalId === filtro; });
      var activas = citas.filter(function (c) { return c.estado === 'Confirmada'; });
      $('cp-sum').textContent = activas.length + (activas.length === 1 ? ' cita' : ' citas') + ' en estos 7 días' + (filtro !== 'todos' ? ' · ' + nombrePro[filtro] : '');
      var html = '';
      if (varios) {
        html += '<div class="cp-fil" role="group" aria-label="Ver citas de">' +
          [{ id: 'todos', nombre: 'Todos' }].concat(pros).map(function (p) {
            return '<button type="button" data-f="' + esc(p.id) + '" aria-pressed="' + (filtro === p.id) + '">' + esc(p.nombre) + '</button>';
          }).join('') + '</div>';
      }
      html += '<form class="cp-closer" id="cp-cf"><div><label for="cp-c1">Cerrar desde</label><input id="cp-c1" type="date" required></div>' +
        '<div><label for="cp-c2">Hasta</label><input id="cp-c2" type="date"></div>' +
        (varios ? '<div><label for="cp-c4">¿Quién?</label><select id="cp-c4"><option value="TODOS">Todo el negocio</option>' +
          pros.map(function (p) { return '<option value="' + esc(p.id) + '"' + (filtro === p.id ? ' selected' : '') + '>Solo ' + esc(p.nombre) + '</option>'; }).join('') + '</select></div>' : '') +
        '<div><label for="cp-c3">Motivo</label><input id="cp-c3" type="text" placeholder="Vacaciones, festivo…"></div>' +
        '<button class="cp-btn" type="submit">Marcar cerrado</button></form>';
      for (var i = 0; i < 7; i++) {
        var d = add(start, i), k = iso(d);
        var del = citas.filter(function (c) { return c.fecha === k; });
        var cers = delDia(k, data.cerrados || []);
        var cer = cers.filter(function (c) { return esTodos(c.quien) || (filtro !== 'todos' && c.quien === filtro); })[0];
        var fuera = filtro === 'todos' && !cer ? cers.filter(function (c) { return !esTodos(c.quien) && nombrePro[c.quien]; }) : [];
        var n = del.filter(function (c) { return c.estado === 'Confirmada'; }).length;
        html += '<section class="cp-day"><div class="cp-dh"><h2>' + DIAS[d.getDay()] + ' · ' + corto(d) + '</h2><span>' +
          (cer ? '<span class="cp-tag cp-closed">' + (esTodos(cer.quien) ? 'Cerrado' : 'No trabaja') + (cer.motivo ? ' · ' + esc(cer.motivo) : '') + '</span>' :
            fuera.map(function (c) { return '<span class="cp-tag cp-off">Sin ' + esc(nombrePro[c.quien]) + '</span> '; }).join('') +
            '<span class="cp-tag">' + n + (n === 1 ? ' cita' : ' citas') + '</span>') + '</span></div>';
        if (!del.length) html += '<div class="cp-empty">Sin citas</div>';
        del.forEach(function (c) {
          var canc = c.estado !== 'Confirmada';
          html += '<div class="cp-ap' + (canc ? ' cp-cx' : '') + '"><div class="t">' + esc(c.hora) + '<span>' + esc(c.fin) + '</span></div>' +
            '<div><div class="n">' + esc(c.nombre) + (canc ? ' · cancelada' : '') + '</div>' +
            '<div class="d">' + esc(c.servicio) + ' · ' + esc(c.profesional) + '</div>' +
            '<div class="d"><a href="tel:' + esc(String(c.telefono).replace(/\s+/g, '')) + '">' + esc(c.telefono) + '</a>' + (c.email ? ' · ' + esc(c.email) : '') + '</div>' +
            (c.notas ? '<div class="d">“' + esc(c.notas) + '”</div>' : '') + '</div>' +
            (canc ? '<span></span>' : '<button type="button" class="cp-x" data-id="' + esc(c.id) + '">Cancelar</button>') + '</div>';
        });
        html += '</section>';
      }
      main.innerHTML = html;
      $('cp-c1').value = iso(start);
      $('cp-cf').onsubmit = function (e) {
        e.preventDefault();
        var a = $('cp-c1').value;
        accion({ accion: 'panel_cerrar', desde: a, hasta: $('cp-c2').value || a, motivo: $('cp-c3').value, quien: $('cp-c4') ? $('cp-c4').value : 'TODOS' });
      };
      cada('.cp-fil button', function (b) {
        b.onclick = function () {
          filtro = b.getAttribute('data-f');
          try { localStorage.setItem('cp-filtro-' + API, filtro); } catch (x) {}
          pintar(data);
        };
      }, main);
      cada('button.cp-x', function (b) {
        b.onclick = function () {
          if (b.getAttribute('data-confirm') !== '1') { b.setAttribute('data-confirm', '1'); b.textContent = '¿Seguro? Pulsa otra vez'; return; }
          b.disabled = true; b.textContent = 'Cancelando…';
          accion({ accion: 'panel_cancelar', id: b.getAttribute('data-id') });
        };
      }, main);
    }
    pedirPin();
  }
})();
