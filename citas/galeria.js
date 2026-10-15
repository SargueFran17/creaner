/*!
 * Creaner · galería de trabajos v1
 * Enseña en la web del negocio los trabajos de la pestaña Galería de su hoja (los sube Creaner
 * desde creaner.es/citas/galeria.html). Si no carga o está vacía, se queda lo que hubiera en el HTML.
 *
 * Opción A, galería ya hecha:
 *   <div id="creaner-galeria" data-api="URL_DEL_SCRIPT/exec"></div>
 *   <script src="https://creaner.es/citas/galeria.js" defer></script>
 *   Colores (opcional): #creaner-galeria{ --cg-accent:#0a3a57; --cg-radius:16px; --cg-font:inherit; --cg-cols:3; }
 *
 * Opción B, con el diseño de la web: el contenedor lleva data-api y un <template data-galeria>
 * con una tarjeta. Dentro, data-g marca dónde va cada dato:
 *   data-g="foto" (img o cualquier elemento: se le pone la foto de portada)
 *   data-g="titulo" | "descripcion" | "zona" | "trabajo" | "fecha" | "lugar" (trabajo · zona) | "nfotos"
 *   <div class="works" data-creaner-galeria data-api="…">
 *     …tarjetas de ejemplo (se quedan si no hay trabajos)…
 *     <template data-galeria><article class="work"><img data-g="foto"><h3 data-g="titulo"></h3><p data-g="descripcion"></p></article></template>
 *   </div>
 *
 * Al tocar una foto se abre un visor con todas las fotos de ese trabajo.
 * También: CreanerGaleria.cargar(API) → Promise con { ok, negocio, trabajos:[{id,fecha,titulo,zona,trabajo,descripcion,fotos}] }
 */
