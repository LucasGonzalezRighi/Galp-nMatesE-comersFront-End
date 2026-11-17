import type { ReactNode } from 'react'
import Link from 'next/link'
import { asRoute } from '../../lib/routes'
import { cx } from './cx'
import { DATA_NOTICE_COPY } from './ui.copy'

/** Props de {@link DataNotice}. */
export interface DataNoticeProps {
  /** Para qué se usan los datos de ese formulario, como oración completa (LS-4, tabla (c)). */
  purpose: string
  /** Clases extra del párrafo. */
  className?: string
}

/**
 * Aviso de datos de un formulario (LS-4): "{purpose} Podés pedir ver, corregir o borrar tus datos.
 * Más en la Política de privacidad." con enlace a `/privacidad`. Es informativo: sin casillas.
 *
 * @param props - Ver {@link DataNoticeProps}.
 * @throws {RangeError} Si `purpose` está vacío.
 */
export function DataNotice({ purpose, className }: DataNoticeProps): ReactNode {
  if (purpose.trim() === '') {
    throw new RangeError('DataNotice necesita el propósito de los datos (purpose).')
  }
  return (
    <p data-data-notice="" className={cx('m-0 text-[12px] text-neutral-400', className)}>
      {purpose} {DATA_NOTICE_COPY.rights} {DATA_NOTICE_COPY.more}{' '}
      <Link href={asRoute('/privacidad')} className="text-accent underline">
        {DATA_NOTICE_COPY.privacyLink}
      </Link>
      .
    </p>
  )
}
