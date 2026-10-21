# @galpon/design-tokens

Tokens de diseño de Galpón Mates (sección 7 del spec): el tema de Tailwind v4 y los estilos base, compartidos por la tienda y el dashboard. Tema oscuro únicamente.

- **`tokens.css`**: un solo bloque `@theme` con colores, radios, sombras, fuente, tipografía y curvas. Arranca con `--color-*: initial;`, así que solo existen los colores del diseño (la paleta por defecto de Tailwind desaparece).
- **`base.css`**: en `@layer base`, `color-scheme: dark`, fondo y texto del `body`, tamaños de `h1` a `h5`, foco (`:focus-visible`), selección y las variables `--space-1…8`.
- **`src/tokens.ts`**: los mismos valores tipados, para el canvas, three.js y los tests. `cssVariables()` devuelve cada variable de `@theme` con su valor, y el test del paquete comprueba que `tokens.css` y `tokens.ts` no se desfasen.
- Sin build: se exporta el código fuente y el CSS tal cual.

## Cómo se importan

**Next (tienda)**, en `src/app/globals.css`:

```css
@import 'tailwindcss';
@import '@galpon/design-tokens/tokens.css';
@import '@galpon/design-tokens/base.css';
```

La fuente llega con `next/font` (`Inter({ variable: '--font-inter' })`), con la clase en `<html>`.

**Vite (dashboard)**, en `src/index.css`, con la misma pila de imports. La fuente sale de `@fontsource-variable/inter` (`import '@fontsource-variable/inter'` en `main.tsx`); `base.css` ya define `--font-inter: 'Inter Variable'` para ese caso.

Desde TypeScript: `import { tokens, cssVariables } from '@galpon/design-tokens'`.

## Utilidades de Tailwind que quedan

- Colores: `bg-background`, `bg-surface`, `text-foreground`, `text-accent`, `bg-accent-500`, `bg-accent-2-500`, `text-neutral-400`, `bg-section`, `bg-cream`, `text-danger`, `border-danger-border`.
- `rounded-sm|md|lg|tag`, `shadow-sm|md|lg`, `text-body|h1|h2|h3|h4|h5`, `ease-main`, `ease-spring`, `font-sans`.
- Los espacios del diseño (2,8 px × n) no reemplazan la escala de Tailwind: están como `--space-*` y se usan con `p-[var(--space-3)]`.

## Dos paletas de cuero

`tokens.leathersUi` son los cuatro cueros tal como se ven en la interfaz (tarjetas, selectores, carrito). `tokens.leathers3d` son los de la escena 6 y del 3D: más saturados, porque la iluminación los apaga. Se mantienen las dos; no se unifican ni se derivan una de la otra.
