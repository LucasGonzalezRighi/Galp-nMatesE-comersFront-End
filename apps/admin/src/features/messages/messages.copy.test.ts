import { describe, expect, it } from 'vitest'
import { withdrawalCodeLabel, withdrawalSubject } from './messages.copy'

describe('withdrawalCodeLabel', () => {
  it('muestra el código del comprobante', () => {
    expect(withdrawalCodeLabel('ARR-000002')).toBe('Código ARR-000002')
  })

  it('lanza RangeError sin código', () => {
    expect(() => withdrawalCodeLabel(' ')).toThrow(RangeError)
  })
})

describe('withdrawalSubject', () => {
  it('lleva el código en el asunto', () => {
    expect(withdrawalSubject('ARR-000001')).toBe('Tu solicitud de arrepentimiento ARR-000001')
  })

  it('lanza RangeError sin código', () => {
    expect(() => withdrawalSubject('')).toThrow(RangeError)
  })
})
