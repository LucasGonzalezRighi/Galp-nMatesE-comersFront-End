import type { KeyboardEvent, ReactNode } from 'react'
import { DotsSixVerticalIcon } from '@phosphor-icons/react'
import { MotionConfig, Reorder, useDragControls } from 'motion/react'
import { useLayoutEffect, useRef, useState } from 'react'
import { buttonClass } from './button-class'
import { cx } from './cx'
import { reorderAnnouncement } from './overlay.copy'

/** Sentido de la lista: `y` vertical, `x` horizontal. */
export type SortableAxis = 'x' | 'y'

/** Lo que recibe `renderItem` para mover cada ítem. */
export interface SortableItemHelpers {
  /** Lugar del ítem, desde 0. */
  index: number
  /** Lo sube (o lo mueve a la izquierda) un lugar. No hace nada si ya es el primero. */
  moveUp: () => void
  /** Lo baja (o lo mueve a la derecha) un lugar. No hace nada si ya es el último. */
  moveDown: () => void
  /** Si es el primero (para deshabilitar "Subir"). */
  isFirst: boolean
  /** Si es el último (para deshabilitar "Bajar"). */
  isLast: boolean
  /**
   * Dibuja la agarradera para arrastrar, un botón de ícono con el `aria-label` que se le pasa
   * (por ejemplo "Arrastrar Mates"). Con el foco en ella, las flechas también mueven el ítem.
   */
  dragHandle: (label: string) => ReactNode
}

/** Props de {@link SortableList}. */
export interface SortableListProps<T> {
  /** Ítems en su orden actual. */
  items: readonly T[]
  /** Clave estable y única de cada ítem. */
  getKey: (item: T) => string
  /**
   * Se llama con el orden nuevo al soltar un arrastre o al mover con un botón o las flechas. El
   * padre lo tiene que reflejar en `items`, aunque sea de forma asíncrona: hasta que cambien las
   * claves de `items`, la lista sigue mostrando el orden nuevo.
   */
  onReorder: (items: T[]) => void
  /** Nombre de la lista (su nombre accesible y el comienzo del anuncio), por ejemplo "Líneas". */
  label: string
  /** Sentido: `y` (por omisión) o `x`. */
  axis?: SortableAxis
  /** Dibuja el contenido de cada ítem. */
  renderItem: (item: T, helpers: SortableItemHelpers) => ReactNode
}

/** Teclas que mueven un ítem desde la agarradera, según el sentido. */
const MOVE_KEYS: Record<SortableAxis, { back: string; forward: string }> = {
  y: { back: 'ArrowUp', forward: 'ArrowDown' },
  x: { back: 'ArrowLeft', forward: 'ArrowRight' },
}

/** Props de {@link SortableItem}. */
interface SortableItemProps<T> {
  /** El ítem. */
  item: T
  /** Su clave. */
  itemKey: string
  /** Sentido de la lista. */
  axis: SortableAxis
  /** Lo que recibe `renderItem`, sin la agarradera. */
  helpers: Omit<SortableItemHelpers, 'dragHandle'>
  /** Guarda (o borra, con `null`) el botón de la agarradera de este ítem. */
  registerHandle: (key: string, element: HTMLButtonElement | null) => void
  /** Se llama al soltar un arrastre de este ítem. */
  onDragEnd: (key: string) => void
  /** Dibuja el contenido. */
  renderItem: SortableListProps<T>['renderItem']
}

/** Un ítem de la lista con sus propios controles de arrastre. */
function SortableItem<T>({
  item,
  itemKey,
  axis,
  helpers,
  registerHandle,
  onDragEnd,
  renderItem,
}: SortableItemProps<T>): ReactNode {
  const controls = useDragControls()
  const keys = MOVE_KEYS[axis]
  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === keys.back) {
      event.preventDefault()
      helpers.moveUp()
    } else if (event.key === keys.forward) {
      event.preventDefault()
      helpers.moveDown()
    }
  }
  const dragHandle = (label: string): ReactNode => (
    <button
      type="button"
      aria-label={label}
      ref={(element) => {
        registerHandle(itemKey, element)
      }}
      onPointerDown={(event) => {
        controls.start(event)
      }}
      onKeyDown={handleKeyDown}
      className={cx(buttonClass('icon', 'md'), 'cursor-grab touch-none active:cursor-grabbing')}
    >
      <DotsSixVerticalIcon size={18} weight="regular" aria-hidden="true" />
    </button>
  )
  return (
    <Reorder.Item
      as="li"
      value={item}
      dragListener={false}
      dragControls={controls}
      onDragEnd={() => {
        onDragEnd(itemKey)
      }}
      className="relative list-none"
    >
      {renderItem(item, { ...helpers, dragHandle })}
    </Reorder.Item>
  )
}

/** Foco a devolver después de mover: el elemento que lo tenía y la clave del ítem movido. */
interface PendingFocus {
  element: Element | null
  key: string
}

/** Orden ya avisado con `onReorder` que el padre todavía no pasó en `items`. */
interface PendingOrder<T> {
  /** Ítems en el orden nuevo. */
  order: T[]
  /** Claves de `items` al avisar (`JSON.stringify`); cuando cambian, manda otra vez `items`. */
  base: string
}

