'use client'

import type { CSSProperties, FocusEvent, ReactNode } from 'react'
import { SealCheckIcon } from '@phosphor-icons/react/SealCheck'
import Link from 'next/link'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { FeaturedReview } from '@galpon/api-client'
import type { CropPoint, MatePart, PlacedNote } from './mate-parts'
import { usePrefersReducedMotion } from '../../components/motion'
import { Stars } from '../../components/ui'
import { cx } from '../../components/ui/cx'
import { asRoute } from '../../lib/routes'
import { HOME_COPY, quoteLabel } from './home.copy'
import {
  cellShowsPart,
  COLLAGE_PHOTO,
  MATE_PARTS,
  NOTES_PER_SIDE,
  PART_ORDER,
  partOfReview,
  placeNotes,
} from './mate-parts'

/** Celdas por lado del collage. */
const GRID = 8

/** Cuánto tarda en armarse el collage antes de que se peguen las notas, en milisegundos. */
const ASSEMBLE_MS = 900

/** Espera entre una celda y la de al lado (en diagonal), en milisegundos. */
const CELL_STEP_MS = 40

/** Espera entre una nota y la siguiente, en milisegundos. */
const NOTE_STEP_MS = 80

/** Giro y corrimiento hacia el mate de cada lugar de la columna (en el lado derecho, espejados). */
const NOTE_TILT = [
  { rotate: -2.5, inset: 0 },
  { rotate: 1.8, inset: 14 },
  { rotate: -1.5, inset: 4 },
  { rotate: 2.2, inset: 18 },
  { rotate: -1, inset: 8 },
] as const

/** Un número fijo entre 0 y 1 por semilla: el mismo en el servidor y en el navegador. */
function noise(seed: number): number {
  const value = Math.sin(seed * 12.9898) * 43758.5453
  return value - Math.floor(value)
}

/** Un valor entre `min` y `max` para una semilla, redondeado a una décima. */
function between(seed: number, min: number, max: number): string {
  return (min + noise(seed) * (max - min)).toFixed(1)
}

/** Una celda del collage: su recorte de la foto, las partes que muestra y sus dos posiciones. */
interface Cell {
  key: string
  parts: readonly MatePart[]
  style: CSSProperties
}

/**
 * Las celdas del collage (sin las cuatro esquinas, que son fondo): cada una muestra su pedazo de la
 * foto, queda apenas corrida y girada como un recorte pegado a mano, y arranca desordenada.
 */
const CELLS: readonly Cell[] = (() => {
  const { width, height, cropX, cropY, cropSize, src } = COLLAGE_PHOTO
  const cell = 100 / GRID
  const cells: Cell[] = []
  for (let row = 0; row < GRID; row++) {
    for (let col = 0; col < GRID; col++) {
      const corner = (row === 0 || row === GRID - 1) && (col === 0 || col === GRID - 1)
      if (corner) continue
      const seed = row * GRID + col + 1
      const center: CropPoint = { x: (col + 0.5) / GRID, y: (row + 0.5) / GRID }
      const posX = ((cropX / cropSize) * GRID + col) / ((width / cropSize) * GRID - 1)
      const posY = ((cropY / cropSize) * GRID + row) / ((height / cropSize) * GRID - 1)
      cells.push({
        key: `${String(col)}-${String(row)}`,
        parts: PART_ORDER.filter((part) => cellShowsPart(part, center, 0.5 / GRID)),
        style: {
          left: `calc(${String(col * cell)}% + 1.5px)`,
          top: `calc(${String(row * cell)}% + 1.5px)`,
          width: `calc(${String(cell)}% - 3px)`,
          height: `calc(${String(cell)}% - 3px)`,
          backgroundImage: `url(${src})`,
          backgroundSize: `${((width / cropSize) * GRID * 100).toFixed(3)}% auto`,
          backgroundPosition: `${(posX * 100).toFixed(3)}% ${(posY * 100).toFixed(3)}%`,
          '--rest': `translate(${between(seed, -2, 2)}px, ${between(seed + 99, -2, 2)}px) rotate(${between(seed + 199, -1.2, 1.2)}deg)`,
          '--scatter': `translate(${between(seed + 299, -90, 90)}px, ${between(seed + 399, -60, 120)}px) rotate(${between(seed + 499, -25, 25)}deg) scale(.9)`,
          '--delay': `${String((row + col) * CELL_STEP_MS)}ms`,
        } as CSSProperties,
      })
    }
  }
  return cells
})()

/** Un hilo de una nota a su parte, en píxeles del escenario. */
interface Thread {
  id: string
  part: MatePart
  x1: number
  y1: number
  x2: number
  y2: number
}

