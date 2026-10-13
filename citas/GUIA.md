# Creaner Citas · Guía de instalación para un negocio nuevo

Tiempo: unos 15–20 minutos por negocio.
Dónde vive: **en la cuenta de Google del propio negocio** (su Gmail o uno creado para ellos, p. ej. `reservas.nombrenegocio@gmail.com`).

## 1. Crear la hoja y pegar el código
1. Entra en Google Drive **con la cuenta del negocio** → Nuevo → Hojas de cálculo de Google. Ponle de nombre `Creaner Citas · [Negocio]`.
2. Menú **Extensiones → Apps Script**.
3. Borra lo que haya en `Código.gs` y pega todo el contenido de `apps-script/Code.gs`.
4. Pulsa **+** (junto a "Archivos") → **HTML** → nómbralo exactamente `Panel` → pega el contenido de `apps-script/Panel.html`.
5. Guarda (icono del disquete).

## 2. Configurar la hoja
1. En Apps Script, arriba, elige la función **`configurar`** y pulsa **Ejecutar**.
2. Google pedirá permisos: *Revisar permisos* → elige la cuenta → *Configuración avanzada* → *Ir a … (no seguro)* → *Permitir*. (Sale "no seguro" porque el script es nuestro y no está publicado en la tienda de Google; es normal.)
3. Vuelve a la hoja: verás las pestañas **Config, Servicios, Profesionales, Horario, Cerrados y Citas** con datos de ejemplo.
4. Rellénalas con los datos del formulario de alta del cliente:
   - **Config**: nombre, email, teléfono, dirección, intervalo, antelación, días visibles, horas para cancelar, horas del recordatorio (RECORDATORIO_HORAS, 26 por defecto para que el cliente aún pueda cancelar desde el email; 0 = sin recordatorios), PIN del panel, CALENDARIO (SI/NO), URL_WEB, y los colores de la marca (COLOR_PRINCIPAL, COLOR_ACENTO) y LOGO_URL opcional. Los colores se aplican al panel, a los emails y a la página de cancelar.
   - **Servicios**: un ID corto sin espacios (`corte-barba`), nombre, duración en minutos, precio, categoría y `SI` en Activo.
   - **Profesionales**: ID, nombre y qué servicios hace (`TODOS` o IDs separados por comas).
   - **Horario**: una fila por tramo. Turno partido = dos filas el mismo día. `TODOS` vale para todos los profesionales.
   - **Cerrados**: festivos y vacaciones, en formato `AAAA-MM-DD`.
   - **Citas**: no tocar; se rellena sola.
5. Menú **Creaner Citas → Enviarme un email de prueba** para comprobar que llegan los avisos.
6. Los **recordatorios automáticos** se activan solos al ejecutar `configurar` (crean un activador que se ejecuta cada hora). Para comprobarlo: Apps Script → **Activadores** (icono del reloj) → debe aparecer `enviarRecordatorios`, cada hora. Menú **Creaner Citas → Enviarme un recordatorio de prueba** para ver cómo le llega al cliente.

## 3. Publicar el script
1. En Apps Script: **Implementar → Nueva implementación** → tipo **Aplicación web**.
2. *Ejecutar como*: **Yo**. *Quién tiene acceso*: **Cualquier usuario**.
3. Pulsa **Implementar** y copia la **URL que termina en `/exec`**.
4. Pégala en la hoja, pestaña **Config**, en el ajuste **URL_WEB**. Se usa para el enlace del panel y para los enlaces de cancelar de los emails.
5. Si más adelante cambias el código: **Implementar → Gestionar implementaciones → editar (lápiz) → Versión: Nueva versión → Implementar**. Así la URL no cambia.

## 4. Poner el widget en la web del negocio
Donde quieras que aparezca la reserva:

```html
<div id="creaner-citas" data-api="URL_DEL_PASO_3" data-privacidad="/privacidad.html"></div>
<script src="https://creaner.es/citas/reservas.js" defer></script>
```

Colores del negocio (opcional, en su CSS):

```css
#creaner-citas{ --cc-accent:#2f6157; --cc-soft:#eef2ef; --cc-font:"Albert Sans",sans-serif; --cc-radius:14px; }
```

## 5. Páginas de cita, opinión y panel en la web del negocio (siempre)
Así el cliente nunca ve el aviso de "aplicación creada por un usuario de Google Apps Script".
1. Copia los tres archivos de `citas/plantilla/` (`cita.html`, `opinion.html`, `panel.html`) junto al index.html de la web del negocio y cambia el nombre del negocio y `URL_DEL_SCRIPT`. Cada uno lleva solo esto (cambiando `data-pagina` por `cita`, `opinion` o `panel`, y la URL /exec del paso 3):
```html
<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow">
<title>Tu cita · Negocio</title></head><body>
<div id="creaner-pagina" data-pagina="cita" data-api="URL_DEL_PASO_3"></div>
<script src="https://creaner.es/citas/paginas.js" defer></script>
</body></html>
```
2. En Config, pon en **WEB_NEGOCIO** la dirección de la web (p. ej. `https://negocio.com/`). Desde ese momento los emails llevan a `cita.html` y `opinion.html` de la web del negocio.
3. Menú **Creaner Citas → Ver enlace del panel**: el enlace pasa a ser `…/panel.html` y se guarda en Config (ENLACE_PANEL).
4. Los colores, el logo y el saludo salen de Config (COLOR_PRINCIPAL, FONDO_PANEL, LOGO_URL, SALUDO).
5. El panel se bloquea 15 minutos tras 8 PIN incorrectos seguidos.
6. Si WEB_NEGOCIO está vacío, todo sigue funcionando con las páginas de Google (con su aviso gris): solo como solución temporal.

