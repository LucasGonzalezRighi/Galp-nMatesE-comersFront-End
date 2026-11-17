import { describe, expect, it } from 'vitest'
import type { LegalMarkerValues, SellerData } from './legal'
import {
  DATA_FISCAL_LOGO_ORIGIN,
  DATA_FISCAL_LOGO_URL,
  DEFAULT_CONSUMER_LINKS,
  LEGAL_DOCUMENTS,
  LEGAL_MARKERS,
  SELLER_LEGAL_FIELDS,
  extractDataFiscalUrl,
  findLegalMarkers,
  isLegalDocument,
  legalMarkerValues,
  missingSellerFields,
  resolveLegalMarkers,
} from './legal'

const EMPTY_SELLER: SellerData = {
  legalName: null,
  cuit: null,
  taxCondition: null,
  address: null,
  phone: null,
  supportArea: null,
  supportHours: null,
  dataFiscalUrl: null,
}

const FULL_SELLER: SellerData = {
  legalName: 'Galpón Mates S. R. L.',
  cuit: '20123456786',
  taxCondition: 'Responsable inscripto',
  address: 'Av. Siempre Viva 742, CABA',
  phone: null,
  supportArea: 'Atención al cliente',
  supportHours: 'Lunes a viernes de 9 a 18',
  dataFiscalUrl: 'https://qr.afip.gob.ar/?qr=abc123',
}

const PASTED_CODE =
  '<a href="https://qr.afip.gob.ar/?qr=abc123" target="_F960AFIPInfo"><img src="https://www.afip.gob.ar/images/f960/DATAWEB.jpg" border="0"></a>'

function values(overrides: Partial<Record<keyof LegalMarkerValues, string | null>> = {}) {
  return {
    ...legalMarkerValues({ contactEmail: 'hola@galponmates.com.ar', seller: EMPTY_SELLER }),
    ...overrides,
  }
}

describe('documentos legales', () => {
  it('son cuatro, en orden', () => {
    expect(LEGAL_DOCUMENTS).toEqual(['terms', 'privacy', 'cookies', 'returns'])
  })
  it.each(['terms', 'privacy', 'cookies', 'returns'])('%s es un documento legal', (value) => {
    expect(isLegalDocument(value)).toBe(true)
  })
  it.each(['legal', 'Terms', '', 'devoluciones'])('"%s" no es un documento legal', (value) => {
    expect(isLegalDocument(value)).toBe(false)
  })
})

describe('legalMarkerValues', () => {
  it('toma cada dato del vendedor y el email de contacto', () => {
    expect(
      legalMarkerValues({ contactEmail: 'hola@galponmates.com.ar', seller: FULL_SELLER }),
    ).toEqual({
      razon_social: 'Galpón Mates S. R. L.',
      cuit: '20-12345678-6',
      condicion_iva: 'Responsable inscripto',
      domicilio: 'Av. Siempre Viva 742, CABA',
      email: 'hola@galponmates.com.ar',
      telefono: null,
      area_atencion: 'Atención al cliente',
      horario_atencion: 'Lunes a viernes de 9 a 18',
    })
  })
  it('deja un CUIT que no tiene 11 dígitos tal cual, sin lanzar', () => {
    const result = legalMarkerValues({
      contactEmail: 'a@b.com',
      seller: { ...EMPTY_SELLER, cuit: '123' },
    })
    expect(result.cuit).toBe('123')
  })
  it('tiene un valor por cada marcador', () => {
    expect(Object.keys(values()).sort()).toEqual([...LEGAL_MARKERS].sort())
  })
})

describe('findLegalMarkers', () => {
  it('separa las claves conocidas de las desconocidas, sin repetir', () => {
    expect(findLegalMarkers('{{cuit}} {{ cuit }} {{cuitt}} {{}}')).toEqual({
      known: ['cuit'],
      unknown: ['cuitt', ''],
    })
  })
  it('respeta el orden de aparición', () => {
    expect(findLegalMarkers('{{domicilio}} y {{razon_social}} y {{x}} y {{domicilio}}')).toEqual({
      known: ['domicilio', 'razon_social'],
      unknown: ['x'],
    })
  })
  it('un texto sin marcadores no trae claves', () => {
    expect(findLegalMarkers('## Título\n\nSin datos. {una} llave simple.')).toEqual({
      known: [],
      unknown: [],
    })
  })
})