/**
 * Mide los hilos: de la chinche de cada nota al punto de su parte en el collage, en píxeles del
 * escenario sin escalar (mientras el pie sube, el bloque clavado se achica un poco).
 */
function measureThreads(
  stage: HTMLElement,
  collage: HTMLElement,
  notes: readonly PlacedNote<FeaturedReview>[],
): Thread[] {
  const base = stage.getBoundingClientRect()
  if (stage.offsetWidth === 0) return []
  const scale = base.width / stage.offsetWidth
  const photo = collage.getBoundingClientRect()
  const threads: Thread[] = []
  for (const note of notes) {
    const pin = stage.querySelector(`[data-pin="${note.item.id}"]`)
    if (pin === null || pin.getClientRects().length === 0) continue
    const box = pin.getBoundingClientRect()
    const { spot } = MATE_PARTS[note.part]
    threads.push({
      id: note.item.id,
      part: note.part,
      x1: (box.left + box.width / 2 - base.left) / scale,
      y1: (box.top + box.height / 2 - base.top) / scale,
      x2: (photo.left + spot.x * photo.width - base.left) / scale,
      y2: (photo.top + spot.y * photo.height - base.top) / scale,
    })
  }
  return threads
}

/** No hay nada que escuchar: si hay `IntersectionObserver` no cambia mientras dura la página. */
function subscribeToNothing(): () => void {
  return () => undefined
}

/** Si el navegador avisa cuándo aparece el collage (sin eso, se muestra ya armado). */
function canObserve(): boolean {
  return typeof IntersectionObserver !== 'undefined'
}

/** En el servidor se dibuja desordenado, como lo va a ver el navegador antes de aparecer. */
function canObserveOnServer(): boolean {
  return true
}

/** Props de {@link ReviewsCollage}. */
export interface ReviewsCollageProps {
  /** Las reseñas destacadas, hasta diez. */
  reviews: readonly FeaturedReview[]
}

/**
 * Las reseñas pegadas sobre el mate: la foto del mate cortada en 8 × 8 recortes, como un collage, y
 * alrededor la nota de cada cliente, en papel, clavada con una chinche y un hilo a la parte del mate
 * que nombra (la boca, la virola, la bombilla, el cuero o el pie, ver {@link partOfReview}). Las
 * notas van en dos columnas de hasta cinco, del lado de su parte y de arriba abajo como en la foto
 * ({@link placeNotes}); en pantallas bajas entran cuatro por lado.
 *
 * Al aparecer, los recortes llegan desordenados y se acomodan en diagonal, y después se pegan las
 * notas y se tienden los hilos (un solo momento, solo `transform` y `opacity`). Con el mouse o el
 * foco en una nota se ilumina su parte del mate y se apagan las demás. Con menos movimiento todo
 * aparece ya armado. Por debajo de 1024 px el collage va arriba y las notas debajo, sin hilos.
 *
 * @param props - Ver {@link ReviewsCollageProps}.
 */
