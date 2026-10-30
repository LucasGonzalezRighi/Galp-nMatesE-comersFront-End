'use client'

import { useSyncExternalStore } from 'react'

/** Cuántos escenarios del mate 3D hay montados (uno, salvo en las pruebas). */
let stages = 0

/** Quienes esperan el cambio. */
const listeners = new Set<() => void>()

/** Avisa el cambio a quienes esperan. */
function notify(): void {
  for (const listener of listeners) listener()
}

/**
 * Avisa que el escenario del mate 3D (`MateStage`) está montado: mientras dure, la colección que
 * viene debajo entra desde la yerba en que termina la zambullida (`CollectionEntrance`). El
 * escenario se monta después de hidratar y solo en escritorio y con movimiento; al achicarse la
 * ventana, pedir menos movimiento o navegar a otra página se desmonta y retira el aviso.
 *
 * @returns La función que retira el aviso.
 */
export function registerMateStage(): () => void {
  stages += 1
  notify()
  let active = true
  return () => {
    if (!active) return
    active = false
    stages -= 1
    notify()
  }
}

/** Se suscribe a los cambios del aviso. */
function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Si hay un escenario montado. */
function getSnapshot(): boolean {
  return stages > 0
}

/** En el servidor no hay escenario: el mate 3D se monta después de hidratar. */
function getServerSnapshot(): boolean {
  return false
}

/**
 * Indica si el escenario del mate 3D está montado (ver {@link registerMateStage}). En el servidor y
 * en la hidratación es `false`; responde a los cambios.
 *
 * @returns `true` mientras el escenario esté montado.
 */
export function useMateStagePresent(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
