/*!
 * Creaner · solicitudes de presupuesto v1
 * Opción A, formulario ya hecho:
 *   <div id="creaner-presupuesto" data-api="URL_DEL_SCRIPT/exec" data-privacidad="/privacidad.html"></div>
 *   <script src="https://creaner.es/citas/presupuesto.js" defer></script>
 *   Colores (opcional): #creaner-presupuesto{ --cq-accent:#c2410c; --cq-radius:12px; --cq-font:inherit; }
 * Opción B, formulario con diseño propio: carga el script (sin el div) y llama a
 *   CreanerPresupuestos.enviar(API, { nombre, telefono, email, trabajo, zona, mensaje }, archivosDeFotos)
 *   → Promise con { ok, id, horas } o { ok:false, error }.
 * Las fotos (máx. 3) se reducen en el navegador a 1600 px antes de enviarse.
 */
(function () {
  'use strict';
  var MAX_FOTOS = 3, LADO = 1600;

  function reducir(file) {
    return new Promise(function (ok) {
      if (!file || !/^image\//.test(file.type)) return ok(null);
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        var k = Math.min(1, LADO / Math.max(img.width, img.height));
        var c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        ok({ tipo: 'image/jpeg', datos: c.toDataURL('image/jpeg', 0.8) });
      };
      img.onerror = function () { URL.revokeObjectURL(url); ok(null); };
      img.src = url;
    });
  }

  function enviar(api, datos, archivos) {
    var lista = Array.prototype.slice.call(archivos || [], 0, MAX_FOTOS);
    return Promise.all(lista.map(reducir)).then(function (fotos) {
      var body = {};
      for (var k in datos) if (Object.prototype.hasOwnProperty.call(datos, k)) body[k] = datos[k];
      body.accion = 'solicitud'; body.fotos = fotos.filter(Boolean);
      return fetch(api, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) })
        .then(function (r) { return r.json(); });
    });
  }

  window.CreanerPresupuestos = { enviar: enviar, reducir: reducir };

  var root = document.getElementById('creaner-presupuesto');
  if (!root) return;
  var API = root.getAttribute('data-api') || '', PRIV = root.getAttribute('data-privacidad') || '';
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  var css =
    ':where(#creaner-presupuesto){--cq-accent:#0d1d38;--cq-ink:#14181e;--cq-muted:#5d6672;--cq-bg:#fff;--cq-soft:#f1f3f6;--cq-line:#dde1e7;--cq-radius:12px;--cq-font:inherit;--cq-bad:#a2463a}' +
    '#creaner-presupuesto .cq{font-family:var(--cq-font);color:var(--cq-ink);display:flex;flex-direction:column;gap:12px}' +
    '#creaner-presupuesto .cq *{box-sizing:border-box}' +
    '#creaner-presupuesto .cq-f{display:flex;flex-direction:column;gap:5px;min-width:0}#creaner-presupuesto .cq-f label{font-size:14px;font-weight:600}' +
    '#creaner-presupuesto .cq-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}' +
    '#creaner-presupuesto input,#creaner-presupuesto select,#creaner-presupuesto textarea{width:100%;font:inherit;font-size:16px;color:inherit;background:var(--cq-bg);border:1px solid var(--cq-line);border-radius:var(--cq-radius);padding:11px 12px}' +
    '#creaner-presupuesto textarea{min-height:96px;resize:vertical}' +
    '#creaner-presupuesto .cq-file{border:1px dashed var(--cq-line);border-radius:var(--cq-radius);padding:12px;display:flex;gap:10px;align-items:center;justify-content:space-between;font-size:14px;color:var(--cq-muted)}' +
    '#creaner-presupuesto .cq-file label{color:var(--cq-accent);font-weight:600;cursor:pointer;white-space:nowrap}#creaner-presupuesto .cq-file input{position:absolute;opacity:0;width:1px;height:1px}' +
    '#creaner-presupuesto .cq-btn{border:0;border-radius:999px;background:var(--cq-accent);color:#fff;font:inherit;font-weight:600;padding:13px 18px;min-height:48px;cursor:pointer}' +
    '#creaner-presupuesto .cq-btn:disabled{opacity:.55;cursor:wait}' +
    '#creaner-presupuesto .cq-err{color:var(--cq-bad);font-size:14px;margin:0;min-height:1em}' +
    '#creaner-presupuesto .cq-small{font-size:13px;color:var(--cq-muted);margin:0}' +
    '#creaner-presupuesto .cq-ok{background:var(--cq-soft);border-radius:var(--cq-radius);padding:18px}#creaner-presupuesto .cq-ok b{display:block;font-size:18px;margin-bottom:4px}' +
    '#creaner-presupuesto .cq-trap{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  root.innerHTML = '<p class="cq-small">Cargando formulario…</p>';

  fetch(API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ accion: 'presupuesto_config' }) })
    .then(function (r) { return r.json(); })
    .then(function (cfg) { if (!cfg.ok) throw new Error(cfg.error); pintar(cfg); })
    .catch(function (x) { root.innerHTML = '<p class="cq-err">No se ha podido cargar el formulario. ' + esc(x.message) + '</p>'; });

  function opciones(l) { return l.map(function (x) { return '<option>' + esc(x) + '</option>'; }).join(''); }

  function pintar(cfg) {
    root.innerHTML = '<form class="cq" novalidate>' +
      '<div class="cq-row">' +
      (cfg.trabajos.length ? '<div class="cq-f"><label for="cq-tr">¿Qué necesitas?</label><select id="cq-tr">' + opciones(cfg.trabajos) + '</select></div>' : '') +
      '<div class="cq-f"><label for="cq-zo">' + (cfg.zonas.length ? 'Zona' : 'Localidad') + '</label>' +
      (cfg.zonas.length ? '<select id="cq-zo">' + opciones(cfg.zonas) + '</select>' : '<input id="cq-zo" type="text" autocomplete="address-level2">') + '</div>' +
      '</div>' +
      '<div class="cq-f"><label for="cq-ms">Cuéntanos qué necesitas</label><textarea id="cq-ms" maxlength="1500" placeholder="Medidas, qué hay ahora, cuándo te vendría bien…"></textarea></div>' +
      '<div class="cq-file"><span id="cq-fn">Añade hasta 3 fotos (opcional)</span><label>Subir fotos<input id="cq-fo" type="file" accept="image/*" multiple></label></div>' +
      '<div class="cq-row"><div class="cq-f"><label for="cq-no">Nombre</label><input id="cq-no" type="text" autocomplete="name" required></div>' +
      '<div class="cq-f"><label for="cq-te">Teléfono</label><input id="cq-te" type="tel" autocomplete="tel" required></div></div>' +
      '<div class="cq-f"><label for="cq-em">Email (opcional, para enviarte la confirmación)</label><input id="cq-em" type="email" autocomplete="email"></div>' +
      '<div class="cq-trap" aria-hidden="true"><label>Web<input id="cq-web" type="text" tabindex="-1" autocomplete="off"></label></div>' +
      '<button class="cq-btn" type="submit">Pedir presupuesto</button><p class="cq-err" id="cq-er" aria-live="polite"></p>' +
      '<p class="cq-small">Te llamamos en menos de ' + esc(cfg.horas) + ' h. ' +
      (PRIV ? 'Al enviar aceptas nuestra <a href="' + esc(PRIV) + '" target="_blank" rel="noopener">política de privacidad</a>.' : 'Solo usaremos tus datos para responder a tu solicitud.') + '</p>' +
      '</form>';
    var f = root.querySelector('form'), fo = root.querySelector('#cq-fo');
    fo.addEventListener('change', function () {
      var n = Math.min(fo.files.length, MAX_FOTOS);
      root.querySelector('#cq-fn').textContent = n ? n + (n === 1 ? ' foto añadida' : ' fotos añadidas') + (fo.files.length > MAX_FOTOS ? ' (máx. 3)' : '') : 'Añade hasta 3 fotos (opcional)';
    });
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      function v(id) { var el = root.querySelector('#' + id); return el ? el.value.trim() : ''; }
      var er = root.querySelector('#cq-er'), b = root.querySelector('.cq-btn');
      if (!v('cq-no') || v('cq-te').replace(/\D/g, '').length < 9) { er.textContent = 'Pon tu nombre y un teléfono para que podamos llamarte.'; return; }
      er.textContent = ''; b.disabled = true; b.textContent = fo.files.length ? 'Enviando fotos…' : 'Enviando…';
      enviar(API, { nombre: v('cq-no'), telefono: v('cq-te'), email: v('cq-em'), trabajo: v('cq-tr'), zona: v('cq-zo'), mensaje: v('cq-ms'), web: v('cq-web') }, fo.files)
        .then(function (r) {
          if (!r.ok) throw new Error(r.error || 'No se ha podido enviar.');
          root.innerHTML = '<div class="cq-ok" role="status"><b>¡Solicitud enviada, ' + esc(v('cq-no') || '') + '!</b>Te llamaremos en menos de ' + esc(r.horas || cfg.horas) + ' horas' +
            (v('cq-em') ? '. Te hemos enviado la confirmación por email.' : '.') + '</div>';
        })
        .catch(function (x) { b.disabled = false; b.textContent = 'Pedir presupuesto'; er.textContent = x.message; });
    });
  }
})();
