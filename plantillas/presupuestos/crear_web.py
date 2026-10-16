#!/usr/bin/env python3
"""
Creaner · generador de webs de presupuestos

Uso:
    python3 crear_web.py CARPETA_DEL_CLIENTE CARPETA_DE_SALIDA

CARPETA_DEL_CLIENTE contiene cliente.json (ver ejemplo/cliente.json) y, si las hay,
las fotos y el logo a los que apunta el JSON. Se copian a la salida tal cual.

Genera: index.html, privacidad.html, aviso-legal.html, panel.html y opinion.html
(estas dos con la identidad de la web; ver citas/plantilla). Avisa por pantalla de lo
que falta o de colores con poco contraste. Necesita Jinja2 (pip install jinja2).
"""
import datetime
import json
import re
import shutil
import sys
from pathlib import Path
from urllib.parse import quote_plus

from jinja2 import Environment, FileSystemLoader, StrictUndefined

AQUI = Path(__file__).resolve().parent
MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

# ----------------------------------------------------------------------------- colores
def rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))

def hexa(c):
    return '#' + ''.join('%02x' % max(0, min(255, round(v))) for v in c)

def mezcla(a, b, t):
    """t = cuánto de b (0..1)"""
    A, B = rgb(a), rgb(b)
    return hexa(tuple(A[i] * (1 - t) + B[i] * t for i in range(3)))

def lum(h):
    def l(v):
        v /= 255
        return v / 12.92 if v <= .03928 else ((v + .055) / 1.055) ** 2.4
    r, g, b = rgb(h)
    return .2126 * l(r) + .7152 * l(g) + .0722 * l(b)

def contraste(a, b):
    la, lb = sorted([lum(a), lum(b)], reverse=True)
    return (la + .05) / (lb + .05)

def texto_sobre(fondo):
    return '#ffffff' if contraste(fondo, '#ffffff') >= contraste(fondo, '#14181e') else '#14181e'

def paleta(c, avisos):
    p, a, f = c['principal'], c['acento'], c.get('fondo') or '#f5f6f8'
    for k, v in (('principal', p), ('acento', a), ('fondo', f)):
        if not re.fullmatch(r'#[0-9a-fA-F]{6}', v):
            sys.exit(f'Color {k} no válido: {v} (formato #RRGGBB)')
    tinta = mezcla(p, '#0b0e12', .72) if lum(p) > .05 else mezcla(p, '#0b0e12', .45)
    # variante del principal para texto pequeño sobre fondo claro (debe leerse bien)
    p2 = p
    for t in (.18, .12, .06):
        cand = mezcla(p, '#ffffff', t)
        if contraste(cand, '#ffffff') >= 4.6:
            p2 = cand
            break
    if contraste(p2, '#ffffff') < 4.5:
        p2 = mezcla(p, '#000000', .35)
    suave = mezcla(tinta, '#ffffff', .38)
    while contraste(suave, '#ffffff') < 4.6:
        suave = mezcla(suave, tinta, .2)
    out = dict(principal=p, principal_on=texto_sobre(p), principal_2=p2, acento=a, acento_on=texto_sobre(a),
               acento_soft=mezcla(a, '#ffffff', .86), fondo=f, tinta=tinta, suave=suave, linea=mezcla(p, '#ffffff', .86))
    if contraste(p, '#ffffff') < 3:
        avisos.append('El color principal es muy claro: la cabecera y los botones se leerán mal. Usa uno más oscuro.')
    if contraste(a, p) < 2.6:
        avisos.append(f'El acento ({a}) se distingue poco sobre el principal ({p}) en la portada.')
    return out

# ----------------------------------------------------------------------------- iconos
ICONOS = {
    'tel': '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
    'wa': '<path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21"/><path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1"/>',
    'doc': '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>',
    'foto': '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-8 8"/>',
    'llave': '<path d="M14.7 6.3a4 4 0 0 0 5 5l-9.4 9.4a2.1 2.1 0 0 1-3-3l9.4-9.4a4 4 0 0 0-2-2z"/>',
    'gota': '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
    'tuberia': '<path d="M4 7h8a4 4 0 0 1 4 4v9M4 4v6M13 20h6"/>',
    'rayo': '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
    'copo': '<path d="M12 2v20M4.9 7l14.2 10M4.9 17L19.1 7M9 4l3 2 3-2M9 20l3-2 3 2"/>',
    'fuego': '<path d="M12 22a7 7 0 0 0 7-7c0-4-3-6-4-10-2 2-3 4-3 6-1-1-2-2-2-4-2 2-5 5-5 8a7 7 0 0 0 7 7z"/>',
    'casa': '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    'pintura': '<rect x="3" y="3" width="16" height="6" rx="1.5"/><path d="M19 6h2v5h-9v3M10 14h4v7h-4z"/>',
    'ladrillo': '<rect x="3" y="4" width="18" height="16" rx="1"/><path d="M3 9h18M3 15h18M9 4v5M15 9v6M9 15v5"/>',
    'escudo': '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
    'reloj': '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    'sol': '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    'herramienta': '<path d="M3 21l7-7M14 4l6 6-3 3-6-6zM10 8l-2-2 2-2 2 2"/>',
    'check': '<path d="M5 12l5 5L20 7"/>',
}

