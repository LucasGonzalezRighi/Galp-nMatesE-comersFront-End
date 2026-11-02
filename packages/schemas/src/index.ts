/**
 * API pública de `@galpon/schemas`: validaciones de formularios con Zod, compartidas por la
 * tienda, el dashboard y el modo de prueba.
 *
 * Al importar el paquete, los errores propios de Zod (tipo equivocado, fuera de rango, método de
 * envío desconocido) quedan en español: se aplica una sola vez el idioma `es` de Zod.
 *
 * @packageDocumentation
 */
import { z } from 'zod'

export * from './account'
export * from './admin'
export * from './checkout'
export * from './content'
export * from './contact'
export * from './fields'
export * from './form-errors'
export * from './messages'
export * from './review'
export * from './withdrawal'

z.config(z.locales.es())
