'use client'

import type { RefObject } from 'react'
import { useEffect, useSyncExternalStore } from 'react'

/*
 * Dónde puede esconderse el encabezado (Ruling MR-20): solo mientras el escenario del mate 3D del
 * inicio está en pantalla. El escenario avisa con `useHeaderHideZone` y el encabezado pregunta con
 * `useHeaderMayHide`; desde la colección en adelante y en las demás páginas no hay zona y el
 * encabezado queda siempre a la vista. Un pin (`useHeaderPin`) lo deja a la vista aunque haya zona:
 * la colección del inicio, que entra encima del final del escenario, lo fija apenas se revela su
 * título (Ruling AT-1).
 */

/** Cuántas zonas están en pantalla. */
let zones = 0

/** Cuántos pins lo fijan a la vista. */
let pins = 0

/** Quienes esperan el cambio. */
const listeners = new Set<() => void>()

/** Avisa el cambio a quienes esperan. */
function notify(): void {
  for (const listener of listeners) listener()
}

/**
 * Avisa que una zona donde el encabezado puede esconderse está en pantalla.
 *
 * @returns La función que retira el aviso (una sola vez, aunque se llame de nuevo).
 */
export function registerHeaderHideZone(): () => void {
  zones += 1
  notify()
  let active = true
  return () => {
    if (!active) return
    active = false
    zones -= 1
    notify()
  }
}

/**
 * Fija el encabezado a la vista mientras dure, aunque haya una zona en pantalla.
 *
 * @returns La función que lo suelta (una sola vez, aunque se llame de nuevo).
 */
export function registerHeaderPin(): () => void {
  pins += 1
  notify()
  let active = true
  return () => {
    if (!active) return
    active = false
    pins -= 1
    notify()
  }
}

/** Se suscribe a los cambios. */
function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Si hay alguna zona en pantalla y nada fija el encabezado. */
function getSnapshot(): boolean {
  return zones > 0 && pins === 0
}

/** En el servidor no hay zonas. */
function getServerSnapshot(): boolean {
  return false
}

/**
 * Indica si el encabezado puede esconderse al bajar: solo mientras haya en pantalla una zona que lo
 * permita (el escenario del mate 3D, ver {@link useHeaderHideZone}) y ningún pin lo fije
 * ({@link useHeaderPin}). En el servidor y en la hidratación es `false`.
 *
 * @returns `true` mientras alguna zona esté en pantalla y no haya pins.
 */
export function useHeaderMayHide(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

/**
 * Marca un elemento como zona donde el encabezado puede esconderse al bajar: lo observa con un
 * `IntersectionObserver` y avisa ({@link registerHeaderHideZone}) mientras alguna parte suya esté en
 * pantalla. Retira el aviso al salir de la pantalla y al desmontarse (también cuando la página queda
 * oculta al navegar). Sin `IntersectionObserver` no avisa nunca: el encabezado queda a la vista.
 *
 * @param ref - El elemento de la zona; tiene que estar montado al terminar el render.
 */
export function useHeaderHideZone(ref: RefObject<Element | null>): void {
  useEffect(() => {
    const element = ref.current
    if (element === null || typeof IntersectionObserver !== 'function') return undefined
    let release: (() => void) | null = null
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting && release === null) release = registerHeaderHideZone()
        if (!entry.isIntersecting && release !== null) {
          release()
          release = null
        }
      }
    })
    observer.observe(element)
    return () => {
      observer.disconnect()
      release?.()
    }
  }, [ref])
}

/**
 * Fija el encabezado a la vista mientras `active` sea `true` ({@link registerHeaderPin}); lo suelta
 * al pasar a `false` y al desmontarse.
 *
 * @param active - Si lo fija ahora.
 */
export function useHeaderPin(active: boolean): void {
  useEffect(() => {
    if (!active) return undefined
    return registerHeaderPin()
  }, [active])
}
