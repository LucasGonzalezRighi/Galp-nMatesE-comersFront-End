import type { Leather } from '@galpon/domain'

/** Escala de 100 a 900 de un color, con sus nueve pasos. */
interface ColorScale {
  readonly 100: string
  readonly 200: string
  readonly 300: string
  readonly 400: string
  readonly 500: string
  readonly 600: string
  readonly 700: string
  readonly 800: string
  readonly 900: string
}

/**
 * Tokens de diseño de Galpón Mates (sección 7 del spec), tipados para usarlos donde las variables
 * CSS no llegan: el canvas, three.js y los tests. Son los mismos valores que `tokens.css`; el test
 * del paquete comprueba que no se desfasen.
 *
 * Los colores y las sombras salen de `page-styles.css`; radios, espacios y tipografía, de `ds-styles.css`.
 */
export const tokens = {
  colors: {
    background: '#1a1210',
    surface: '#271b15',
    foreground: '#f3ebe3',
    /** Cobre; el `accent` sin número es el 500. */
    accent: {
      100: '#fbf1e6',
      200: '#f3dcc2',
      300: '#e6bd91',
      400: '#d59d63',
      500: '#c0803f',
      600: '#9c6430',
      700: '#774a24',
      800: '#53331a',
      900: '#34200f',
    },
    /** Verde yerba. */
    accent2: {
      100: '#f1f5e1',
      200: '#dfe8bb',
      300: '#c5d68b',
      400: '#a8bf5f',
      500: '#8ba43f',
      600: '#6d8430',
      700: '#516324',
      800: '#384419',
      900: '#232b10',
    },
    neutral: {
      100: '#f8f1ea',
      200: '#ebe0d5',
      300: '#d6c8ba',
      400: '#b9a898',
      500: '#998877',
      600: '#7a6a5c',
      700: '#5c4f45',
      800: '#42382f',
      900: '#2b241f',
    },
    section: '#3a2415',
    sectionGlow: '#5e3c20',
    sectionGhost: '#7a5230',
    /** Fondo claro de las escenas 1, 4 y 6. */
    cream: '#fffaf3',
    danger: {
      /** Color del texto de error. */
      text: 'oklch(0.76 0.12 25)',
      /** Color del borde de un campo con error. */
      border: 'oklch(0.72 0.14 25)',
    },
    divider: 'color-mix(in srgb, #f3ebe3 15%, transparent)',
  },
  shadows: {
    sm: '0 0 0 1px #42382f',
    md: '0 0 0 1px #5c4f45, 0 6px 18px rgba(0,0,0,.55)',
    lg: '0 0 0 1px #998877, 0 16px 40px rgba(0,0,0,.65)',
  },
  radii: { sm: '4px', md: '8px', lg: '14px', tag: '6px' },
  /** Espacios del diseño (2,8 px por paso). No reemplazan la escala de Tailwind. */
  space: {
    1: '2.8px',
    2: '5.6px',
    3: '8.4px',
    4: '11.2px',
    6: '16.8px',
    8: '22.4px',
  },
  typography: {
    fontFamily: "var(--font-manrope), 'Manrope Variable', system-ui, sans-serif",
    body: { size: '15px', lineHeight: '1.55' },
    heading: {
      lineHeight: '1.12',
      letterSpacing: '-0.015em',
      fontWeight: '500',
      sizes: { h1: '42px', h2: '32px', h3: '25px', h4: '20px', h5: '16px' },
    },
  },
  /** Cueros en la interfaz (tarjetas, selectores, carrito). */
  leathersUi: {
    Negro: '#221f22',
    Marrón: '#6b4532',
    Crudo: '#d7c29e',
    Borravino: '#5d1f2d',
  } satisfies Record<Leather, string>,
  /** Cueros de la escena 6 y del 3D: más saturados para que la iluminación los muestre bien. */
  leathers3d: {
    Negro: '#3a2016',
    Marrón: '#6b3c22',
    Crudo: '#b88d5c',
    Borravino: '#5a1c26',
  } satisfies Record<Leather, string>,
  easing: {
    /** Curva principal de las animaciones. */
    main: 'cubic-bezier(.16,1,.3,1)',
    /** Curva elástica, con rebote. */
    spring: 'cubic-bezier(.34,1.56,.64,1)',
  },
  durations: {
    /** Duración por defecto de la entrada de los elementos, en milisegundos. */
    reveal: 1000,
  },
} as const

/** Pasos de una escala de color, en el orden en que se declaran. */
const SCALE_STEPS = [100, 200, 300, 400, 500, 600, 700, 800, 900] as const

/**
 * Agrega a `target` los nueve pasos de una escala de color como variables CSS.
 *
 * @param target - Variables que se van armando.
 * @param prefix - Nombre de la variable sin el paso, por ejemplo `--color-accent`.
 * @param scale - Escala de 100 a 900.
 */
function addScale(target: Record<string, string>, prefix: string, scale: ColorScale): void {
  for (const step of SCALE_STEPS) target[`${prefix}-${String(step)}`] = scale[step]
}

/**
 * Variables CSS del bloque `@theme` de `tokens.css`, con su valor.
 *
 * No incluye `--color-*: initial`, que borra la paleta por defecto de Tailwind y no es un valor.
 *
 * @returns El nombre de cada variable (por ejemplo `--color-accent-500`) con su valor.
 */
export function cssVariables(): Readonly<Record<string, string>> {
  const { colors, shadows, radii, typography, easing } = tokens
  const vars: Record<string, string> = {
    '--color-background': colors.background,
    '--color-surface': colors.surface,
    '--color-foreground': colors.foreground,
    '--color-accent': colors.accent[500],
  }
  addScale(vars, '--color-accent', colors.accent)
  addScale(vars, '--color-accent-2', colors.accent2)
  addScale(vars, '--color-neutral', colors.neutral)
  Object.assign(vars, {
    '--color-section': colors.section,
    '--color-section-glow': colors.sectionGlow,
    '--color-section-ghost': colors.sectionGhost,
    '--color-cream': colors.cream,
    '--color-danger': colors.danger.text,
    '--color-danger-border': colors.danger.border,
    '--color-divider': colors.divider,
    '--radius-sm': radii.sm,
    '--radius-md': radii.md,
    '--radius-lg': radii.lg,
    '--radius-tag': radii.tag,
    '--shadow-sm': shadows.sm,
    '--shadow-md': shadows.md,
    '--shadow-lg': shadows.lg,
    '--font-sans': typography.fontFamily,
    '--text-body': typography.body.size,
    '--text-body--line-height': typography.body.lineHeight,
    '--ease-main': easing.main,
    '--ease-spring': easing.spring,
  })
  const { sizes, lineHeight, letterSpacing, fontWeight } = typography.heading
  for (const [level, size] of Object.entries(sizes)) {
    vars[`--text-${level}`] = size
    vars[`--text-${level}--line-height`] = lineHeight
    vars[`--text-${level}--letter-spacing`] = letterSpacing
    vars[`--text-${level}--font-weight`] = fontWeight
  }
  return vars
}