(function () {
  'use strict';
  var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fechaTxt(f) { var m = String(f || '').match(/^(\d{4})-(\d{2})/); return m ? MESES[+m[2] - 1] + ' ' + m[1] : ''; }
  function idDe(url) { var m = String(url).match(/\/d\/([^=/?]+)/); return m ? m[1] : ''; }
  function tam(url, w) { return String(url).replace(/=w\d+$/, '=w' + w); }
  // Si la dirección rápida de Google falla, se prueba la de miniaturas de Drive
  function respaldo(img) {
    img.addEventListener('error', function f() {
      img.removeEventListener('error', f);
      var id = idDe(img.currentSrc || img.src); if (id) img.src = 'https://drive.google.com/thumbnail?id=' + id + '&sz=w1600';
    });
  }

  var pedidas = {};
  function cargar(api) {
    if (!pedidas[api]) {
      pedidas[api] = fetch(api + (api.indexOf('?') < 0 ? '?' : '&') + 'accion=galeria')
        .then(function (r) { return r.json(); })
        .then(function (r) { if (!r || !r.ok) throw new Error((r && r.error) || 'Galería no disponible.'); return r; });
    }
    return pedidas[api];
  }

  /* ----------------------------------- visor ----------------------------------- */
  var visor, pista, contador;
  function css() {
    if (document.getElementById('cg-css')) return;
    var s = document.createElement('style'); s.id = 'cg-css';
    s.textContent =
      ':where(#creaner-galeria){--cg-accent:#0d1d38;--cg-ink:#14181e;--cg-muted:#5d6672;--cg-bg:#fff;--cg-line:#dde1e7;--cg-radius:16px;--cg-font:inherit;--cg-cols:3}' +
      '#creaner-galeria .cg{display:grid;grid-template-columns:repeat(var(--cg-cols),minmax(0,1fr));gap:14px;font-family:var(--cg-font);color:var(--cg-ink)}' +
      '#creaner-galeria .cg-it{margin:0;background:var(--cg-bg);border:1px solid var(--cg-line);border-radius:var(--cg-radius);overflow:hidden;display:flex;flex-direction:column}' +
      '#creaner-galeria .cg-ph{all:unset;cursor:zoom-in;display:block;position:relative;aspect-ratio:4/3;background:#eef0f3}' +
      '#creaner-galeria .cg-ph img{width:100%;height:100%;object-fit:cover;display:block}' +
      '#creaner-galeria .cg-n{position:absolute;right:10px;bottom:10px;background:rgba(0,0,0,.6);color:#fff;font-size:12px;font-weight:600;border-radius:999px;padding:3px 9px}' +
      '#creaner-galeria figcaption{padding:12px 14px 14px}#creaner-galeria figcaption b{display:block;font-size:16px}' +
      '#creaner-galeria figcaption span{display:block;font-size:13px;color:var(--cg-muted);margin-top:2px}#creaner-galeria figcaption p{margin:6px 0 0;font-size:14px;color:var(--cg-muted)}' +
      '@media (max-width:860px){#creaner-galeria .cg{grid-template-columns:repeat(2,minmax(0,1fr))}}@media (max-width:560px){#creaner-galeria .cg{grid-template-columns:minmax(0,1fr)}}' +
      '[data-g="foto"]{cursor:zoom-in}' +
      '.cg-visor{position:fixed;inset:0;z-index:2147483000;background:rgba(8,12,20,.94);display:none;flex-direction:column;color:#fff;font-family:system-ui,sans-serif}' +
      '.cg-visor.abierto{display:flex}.cg-visor *{box-sizing:border-box}' +
      '.cg-top{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px 16px;padding-top:max(12px,env(safe-area-inset-top))}' +
      '.cg-top p{margin:0;font-size:14px;opacity:.85;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
      '.cg-x{border:0;background:rgba(255,255,255,.14);color:#fff;width:44px;height:44px;border-radius:50%;font-size:24px;line-height:1;cursor:pointer;flex:0 0 auto}' +
      '.cg-pista{flex:1;display:flex;overflow-x:auto;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch;scrollbar-width:none}.cg-pista::-webkit-scrollbar{display:none}' +
      '.cg-pista div{flex:0 0 100%;scroll-snap-align:center;display:flex;align-items:center;justify-content:center;padding:0 12px 16px}' +
      '.cg-pista img{max-width:100%;max-height:100%;object-fit:contain;border-radius:8px}' +
      '.cg-fl{position:absolute;top:50%;transform:translateY(-50%);border:0;background:rgba(255,255,255,.14);color:#fff;width:44px;height:44px;border-radius:50%;font-size:22px;cursor:pointer}' +
      '.cg-fl.i{left:12px}.cg-fl.d{right:12px}@media (hover:none){.cg-fl{display:none}}';
    document.head.appendChild(s);
  }

  function abrirVisor(t, desde) {
    css();
    if (!visor) {
      visor = document.createElement('div'); visor.className = 'cg-visor'; visor.setAttribute('role', 'dialog'); visor.setAttribute('aria-modal', 'true');
      visor.innerHTML = '<div class="cg-top"><p></p><button type="button" class="cg-x" aria-label="Cerrar">×</button></div><div class="cg-pista"></div>' +
        '<button type="button" class="cg-fl i" aria-label="Foto anterior">‹</button><button type="button" class="cg-fl d" aria-label="Foto siguiente">›</button>';
      document.body.appendChild(visor);
      pista = visor.querySelector('.cg-pista'); contador = visor.querySelector('.cg-top p');
      visor.querySelector('.cg-x').onclick = cerrarVisor;
      visor.querySelector('.i').onclick = function () { pista.scrollBy({ left: -pista.clientWidth, behavior: 'smooth' }); };
      visor.querySelector('.d').onclick = function () { pista.scrollBy({ left: pista.clientWidth, behavior: 'smooth' }); };
      visor.addEventListener('click', function (e) { if (e.target === visor || e.target.parentNode === pista) cerrarVisor(); });
      document.addEventListener('keydown', function (e) {
        if (!visor.classList.contains('abierto')) return;
        if (e.key === 'Escape') cerrarVisor();
        if (e.key === 'ArrowRight') visor.querySelector('.d').click();
        if (e.key === 'ArrowLeft') visor.querySelector('.i').click();
      });
      pista.addEventListener('scroll', function () { pintarContador(); }, { passive: true });
    }
    visor.t = t;
    pista.innerHTML = t.fotos.map(function (u) { return '<div><img alt="' + esc(t.titulo) + '" src="' + esc(u) + '"></div>'; }).join('');
    Array.prototype.forEach.call(pista.querySelectorAll('img'), respaldo);
    visor.querySelector('.i').style.visibility = visor.querySelector('.d').style.visibility = t.fotos.length > 1 ? '' : 'hidden';
    visor.classList.add('abierto'); document.documentElement.style.overflow = 'hidden';
    pista.scrollLeft = (desde || 0) * pista.clientWidth; pintarContador();
    visor.querySelector('.cg-x').focus();
  }
  function pintarContador() {
    var t = visor.t, i = Math.round(pista.scrollLeft / Math.max(1, pista.clientWidth));
    contador.textContent = t.titulo + (t.fotos.length > 1 ? ' · ' + (i + 1) + '/' + t.fotos.length : '');
  }
  function cerrarVisor() { visor.classList.remove('abierto'); document.documentElement.style.overflow = ''; }

  /* ----------------------------------- pintar ----------------------------------- */
  function lugar(t) { return [t.trabajo, t.zona].filter(Boolean).join(' · '); }

  function opcionA(root, r) {
    css();
    root.innerHTML = '<div class="cg">' + r.trabajos.map(function (t, i) {
      var sub = [lugar(t), fechaTxt(t.fecha)].filter(Boolean).join(' · ');
      return '<figure class="cg-it"><button type="button" class="cg-ph" data-i="' + i + '" aria-label="Ver fotos: ' + esc(t.titulo) + '">' +
        '<img alt="' + esc(t.titulo) + '" loading="lazy" src="' + esc(tam(t.fotos[0], 900)) + '">' +
        (t.fotos.length > 1 ? '<span class="cg-n">' + t.fotos.length + ' fotos</span>' : '') + '</button>' +
        '<figcaption><b>' + esc(t.titulo) + '</b>' + (sub ? '<span>' + esc(sub) + '</span>' : '') + (t.descripcion ? '<p>' + esc(t.descripcion) + '</p>' : '') + '</figcaption></figure>';
    }).join('') + '</div>';
    Array.prototype.forEach.call(root.querySelectorAll('img'), respaldo);
    Array.prototype.forEach.call(root.querySelectorAll('.cg-ph'), function (b) { b.onclick = function () { abrirVisor(r.trabajos[+b.getAttribute('data-i')]); }; });
  }

  function opcionB(root, tpl, r) {
    css();
    var frag = document.createDocumentFragment();
    r.trabajos.forEach(function (t) {
      var el = tpl.content.cloneNode(true);
      var valores = { titulo: t.titulo, descripcion: t.descripcion, zona: t.zona, trabajo: t.trabajo, fecha: fechaTxt(t.fecha), lugar: lugar(t),
        nfotos: t.fotos.length > 1 ? t.fotos.length + ' fotos' : '' };
      Array.prototype.forEach.call(el.querySelectorAll('[data-g]'), function (n) {
        var k = n.getAttribute('data-g');
        if (k === 'foto') {
          var url = tam(t.fotos[0], 900);
          if (n.tagName === 'IMG') { n.src = url; n.alt = t.titulo; n.loading = 'lazy'; respaldo(n); }
          else { n.style.backgroundImage = 'url("' + url + '")'; n.style.backgroundSize = 'cover'; n.style.backgroundPosition = 'center'; }
          n.setAttribute('role', 'button'); n.setAttribute('tabindex', '0'); n.setAttribute('aria-label', 'Ver fotos: ' + t.titulo);
          n.addEventListener('click', function () { abrirVisor(t); });
          n.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrirVisor(t); } });
        } else if (valores[k] !== undefined) {
          n.textContent = valores[k];
          if (!valores[k]) n.hidden = true;
        }
      });
      frag.appendChild(el);
    });
    Array.prototype.slice.call(root.childNodes).forEach(function (n) { if (n !== tpl) root.removeChild(n); });
    root.insertBefore(frag, tpl);
  }

  function iniciar() {
    var raices = Array.prototype.slice.call(document.querySelectorAll('#creaner-galeria,[data-creaner-galeria]'));
    raices.forEach(function (root) {
      var api = root.getAttribute('data-api') || '';
      if (!/^https:\/\//.test(api)) return; // sin API: se queda el contenido de ejemplo
      var tpl = root.querySelector('template[data-galeria]');
      if (!tpl && root.id === 'creaner-galeria' && !root.children.length) root.innerHTML = '<p style="color:#5d6672;font-size:14px">Cargando trabajos…</p>';
      cargar(api).then(function (r) {
        if (!r.trabajos || !r.trabajos.length) { if (!tpl && root.id === 'creaner-galeria') root.innerHTML = ''; return; }
        if (tpl) opcionB(root, tpl, r); else opcionA(root, r);
        root.setAttribute('data-cargada', r.trabajos.length);
      }).catch(function (x) {
        if (window.console) console.warn('Creaner galería:', x.message);
        if (!tpl && root.querySelector('p') && root.children.length === 1) root.innerHTML = '';
      });
    });
  }

  window.CreanerGaleria = { cargar: cargar, abrir: abrirVisor, iniciar: iniciar };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
