import type { ReactNode } from 'react'
import { WarningIcon } from '@phosphor-icons/react'
import { Link } from '@tanstack/react-router'
import type { SellerData } from '@galpon/domain'
import { missingSellerFields } from '@galpon/domain'
import { buttonClass } from '../../../components/ui/button-class'
import { cx } from '../../../components/ui/cx'
import { SETTINGS_COPY } from '../settings.copy'

/** Props de {@link MissingLegalDataNotice}. */
export interface MissingLegalDataNoticeProps {
  /** Datos del vendedor guardados (los de `adminSettingsQuery`, no los del formulario). */
  seller: SellerData
  /** `true` suma el enlace "Completar en Ajustes" a `/ajustes` (en el Resumen). */
  withLink: boolean
}

/**
 * Aviso de los datos legales del vendedor que faltan (LS-2): un `role="note"` con el título, la
 * explicación y la lista de los que faltan, en el orden de `SELLER_LEGAL_FIELDS`
 * (`missingSellerFields` del dominio: vacío o en blanco cuenta como faltante; el teléfono es
 * opcional y nunca aparece). Si no falta ninguno no dibuja nada.
 *
 * @param props - Ver {@link MissingLegalDataNoticeProps}.
 * @throws {RangeError} Si `seller` no trae los datos del vendedor (lo lanza `missingSellerFields`).
 * @example
 * <MissingLegalDataNotice seller={settings.seller} withLink />
 */
export function MissingLegalDataNotice({
  seller,
  withLink,
}: MissingLegalDataNoticeProps): ReactNode {
  const missing = missingSellerFields(seller)
  if (missing.length === 0) return null
  const copy = SETTINGS_COPY.missingLegal
  return (
    <div
      role="note"
      className="border-divider bg-surface flex flex-wrap items-start gap-x-2 gap-y-3 rounded-lg border p-4 text-sm"
    >
      <WarningIcon
        size={18}
        weight="regular"
        aria-hidden="true"
        className="text-accent mt-0.5 shrink-0"
      />
      <div className="flex min-w-0 flex-1 basis-64 flex-col gap-2">
        <p className="text-foreground font-medium">{copy.title}</p>
        <p className="text-neutral-300">{copy.text}</p>
        <ul className="flex list-disc flex-col gap-1 pl-5 text-neutral-300">
          {missing.map((field) => (
            <li key={field}>{copy.labels[field]}</li>
          ))}
        </ul>
      </div>
      {withLink && (
        <Link to="/ajustes" className={cx(buttonClass('secondary', 'md'), 'ml-6.5')}>
          {copy.action}
        </Link>
      )}
    </div>
  )
}