export function ReviewsCollage({ reviews }: ReviewsCollageProps): ReactNode {
  const stageRef = useRef<HTMLDivElement>(null)
  const collageRef = useRef<HTMLDivElement>(null)
  const reduced = usePrefersReducedMotion()
  const observable = useSyncExternalStore(subscribeToNothing, canObserve, canObserveOnServer)
  const [appeared, setAppeared] = useState(false)
  const [done, setDone] = useState(false)
  const [active, setActive] = useState<string | null>(null)
  const [threads, setThreads] = useState<Thread[]>([])
  // Con menos movimiento (o sin forma de saber cuándo aparece) se muestra ya armado.
  const still = reduced || !observable
  const assembled = still || appeared
  const settled = still || done

  const placed = placeNotes(reviews, partOfReview)
  const notes = [...placed.left, ...placed.right]
  const activeNote = notes.find((note) => note.item.id === active)
  const activePart = activeNote?.part ?? null
  const shownParts = new Set(notes.map((note) => note.part))

  // Se arma al aparecer la foto (no el escenario entero: en el celular las notas van debajo y el
  // escenario es mucho más alto que la pantalla).
  useEffect(() => {
    const collage = collageRef.current
    if (still || collage === null) return undefined
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setAppeared(true)
          observer.disconnect()
        }
      },
      { threshold: 0.3 },
    )
    observer.observe(collage)
    return () => {
      observer.disconnect()
    }
  }, [still])

  // Terminado de armar, las notas y los hilos ya no esperan (el resaltado responde enseguida).
  const noteCount = notes.length
  useEffect(() => {
    if (!assembled || settled) return undefined
    const timer = window.setTimeout(
      () => {
        setDone(true)
      },
      ASSEMBLE_MS + noteCount * NOTE_STEP_MS + 400,
    )
    return () => {
      window.clearTimeout(timer)
    }
  }, [assembled, settled, noteCount])

  // Los hilos se miden con las notas ya en su lugar (`ResizeObserver` avisa al empezar a mirar) y
  // de nuevo si cambia el tamaño.
  useEffect(() => {
    const stage = stageRef.current
    const collage = collageRef.current
    if (!settled || stage === null || collage === null || typeof ResizeObserver === 'undefined') {
      return undefined
    }
    const placedNotes = placeNotes(reviews, partOfReview)
    const observer = new ResizeObserver(() => {
      setThreads(measureThreads(stage, collage, [...placedNotes.left, ...placedNotes.right]))
    })
    observer.observe(stage)
    return () => {
      observer.disconnect()
    }
  }, [reviews, settled])

  const leave = (event: FocusEvent<HTMLLIElement>): void => {
    if (!event.currentTarget.contains(event.relatedTarget)) setActive(null)
  }

  return (
    <div
      ref={stageRef}
      data-reviews-collage=""
      data-assembled={assembled ? 'true' : 'false'}
      data-active-part={activePart ?? undefined}
      className="relative mx-auto max-w-[1240px] [--note-w:clamp(220px,20vw,288px)] lg:h-[clamp(520px,calc(100svh_-_200px),720px)]"
    >
      <div
        ref={collageRef}
        aria-hidden="true"
        className="relative mx-auto aspect-square w-full max-w-[440px] lg:absolute lg:top-[4%] lg:left-1/2 lg:h-[92%] lg:w-auto lg:max-w-none lg:-translate-x-1/2"
      >
        {CELLS.map((cell) => {
          const lit = activePart !== null && cell.parts.includes(activePart)
          const dim = activePart !== null && !lit
          return (
            <span
              key={cell.key}
              data-cell=""
              data-parts={cell.parts.join(' ')}
              className={cx(
                'outline-foreground/7 ease-main absolute bg-no-repeat shadow-[0_2px_6px_rgb(0_0_0/0.55)] outline -outline-offset-1 transition-[transform,opacity,filter] motion-reduce:transition-none',
                settled ? 'duration-400' : 'duration-900',
                assembled ? '[transform:var(--rest)]' : '[transform:var(--scatter)]',
                !assembled && 'opacity-0',
                dim && 'opacity-30',
                lit && 'brightness-125',
              )}
              style={{ ...cell.style, transitionDelay: settled ? '0ms' : 'var(--delay)' }}
            />
          )
        })}
        {PART_ORDER.filter((part) => shownParts.has(part)).map((part) => (
          <span
            key={part}
            data-spot={part}
            className={cx(
              'bg-accent ease-main absolute hidden size-2.5 -translate-1/2 rounded-full shadow-[0_0_0_4px_color-mix(in_srgb,var(--color-accent)_28%,transparent)] transition-opacity duration-300 lg:block',
              !settled || (activePart !== null && activePart !== part)
                ? 'opacity-0'
                : 'opacity-100',
            )}
            style={{
              left: `${String(MATE_PARTS[part].spot.x * 100)}%`,
              top: `${String(MATE_PARTS[part].spot.y * 100)}%`,
            }}
          />
        ))}
      </div>

      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 hidden size-full overflow-visible lg:block"
      >
        {threads.map((thread) => {
          const on = activeNote === undefined || activeNote.item.id === thread.id
          return (
            <line
              key={thread.id}
              x1={thread.x1}
              y1={thread.y1}
              x2={thread.x2}
              y2={thread.y2}
              stroke="var(--color-accent)"
              strokeWidth={activeNote?.item.id === thread.id ? 1.5 : 1.25}
              strokeDasharray={activeNote?.item.id === thread.id ? undefined : '4 4'}
              className={cx(
                'ease-main transition-opacity duration-300',
                !settled ? 'opacity-0' : on ? 'opacity-100' : 'opacity-15',
              )}
            />
          )
        })}
      </svg>

      <ul
        aria-label={HOME_COPY.reviewsList}
        className="-mx-(--site-inset) mt-8 mb-0 flex snap-x snap-mandatory scroll-px-(--site-inset) [scrollbar-width:none] list-none items-start gap-4 overflow-x-auto overscroll-x-contain px-(--site-inset) pt-3 pb-6 lg:pointer-events-none lg:absolute lg:inset-0 lg:m-0 lg:grid lg:snap-none lg:grid-cols-[var(--note-w)_1fr_var(--note-w)] lg:grid-rows-[repeat(5,auto)] lg:content-between lg:gap-x-0 lg:gap-y-2 lg:overflow-visible lg:p-0 [&::-webkit-scrollbar]:hidden"
      >
        {notes.map((note, order) => (
          <ReviewNote
            key={note.item.id}
            note={note}
            order={order}
            shown={assembled}
            settled={settled}
            faded={activeNote !== undefined && activeNote !== note}
            onEnter={() => {
              setActive(note.item.id)
            }}
            onLeave={leave}
            onPointerLeave={() => {
              setActive(null)
            }}
          />
        ))}
      </ul>
    </div>
  )
}

