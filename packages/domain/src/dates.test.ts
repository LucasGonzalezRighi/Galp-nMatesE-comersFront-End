import { afterEach, describe, expect, it, vi } from 'vitest'
import { AR_TIME_ZONE, formatDate, formatDateTime, formatMonthYear } from './dates'

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
  ])('rechaza %s', (_description, iso) => {
    expect(() => formatDate(iso)).toThrow(RangeError)
    expect(() => formatDateTime(iso)).toThrow(RangeError)
    expect(() => formatMonthYear(iso)).toThrow(RangeError)
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
