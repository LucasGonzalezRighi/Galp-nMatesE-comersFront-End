import type { ReactNode } from 'react'
import { CaretLeftIcon } from '@phosphor-icons/react'
import { Link } from '@tanstack/react-router'
import { useEffect } from 'react'
import type { FileRouteTypes } from '../../routeTree.gen'
import { UI_COPY } from './ui.copy'

/** Ruta del admin sin parámetros (por ejemplo `/productos`), a la que puede volver `back`. */
export type PageHeaderBackPath = Exclude<FileRouteTypes['to'], `${string}$${string}`>

/** Enlace para volver a la pantalla anterior. */
export interface PageHeaderBack {
  /** Ruta de destino, sin parámetros. */
  to: PageHeaderBackPath
  /** Nombre de la pantalla de destino, por ejemplo "Productos". */
  label: string
}

/** Props de {@link PageHeader}. */
export interface PageHeaderProps {
  /** Título de la pantalla; también va en `document.title`. */
  title: string
  /** Texto o datos debajo del título, en `neutral-400`. */
  description?: ReactNode
  /** Botones o enlaces de la pantalla: a la derecha desde 640 px y debajo en celular. */
  actions?: ReactNode
  /** Enlace con `CaretLeft` para volver, arriba del título. */
  back?: PageHeaderBack
}

/**
 * Encabezado de una pantalla del admin: `h1` con `text-h3` y `tabIndex={-1}` (el router le da
 * el foco al navegar), la descripción, las acciones y, si hay, el enlace para volver.
 *
 * Pone `document.title` = "{title} · Galpón Admin".
 *
 * @param props - Ver {@link PageHeaderProps}.
 * @throws {RangeError} Si `title` está vacío.
 * @example
 * <PageHeader title="Pedido GLP-09001" back={{ to: '/pedidos', label: 'Pedidos' }} />
 */
export function PageHeader({ title, description, actions, back }: PageHeaderProps): ReactNode {
  useEffect(() => {
    document.title = `${title}${UI_COPY.documentTitleSuffix}`
  }, [title])
  if (title.trim() === '') {
    throw new RangeError('El título de la pantalla no puede estar vacío.')
  }
  return (
    <header className="flex flex-col gap-3">
      {back !== undefined && (
        <Link
          to={back.to}
          className="hover:text-foreground inline-flex min-h-9 items-center gap-1 self-start rounded-md text-sm text-neutral-400 no-underline transition-colors motion-reduce:transition-none"
        >
          <CaretLeftIcon size={18} weight="regular" aria-hidden="true" />
          {back.label}
        </Link>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 tabIndex={-1} className="text-h3 break-words">
            {title}
          </h1>
          {description !== undefined && <div className="text-neutral-400">{description}</div>}
        </div>
        {actions !== undefined && (
          <div className="flex flex-wrap items-center gap-2 sm:shrink-0">{actions}</div>
        )}
      </div>
    </header>
  )
}
