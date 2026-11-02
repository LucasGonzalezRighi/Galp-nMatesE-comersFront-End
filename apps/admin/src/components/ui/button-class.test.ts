import { describe, expect, it } from 'vitest'
import type { ButtonSize, ButtonVariant } from './button-class'
import { buttonClass } from './button-class'

/** Todas las variantes del botón. */
const VARIANTS: ButtonVariant[] = ['primary', 'secondary', 'ghost', 'danger', 'icon']

/** Un valor que no es variante ni tamaño, tipado como `string` para poder forzarlo en la llamada. */
function unknownValue(): string {
  return 'enorme'
}

/** Parte las clases de un botón en una lista para compararlas una por una. */
function classesOf(variant: ButtonVariant, size: ButtonSize): string[] {
  return buttonClass(variant, size).split(' ')
}

describe('buttonClass', () => {
  it('la variante primary usa el fondo accent-500, el texto background y hover accent-400', () => {
    expect(classesOf('primary', 'md')).toEqual(
      expect.arrayContaining(['bg-accent-500', 'text-background', 'hover:bg-accent-400']),
    )
  })

  it('la variante secondary usa surface con shadow-sm y hover neutral-900', () => {
    expect(classesOf('secondary', 'md')).toEqual(
      expect.arrayContaining(['bg-surface', 'shadow-sm', 'hover:bg-neutral-900']),
    )
  })

  it('la variante ghost es transparente y no lleva fondo de color', () => {
    const classes = classesOf('ghost', 'md')

    expect(classes).toContain('bg-transparent')
    expect(classes).not.toContain('bg-accent-500')
    expect(classes).not.toContain('bg-surface')
  })

  it('la variante danger usa el fondo danger y el texto background', () => {
    expect(classesOf('danger', 'md')).toEqual(
      expect.arrayContaining(['bg-danger', 'text-background']),
    )
  })

  it('la variante icon mide 36 por 36 sin relleno', () => {
    expect(classesOf('icon', 'md')).toEqual(expect.arrayContaining(['size-9', 'p-0']))
  })

  it('la variante icon mide lo mismo en los dos tamaños', () => {
    expect(classesOf('icon', 'sm')).toContain('size-9')
  })

  it('el tamaño md tiene un alto mínimo de 36 px y el sm de 32 px', () => {
    expect(classesOf('primary', 'md')).toContain('min-h-9')
    expect(classesOf('primary', 'sm')).toContain('min-h-8')
  })

  it('todas las variantes llevan radio md, foco visible con anillo accent y 45 % al deshabilitar', () => {
    for (const variant of VARIANTS) {
      expect(classesOf(variant, 'md')).toEqual(
        expect.arrayContaining([
          'rounded-md',
          'focus-visible:outline-2',
          'focus-visible:outline-accent',
          'disabled:opacity-45',
        ]),
      )
    }
  })

  it('no usa colores literales', () => {
    for (const variant of VARIANTS) {
      expect(buttonClass(variant, 'md')).not.toMatch(/#[0-9a-f]{3,8}|rgba?\(/i)
    }
  })

  it('rechaza una variante desconocida con un RangeError en español', () => {
    const unknown = unknownValue()

    expect(() => buttonClass(unknown as ButtonVariant, 'md')).toThrow(RangeError)
    expect(() => buttonClass(unknown as ButtonVariant, 'md')).toThrow(/variante/)
  })

  it('rechaza un tamaño desconocido con un RangeError en español', () => {
    const unknown = unknownValue()

    expect(() => buttonClass('primary', unknown as ButtonSize)).toThrow(RangeError)
    expect(() => buttonClass('primary', unknown as ButtonSize)).toThrow(/tamaño/)
  })
})
