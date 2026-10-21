/** Indica si el texto tiene un carácter de control (`\n`, `\t`…), que los navegadores ignoran en las URL. */
function hasControlCharacter(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index)
    if (code < 0x20 || code === 0x7f) return true
  }
  return false
}

/** La pantalla de login, con o sin barra final, búsqueda o fragmento (el router no distingue mayúsculas). */
const LOGIN_PATH_PATTERN = /^\/login(?:[/?#]|$)/i

/**
 * Devuelve a dónde ir después de iniciar sesión, sin dejar que `?redirect=` mande a otro sitio.
 *
 * Solo sirve una ruta interna que empieza con una única `/`: `//evil.com`, `https://evil.com`,
 * `/\evil.com` y cualquier texto con caracteres de control (que el navegador quita y convierte
 * en `//`) se descartan; también la propia pantalla de login, que haría un bucle.
 *
 * @param value - Lo que vino en el parámetro `redirect` (puede ser cualquier cosa).
 * @returns La ruta interna, o `'/'` si no es segura.
 */
export function safeRedirectPath(value: unknown): string {
  if (typeof value !== 'string' || !value.startsWith('/')) return '/'
  if (value.startsWith('//') || value.includes('\\') || hasControlCharacter(value)) return '/'
  return LOGIN_PATH_PATTERN.test(value) ? '/' : value
}
