import type { LogoPaths } from './logo-paths'

/** Los trazos ya cargados, o `null` antes de la primera intro. */
let cached: LogoPaths | null = null

/**
 * Los trazos del logo si ya se cargaron (después de la primera intro, la segunda no espera).
 *
 * @returns Los trazos, o `null` si todavía no se pidieron o no llegaron.
 */
export function cachedLogoPaths(): LogoPaths | null {
  return cached
}

/**
 * Carga los trazos del logo con `import()`: unos 37 KB (16 KB comprimidos) que solo necesita la
 * intro, así no pesan en el resto de las páginas.
 *
 * @returns Los trazos (ver `LOGO_PATHS`).
 */
export async function loadLogoPaths(): Promise<LogoPaths> {
  const { LOGO_PATHS } = await import('./logo-paths')
  cached = LOGO_PATHS
  return LOGO_PATHS
}
