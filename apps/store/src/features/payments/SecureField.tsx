import type { ReactNode, Ref } from 'react'
import type { ShakeHandle } from '@/components/motion'
import { Shake } from '@/components/motion'

/** Props de {@link SecureField}. */
export interface SecureFieldProps {
  /** Etiqueta visible. */
  label: string
  /** Id del contenedor donde la implementación dibuja el campo (Mercado Pago monta por id). */
  containerId: string
  /** Id del control propio de los campos simulados, al que apunta el `<label>`. */
  inputId: string
  /** Id del mensaje de error. */
  errorId: string
  /** Mensaje de error, o `null` si no hay que mostrar ninguno. */
  error: string | null
  /** Referencia al contenedor, para montar el campo. */
  containerRef: Ref<HTMLDivElement>
  /** Referencia para hacer temblar el campo. */
  shakeRef: Ref<ShakeHandle>
  /** Clases extra, por ejemplo para ocupar las dos columnas. */
  className?: string
}

/**
 * Campo de tarjeta (número, vencimiento o CVC) con su `<label>` visible, el contenedor con el
 * aspecto de `.input` donde se dibuja el campo seguro o el simulado, y el mensaje de error en
 * `aria-live="polite"`. El temblor se aplica al contenedor (spec 14.4).
 *
 * @param props - Ver {@link SecureFieldProps}.
 */
export function SecureField({
  label,
  containerId,
  inputId,
  errorId,
  error,
  containerRef,
  shakeRef,
  className,
}: SecureFieldProps): ReactNode {
  return (
    <Shake ref={shakeRef} className={className}>
      <div className="flex flex-col">
        <label htmlFor={inputId} className="text-foreground/70 mb-[5px] block text-[12px]">
          {label}
        </label>
        <div
          ref={containerRef}
          id={containerId}
          data-invalid={error === null ? undefined : 'true'}
          className="border-divider bg-surface text-foreground hover:border-foreground/45 focus-within:border-accent data-invalid:border-danger-border data-invalid:hover:border-danger-border data-invalid:focus-within:border-danger-border h-[36px] w-full rounded-md border px-[10px] text-[14px] [&_iframe]:size-full [&_input::placeholder]:text-neutral-500"
        />
        <div aria-live="polite">
          {error === null ? null : (
            <p id={errorId} className="text-danger mt-[5px] block text-[12px]">
              {error}
            </p>
          )}
        </div>
      </div>
    </Shake>
  )
}
