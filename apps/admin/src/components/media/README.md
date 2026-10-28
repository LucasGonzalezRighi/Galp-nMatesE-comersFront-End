# `components/media`: subida de fotos

La lógica de las fotos del dashboard (firmar, validar, subir y la cola de subidas). Es infraestructura compartida (Ruling P4-1): la usan productos, líneas y contenido sin importarse entre sí. Las piezas visuales (`ImageDropzone`, `ImageTile`, `SingleImageField`) están en `components/ui` y reciben los datos de acá (`UploadItem`).

## Piezas

- **`createImageUploader({ apiMode, api, registerMockImage })`**: elige el uploader según el modo de la API. Recibe el contexto del router (o cualquier objeto con esa forma, `ImageUploaderConfig`).
- **`ImageUploaderProvider({ uploader, onUnauthorized })`** y **`useImageUploader()`**: reparten el uploader. Sin proveedor, el hook lanza un error claro. `onUnauthorized` lo pasa la estructura para abrir "Tu sesión venció" cuando una subida da `401` (la foto queda en error con "Reintentar").
- **`useImageUploads({ purpose, max, current })`**: la cola. `add(files)` valida formato, peso, medidas (`checkImageFile` de `@galpon/domain`) y cupo ("Ya hay {max} fotos: quitá una para agregar otra.") y arranca cada subida con su vista previa `blob:`. `cancel(id)`, `retry(id)` (pide una firma nueva) y `remove(id)`; devuelve `items`, `isUploading`, `hasErrors` y `error` (por qué no entraron archivos; `remove` y `cancel` lo limpian). Cada `blob:` se revoca al quitar la foto o al desmontar, y desmontar corta las subidas en curso.
  - **El cupo cuenta toda la cola**, también las fotos ya subidas (`done`), más `current`. Para la pantalla de productos: si copia el `result` de una foto lista al formulario y la suma en `current`, tiene que hacer `remove(id)` de esa foto para no contarla dos veces.
- **`useSingleImageUpload({ purpose })`**: lo mismo con `max: 1`; una foto nueva reemplaza a la anterior y un archivo inválido no reemplaza nada. `item`, `retry()`, `cancel()` y `remove()` sin identificador; con una sola foto, `cancel()` la quita en cualquier estado (en curso o con error), a diferencia de `cancel(id)` de la cola, que solo actúa sobre una foto subiendo.
- **`checkFile(file)`** y **`readImageSize(file)`** (`validate-image-file.ts`): las reglas antes de subir; las medidas se leen con `createImageBitmap` (o `Image` + `blob:` de respaldo).
- **`MediaUploadError`**: `reason` (`rejected`, `network`, `timeout`, `simulated`, `unauthorized`), `status` y el mensaje de `media.copy.ts` listo para mostrar. Una subida cancelada rechaza con un `DOMException` `AbortError`, que la cola ignora.

## Los dos modos

- **En vivo (`live`)**: `createCloudinaryUploader` pide la firma al back (`POST /admin/media/signature`) en cada intento, también al reintentar, porque la firma lleva la hora. Sube directo a `https://api.cloudinary.com/v1_1/{cloudName}/image/upload` con `XMLHttpRequest` (para tener el progreso) y un `FormData` de exactamente `file`, `api_key`, `timestamp`, `signature` y `folder`. Tiempo máximo: 120 s. La CSP ya permite ese origen en `connect-src` y `https://res.cloudinary.com` en `img-src` (`src/lib/csp.ts`).
- **De prueba (`mock`)**: `createSimulatedUploader` también pide la firma (así se ejercitan la sesión y el CSRF de la API simulada), reduce la foto con `canvas` (lado mayor 640 px, WebP 0,8, o JPEG si el navegador no da WebP; si pasa de 200 000 caracteres, 480 px y 0,6), avanza el progreso en 5 pasos durante 600 ms y la registra con `registerMockImage` (`POST /__mock/media`), con las medidas de la original. Devuelve `publicId = {carpeta}/mock-{uuid}` y la `url` es el data URL.

### Por qué un data URL en el modo de prueba (refinamiento 2)

Mientras se elige y se sube, la vista previa es una URL `blob:`. Lo que se guarda es un data URL reducido porque la base simulada vive en `sessionStorage` y sobrevive a las recargas, y una `blob:` muere con la página. Reducida (unas decenas de KB, hasta 200 000 caracteres), entran varias en el cupo de `sessionStorage`; si igual no entran, el aviso pasa a "Sin persistencia". `img-src data:` ya está en la CSP.

## Probar "Reintentar"

En el modo de prueba, elegí un archivo cuyo nombre empiece con `error-` (por ejemplo `error-mate.jpg`): el primer intento falla con "Falló la subida simulada (el archivo empieza con error-). Reintentá." y "Reintentar" lo sube bien. Un `401` al pedir la firma deja la foto en error con "Tu sesión venció: ingresá de nuevo y reintentá." y llama a `onUnauthorized`; el test lo provoca cerrando la sesión en la base simulada (`app.mockDb.db.adminSession = null`).

## Tests

Contra la API simulada real (`createTestApp()`), sin mocks de `fetch`. La subida a Cloudinary se prueba con un `XMLHttpRequest` falso (`fake-xhr.test-helper.ts`, la única excepción permitida).
