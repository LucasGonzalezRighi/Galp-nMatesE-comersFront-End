import type { ReactNode } from 'react'
import { CaretDownIcon } from '@phosphor-icons/react'
import { Link } from '@tanstack/react-router'
import { useId, useRef } from 'react'
import type { ContactMessage } from '@galpon/api-client'
import { formatDateTime } from '@galpon/domain'
import { Badge } from '../../../components/ui/Badge'
import { Button } from '../../../components/ui/Button'
import { buttonClass } from '../../../components/ui/button-class'
import { cx } from '../../../components/ui/cx'
import { replyMailto, toParagraphs } from '../message-format'
import { MESSAGES_COPY, withdrawalCodeLabel } from '../messages.copy'

/** Props de {@link MessageItem}. */
export interface MessageItemProps {
  /** El mensaje. */
  message: ContactMessage
  /** Si está desplegado. */
  isOpen: boolean
  /** Se llama al tocar el resumen, para desplegarlo o plegarlo. */
  onToggle: () => void
  /** Se llama con "Marcar como no leído". */
  onMarkUnread: () => void
  /** Deshabilita "Marcar como no leído" mientras se guarda un cambio de este mensaje. */
  isPending?: boolean
}

/**
 * Un mensaje de la bandeja (un `li`): el resumen es un botón que lo despliega (`aria-expanded`),
 * con un punto cobre y "Sin leer" oculto si no se leyó, el nombre, el tipo, el motivo o el código
 * del arrepentimiento, el pedido y la fecha y hora. Desplegado muestra el email, el texto en
 * párrafos (o "Sin comentario."), "Responder por email", "Ver pedido {número}" y "Marcar como no
 * leído".
 *
 * @param props - Ver {@link MessageItemProps}.
 * @throws {RangeError} Si la fecha no es válida o un arrepentimiento no tiene código.
 */
export function MessageItem({
  message,
  isOpen,
  onToggle,
  onMarkUnread,
  isPending = false,
}: MessageItemProps): ReactNode {
  const panelId = useId()
  const toggleRef = useRef<HTMLButtonElement>(null)
  const unread = !message.read
  const detail =
    message.kind === 'withdrawal'
      ? message.code === null
        ? null
        : withdrawalCodeLabel(message.code)
      : message.reason
  const paragraphs = message.message === null ? [] : toParagraphs(message.message)

  return (
    <li>
      <button
        ref={toggleRef}
        type="button"
        aria-expanded={isOpen}
        aria-controls={isOpen ? panelId : undefined}
        onClick={onToggle}
        className="flex min-h-9 w-full cursor-pointer items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-neutral-900 motion-reduce:transition-none"
      >
        <span
          aria-hidden="true"
          className={cx('mt-2 size-2 shrink-0 rounded-full', unread ? 'bg-accent' : '')}
        />
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {unread && <span className="sr-only">{MESSAGES_COPY.unread}</span>}
            <span className={cx('break-words', unread && 'font-medium')}>{message.name}</span>
            <Badge tone={message.kind === 'withdrawal' ? 'accent' : 'neutral'}>
              {MESSAGES_COPY.kinds[message.kind]}
            </Badge>
          </span>
          <span className="flex flex-wrap gap-x-3 text-sm text-neutral-400">
            {detail !== null && <span>{detail}</span>}
            {message.orderNumber !== null && (
              <span>
                {MESSAGES_COPY.order} <span className="font-mono">{message.orderNumber}</span>
              </span>
            )}
          </span>
        </span>
        <time
          dateTime={message.createdAt}
          className="shrink-0 text-sm text-neutral-400 tabular-nums"
        >
          {formatDateTime(message.createdAt)}
        </time>
        <CaretDownIcon
          size={18}
          weight="regular"
          aria-hidden="true"
          className={cx(
            'mt-px shrink-0 text-neutral-400 transition-transform motion-reduce:transition-none',
            isOpen && 'rotate-180',
          )}
        />
      </button>
      {isOpen && (
        <div id={panelId} className="flex flex-col gap-4 px-4 pb-4 sm:pl-9">
          <p className="text-sm break-all text-neutral-400">{message.email}</p>
          <div className="flex flex-col gap-2 break-words">
            {paragraphs.length === 0 ? (
              <p className="text-neutral-400">{MESSAGES_COPY.noComment}</p>
            ) : (
              paragraphs.map((paragraph, index) => (
                // Los párrafos no tienen identidad propia: la posición es la clave.
                <p key={index}>{paragraph}</p>
              ))
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <a href={replyMailto(message)} className={buttonClass('primary', 'md')}>
              {MESSAGES_COPY.reply}
            </a>
            {message.orderNumber !== null && (
              <Link
                to="/pedidos/$numero"
                params={{ numero: message.orderNumber }}
                className={buttonClass('secondary', 'md')}
              >
                {MESSAGES_COPY.viewOrder} <span className="font-mono">{message.orderNumber}</span>
              </Link>
            )}
            {message.read && (
              <Button
                variant="ghost"
                disabled={isPending}
                onClick={() => {
                  toggleRef.current?.focus()
                  onMarkUnread()
                }}
              >
                {MESSAGES_COPY.markUnread}
              </Button>
            )}
          </div>
        </div>
      )}
    </li>
  )
}
