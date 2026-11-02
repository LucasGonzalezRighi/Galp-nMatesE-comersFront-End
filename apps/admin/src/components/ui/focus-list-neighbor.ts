/**
 * Antes de quitar un elemento de una lista (`li`), lleva el foco a un control del vecino que
 * queda: el siguiente (que pasa a ocupar su lugar) o, si era el último, el anterior. Así, quien
 * usa el teclado no queda en el `body` cuando el botón que tocó desaparece con su elemento. Se
 * llama antes de quitar: el vecino sigue en el DOM después (las listas van con `key` estable).
 *
 * @param from - Un elemento dentro del `li` que se va a quitar (por ejemplo, el botón "Quitar").
 * @param selector - Qué enfocar dentro del vecino, por ejemplo `'input, textarea'`.
 * @returns `true` si encontró a quién darle el foco; `false` si no hay vecino (el que llama elige
 *   otro destino, por ejemplo "Agregar").
 * @example
 * <Button onClick={(event) => { focusListNeighbor(event.currentTarget, 'input'); remove(index) }} />
 */
export function focusListNeighbor(from: Element, selector: string): boolean {
  const item = from.closest('li')
  const neighbor = item?.nextElementSibling ?? item?.previousElementSibling
  const target = neighbor?.querySelector<HTMLElement>(selector)
  if (target === null || target === undefined) return false
  target.focus()
  return true
}
