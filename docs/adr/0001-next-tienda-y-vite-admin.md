# 0001. Next.js para la tienda y Vite para el dashboard

- **Estado**: Aceptada
- **Fecha**: 2026-10-20

## Contexto

El front tiene dos productos con necesidades distintas:

- La **tienda** es pública. Tiene que indexarse bien (SEO, Open Graph, JSON-LD), cargar rápido en celulares y servir casi todo como páginas estáticas que se regeneran cuando cambia un precio, un stock o un texto.
- El **dashboard** lo usa una sola persona, detrás de un login. No necesita SEO ni render en servidor; sí muchas tablas y formularios, y una política de seguridad de contenido (CSP) lo más estricta posible.

Lucas eligió la opción C entre las que se le presentaron el 2026-10-19 (sección 2.1 del [diseño del front](../superpowers/specs/2026-10-19-galpon-frontend-design.md)).

## Decisión

- `apps/store`: **Next.js 16** (App Router, Cache Components, Turbopack) con React 19.
- `apps/admin`: **Vite 8** con React 19, TanStack Router (rutas por archivos, tipadas), TanStack Query y TanStack Table 9.
- Los dos viven en un único workspace npm, junto con los paquetes compartidos `api-client`, `schemas`, `domain`, `design-tokens` y `config`.
- Una app **nunca importa de la otra**; solo comparten lo que está en `packages/` (lo controla `eslint-plugin-boundaries`).
- Los paquetes exportan su código fuente TypeScript, sin paso de build propio: Turbopack y Vite lo transpilan.

## Consecuencias

- Cada app usa la herramienta que mejor le calza: la tienda saca partido de la caché y del render estático de Next; el admin es una SPA liviana que se sirve como archivos estáticos.
- El admin puede tener una CSP estricta (`script-src 'self'`, sin scripts inline), imposible de lograr tan fácil en la tienda, que necesita los scripts de Next y de Mercado Pago.
- Hay **dos toolchains** que mantener (Next/Turbopack y Vite/Rollup) y dos despliegues (el admin está previsto en `admin.galponmates.com.ar`, aparte de la tienda).
- En modo de prueba, la tienda y el admin corren en procesos distintos y **no comparten datos simulados** (ADR 0003).
- Lo que se necesita en las dos apps (reglas de negocio, validaciones, cliente de la API, tokens de diseño) se escribe una sola vez en `packages/`.

## Alternativas consideradas

- **Todo en Next.js** (el admin como rutas protegidas de la misma app): un solo despliegue y una sola herramienta, pero el admin heredaría la CSP laxa de la tienda, el build de la tienda cargaría con código que el público nunca usa, y un error del admin podría tirar la tienda.
- **Todo en Vite como SPA** (sin Next): una sola herramienta y despliegue simple, pero la tienda perdería el render estático, la regeneración por etiqueta y buena parte del SEO, que es lo que más importa en un comercio.
