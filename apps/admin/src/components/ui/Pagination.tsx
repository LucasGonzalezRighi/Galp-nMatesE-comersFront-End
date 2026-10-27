import type { ReactNode } from 'react'
import { Button } from './Button'
import { OVERLAY_COPY, pageOf, showingRange } from './overlay.copy'

/** Props de {@link Pagination}. */
export interface PaginationProps {
  /** Página actual, desde 1. */
  page: number
  /** Filas por página, mayor a 0. */
  pageSize: number
  /** Total de filas de la consulta (no solo de esta página). */
  total: number
  /** Se llama con la página pedida al tocar "Anterior" o "Siguiente". */
  onPageChange: (page: number) => void
}

/**
 * Valida que un número sea un entero mayor o igual a un mínimo.
 *
 * @param value - Número a revisar.
 * @param min - Mínimo admitido.
 * @param name - Qué es, para el mensaje de error.
 * @throws {RangeError} Si no es un entero o es menor a `min`.
 */
function assertInteger(value: number, min: number, name: string): void {
  if (!Number.isInteger(value) || value < min) {
    throw new RangeError(
      `${name} tiene que ser un entero mayor o igual a ${String(min)}; se recibió ${String(value)}.`,
    )
  }
}

/**
 * Paginación de una tabla: "Mostrando {desde}–{hasta} de {total}", "Página {n} de {páginas}" y
 * los botones "Anterior" y "Siguiente", en un `nav` "Paginación". No se dibuja si todo entra en
 * una sola página. Si `page` pasa de la última (por ejemplo, una dirección vieja), se muestra la
 * última.
 *
 * @param props - Ver {@link PaginationProps}.
 * @throws {RangeError} Si `page` o `pageSize` no son enteros mayores a 0, o `total` no es un
 *   entero mayor o igual a 0.
 * @example
 * <Pagination page={page} pageSize={20} total={data.total} onPageChange={goToPage} />
 */
export function Pagination({ page, pageSize, total, onPageChange }: PaginationProps): ReactNode {
  assertInteger(page, 1, 'La página')
  assertInteger(pageSize, 1, 'El tamaño de la página')
  assertInteger(total, 0, 'El total')
  const pages = Math.max(1, Math.ceil(total / pageSize))
  if (pages === 1) return null
  const current = Math.min(page, pages)
  const from = (current - 1) * pageSize + 1
  const to = Math.min(current * pageSize, total)
  return (
    <nav
      aria-label={OVERLAY_COPY.pagination}
      className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-sm"
    >
      <p className="text-neutral-400 tabular-nums">{showingRange(from, to, total)}</p>
      <div className="flex items-center gap-2">
        <span className="tabular-nums">{pageOf(current, pages)}</span>
        <Button
          variant="secondary"
          disabled={current === 1}
          onClick={() => {
            onPageChange(current - 1)
          }}
        >
          {OVERLAY_COPY.previous}
        </Button>
        <Button
          variant="secondary"
          disabled={current === pages}
          onClick={() => {
            onPageChange(current + 1)
          }}
        >
          {OVERLAY_COPY.next}
        </Button>
      </div>
    </nav>
  )
}
