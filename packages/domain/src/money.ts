/**
 * Monto en pesos argentinos enteros (sin centavos).
 *
 * La marca impide usar un `number` cualquiera como monto: los valores se crean
 * solo con {@link pesos}, que valida que sean enteros seguros no negativos.
 */
export type Pesos = number & { readonly __brand: 'Pesos' }

/** Formato de miles de Argentina ("39.999"), sin decimales. */
const PESOS_FORMAT = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 })

/** Signo menos tipográfico (U+2212) que usa el diseño en los descuentos. */
const MINUS_SIGN = '−'

/**
 * Convierte un número en un monto en pesos.
 *
 * @param value - Monto en pesos enteros.
 * @returns El mismo valor con el tipo {@link Pesos}; el cero negativo (`-0`) se normaliza a `0`.
 * @throws {RangeError} Si el valor no es un entero seguro mayor o igual a 0 (tampoco `NaN` ni infinito).
 * @example
 * pesos(39999) // 39999 como Pesos
 * pesos(1.5) // lanza RangeError
 */
export function pesos(value: number): Pesos {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(
      `El monto tiene que ser un entero de pesos mayor o igual a 0; se recibió ${String(value)}.`,
    )
  }
  // `-0` pasa la validación pero Intl lo mostraría como "-0": se normaliza a `0`.
  return (value === 0 ? 0 : value) as Pesos
}

/**
 * Formatea un monto como lo muestra el diseño: signo pesos pegado y puntos de miles.
 *
 * @param value - Monto en pesos.
 * @returns El monto formateado, sin espacio entre el signo y el número.
 * @example
 * formatPesos(pesos(39999)) // "$39.999"
 */
export function formatPesos(value: Pesos): string {
  return `$${PESOS_FORMAT.format(value)}`
}

/**
 * Formatea un descuento en pesos con el signo menos U+2212 adelante.
 *
 * @param value - Monto descontado, en positivo.
 * @returns El descuento formateado.
 * @example
 * formatDiscountPesos(pesos(3600)) // "−$3.600"
 */
export function formatDiscountPesos(value: Pesos): string {
  return `${MINUS_SIGN}${formatPesos(value)}`
}

/**
 * Formatea un porcentaje de descuento con el signo menos U+2212 adelante.
 *
 * @param percent - Porcentaje entero de 0 a 100, en positivo (por ejemplo, el descuento del kit).
 * @returns El porcentaje formateado.
 * @throws {RangeError} Si el porcentaje no es un entero entre 0 y 100.
 * @example
 * formatDiscountPercent(10) // "−10%"
 */
export function formatDiscountPercent(percent: number): string {
  if (!Number.isInteger(percent) || percent < 0 || percent > 100) {
    throw new RangeError(
      `El porcentaje tiene que ser un entero entre 0 y 100; se recibió ${String(percent)}.`,
    )
  }
  return `${MINUS_SIGN}${String(percent)}%`
}

/**
 * Suma montos en pesos.
 *
 * @param values - Montos a sumar; puede estar vacía.
 * @returns La suma (0 si no hay montos).
 * @throws {RangeError} Si la suma supera el máximo entero seguro.
 */
export function sumPesos(values: readonly Pesos[]): Pesos {
  return pesos(values.reduce((total, value) => total + value, 0))
}
