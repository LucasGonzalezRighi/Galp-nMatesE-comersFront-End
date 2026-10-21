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