def icono(nombre):
    cuerpo = ICONOS.get(nombre) or ICONOS['herramienta']
    if nombre == 'wa':
        return ('<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.5 14.2c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .1-3.3-.8-2.8-1.2-4.6-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.9s.7-2.1 1-2.4c.3-.3.6-.3.8-.3h.6c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.4 0 .6l-.4.6-.4.4c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.4 2.4 1.5.3.1.5.1.6-.1l.9-1c.2-.3.4-.2.7-.1l2 .9c.3.2.5.2.6.4.1.1.1.7-.1 1.3z"/></svg>')
    return '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + cuerpo + '</svg>'

# ----------------------------------------------------------------------------- datos
PASOS = [
    {'titulo': 'Nos cuentas qué necesitas', 'texto': 'Por el formulario, por teléfono o por WhatsApp. Con un par de fotos vamos más rápido.'},
    {'titulo': 'Te llamamos', 'texto': 'Resolvemos dudas y, si hace falta, pasamos a verlo sin compromiso.'},
    {'titulo': 'Presupuesto cerrado', 'texto': 'Te lo enviamos por escrito, con plazos claros y sin letra pequeña.'},
    {'titulo': 'Trabajo hecho y limpio', 'texto': 'Lo dejamos funcionando, recogemos y te explicamos todo.'},
]

def tel_link(t):
    d = re.sub(r'[^\d+]', '', t or '')
    return d if d.startswith('+') else ('+34' + d if len(d) == 9 else d)

