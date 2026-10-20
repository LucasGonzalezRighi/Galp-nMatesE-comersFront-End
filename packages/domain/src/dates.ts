/** Zona horaria en la que se muestra toda fecha visible de la tienda y del admin. */
export const AR_TIME_ZONE = 'America/Argentina/Buenos_Aires'

/** Meses abreviados, como los muestra el diseño (enero es el índice 0). */
const MONTH_ABBREVIATIONS = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
] as const

/**
 * Fecha ISO 8601 con hora y zona horaria (`Z` o desfase `±hh:mm`), como las del contrato.
 *
 * Sin zona horaria `Date` interpretaría la hora según la máquina, y con solo fecha usaría UTC.
 */
const ISO_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/

/** Fecha y hora en Buenos Aires, con día, mes y hora de dos dígitos y hora de 0 a 23. */
const AR_DATE_TIME_FORMAT = new Intl.DateTimeFormat('es-AR', {
  timeZone: AR_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

/** Partes de una fecha vistas desde Buenos Aires. */
interface ArgentinaDateParts {
  day: string
  month: string
  monthName: string
  year: string
  hour: string
  minute: string
}

/**
 * Descompone una fecha ISO en sus partes según la hora de Buenos Aires.
 *
 * @throws {RangeError} Si el texto no es una fecha ISO 8601 con hora y zona horaria válida.
 */
function argentinaParts(iso: string): ArgentinaDateParts {
  const date = new Date(iso)
  if (!ISO_DATE_TIME.test(iso) || Number.isNaN(date.getTime())) {
    throw new RangeError(
      `La fecha tiene que ser ISO 8601 con hora y zona horaria (por ejemplo 2026-10-19T17:05:00Z); se recibió "${iso}".`,
    )
  }
  const values = new Map<string, string>()
  for (const part of AR_DATE_TIME_FORMAT.formatToParts(date)) values.set(part.type, part.value)
  const day = values.get('day')
  const month = values.get('month')
  const year = values.get('year')
  const hour = values.get('hour')
  const minute = values.get('minute')
  const monthName = MONTH_ABBREVIATIONS[Number(month) - 1]
  if (
    day === undefined ||
    month === undefined ||
    year === undefined ||
    hour === undefined ||
    minute === undefined ||
    monthName === undefined
  ) {
    throw new Error('No se pudo leer la fecha en la zona horaria de Buenos Aires.')
  }
  return { day, month, monthName, year, hour, minute }
}

/**
 * Formatea el mes y el año de una fecha, por ejemplo la de una reseña.
 *
 * El mes es el de Buenos Aires: `2026-09-01T02:00:00Z` todavía es el 31 de agosto allá.
 *
 * @param iso - Fecha ISO 8601 con hora y zona horaria.
 * @returns El mes abreviado y el año.
 * @throws {RangeError} Si el texto no es una fecha ISO 8601 con hora y zona horaria válida.
 * @example
 * formatMonthYear('2026-09-15T15:00:00Z') // "Sep 2026"
 */
export function formatMonthYear(iso: string): string {
  const { monthName, year } = argentinaParts(iso)
  return `${monthName} ${year}`
}

/**
 * Formatea el día de una fecha como `dd/mm/aaaa`, en hora de Buenos Aires.
 *
 * @param iso - Fecha ISO 8601 con hora y zona horaria.
 * @returns La fecha con día y mes de dos dígitos.
 * @throws {RangeError} Si el texto no es una fecha ISO 8601 con hora y zona horaria válida.
 * @example
 * formatDate('2026-10-19T02:00:00Z') // "18/10/2026"
 */
export function formatDate(iso: string): string {
  const { day, month, year } = argentinaParts(iso)
  return `${day}/${month}/${year}`
}

/**
 * Formatea fecha y hora como `dd/mm/aaaa hh:mm` (24 horas), en hora de Buenos Aires.
 *
 * @param iso - Fecha ISO 8601 con hora y zona horaria.
 * @returns La fecha y la hora, con la medianoche como `00:00`.
 * @throws {RangeError} Si el texto no es una fecha ISO 8601 con hora y zona horaria válida.
 * @example
 * formatDateTime('2026-10-19T17:05:00Z') // "19/10/2026 14:05"
 */
export function formatDateTime(iso: string): string {
  const { day, month, year, hour, minute } = argentinaParts(iso)
  return `${day}/${month}/${year} ${hour}:${minute}`
}
