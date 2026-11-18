# Ajustes del inicio, telón y kit: plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** aplicar los ajustes que pidió Lucas el 2026-11-18 sobre la intro, el telón entre secciones, el texto del escenario del mate, el menú y el armado del kit.

**Architecture:** solo la tienda (`apps/store`). No cambian el contrato, el mock, los paquetes ni el back: los títulos editables siguen igual y cambia cómo se muestran; el kit incompleto usa las líneas de producto que el carrito ya tiene.

**Tech Stack:** el monorepo actual (Next 16.4.5 con `cacheComponents`, Motion, Vitest, Playwright).

**Spec:** `docs/superpowers/specs/2026-10-19-galpon-frontend-design.md` (las líneas de la intro, el telón, el escenario del mate, el menú y el kit). Las decisiones de esta ronda son los rulings AI-1 a AI-7 de `.superpowers/sdd/2026-11-18-ajustes-inicio/progress.md`, que mandan sobre el spec.

## Global Constraints

- Ver `.superpowers/sdd/2026-11-18-ajustes-inicio/global-constraints.md` (worktree, puertos 4430 y 5430, sin `next dev` ni `.env.local`, E2E con `--workers=2`, una corrida pesada a la vez, commits con pathspec y el trailer).
- Intro (AI-1): matecito de 0 a 1,2 s y GALPÓN de 0 a 2,4 s; relleno 0,5 s; apertura 1,5 s. Total 4,4 s.
- Telón (AI-2): 1,5 s del clic a la página abierta (baja 450 ms, tapado hasta 850 ms, abre 650 ms); espera a la página si tarda más (tope 8 s).
- Inicio (AI-3): dentro del sitio, el telón de 1,5 s; la intro dibujada solo si el inicio es la primera página que carga el navegador.
- Escenario (AI-4): "Encontrá tu mate." y "Alpaca y bronce." en un renglón; ningún renglón de título se corta; solo los botones y los pasos del agua centrados.
- Menú (AI-5): sin subrayado en el hover.
- Kit (AI-6): con 1 o 2 piezas, productos sueltos a precio de lista; el −10 % solo con las tres.

## Review Focus

1. Volver al inicio desde adentro del sitio (menú, logo, botón Atrás) nunca arranca la intro, pero recargar `/` sí: los dos casos con su prueba.
2. El telón dura 1,5 s medido sobre la tienda compilada, no solo en los tiempos del código; en `next dev` puede durar más por la compilación y eso se dice en la bitácora.
3. Los títulos en un renglón no desbordan: sin scroll horizontal entre 1024 y 1905 px de ancho en el escenario, y desde 360 px en el celular.
4. Kit con dos piezas: las líneas van a precio de lista, el mate conserva su cuero, se respetan el stock y el tope de compra, y volver a agregar suma cantidades como un producto suelto.
5. El resumen del kit nunca muestra un descuento ni un total que el carrito no va a cobrar.

---

### Task 1: Intro, telón, inicio, escenario del mate y menú

Brief: `.superpowers/sdd/2026-11-18-ajustes-inicio/task-1-brief.md`. Rulings AI-1 a AI-5.

- [ ] **Step 1:** tests que fallan para cada ruling (tiempos de la intro y del telón, la intro que no arranca al navegar hacia `/`, los títulos en un renglón, el centrado, el hover sin subrayado).
- [ ] **Step 2:** implementar.
- [ ] **Step 3:** `npm test`, `npm run lint`, `npm run typecheck`, `npm run format:check`; compilar la tienda y correr los E2E de la tienda que tocan estas pantallas con `--workers=2`; medir el telón y la intro en la tienda compilada; capturas.
- [ ] **Step 4:** bitácora y spec; commits.

### Task 2: Kit con una o dos piezas

Brief: `.superpowers/sdd/2026-11-18-ajustes-inicio/task-2-brief.md`. Ruling AI-6.

- [ ] **Step 1:** tests que fallan (botón habilitado con una o dos piezas, líneas sueltas a precio de lista con el cuero del mate, resumen sin descuento con menos de tres, el aviso de lo que falta).
- [ ] **Step 2:** implementar.
- [ ] **Step 3:** suite de unidad, lint, tipos, formato; E2E del kit y del carrito con `--workers=2`; capturas.
- [ ] **Step 4:** bitácora y spec; commit.
