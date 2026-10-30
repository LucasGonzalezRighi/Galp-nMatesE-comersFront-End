'use client'

import { createContext } from 'react'

/**
 * Lo que publica {@link Magnetic} para su contenido: una función con que un botón que trae su
 * propio imán (el `Button` de la tienda, con los valores del portafolio) le avisa que se encarga él.
 * Así el contenedor deja de moverse y el efecto no se suma dos veces. Fuera de un `Magnetic` vale
 * `null`.
 */
export const MagneticClaimContext = createContext<(() => void) | null>(null)
