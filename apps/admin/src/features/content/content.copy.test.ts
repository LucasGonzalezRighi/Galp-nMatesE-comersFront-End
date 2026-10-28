import { describe, expect, it } from 'vitest'
import { combinedLoadState } from './content-load-state'
import {
  actionLabel,
  positionLabel,
  questionName,
  questionsListLabel,
  removeLineLabel,
  removePartnerLabel,
  removePaymentMethodLabel,
  unpublishedProductLabel,
} from './content.copy'
import { legalSearchSchema } from './legal-search'

describe('textos de Contenido', () => {
  it('arma los nombres de los campos y de los botones', () => {
    expect(positionLabel('Línea', 2)).toBe('Línea 2')
    expect(actionLabel('Subir', 'Envíos')).toBe('Subir Envíos')
    expect(removeLineLabel(3)).toBe('Quitar la línea 3')
    expect(removePaymentMethodLabel(1)).toBe('Quitar el medio de pago 1')
    expect(removePartnerLabel('Bruno')).toBe('Quitar a Bruno')
    expect(questionName(2, 'Envíos')).toBe('la pregunta 2 de Envíos')
    expect(questionsListLabel('Envíos')).toBe('Preguntas de Envíos')
    expect(unpublishedProductLabel('mate-viejo')).toBe('mate-viejo (no está publicado)')
  })

  it('lanza RangeError con un lugar inválido o un nombre vacío', () => {
    expect(() => positionLabel('Línea', 0)).toThrow(RangeError)
    expect(() => positionLabel(' ', 1)).toThrow(RangeError)
    expect(() => actionLabel('Subir', '')).toThrow(RangeError)
    expect(() => removeLineLabel(1.5)).toThrow(RangeError)
    expect(() => removePaymentMethodLabel(-1)).toThrow(RangeError)
    expect(() => removePartnerLabel('')).toThrow(RangeError)
    expect(() => questionName(1, '')).toThrow(RangeError)
    expect(() => questionsListLabel(' ')).toThrow(RangeError)
    expect(() => unpublishedProductLabel('')).toThrow(RangeError)
  })
})

describe('combinedLoadState', () => {
  it('da error si alguna falló, cargando si alguna espera y listo si están todas', () => {
    const done = { isPending: false, isError: false }
    expect(combinedLoadState([done, { isPending: false, isError: true }])).toBe('error')
    expect(combinedLoadState([done, { isPending: true, isError: false }])).toBe('pending')
    expect(combinedLoadState([done, done])).toBe('success')
    expect(() => combinedLoadState([])).toThrow(RangeError)
  })
})

describe('legalSearchSchema', () => {
  it('acepta los dos documentos y vuelve a los términos con cualquier otro valor', () => {
    expect(legalSearchSchema.parse({ documento: 'privacidad' })).toEqual({
      documento: 'privacidad',
    })
    expect(legalSearchSchema.parse({ documento: 'otro' })).toEqual({ documento: 'terminos' })
    expect(legalSearchSchema.parse({})).toEqual({ documento: 'terminos' })
  })
})
