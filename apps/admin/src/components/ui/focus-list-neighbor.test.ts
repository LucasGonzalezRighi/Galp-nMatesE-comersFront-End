import { afterEach, describe, expect, it } from 'vitest'
import { focusListNeighbor } from './focus-list-neighbor'

/** Arma una lista de `count` elementos, cada uno con su campo y su botón. */
function list(count: number): HTMLUListElement {
  const ul = document.createElement('ul')
  for (let index = 1; index <= count; index += 1) {
    const li = document.createElement('li')
    const input = document.createElement('input')
    input.setAttribute('aria-label', `Campo ${String(index)}`)
    const button = document.createElement('button')
    button.textContent = `Quitar ${String(index)}`
    li.append(input, button)
    ul.append(li)
  }
  document.body.append(ul)
  return ul
}

/** El botón "Quitar" del elemento `position` (desde 1). */
function removeButton(ul: HTMLUListElement, position: number): HTMLButtonElement {
  const button = ul.querySelectorAll('button')[position - 1]
  if (button === undefined) throw new Error(`Falta el botón ${String(position)}.`)
  return button
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('focusListNeighbor', () => {
  it('enfoca el campo del siguiente, que va a quedar en el lugar del quitado', () => {
    const ul = list(3)

    expect(focusListNeighbor(removeButton(ul, 2), 'input')).toBe(true)

    expect(document.activeElement).toHaveAccessibleName('Campo 3')
  })

  it('si era el último, enfoca el campo del anterior', () => {
    const ul = list(3)

    expect(focusListNeighbor(removeButton(ul, 3), 'input')).toBe(true)

    expect(document.activeElement).toHaveAccessibleName('Campo 2')
  })

  it('sin vecino (o sin lista) no mueve el foco y devuelve false', () => {
    const ul = list(1)
    const outside = document.createElement('button')
    document.body.append(outside)

    expect(focusListNeighbor(removeButton(ul, 1), 'input')).toBe(false)
    expect(focusListNeighbor(outside, 'input')).toBe(false)
    expect(document.activeElement).toBe(document.body)
  })
})
