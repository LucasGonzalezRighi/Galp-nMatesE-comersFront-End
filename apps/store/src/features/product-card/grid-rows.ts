/**
 * Cuenta las columnas de una grilla a partir de su `grid-template-columns` calculado
 * (`getComputedStyle`), que el navegador devuelve con las pistas resueltas, por ejemplo
 * `"250px 250px 250px"`. Los nombres de línea (`[inicio]`) no cuentan.
 *
 * @param template - El valor calculado de `grid-template-columns`.
 * @returns La cantidad de columnas, o `null` si la grilla no está medida (vacío, `none` o la
 *   plantilla sin resolver, como pasa con un elemento oculto).
 * @example
 * countGridColumns('250px 250px 250px') // 3
 */
export function countGridColumns(template: string): number | null {
  const trimmed = template.trim()
  if (trimmed === '' || trimmed === 'none' || trimmed.includes('(')) return null
  const tracks = trimmed
    .replace(/\[[^\]]*\]/g, ' ')
    .split(/\s+/)
    .filter((track) => track !== '')
  return tracks.length > 0 ? tracks.length : null
}

/**
 * Cuántos productos entran en las primeras hileras completas de la grilla.
 *
 * @param columns - Columnas de la grilla (entero mayor o igual a 1).
 * @param rows - Hileras que se muestran (entero mayor o igual a 1).
 * @returns `columns × rows`.
 * @throws {RangeError} Si `columns` o `rows` no son enteros mayores o iguales a 1.
 * @example
 * visibleProductLimit(5, 4) // 20
 */
export function visibleProductLimit(columns: number, rows: number): number {
  if (!Number.isInteger(columns) || columns < 1) {
    throw new RangeError(
      `Las columnas tienen que ser un entero mayor o igual a 1 (llegó ${String(columns)}).`,
    )
  }
  if (!Number.isInteger(rows) || rows < 1) {
    throw new RangeError(
      `Las hileras tienen que ser un entero mayor o igual a 1 (llegó ${String(rows)}).`,
    )
  }
  return columns * rows
}
