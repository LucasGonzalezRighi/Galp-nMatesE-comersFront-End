/** Indica si el texto tiene un carácter de control (`\n`, `\t`…), que los navegadores ignoran en las URL. */
function hasControlCharacter(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index)
    if (code < 0x20 || code === 0x7f) return true
  }
  return false
}

/**
 * Devuelve a dónde ir después de iniciar sesión, sin dejar que `?redirect=` mande a otro sitio.
 *
 * Solo sirve una ruta interna que empieza con una única `/`: `//evil.com`, `https://evil.com`,
 * `/\evil.com` y cualquier texto con caracteres de control (que el navegador quita y convierte
 * en `//`) se descartan.
 *
 * @param value - Lo que vino en el parámetro `redirect` (puede ser cualquier cosa).
 * @returns La ruta interna, o `'/'` si no es segura.
 */
export function safeRedirectPath(value: unknown): string {
  if (typeof value !== 'string' || !value.startsWith('/')) return '/'
  if (value.startsWith('//') || value.includes('\\') || hasControlCharacter(value)) return '/'
  return value
}