/** Props de {@link ReviewNote}. */
interface ReviewNoteProps {
  /** La reseña con su parte, su columna y su lugar. */
  note: PlacedNote<FeaturedReview>
  /** Su turno al pegarse. */
  order: number
  /** Si ya se pegó. */
  shown: boolean
  /** Si el collage terminó de armarse. */
  settled: boolean
  /** Si otra nota tiene el mouse o el foco. */
  faded: boolean
  /** Mouse o foco adentro. */
  onEnter: () => void
  /** Foco afuera. */
  onLeave: (event: FocusEvent<HTMLLIElement>) => void
  /** Mouse afuera. */
  onPointerLeave: () => void
}

/** Una nota de papel: la parte, las estrellas, la reseña, quién la escribió y el producto. */
function ReviewNote({
  note,
  order,
  shown,
  settled,
  faded,
  onEnter,
  onLeave,
  onPointerLeave,
}: ReviewNoteProps): ReactNode {
  const { item: review, part, side, slot } = note
  const tilt = NOTE_TILT[slot % NOTES_PER_SIDE] ?? NOTE_TILT[0]
  const mirror = side === 'right' ? -1 : 1
  const style = {
    '--column': side === 'left' ? '1' : '3',
    '--row': String(slot + 1),
    '--tilt': `${String(tilt.rotate * mirror)}deg`,
    '--inset': `${String(tilt.inset * mirror)}px`,
    transitionDelay: settled ? '0ms' : `${String(ASSEMBLE_MS + order * NOTE_STEP_MS)}ms`,
  } as CSSProperties
  return (
    <li
      data-note={part}
      data-side={side}
      onPointerEnter={onEnter}
      onPointerLeave={onPointerLeave}
      onFocus={onEnter}
      onBlur={onLeave}
      className={cx(
        'bg-accent-200 text-background ease-main before:bg-accent-300 relative [rotate:var(--tilt)] px-3.5 pb-3 shadow-[0_12px_28px_rgb(0_0_0/0.5)] transition-[opacity,scale] duration-500 before:-mx-3.5 before:mb-2 before:block before:h-2 motion-reduce:transition-none',
        'w-[78%] shrink-0 snap-start sm:w-[46%] lg:pointer-events-auto lg:col-start-(--column) lg:row-start-(--row) lg:w-auto lg:translate-x-(--inset) lg:self-center',
        slot === NOTES_PER_SIDE - 1 && '[@media(max-height:820px)]:lg:hidden',
        shown ? 'scale-100' : 'scale-105 opacity-0',
        shown && (faded ? 'opacity-60' : 'opacity-100'),
      )}
      style={style}
    >
      <span
        aria-hidden="true"
        data-pin={review.id}
        className={cx(
          'bg-accent absolute -top-1.5 size-3 rounded-full shadow-[0_2px_4px_rgb(0_0_0/0.5)]',
          side === 'left' ? 'right-4' : 'left-4',
        )}
      />
      <div className="flex items-center justify-between gap-2">
        <span className="text-accent-700 text-xs font-bold">{MATE_PARTS[part].label}</span>
        <Stars value={review.rating} size={10} />
      </div>
      <blockquote className="m-0 mt-1 mb-2">
        <p className="m-0 text-xs leading-4 font-medium">{quoteLabel(review.text)}</p>
      </blockquote>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs leading-4">
        <span className="font-bold">{review.authorName}</span>
        {review.verifiedPurchase ? (
          <span className="text-accent-2-700 inline-flex items-center gap-1">
            <SealCheckIcon aria-hidden="true" size={12} weight="fill" />
            {HOME_COPY.verifiedPurchase}
          </span>
        ) : null}
      </div>
      <Link
        href={asRoute(`/producto/${encodeURIComponent(review.product.slug)}`)}
        className="text-accent-700 hover:text-accent-800 focus-visible:outline-accent-700 mt-0.5 inline-block text-xs leading-4 underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        {review.product.name}
      </Link>
    </li>
  )
}