def preparar(d, carpeta, avisos):
    req = ['negocio', 'colores', 'contacto', 'hero', 'servicios', 'presupuesto']
    falta = [k for k in req if k not in d]
    if falta:
        sys.exit('Faltan en cliente.json: ' + ', '.join(falta))
    ct = d['contacto']
    if not ct.get('telefono'):
        sys.exit('Falta contacto.telefono')
    ct.setdefault('email', ''); ct.setdefault('direccion', ''); ct.setdefault('horario', ''); ct.setdefault('urgencias', '')
    ct.setdefault('tel_etiqueta', 'Llámanos')
    ct['tel_link'] = tel_link(ct['telefono'])
    wa = re.sub(r'\D', '', ct.get('whatsapp', ct['telefono']) or '')
    if wa:
        wa = '34' + wa if len(wa) == 9 else wa
        msg = ct.get('whatsapp_mensaje') or f"Hola, vengo de la web de {d['negocio']} y quería pedir un presupuesto."
        ct['wa_link'] = f'https://wa.me/{wa}?text={quote_plus(msg)}'
    else:
        ct['wa_link'] = ''

    fu = d.setdefault('fuentes', {})
    fu.setdefault('titulos', 'Bricolage Grotesque'); fu.setdefault('texto', 'Figtree')
    url_f = fu.get('url') or (
        'https://fonts.googleapis.com/css2?family=' + fu['titulos'].replace(' ', '+') + ':wght@600;700;800'
        + ('' if fu['texto'] == fu['titulos'] else '&family=' + fu['texto'].replace(' ', '+') + ':wght@400;500;600;700')
        + '&display=swap')

    h = d['hero']
    h.setdefault('destacado', ''); h.setdefault('foto', ''); h.setdefault('foto_alt', f"Trabajo de {d['negocio']}")
    h.setdefault('boton', 'Pedir presupuesto gratis'); h.setdefault('datos', []); h.setdefault('etiqueta', '')
    url = (d.get('url') or '').rstrip('/') + '/' if d.get('url') else ''
    h['foto_abs'] = (url + h['foto']) if h['foto'] and not h['foto'].startswith('http') else h['foto']
    if not h['foto']:
        avisos.append('Sin hero.foto: la portada muestra un hueco. Pide al cliente una foto buena de un trabajo.')

    pr = d['presupuesto']
    pr.setdefault('horas', 24); pr.setdefault('zonas', [])
    pr.setdefault('titulo', 'Cuéntanos qué necesitas y te damos precio')
    pr.setdefault('texto', f"Rellena el formulario y te llamamos en menos de {pr['horas']} horas. Sin compromiso.")
    pr.setdefault('ventajas', ['Presupuesto gratis y por escrito', 'Precio cerrado antes de empezar', 'Garantía en todos los trabajos'])
    pr.setdefault('placeholder', 'Qué hay ahora, medidas aproximadas, cuándo te vendría bien…')
    pr.setdefault('fotos_texto', 'Añade hasta 3 fotos (opcional)')
    if not pr.get('trabajos'):
        pr['trabajos'] = [s['nombre'] for s in d['servicios']][:6]

    for s in d['servicios']:
        s.setdefault('icono', 'herramienta'); s.setdefault('desde', '')
        if s['icono'] not in ICONOS:
            avisos.append(f"Icono desconocido '{s['icono']}' en {s['nombre']}. Disponibles: {', '.join(sorted(ICONOS))}")
    if len(d['servicios']) > 9:
        avisos.append('Más de 9 servicios: la sección queda larga. Agrupa algunos.')

    for o in d.get('opiniones', []):
        o['estrellas'] = max(1, min(5, int(o.get('estrellas', 5))))
        o.setdefault('fuente', '')
    if d.get('opiniones') and not d.get('demo'):
        avisos.append('Revisa que las opiniones sean reales (copiadas de Google con permiso). No se pueden inventar.')

    ciudad = ct.get('ciudad', '')
    tx = d.setdefault('textos', {})
    tx.setdefault('servicios_titulo', 'Todo lo que necesitas, con un solo profesional')
    tx.setdefault('servicios_texto', '')
    tx.setdefault('pasos_titulo', 'Así de fácil')
    tx.setdefault('trabajos_titulo', 'Trabajos recientes')
    tx.setdefault('trabajos_texto', 'Fotos reales de trabajos terminados. Las vamos actualizando cada mes.')
    tx.setdefault('opiniones_titulo', 'Lo que dicen nuestros clientes')
    tx.setdefault('zona_titulo', f"Trabajamos en {ciudad} y alrededores" if ciudad else 'Dónde trabajamos')
    tx.setdefault('zona_texto', 'Si tu localidad no está en la lista, pregúntanos: muchas veces también llegamos.')
    tx.setdefault('cierre_titulo', '¿Hablamos de tu proyecto?')
    tx.setdefault('cierre_texto', f"Pide tu presupuesto sin compromiso y te llamamos en menos de {pr['horas']} horas.")

    seo = d.setdefault('seo', {})
    seo.setdefault('titulo', f"{d['negocio']}" + (f" · {d.get('actividad', '')} en {ciudad}" if ciudad and d.get('actividad') else ''))
    seo.setdefault('descripcion', h['texto'][:155])
    if len(seo['titulo']) > 65:
        avisos.append(f"seo.titulo largo ({len(seo['titulo'])} caracteres); Google corta hacia los 60.")

    hoy = datetime.date.today()
    logo = d.get('logo', '')
    if logo.endswith('.svg'):
        favicon = logo
    else:
        ini = d['negocio'][:1].upper()
        svg = (f"<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' rx='16' fill='{d['colores']['principal']}'/>"
               f"<text x='32' y='43' font-family='Arial,sans-serif' font-size='32' font-weight='700' text-anchor='middle' fill='{texto_sobre(d['colores']['principal'])}'>{ini}</text></svg>")
        favicon = 'data:image/svg+xml,' + quote_plus(svg).replace('+', '%20')

    ctx = dict(d)
    ctx.update(
        negocio=d['negocio'], c=paleta(d['colores'], avisos), fuentes=fu, fuentes_url=url_f, contacto=ct, hero=h, presupuesto=pr,
        servicios=d['servicios'], pasos=d.get('pasos') or PASOS, trabajos_ejemplo=d.get('trabajos_ejemplo', []),
        opiniones=d.get('opiniones', []), resenas_url=d.get('resenas_url', ''), faq=d.get('faq', []), textos=tx, seo=seo,
        url=url, demo=bool(d.get('demo')), api=d.get('api', ''), logo=logo, favicon=favicon, radio=int(d.get('radio', 16)),
        sello=d.get('sello'), top_texto=d.get('top_texto') or (f"Presupuesto gratis en {ciudad} y alrededores" if ciudad else 'Presupuesto gratis y sin compromiso'),
        legal=d.get('legal', {}), anio=hoy.year, fecha_legal=f"{hoy.day} de {MESES[hoy.month - 1]} de {hoy.year}", icon=icono)
    ctx['jsonld'] = jsonld(ctx)
    if not ctx['api']:
        avisos.append('Sin api: el formulario y la galería funcionan en modo demo.')
    if not ctx['legal'].get('nif') and not ctx['demo']:
        avisos.append('Faltan legal.titular / legal.nif / legal.direccion: privacidad y aviso legal salen como borrador.')
    return ctx

