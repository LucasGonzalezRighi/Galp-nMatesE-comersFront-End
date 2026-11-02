import type { PaymentFields, PaymentFieldsEvents } from './payments.types'

/** Quién escucha cada evento. */
type Listeners = {
  [E in keyof PaymentFieldsEvents]: Set<(payload: PaymentFieldsEvents[E]) => void>
}

/** Suscripciones a los eventos de una implementación de {@link PaymentFields}. */
export interface FieldEvents {
  /** Suscribe a un evento; devuelve la función que cancela la suscripción. */
  on: PaymentFields['on']
  /**
   * Avisa un evento a quienes lo escuchan.
   *
   * @param event - Evento.
   * @param payload - Datos del evento.
   */
  emit<E extends keyof PaymentFieldsEvents>(event: E, payload: PaymentFieldsEvents[E]): void
  /** Quita todas las suscripciones. */
  clear(): void
}

/**
 * Arma el registro de eventos que comparten los campos simulados y los de Mercado Pago.
 *
 * @returns Un registro vacío.
 */
export function createFieldEvents(): FieldEvents {
  const listeners: Listeners = {
    binChange: new Set(),
    validityChange: new Set(),
    focus: new Set(),
    blur: new Set(),
  }
  return {
    on(event, listener) {
      const set: Set<typeof listener> = listeners[event]
      set.add(listener)
      return () => {
        set.delete(listener)
      }
    },
    emit(event, payload) {
      for (const listener of listeners[event]) listener(payload)
    },
    clear() {
      for (const set of Object.values(listeners)) set.clear()
    },
  }
}