## 5b. Panel del negocio
- Dirección: `WEB_NEGOCIO/panel.html` (menú **Creaner Citas → Ver enlace del panel**; queda guardada en Config → ENLACE_PANEL).
- Se entra con el **PIN_PANEL** de la pestaña Config. Que el negocio lo guarde en favoritos del móvil.
- Desde el panel: ver la semana, cancelar citas y marcar días cerrados.
- Si se activa CALENDARIO = SI, cada cita aparece también en el Google Calendar de la cuenta.

## 6. Comprobar antes de entregar
- [ ] Hacer una reserva de prueba desde la web (con tu email) y comprobar que llegan los 2 emails.
- [ ] Comprobar que existe el activador `enviarRecordatorios` y que el recordatorio de prueba llega bien.
- [ ] Abrir el enlace "Cambia o cancela tu cita aquí" del email: cambiar la cita a otra hora y comprobar que la fila de Citas se actualiza y llegan los avisos; después, cancelarla.
- [ ] Entrar al panel con el PIN y ver la cita.
- [ ] Borrar la fila de prueba de la pestaña Citas.

## Cambiar o cancelar (cliente)
- Los emails de confirmación y recordatorio llevan el enlace **Cambia o cancela tu cita aquí** (`URL_WEB?accion=cita&id=…&t=…`).
- El cliente ve su cita y puede elegir otro día y hora (mismo servicio y profesional) o cancelarla, hasta CANCELACION_HORAS antes.
- El cambio se guarda en la misma fila: la hora antigua solo se libera cuando la nueva está guardada. Si había evento en Calendar, se mueve. El recordatorio se vuelve a enviar para la nueva hora.
- El negocio recibe un email con la hora antigua y la nueva; el cliente, la confirmación del cambio.
- Los enlaces antiguos de "Cancela tu cita aquí" siguen funcionando.

## Opiniones y reseñas
- Unas RESENA_HORAS (2 por defecto) después de cada cita, el cliente recibe "¿Qué tal tu visita?". Solo una vez por cliente (por email), nunca de noche y nunca de citas de hace más de 48 h. 0 = desactivado.
- **Con RESENA_URL** (enlace de reseñas del perfil de empresa de Google: Perfil → Pedir reseñas → copiar enlace): el email lleva el botón "Dejar mi reseña en Google".
- **Sin RESENA_URL**: el email lleva 5 estrellas. Al tocar una, la puntuación se guarda en la pestaña **Opiniones** y el cliente puede añadir un comentario y permitir que se publique en la web. El negocio recibe un email con cada opinión.
- Se pide a todos los clientes por igual: Google prohíbe pedir reseñas solo a los clientes contentos.
- La columna **Reseña** de Citas dice cuándo se pidió (o por qué no: sin email, ya pedida antes, cita antigua).
- Prueba: menú **Creaner Citas → Enviarme una petición de opinión de prueba**.
- Va en el mismo activador horario que los recordatorios: no hay que activar nada nuevo.

## Límites a tener en cuenta
- Gmail gratuito: unos **100 emails al día** por cuenta. Cada cita gasta hasta 3 (aviso al negocio, confirmación y recordatorio), así que da para unas 30 citas al día. Si quedan menos de 5 envíos en el día, los recordatorios se paran para no dejar sin confirmación a las reservas nuevas.
- Recordatorios: se envían unas RECORDATORIO_HORAS antes de la cita, nunca entre las 22:00 y las 8:00, y no a quien reservó hace menos de 6 h. En la pestaña Citas, la columna **Recordatorio** dice cuándo se envió (o "Sin email").
- Cada consulta tarda 1–2 segundos: es normal en Google Apps Script.
- Recordatorios por WhatsApp o SMS: no incluidos (tienen coste). Los recordatorios son por email.

## Protección de datos (obligatorio)
Guardamos nombre, teléfono y email de los clientes del negocio, así que Creaner es **encargado del tratamiento**:
- Firmar con cada negocio un **contrato de encargo del tratamiento** (plantilla pendiente).
- La web del negocio debe tener **política de privacidad** (enlazarla en `data-privacidad`).
- Nunca escribir claves o PIN en el código de la web: el PIN vive solo en la hoja.

## Actualizar un negocio con una versión anterior
1. Pega el nuevo `Code.gs` encima del antiguo y guarda.
2. Elige la función **`activarRecordatorios`** y pulsa **Ejecutar**. Google pedirá un permiso nuevo (para crear el activador): acéptalo. Se añade sola la columna Recordatorio en Citas.
3. Opcional: añade en Config la fila `RECORDATORIO_HORAS` (si no está, se usan 26 h).
4. Ejecuta `configurar` (crea las pestañas y columnas nuevas sin tocar lo que hay) y añade en Config las filas nuevas que quieras usar (WEB_NEGOCIO, SALUDO, FONDO_PANEL, RESENA_URL…).
5. Sube cita.html, opinion.html y panel.html a su web (paso 5).
6. **Implementar → Gestionar implementaciones → editar → Nueva versión → Implementar**.

