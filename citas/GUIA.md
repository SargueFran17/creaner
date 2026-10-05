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
   - **Config**: nombre, email, teléfono, dirección, intervalo, antelación, días visibles, horas para cancelar, PIN del panel, CALENDARIO (SI/NO).
   - **Servicios**: un ID corto sin espacios (`corte-barba`), nombre, duración en minutos, precio, categoría y `SI` en Activo.
   - **Profesionales**: ID, nombre y qué servicios hace (`TODOS` o IDs separados por comas).
   - **Horario**: una fila por tramo. Turno partido = dos filas el mismo día. `TODOS` vale para todos los profesionales.
   - **Cerrados**: festivos y vacaciones, en formato `AAAA-MM-DD`.
   - **Citas**: no tocar; se rellena sola.
5. Menú **Creaner Citas → Enviarme un email de prueba** para comprobar que llegan los avisos.

## 3. Publicar el script
1. En Apps Script: **Implementar → Nueva implementación** → tipo **Aplicación web**.
2. *Ejecutar como*: **Yo**. *Quién tiene acceso*: **Cualquier usuario**.
3. Pulsa **Implementar** y copia la **URL que termina en `/exec`**.
4. Si más adelante cambias el código: **Implementar → Gestionar implementaciones → editar (lápiz) → Versión: Nueva versión → Implementar**. Así la URL no cambia.

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

## 5. Panel del negocio
- Dirección: `URL_DEL_PASO_3?accion=panel` (también en el menú **Creaner Citas → Ver enlace del panel**).
- Se entra con el **PIN_PANEL** de la pestaña Config. Que el negocio lo guarde en favoritos del móvil.
- Desde el panel: ver la semana, cancelar citas y marcar días cerrados.
- Si se activa CALENDARIO = SI, cada cita aparece también en el Google Calendar de la cuenta.

## 6. Comprobar antes de entregar
- [ ] Hacer una reserva de prueba desde la web (con tu email) y comprobar que llegan los 2 emails.
- [ ] Probar el enlace de cancelación del email.
- [ ] Entrar al panel con el PIN y ver la cita.
- [ ] Borrar la fila de prueba de la pestaña Citas.

## Límites a tener en cuenta
- Gmail gratuito: unos **100 emails al día** por cuenta (cada cita gasta 1–2). De sobra para un negocio pequeño.
- Cada consulta tarda 1–2 segundos: es normal en Google Apps Script.
- Recordatorios por WhatsApp: no incluidos (tienen coste). El cliente recibe email de confirmación.

## Protección de datos (obligatorio)
Guardamos nombre, teléfono y email de los clientes del negocio, así que Creaner es **encargado del tratamiento**:
- Firmar con cada negocio un **contrato de encargo del tratamiento** (plantilla pendiente).
- La web del negocio debe tener **política de privacidad** (enlazarla en `data-privacidad`).
- Nunca escribir claves o PIN en el código de la web: el PIN vive solo en la hoja.
