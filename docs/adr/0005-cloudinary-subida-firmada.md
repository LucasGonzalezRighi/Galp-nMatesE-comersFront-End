# 0005. Cloudinary con subida firmada directa

- **Estado**: Aceptada
- **Fecha**: 2026-10-20

## Contexto

El dueño sube las fotos de productos, líneas y socios desde el dashboard. Lucas eligió Cloudinary para guardarlas y servirlas optimizadas. Hace falta que la subida muestre progreso, se pueda cancelar y reintentar, y que el secreto de la cuenta no llegue nunca al navegador.

## Decisión

**Subida firmada directa desde el navegador**, en cuatro pasos:

1. El admin valida la foto en el navegador: JPG, PNG o WebP, hasta 10 MB y lado menor de al menos 800 px. Límites: 8 fotos por producto, 1 por línea y 1 por socio.
2. `POST /admin/media/signature { purpose }` devuelve `{ timestamp, signature, apiKey, cloudName, folder }`. El back firma con el secreto; el navegador solo recibe la firma.
3. El navegador sube la imagen a `https://api.cloudinary.com/v1_1/{cloudName}/image/upload` con **`XMLHttpRequest`**, enviando exactamente los parámetros firmados. Esta llamada **no pasa por `api-client`**.
4. Se guarda `{ publicId, width, height, alt }`; el texto alternativo es obligatorio (3 a 120 caracteres). Las fotos se reordenan arrastrando y la primera es la principal.

La tienda muestra las imágenes con `next/image` y un _loader_ de Cloudinary (`NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`).

**Modo de prueba**: la subida se simula y la vista previa usa una URL `blob:` (ADR 0003).

## Consecuencias

- Las imágenes no pasan por el servidor del back: menos carga y sin límites de tamaño de pedido.
- `XMLHttpRequest` da progreso, cancelación y reintento, que `fetch` todavía no ofrece de forma simple para las subidas.
- La CSP del admin tiene que permitir `connect-src https://api.cloudinary.com` e `img-src https://res.cloudinary.com`.
- Dependemos de que la firma esté bien armada: un parámetro de más o de menos y Cloudinary rechaza la subida.
- Hay una excepción documentada a "todo el tráfico sale por `api-client`".

## Alternativas consideradas

- **Subir las fotos al back y que él las reenvíe a Cloudinary**: el servidor carga con archivos de hasta 10 MB y hay que manejar `multipart`, tiempos y errores intermedios.
- **Subida sin firma (_unsigned preset_)**: cualquiera que conozca el preset podría subir archivos a la cuenta.
- **Widget de subida de Cloudinary**: trae su propia interfaz, que no respeta el diseño ni la CSP estricta del admin.
- **Guardar las imágenes en el disco del servidor o en otro almacenamiento de objetos**: habría que resolver las variantes optimizadas por tamaño, que Cloudinary ya resuelve.

## Actualización P4 (2026-10-28)

El dashboard implementó la subida en `apps/admin/src/components/media` (lógica: firmar, subir, validar, cola) y `src/components/ui` (piezas visuales: `ImageDropzone`, `ImageTile`, `SingleImageField`), no en `features/media` como decía el spec: así productos, líneas y contenido la usan sin importarse entre sí (Ruling P4-1). Lo que se decidió arriba no cambia; se agregan estos detalles:

- **Validación antes de subir** (`validate-image-file.ts`): formato, 10 MB, 800 px del lado menor (con las medidas en el mensaje: "esta mide 1 × 1 px") y cupo (8, 1 o 1). Una foto que no cumple no llega a pedir firma.
- **Errores**: "Reintentar" pide una firma nueva; cancelar aborta el `XMLHttpRequest` y libera la URL `blob:` de la vista previa; el producto no se guarda mientras haya subidas en curso o en error. Un `401` al pedir la firma deja la foto en error y abre "Tu sesión venció" sin salir de la pantalla.
- **Modo de prueba** (Ruling P4-4): `createSimulatedUploader` también pide la firma a la API simulada (así se ejercitan la sesión y el CSRF), reduce la foto en el navegador con `canvas` (lado mayor 640 px, WebP 0,8; si pasa de 200 000 caracteres, 480 px y 0,6), simula el progreso y la registra con la ruta interna `POST /__mock/media`, con las medidas de la original. Devuelve `publicId = {carpeta}/mock-{uuid}` y como `url` un **data URL**. Mientras se elige y se sube, la vista previa sigue siendo una URL `blob:`.
  - **Por qué data URL y no `blob:`**: la base simulada del admin vive en `sessionStorage` y sobrevive a las recargas; una `blob:` muere con la página y la foto guardada quedaría rota. Reducidas (unas decenas de KB), entran varias en el cupo de `sessionStorage`; la API simulada borra las más viejas sin usar pasadas las 40, y si igual no entra la base, el aviso pasa a "Sin persistencia" sin romper la pantalla. `img-src data:` ya estaba en la CSP del admin.
  - Un archivo cuyo nombre empieza con `error-` falla en el primer intento ("Falló la subida simulada…"), para probar "Reintentar" a mano y en los E2E.
- **En vivo** no cambia nada de lo decidido: firma del back, `XMLHttpRequest` a `api.cloudinary.com` con los parámetros firmados y `{ publicId, width, height, alt }` en la base; el back arma la `url` desde `publicId`. La foto de los socios pasó a ser un `ImageInput` como las de productos y líneas (`AboutContentInput`, §12 del spec).
