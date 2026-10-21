# 0003. Modo de prueba: API simulada en el servidor de Next y rewrite de mismo dominio

- **Estado**: Aceptada
- **Fecha**: 2026-10-20

## Contexto

Las dos apps tienen que funcionar completas, con compra, pedidos y dashboard, antes de que exista el back. Además, el paso a la API real tiene que ser **solo cambiar variables de entorno**, sin tocar código.

En la tienda, los Server Components y las funciones `'use cache'` piden datos **durante el build y en el servidor**, donde no hay navegador ni service workers. El navegador, por su parte, llama a la API por el mismo dominio (`/api/v1`) para no tener CORS y usar una cookie propia del sitio (decisión D2 del diseño).

## Decisión

`@galpon/api-client/mock` implementa la API completa como un `fetch` en memoria (`createMockFetch`): un router, un handler por endpoint con los mismos schemas que usará el back, latencia de 150 a 400 ms, errores reales (`422`, `401`, `409` de stock, precio o total) y resultados de pago según el nombre del titular, como el sandbox de Mercado Pago (`APRO`, `CONT`, `OTHE`…).

- **Tienda, servidor**: los Server Components usan ese `fetch` en el mismo proceso (`src/lib/mock.server.ts`). La base vive en un singleton colgado de `globalThis.__galponMockDb`, así los bundles por ruta y el recargado en caliente ven los mismos datos.
- **Tienda, navegador**: siempre llama a `/api/v1/*` de su propio dominio. En modo de prueba, un _rewrite_ lo lleva a `/api/mock/v1/*`, un route handler que responde con la misma base. En modo vivo, el _rewrite_ apunta a `API_BASE_URL/api/v1/*` y `/api/mock/v1` responde `404`.
- **Admin**: es una SPA sin servidor, así que corre el `fetch` simulado **en el navegador**. La base y la sesión se guardan en `sessionStorage` (clave `galpon.admin.mock.v1`) y sobreviven a las recargas. Si el navegador no permite `sessionStorage`, sigue funcionando en memoria y la pantalla lo avisa.
- Las variables de entorno se validan al cargar `next.config.ts` y al arrancar el admin. Una configuración incoherente (por ejemplo `API_MODE=live` sin `API_BASE_URL`) hace fallar el build con un mensaje en español, en lugar de compilar una tienda que apunta al mock.

## Consecuencias

- Todo el front se puede construir, probar y demostrar sin backend, y `npm run dev` levanta todo.
- El navegador de la tienda nunca cambia de destino ni de dominio, así que el paso a vivo no toca código del cliente.
- **La tienda y el admin no comparten datos de prueba** (procesos distintos): un producto editado en el admin no se ve en la tienda hasta que exista el back. Está documentado en los README.
- La base simulada de la tienda se reinicia al reiniciar el servidor; la del admin, al cerrar la pestaña.
- Hay que mantener el mock alineado con el contrato; los tipos generados y los tests de cobertura de rutas lo vigilan.

## Alternativas consideradas

- **MSW (service worker)**: sirve para el navegador, pero no cubre los Server Components ni el build de Next, que es donde más se lee.
- **Un servidor de mocks aparte** (Prism, json-server): otro proceso que levantar y mantener, con estado compartido difícil de reiniciar, y `npm run dev` dejaría de ser un solo comando.
- **Que el navegador de la tienda llame al mock directamente**: duplicaría la lógica de red de modo de prueba y de vivo, y no probaría el _rewrite_ ni la cookie de mismo dominio.
