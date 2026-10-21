/**
 * Clases compartidas por `Input`, `Textarea` y `Select` (`.input` del diseño): fondo `surface`,
 * borde divisor, 14 px y, al enfocar, borde cobre. Con `aria-invalid` el borde es el de error,
 * también al pasar el mouse o enfocar. No lleva alto mínimo: cada control agrega el suyo para no
 * repetir una propiedad (Tailwind decide el ganador por el orden de su hoja).
 */
export const CONTROL_CLASS_NAME =
  'w-full rounded-md border border-divider bg-surface px-[10px] py-[6px] text-[14px] text-foreground caret-accent hover:border-foreground/45 focus-visible:border-accent focus-visible:outline-offset-0 aria-invalid:border-danger-border aria-invalid:hover:border-danger-border aria-invalid:focus-visible:border-danger-border disabled:cursor-not-allowed disabled:opacity-45'

/** Alto mínimo de un campo de una línea (36 px, spec 7). */
export const CONTROL_MIN_HEIGHT_CLASS_NAME = 'min-h-[36px]'

/** Alto mínimo de un campo de varias líneas (90 px, spec 7) y estirable en vertical. */
export const TEXTAREA_SIZE_CLASS_NAME = 'min-h-[90px] resize-y'