/**
 * Lista reordenable con `Reorder` de `motion`: se arrastra desde la agarradera, se mueve con los
 * botones que dibuja `renderItem` (`moveUp`, `moveDown`) o con las flechas desde la agarradera.
 * Después de cada movimiento anuncia por `aria-live` "{label}: quedó en el lugar {n} de
 * {total}." y devuelve el foco a donde estaba. `onReorder` se llama una vez por movimiento
 * (al soltar, no en cada cuadro del arrastre). Con `prefers-reduced-motion`, sin animación.
 *
 * El orden nuevo queda como borrador hasta que cambien las claves de `items` (comparadas con
 * `getKey`), así la lista no vuelve un cuadro al orden viejo cuando el padre actualiza `items`
 * de forma asíncrona (por ejemplo en el `onMutate` de React Query, después de
 * `await cancelQueries`). Si el padre descarta el cambio sin tocar `items`, la lista se queda
 * con el orden nuevo hasta que `items` cambie. Si dos anuncios seguidos dicen lo mismo, el
 * segundo lleva un espacio final para que el DOM cambie y el lector lo repita.
 *
 * @param props - Ver {@link SortableListProps}.
 * @throws {RangeError} Si `label` está vacío o dos ítems tienen la misma clave.
 * @example
 * <SortableList
 *   items={lines}
 *   getKey={(line) => line.id}
 *   label="Líneas"
 *   onReorder={saveOrder}
 *   renderItem={(line, { dragHandle, moveUp, moveDown, isFirst, isLast }) => (
 *     <LineRow line={line} handle={dragHandle(`Arrastrar ${line.name}`)} … />
 *   )}
 * />
 */
export function SortableList<T>({
  items,
  getKey,
  onReorder,
  label,
  axis = 'y',
  renderItem,
}: SortableListProps<T>): ReactNode {
  if (label.trim() === '') {
    throw new RangeError('El nombre de la lista no puede estar vacío.')
  }
  const keys = items.map(getKey)
  if (new Set(keys).size !== keys.length) {
    throw new RangeError(`Los ítems de "${label}" tienen claves repetidas.`)
  }
  const signature = JSON.stringify(keys)
  const [draft, setDraft] = useState<T[] | null>(null)
  const [pendingOrder, setPendingOrder] = useState<PendingOrder<T> | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const draftRef = useRef<T[] | null>(null)
  const handles = useRef(new Map<string, HTMLButtonElement>())
  const pendingFocus = useRef<PendingFocus | null>(null)
  // El padre ya cambió `items` (aunque haya sido de forma asíncrona): se suelta el borrador.
  if (pendingOrder !== null && pendingOrder.base !== signature) {
    setPendingOrder(null)
  }
  const resting = pendingOrder?.base === signature ? pendingOrder.order : items
  const shown: T[] = draft ?? [...resting]

  useLayoutEffect(() => {
    const pending = pendingFocus.current
    if (pending === null) return
    pendingFocus.current = null
    const { element } = pending
    if (element === document.activeElement) return
    if (element instanceof HTMLElement && element.isConnected && !element.matches(':disabled')) {
      element.focus()
    } else {
      handles.current.get(pending.key)?.focus()
    }
  })

  const updateDraft = (next: T[] | null) => {
    draftRef.current = next
    setDraft(next)
  }

  const commit = (next: T[], key: string) => {
    const position = next.findIndex((item) => getKey(item) === key) + 1
    const text = reorderAnnouncement(label, position, next.length)
    pendingFocus.current = { element: document.activeElement, key }
    updateDraft(null)
    setPendingOrder({ order: next, base: signature })
    // Un texto igual al anterior no cambia el DOM y el lector no lo repite: se alterna un espacio.
    setAnnouncement((previous) => (previous === text ? `${text} ` : text))
    onReorder(next)
  }

  const move = (from: number, to: number) => {
    if (to < 0 || to >= shown.length) return
    const next = [...shown]
    const [moved] = next.splice(from, 1)
    if (moved === undefined) return
    next.splice(to, 0, moved)
    commit(next, getKey(moved))
  }

  const handleDragEnd = (key: string) => {
    const next = draftRef.current
    if (next === null) return
    const restingKeys = resting.map(getKey)
    if (next.every((item, index) => getKey(item) === restingKeys[index])) {
      updateDraft(null)
      return
    }
    commit(next, key)
  }

  const registerHandle = (key: string, element: HTMLButtonElement | null) => {
    if (element === null) handles.current.delete(key)
    else handles.current.set(key, element)
  }

  return (
    <MotionConfig reducedMotion="user">
      <Reorder.Group
        as="ul"
        axis={axis}
        values={shown}
        onReorder={updateDraft}
        aria-label={label}
        className={cx(
          'm-0 flex list-none gap-2 p-0',
          axis === 'y' ? 'flex-col' : 'flex-row overflow-x-auto',
        )}
      >
        {shown.map((item, index) => {
          const key = getKey(item)
          return (
            <SortableItem
              key={key}
              item={item}
              itemKey={key}
              axis={axis}
              helpers={{
                index,
                isFirst: index === 0,
                isLast: index === shown.length - 1,
                moveUp: () => {
                  move(index, index - 1)
                },
                moveDown: () => {
                  move(index, index + 1)
                },
              }}
              registerHandle={registerHandle}
              onDragEnd={handleDragEnd}
              renderItem={renderItem}
            />
          )
        })}
      </Reorder.Group>
      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </MotionConfig>
  )
}
