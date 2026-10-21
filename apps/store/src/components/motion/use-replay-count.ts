import { useState } from 'react'

/**
 * Cuenta cuántas veces cambió `replayKey` desde el primer render. Sirve para volver a animar
 * contenido cuando cambia un filtro, un orden o una pestaña, sin animar la primera carga.
 *
 * Usa el patrón de React de ajustar el estado durante el render (sin efectos ni refs), así el
 * contenido nuevo ya sale con el estado de partida en el mismo render.
 *
 * @param replayKey - Valor que identifica lo que se muestra; al cambiar, se vuelve a animar.
 * @returns 0 hasta el primer cambio y luego la cantidad de cambios.
 */
export function useReplayCount(replayKey: number | string): number {
  const [state, setState] = useState({ key: replayKey, count: 0 })
  if (state.key !== replayKey) {
    setState({ key: replayKey, count: state.count + 1 })
    return state.count + 1
  }
  return state.count
}
