import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  AR_TIME_ZONE,
  arDayKey,
  formatDate,
  formatDateTime,
  formatLongDate,
  formatMonthYear,
  isWithinLastArDays,
} from './dates'

describe('AR_TIME_ZONE', () => {
  it('es la zona horaria de Buenos Aires', () => {
    expect(AR_TIME_ZONE).toBe('America/Argentina/Buenos_Aires')
  })
})

describe('formatMonthYear', () => {
  it('muestra el mes abreviado y el año', () => {
    expect(formatMonthYear('2026-09-15T15:00:00Z')).toBe('Sep 2026')
  })
  it('en el borde del mes usa la fecha de Buenos Aires, no la de UTC', () => {
    // 01/09 02:00 UTC son las 23:00 del 31/08 en Buenos Aires.
    expect(formatMonthYear('2026-09-01T02:00:00Z')).toBe('Ago 2026')
    // 01/09 03:00 UTC ya son las 00:00 del 01/09 en Buenos Aires.
    expect(formatMonthYear('2026-09-01T03:00:00Z')).toBe('Sep 2026')
  })
  it('en el borde del año también usa la fecha de Buenos Aires', () => {
    expect(formatMonthYear('2027-01-01T02:00:00Z')).toBe('Dic 2026')
    expect(formatMonthYear('2027-01-01T03:00:00Z')).toBe('Ene 2027')
  })
  it('traduce los doce meses', () => {
    const months = Array.from({ length: 12 }, (_, index) =>
      formatMonthYear(`2026-${String(index + 1).padStart(2, '0')}-15T15:00:00Z`),
    )
    expect(months).toEqual([
      'Ene 2026',
      'Feb 2026',
      'Mar 2026',
      'Abr 2026',
      'May 2026',
      'Jun 2026',
      'Jul 2026',
      'Ago 2026',
      'Sep 2026',
      'Oct 2026',
      'Nov 2026',
      'Dic 2026',
    ])
  })
})

describe('formatDate', () => {
  it('muestra día/mes/año de Buenos Aires', () => {
    expect(formatDate('2026-10-19T17:05:00Z')).toBe('19/10/2026')
  })
  it('antes de las 03:00 UTC todavía es el día anterior en Buenos Aires', () => {
    expect(formatDate('2026-10-19T02:00:00Z')).toBe('18/10/2026')
    expect(formatDate('2026-10-19T03:00:00Z')).toBe('19/10/2026')
  })
  it('completa con cero el día y el mes', () => {
    expect(formatDate('2026-03-05T15:00:00Z')).toBe('05/03/2026')
  })
})

describe('formatDateTime', () => {
  it('muestra fecha y hora de Buenos Aires con dos dígitos', () => {
    expect(formatDateTime('2026-10-19T17:05:00Z')).toBe('19/10/2026 14:05')
  })
  it('la medianoche es 00:00, no 24:00', () => {
    expect(formatDateTime('2026-10-19T03:00:00Z')).toBe('19/10/2026 00:00')
  })
  it('usa formato de 24 horas', () => {
    expect(formatDateTime('2026-10-19T23:30:00Z')).toBe('19/10/2026 20:30')
  })
  it('acepta milisegundos y desfases explícitos', () => {
    expect(formatDateTime('2026-10-19T17:05:00.123Z')).toBe('19/10/2026 14:05')
    expect(formatDateTime('2026-10-19T14:05:00-03:00')).toBe('19/10/2026 14:05')
  })
})

describe('validación de la fecha', () => {
  it.each([
    ['vacío', ''],
    ['texto cualquiera', 'ayer'],
    ['un mes que no existe', '2026-13-01T00:00:00Z'],
    ['solo fecha, sin hora ni zona', '2026-10-19'],
    ['sin zona horaria, que dependería de la máquina', '2026-10-19T17:05:00'],
    ['un día que no existe en febrero', '2026-02-30T00:00:00Z'],
    ['el 29 de febrero de un año no bisiesto', '2026-02-29T00:00:00Z'],
    ['el día 31 de un mes de 30 días', '2026-04-31T12:00:00Z'],
    ['el día 0', '2026-10-00T12:00:00Z'],
  ])('rechaza %s', (_description, iso) => {
    expect(() => formatDate(iso)).toThrow(RangeError)
    expect(() => formatDateTime(iso)).toThrow(RangeError)
    expect(() => formatMonthYear(iso)).toThrow(RangeError)
  })
  it('acepta el 29 de febrero de un año bisiesto y el último día de cada mes', () => {
    expect(formatDate('2028-02-29T15:00:00Z')).toBe('29/02/2028')
    expect(formatDate('2026-12-31T15:00:00Z')).toBe('31/12/2026')
  })
  it('el mensaje de error está en español', () => {
    expect(() => formatDate('ayer')).toThrow(
      'La fecha tiene que ser ISO 8601 con hora y zona horaria (por ejemplo 2026-10-19T17:05:00Z); se recibió "ayer".',
    )
  })
})

describe('si el entorno no entrega las partes de la fecha', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })
  it('falla en lugar de mostrar una fecha incompleta', () => {
    vi.spyOn(Intl.DateTimeFormat.prototype, 'formatToParts').mockReturnValue([])
    expect(() => formatDate('2026-10-19T17:05:00Z')).toThrow(
      'No se pudo leer la fecha en la zona horaria de Buenos Aires.',
    )
  })
})

