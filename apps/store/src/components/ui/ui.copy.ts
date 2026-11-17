/** Microtextos de los componentes de `components/ui`, tal como están en el diseño. */
export const UI_COPY = {
  /** Precio de un producto "a consultar". */
  consult: 'Consultar',
  /** Leyenda del precio sin impuestos nacionales (Ley 27.743, spec 14.5); lleva los dos puntos. */
  netPrice: 'Precio sin impuestos nacionales:',
  /** Nombre accesible del grupo de cantidad. */
  quantity: 'Cantidad',
  /** Botón que resta una unidad. */
  decrease: 'Restar',
  /** Botón que suma una unidad. */
  increase: 'Sumar',
  /** Botón que resta la última unidad y quita la línea. */
  remove: 'Quitar',
  /** Complemento del nombre accesible de las estrellas ("4,7" + "de 5"). */
  outOfFive: 'de 5',
  /** Lo que va entre la posición y el total de un carrusel ("3 de 7", `positionLabel`). */
  positionOf: 'de',
} as const

/** Piezas de la leyenda de cuotas (spec 14.4): "o 3 cuotas sin interés de $13.333 · CFT … (TEA …)". */
export const INSTALLMENTS_COPY = {
  prefix: 'o',
  withoutInterest: 'cuotas sin interés de',
  separator: '·',
  cft: 'CFT',
  tea: 'TEA',
} as const

/** Piezas del aviso de datos de los formularios (`DataNotice`, LS-4). */
export const DATA_NOTICE_COPY = {
  /** Los derechos, después del propósito. */
  rights: 'Podés pedir ver, corregir o borrar tus datos.',
  /** Lo que va antes del enlace. */
  more: 'Más en la',
  /** Texto del enlace a `/privacidad`. */
  privacyLink: 'Política de privacidad',
} as const