describe('resolveLegalMarkers', () => {
  const MISSING = 'a completar por el vendedor'
  it('reemplaza las conocidas con valor y el resto con el texto de faltante', () => {
    expect(
      resolveLegalMarkers(
        'CUIT {{cuit}}, {{domicilio}}. {{otro}}',
        values({ cuit: '20-12345678-6', domicilio: null }),
        MISSING,
      ),
    ).toBe('CUIT 20-12345678-6, a completar por el vendedor. a completar por el vendedor')
  })
  it('un valor vacío cuenta como faltante', () => {
    expect(
      resolveLegalMarkers('Razón social: {{razon_social}}', values({ razon_social: '' }), MISSING),
    ).toBe(`Razón social: ${MISSING}`)
  })
  it('con faltante vacío no deja llaves, espacios dobles ni espacios antes de la puntuación', () => {
    const result = resolveLegalMarkers(
      'Somos {{razon_social}} , CUIT {{cuit}}; domicilio {{domicilio}}: ({{telefono}} ) fin {{x}}.',
      values(),
      '',
    )
    expect(result).not.toMatch(/\{\{|\}\}/)
    expect(result).not.toMatch(/ {2}/)
    expect(result).not.toMatch(/ [,.;:)]/)
  })
  it('no deja llaves con marcadores anidados', () => {
    const result = resolveLegalMarkers('{{ {{cuit}} }}', values({ cuit: '20-12345678-6' }), MISSING)
    expect(result).not.toContain('{{')
    expect(result).not.toContain('}}')
  })
  it('no deja llaves sueltas', () => {
    const result = resolveLegalMarkers('a }} b {{ c {{{{cuit}}}}', values(), '')
    expect(result).not.toContain('{{')
    expect(result).not.toContain('}}')
  })
  it('un valor con llaves no las mete en el resultado', () => {
    const result = resolveLegalMarkers(
      '{{razon_social}}',
      values({ razon_social: '{{x}}' }),
      MISSING,
    )
    expect(result).not.toContain('{{')
    expect(result).not.toContain('}}')
  })
})

describe('missingSellerFields', () => {
  it('sin datos faltan los 7', () => {
    expect(missingSellerFields(EMPTY_SELLER)).toEqual([...SELLER_LEGAL_FIELDS])
    expect(SELLER_LEGAL_FIELDS).toHaveLength(7)
  })
  it('el teléfono es opcional', () => {
    expect(missingSellerFields(FULL_SELLER)).toEqual([])
  })
  it('un texto vacío o en blanco cuenta como faltante', () => {
    expect(missingSellerFields({ ...FULL_SELLER, cuit: '', address: '  ' })).toEqual([
      'cuit',
      'address',
    ])
  })
})

describe('Data Fiscal', () => {
  it('saca el enlace del código pegado de ARCA', () => {
    expect(extractDataFiscalUrl(PASTED_CODE)).toBe('https://qr.afip.gob.ar/?qr=abc123')
  })
  it('acepta comillas simples en el código', () => {
    expect(extractDataFiscalUrl("<a target='x' href='https://qr.afip.gob.ar/?qr=1'>x</a>")).toBe(
      'https://qr.afip.gob.ar/?qr=1',
    )
  })
  it('una URL suelta queda recortada', () => {
    expect(extractDataFiscalUrl('  https://qr.afip.gob.ar/?qr=abc123 \n')).toBe(
      'https://qr.afip.gob.ar/?qr=abc123',
    )
  })
  it('el logo sale del origen de AFIP', () => {
    expect(DATA_FISCAL_LOGO_URL.startsWith(`${DATA_FISCAL_LOGO_ORIGIN}/`)).toBe(true)
  })
})

describe('DEFAULT_CONSUMER_LINKS', () => {
  it('trae los dos enlaces de fábrica', () => {
    expect(DEFAULT_CONSUMER_LINKS).toEqual({
      cabaUrl: 'https://buenosaires.gob.ar/gobierno/atencion-ciudadana/defensa-al-consumidor',
      nationalUrl: 'https://www.argentina.gob.ar/produccion/defensadelconsumidor/formulario',
    })
  })
})