describe('arDayKey', () => {
  it('a las 02:59 UTC todavía es el día anterior en Buenos Aires', () => {
    expect(arDayKey(new Date('2026-10-27T02:59:00Z'))).toBe('2026-10-26')
  })
  it('a las 03:00 UTC ya es el día nuevo en Buenos Aires', () => {
    expect(arDayKey(new Date('2026-10-27T03:00:00Z'))).toBe('2026-10-27')
  })
  it('acepta también la fecha ISO como texto', () => {
    expect(arDayKey('2026-10-27T02:59:00Z')).toBe('2026-10-26')
    expect(arDayKey('2026-03-05T15:00:00Z')).toBe('2026-03-05')
  })
  it('cruza el año con la fecha de Buenos Aires', () => {
    expect(arDayKey('2027-01-01T02:00:00Z')).toBe('2026-12-31')
  })
  it('rechaza una fecha inválida', () => {
    expect(() => arDayKey(new Date('ayer'))).toThrow(new RangeError('La fecha no es válida.'))
    expect(() => arDayKey('ayer')).toThrow(RangeError)
  })
})

describe('isWithinLastArDays', () => {
  const now = new Date('2026-10-27T15:00:00Z')

  it('con 1 día cuenta solo el día de hoy en Buenos Aires', () => {
    expect(isWithinLastArDays('2026-10-27T03:00:00Z', now, 1)).toBe(true)
    expect(isWithinLastArDays('2026-10-28T02:59:00Z', now, 1)).toBe(true)
    expect(isWithinLastArDays('2026-10-27T02:59:00Z', now, 1)).toBe(false)
  })
  it('con 7 días cuenta hoy y los 6 anteriores', () => {
    expect(isWithinLastArDays('2026-10-21T03:00:00Z', now, 7)).toBe(true)
    expect(isWithinLastArDays('2026-10-21T02:59:00Z', now, 7)).toBe(false)
  })
  it('un día que todavía no llegó no cuenta', () => {
    expect(isWithinLastArDays('2026-10-28T03:00:00Z', now, 7)).toBe(false)
  })
  it('cruza el mes y el año', () => {
    expect(isWithinLastArDays('2026-10-27T15:00:00Z', new Date('2026-11-02T15:00:00Z'), 7)).toBe(
      true,
    )
    expect(isWithinLastArDays('2026-12-26T15:00:00Z', new Date('2027-01-01T15:00:00Z'), 7)).toBe(
      true,
    )
    expect(isWithinLastArDays('2026-12-25T15:00:00Z', new Date('2027-01-01T15:00:00Z'), 7)).toBe(
      false,
    )
  })
  it.each([0, -1, 1.5, Number.NaN])('rechaza %s días', (days) => {
    expect(() => isWithinLastArDays('2026-10-27T15:00:00Z', now, days)).toThrow(
      new RangeError(
        `La cantidad de días tiene que ser un entero desde 1; se recibió ${String(days)}.`,
      ),
    )
  })
  it('rechaza fechas inválidas', () => {
    expect(() => isWithinLastArDays('ayer', now, 7)).toThrow(RangeError)
    expect(() => isWithinLastArDays('2026-10-27T15:00:00Z', new Date('ayer'), 7)).toThrow(
      RangeError,
    )
  })
})

describe('formatLongDate', () => {
  it('muestra el día de la semana, el día y el mes de Buenos Aires', () => {
    expect(formatLongDate('2026-10-26T15:00:00Z')).toBe('lunes 26 de octubre')
  })
  it('usa el día de Buenos Aires, no el de UTC', () => {
    expect(formatLongDate('2026-10-27T02:59:00Z')).toBe('lunes 26 de octubre')
    expect(formatLongDate('2026-10-27T03:00:00Z')).toBe('martes 27 de octubre')
  })
  it('el día va sin cero adelante', () => {
    expect(formatLongDate('2026-10-05T15:00:00Z')).toBe('lunes 5 de octubre')
  })
  it('traduce los siete días de la semana', () => {
    const days = ['26', '27', '28', '29', '30', '31'].map((day) =>
      formatLongDate(`2026-10-${day}T15:00:00Z`),
    )
    days.push(formatLongDate('2026-11-01T15:00:00Z'))
    expect(days).toEqual([
      'lunes 26 de octubre',
      'martes 27 de octubre',
      'miércoles 28 de octubre',
      'jueves 29 de octubre',
      'viernes 30 de octubre',
      'sábado 31 de octubre',
      'domingo 1 de noviembre',
    ])
  })
  it('traduce los doce meses', () => {
    const months = Array.from({ length: 12 }, (_, index) =>
      formatLongDate(`2026-${String(index + 1).padStart(2, '0')}-15T15:00:00Z`).replace(
        /^\S+ 15 de /,
        '',
      ),
    )
    expect(months).toEqual([
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
    ])
  })
  it('rechaza una fecha inválida', () => {
    expect(() => formatLongDate('ayer')).toThrow(RangeError)
  })
})
