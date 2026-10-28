import type { MouseEvent, ReactNode } from 'react'
import { ArrowSquareOutIcon, DotsThreeIcon } from '@phosphor-icons/react'
import { useNavigate } from '@tanstack/react-router'
import { DropdownMenu } from 'radix-ui'
import { buttonClass } from './button-class'
import { cx } from './cx'
import { OVERLAY_COPY } from './overlay.copy'

/** Una acción del menú: hace algo (`onSelect`) o lleva a otra dirección (`href`). */
export interface ActionsMenuItem {
  /** Texto visible de la acción, por ejemplo "Editar". */
  label: string
  /** Qué hace al elegirla. Va solo, sin `href`. */
  onSelect?: () => void
  /** Adónde lleva: una ruta del dashboard (`/productos/p1`) o, con `external`, una dirección completa. */
  href?: string
  /** Con `true`, `href` se abre en otra pestaña (por ejemplo "Ver en la tienda"). */
  external?: boolean
  /** `danger` para lo destructivo ("Archivar", "Borrar"). Por omisión `default`. */
  tone?: 'default' | 'danger'
}

/** Props de {@link ActionsMenu}. */
export interface ActionsMenuProps {
  /** Nombre accesible del disparador, por ejemplo "Acciones de Mate imperial". */
  label: string
  /** Acciones del menú, en orden. */
  items: readonly ActionsMenuItem[]
}

/** Clases de cada acción: 14 px, alto mínimo de 36 px y resaltado al pasar o con el teclado. */
const ITEM_CLASS =
  'flex min-h-9 cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-sm no-underline outline-none select-none data-[highlighted]:bg-foreground/10'

/**
 * Valida las acciones de un menú.
 *
 * @param label - Nombre del menú.
 * @param items - Acciones a revisar.
 * @throws {RangeError} Si el nombre está vacío, no hay acciones, alguna no tiene texto o no
 *   tiene exactamente uno de `onSelect` y `href`.
 */
function assertItems(label: string, items: readonly ActionsMenuItem[]): void {
  if (label.trim() === '') {
    throw new RangeError('El nombre del menú de acciones no puede estar vacío.')
  }
  if (items.length === 0) {
    throw new RangeError(`El menú "${label}" necesita al menos una acción.`)
  }
  for (const item of items) {
    if (item.label.trim() === '') {
      throw new RangeError(`Una acción del menú "${label}" no tiene texto.`)
    }
    if ((item.onSelect === undefined) === (item.href === undefined)) {
      throw new RangeError(
        `La acción "${item.label}" tiene que tener onSelect o href (uno de los dos).`,
      )
    }
  }
}

/** Props de {@link InternalLinkItem}. */
interface InternalLinkItemProps {
  /** Ruta del dashboard. */
  href: string
  /** Clases de la acción. */
  className: string
  /** Texto visible. */
  children: ReactNode
}

/**
 * Acción que navega dentro del dashboard con el router (sin recargar). Un clic con Ctrl, Shift
 * o la rueda deja que el navegador abra el enlace como siempre.
 */
function InternalLinkItem({ href, className, children }: InternalLinkItemProps): ReactNode {
  const navigate = useNavigate()
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return
    }
    event.preventDefault()
    void navigate({ href })
  }
  return (
    <DropdownMenu.Item asChild className={className}>
      <a href={href} onClick={handleClick}>
        {children}
      </a>
    </DropdownMenu.Item>
  )
}

/**
 * Menú de acciones de una fila o tarjeta, sobre Radix `DropdownMenu`. El disparador es un
 * botón de ícono (tres puntos) con `aria-label={label}`; las acciones se recorren con las
 * flechas y Escape lo cierra.
 *
 * @param props - Ver {@link ActionsMenuProps}.
 * @throws {RangeError} Si `label` está vacío, no hay acciones o alguna no tiene exactamente uno
 *   de `onSelect` y `href`.
 * @example
 * <ActionsMenu
 *   label={`Acciones de ${product.name}`}
 *   items={[
 *     { label: 'Editar', href: `/productos/${product.id}` },
 *     { label: 'Archivar', onSelect: openArchive, tone: 'danger' },
 *   ]}
 * />
 */
export function ActionsMenu({ label, items }: ActionsMenuProps): ReactNode {
  assertItems(label, items)
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger aria-label={label} className={buttonClass('icon', 'md')}>
        <DotsThreeIcon size={18} weight="regular" aria-hidden="true" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={4}
          className="bg-surface text-foreground z-50 flex min-w-48 flex-col rounded-md p-1 shadow-md transition-opacity duration-150 ease-out motion-reduce:transition-none starting:opacity-0"
        >
          {items.map((item, index) => {
            // El texto se puede repetir (dos "Editar" en un mismo menú): la clave suma el lugar.
            const key = `${String(index)}-${item.label}`
            const className = cx(
              ITEM_CLASS,
              item.tone === 'danger' ? 'text-danger' : 'text-foreground',
            )
            if (item.href === undefined) {
              return (
                <DropdownMenu.Item key={key} className={className} onSelect={item.onSelect}>
                  {item.label}
                </DropdownMenu.Item>
              )
            }
            if (item.external === true) {
              return (
                <DropdownMenu.Item key={key} asChild className={className}>
                  <a href={item.href} target="_blank" rel="noopener noreferrer">
                    {item.label}
                    <span className="sr-only"> {OVERLAY_COPY.opensInNewTab}</span>
                    <ArrowSquareOutIcon
                      size={18}
                      weight="regular"
                      aria-hidden="true"
                      className="ml-auto text-neutral-400"
                    />
                  </a>
                </DropdownMenu.Item>
              )
            }
            return (
              <InternalLinkItem key={key} href={item.href} className={className}>
                {item.label}
              </InternalLinkItem>
            )
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
