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
const ISO_DATE_TIME =
  /^(\d{4})-(\d{2})-(\d{2})T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/

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

/**
 * Indica si el año, mes y día existen en el calendario (por ejemplo, el 30 de febrero no).
 *
 * `Date` corrige solo los días imposibles pasándose al mes siguiente, así que se reconstruye
 * el día y se compara con el que se pidió.
 */
function isRealCalendarDay(year: number, month: number, day: number): boolean {
  const date = new Date(0)
  date.setUTCFullYear(year, month - 1, day)
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  )
}

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
 * @throws {RangeError} Si el texto no es una fecha ISO 8601 con hora y zona horaria válida, o si el
 *   día no existe en el calendario.
 */
function argentinaParts(iso: string): ArgentinaDateParts {
  const date = new Date(iso)
  const match = ISO_DATE_TIME.exec(iso)
  if (
    match === null ||
    Number.isNaN(date.getTime()) ||
    !isRealCalendarDay(Number(match[1]), Number(match[2]), Number(match[3]))
  ) {
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

/** Nombres de los meses en minúscula, como van en una fecha larga (enero es el índice 0). */
const MONTH_NAMES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
] as const

/** Días de la semana en minúscula, desde el domingo como `Date.getUTCDay`. */
const WEEKDAY_NAMES = [
  'domingo',
  'lunes',
  'martes',
  'miércoles',
  'jueves',
  'viernes',
  'sábado',
] as const

/** Posición de un mes en {@link MONTH_NAMES}; `Date.getUTCMonth` siempre da una de estas. */
type MonthIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11

/** Posición de un día en {@link WEEKDAY_NAMES}; `Date.getUTCDay` siempre da una de estas. */
type WeekdayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6

/** Milisegundos de un día. */
const DAY_MS = 86_400_000

/**
 * Pasa una fecha a texto ISO 8601, para leerla con {@link argentinaParts}.
 *
 * @throws {RangeError} Si es un `Date` inválido.
 */
function toIso(date: Date | string): string {
  if (typeof date === 'string') return date
  if (Number.isNaN(date.getTime())) throw new RangeError('La fecha no es válida.')
  return date.toISOString()
}

/**
 * Día de calendario de Buenos Aires como medianoche UTC, para comparar días sin las horas.
 *
 * @throws {RangeError} Si la fecha no es válida.
 */
function argentinaDay(date: Date | string): Date {
  const { day, month, year } = argentinaParts(toIso(date))
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)))
}

/**
 * Clave del día de una fecha en Buenos Aires, para agrupar o comparar por día.
 *
 * @param date - Fecha (`Date` o texto ISO 8601 con hora y zona horaria).
 * @returns El día como `YYYY-MM-DD`.
 * @throws {RangeError} Si la fecha no es válida.
 * @example
 * arDayKey('2026-10-27T02:59:00Z') // "2026-10-26"
 * arDayKey('2026-10-27T03:00:00Z') // "2026-10-27"
 */
export function arDayKey(date: Date | string): string {
  return argentinaDay(date).toISOString().slice(0, 10)
}

/**
 * Indica si una fecha cae en los últimos `days` días de Buenos Aires, hoy incluido.
 *
 * Con 1 cuenta solo hoy; con 7, hoy y los 6 días anteriores. Un día que todavía no llegó no cuenta.
 *
 * @param iso - Fecha a revisar, ISO 8601 con hora y zona horaria.
 * @param now - Momento actual.
 * @param days - Cantidad de días, entero desde 1.
 * @returns `true` si el día de `iso` está entre hoy y `days - 1` días atrás.
 * @throws {RangeError} Si alguna fecha no es válida o `days` no es un entero desde 1.
 * @example
 * isWithinLastArDays('2026-10-21T03:00:00Z', new Date('2026-10-27T15:00:00Z'), 7) // true
 */
export function isWithinLastArDays(iso: string, now: Date, days: number): boolean {
  if (!Number.isInteger(days) || days < 1) {
    throw new RangeError(
      `La cantidad de días tiene que ser un entero desde 1; se recibió ${String(days)}.`,
    )
  }
  const elapsed = (argentinaDay(now).getTime() - argentinaDay(iso).getTime()) / DAY_MS
  return elapsed >= 0 && elapsed < days
}

/**
 * Formatea una fecha larga con el día de la semana, en hora de Buenos Aires y en minúscula (la
 * pantalla pone la mayúscula inicial si la necesita).
 *
 * @param iso - Fecha ISO 8601 con hora y zona horaria.
 * @returns El día de la semana, el día sin cero adelante y el mes.
 * @throws {RangeError} Si el texto no es una fecha ISO 8601 con hora y zona horaria válida.
 * @example
 * formatLongDate('2026-10-26T15:00:00Z') // "lunes 26 de octubre"
 */
export function formatLongDate(iso: string): string {
  const day = argentinaDay(iso)
  const weekday = WEEKDAY_NAMES[day.getUTCDay() as WeekdayIndex]
  const month = MONTH_NAMES[day.getUTCMonth() as MonthIndex]
  return `${weekday} ${String(day.getUTCDate())} de ${month}`
}
