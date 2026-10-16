# Plantilla · web de presupuestos

Web completa para oficios y empresas sin citas (fontanería, climatización, reformas, construcción, electricidad…), lista para conectar con Creaner Citas (formulario de presupuesto + galería de trabajos).

Ejemplo generado: **creaner.es/demos/caudal-fontaneria/** (datos en `ejemplo/cliente.json`).

## Cómo sacar la web de un cliente
1. Copia `ejemplo/` a una carpeta del cliente (fuera de la web pública, p. ej. `clientes/nombre/`) y rellena `cliente.json`.
   Pon junto al JSON el logo y las fotos (`portada.jpg`, carpeta `fotos/`…): se copian a la web tal cual.
2. Genera:
   ```
   python3 plantillas/presupuestos/crear_web.py clientes/nombre SALIDA
   ```
   Crea `index.html`, `privacidad.html`, `aviso-legal.html` y, si hay `api`, `panel.html` y `opinion.html` con la identidad de la web.
3. Lee los avisos que salen por pantalla (falta foto, contraste de colores, datos legales…).
4. Retoca a mano lo propio del sector tomando como referencia las mejores webs del sector (ver `proceso-referencias-sector`).

## Lo que hay que pedir al cliente
- Nombre, teléfono (y si su WhatsApp es otro), email, horario, ciudad y zonas donde trabaja.
- Servicios (máx. 9) y, si quiere, precio orientativo «desde».
- 1 foto buena para la portada y 3–6 de trabajos terminados (para la galería).
- Opiniones **reales** (de Google, con permiso) y su enlace de reseñas.
- Datos legales: titular, NIF y dirección (para aviso legal y privacidad).
- Logo (SVG o PNG). Si no tiene, la web usa la inicial con su color.

## Campos de cliente.json
| Campo | Para qué |
|---|---|
| `negocio`, `actividad`, `tipo_schema` | Nombre, actividad (para el título de Google) y tipo para Google: `Plumber`, `HVACBusiness`, `Electrician`, `HousePainter`, `RoofingContractor`, `GeneralContractor`, `HomeAndConstructionBusiness` |
| `url`, `demo`, `api` | Dirección final; `demo: true` añade la franja de ejemplo y `noindex`; `api` = URL /exec de su hoja (vacía = modo demo) |
| `colores` | `principal` (oscuro), `acento` (llamativo) y `fondo` (claro). El resto se calcula |
| `fuentes` | Google Fonts: `titulos` (necesita pesos 600–800) y `texto`. Si una fuente no tiene esos pesos, pon `url` con el enlace exacto |
| `contacto` | `telefono`, `whatsapp`, `whatsapp_mensaje`, `email`, `direccion`, `ciudad`, `provincia`, `horario`, `urgencias`, `tel_etiqueta` |
| `hero` | `etiqueta`, `titulo`, `destacado` (en color acento), `texto`, `boton`, `foto`, `foto_alt`, `datos` (3 cifras cortas) |
| `sello` | Tarjeta sobre la foto (p. ej. nota en Google). Solo con datos reales |
| `servicios` | `nombre`, `texto`, `desde`, `icono`: gota, tuberia, llave, fuego, copo, sol, rayo, casa, pintura, ladrillo, escudo, reloj, herramienta, check |
| `pasos` | Opcional; por defecto 4 pasos genéricos |
| `presupuesto` | `titulo`, `texto`, `horas`, `trabajos` (botones del formulario), `zonas`, `ventajas`, `placeholder`, `fotos_texto` |
| `trabajos_ejemplo` | Tarjetas que se ven hasta que haya trabajos en la galería |
| `opiniones`, `resenas_url` | Solo reales. Si no hay, se quita la sección |
| `faq` | Preguntas `p` y respuestas `r` (salen también en Google) |
| `textos`, `seo`, `top_texto` | Opcional, para cambiar títulos de sección, título y descripción de Google |
| `legal` | `titular`, `nif`, `direccion` |

## Qué lleva la web
Barra con teléfono y horario · cabecera fija · portada con dos llamadas a la acción · servicios · cómo trabajamos · formulario de presupuesto con fotos (Creaner Citas) · galería de trabajos (se actualiza desde creaner.es/citas/galeria.html) · opiniones · zona de trabajo · preguntas frecuentes · cierre · pie con legales · botón de WhatsApp y, en móvil, barra fija con Llamar / Presupuesto / WhatsApp. Incluye datos para Google (LocalBusiness y FAQ) y pasa sin scroll lateral en móvil.