def jsonld(x):
    ct = x['contacto']
    neg = {'@type': x.get('tipo_schema', 'HomeAndConstructionBusiness'), 'name': x['negocio'], 'telephone': ct['tel_link'],
           'description': x['seo']['descripcion']}
    if x['url']:
        neg['url'] = x['url']
    if x['hero'].get('foto_abs'):
        neg['image'] = x['hero']['foto_abs']
    if ct.get('email'):
        neg['email'] = ct['email']
    if ct.get('direccion'):
        neg['address'] = {'@type': 'PostalAddress', 'streetAddress': ct['direccion'], 'addressLocality': ct.get('ciudad', ''), 'addressRegion': ct.get('provincia', ''), 'addressCountry': 'ES'}
    if x['presupuesto']['zonas']:
        neg['areaServed'] = [{'@type': 'City', 'name': z} for z in x['presupuesto']['zonas']]
    grafo = [neg]
    if x['faq']:
        grafo.append({'@type': 'FAQPage', 'mainEntity': [{'@type': 'Question', 'name': q['p'], 'acceptedAnswer': {'@type': 'Answer', 'text': q['r']}} for q in x['faq']]})
    return json.dumps({'@context': 'https://schema.org', '@graph': grafo}, ensure_ascii=False).replace('</', '<\\/')

def pagina_citas(tipo, x):
    """panel.html / opinion.html con la identidad de la web (lee citas/plantilla para no duplicar)"""
    base = (AQUI.parent.parent / 'citas' / 'plantilla' / f'{tipo}.html').read_text(encoding='utf-8')
    base = re.sub(r'<!-- Cambia.*?-->\n', '', base, flags=re.S)
    base = base.replace('NOMBRE DEL NEGOCIO', x['negocio'].replace('&', '&amp;').replace('<', '&lt;'))
    base = base.replace('URL_DEL_SCRIPT', x['api'] or '')
    base = base.replace('data-color="#COLOR"', f'data-color="{x["c"]["principal"]}"').replace('data-fondo="#FONDO"', f'data-fondo="{x["c"]["fondo"]}"')
    base = base.replace('data-logo="logo.svg"', f'data-logo="{x["logo"]}"' if x['logo'] else '')
    base = base.replace("data-fuente='\"Fuente de la web\", sans-serif'", "data-fuente='\"" + x['fuentes']['texto'] + "\", system-ui, sans-serif'")
    base = base.replace('</head>', f'<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link rel="stylesheet" href="{x["fuentes_url"]}">\n</head>', 1)
    return base

def main():
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    origen, destino = Path(sys.argv[1]).resolve(), Path(sys.argv[2]).resolve()
    datos = json.loads((origen / 'cliente.json').read_text(encoding='utf-8'))
    avisos = []
    x = preparar(datos, origen, avisos)
    env = Environment(loader=FileSystemLoader(str(AQUI)), autoescape=True, undefined=StrictUndefined, trim_blocks=False)
    destino.mkdir(parents=True, exist_ok=True)
    (destino / 'index.html').write_text(env.get_template('plantilla.html').render(**x), encoding='utf-8')
    leg = env.get_template('legal.html')
    (destino / 'privacidad.html').write_text(leg.render(pagina={'tipo': 'privacidad', 'titulo': 'Política de privacidad'}, **x), encoding='utf-8')
    (destino / 'aviso-legal.html').write_text(leg.render(pagina={'tipo': 'aviso', 'titulo': 'Aviso legal'}, **x), encoding='utf-8')
    if x['api']:
        for t in ('panel', 'opinion'):
            (destino / f'{t}.html').write_text(pagina_citas(t, x), encoding='utf-8')
    # copiar fotos y logo que estén junto al JSON
    for f in origen.iterdir():
        if f.is_file() and f.name != 'cliente.json' and f.suffix.lower() in ('.svg', '.png', '.jpg', '.jpeg', '.webp', '.avif'):
            shutil.copy2(f, destino / f.name)
        elif f.is_dir() and f.name in ('fotos', 'img'):
            shutil.copytree(f, destino / f.name, dirs_exist_ok=True)
    print(f'Web generada en {destino}')
    for a in avisos:
        print('  · ' + a)

if __name__ == '__main__':
    main()
