/**
 * Base de los campos de texto, como `.input` del diseño (`ds-styles.css`): 14 px, fondo
 * `surface`, borde `divider` con radio `md`, borde `accent` con el foco (el anillo lo pone
 * `base.css`) y borde `danger-border` con `aria-invalid`. El alto mínimo lo suma cada campo.
 */
const FIELD_BASE =
  'w-full rounded-md border border-divider bg-surface px-2.5 py-1.5 text-sm text-foreground caret-accent transition-colors placeholder:text-neutral-500 hover:border-foreground/45 focus-visible:border-accent focus-visible:outline-offset-0 disabled:cursor-not-allowed disabled:opacity-45 aria-invalid:border-danger-border motion-reduce:transition-none'

/** Clases de un `<input>` de texto: `.input` con alto mínimo de 36 px. */
export const INPUT_CLASS = `${FIELD_BASE} min-h-9`

/** Clases de un `<textarea>`: `.input` con alto mínimo de 90 px y alto ajustable. */
export const TEXTAREA_CLASS = `${FIELD_BASE} min-h-[90px] resize-y`

/** Clases de un `<select>` nativo: `.input` con alto mínimo de 36 px. */
export const SELECT_CLASS = `${FIELD_BASE} min-h-9 cursor-pointer`
