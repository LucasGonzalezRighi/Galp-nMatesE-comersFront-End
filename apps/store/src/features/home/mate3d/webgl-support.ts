/** Lo único que hace falta del lienzo de prueba: pedirle un contexto. */
export type WebGLProbe = Pick<HTMLCanvasElement, 'getContext'>

/**
 * Dice si el navegador puede dibujar con WebGL: le pide un contexto `webgl2` (o `webgl`, si no hay)
 * a un lienzo de prueba y, si lo consigue, lo libera enseguida. El lienzo tiene que ser uno aparte y
 * no el de la escena: el primer contexto de un lienzo fija sus opciones (antialias, transparencia) y
 * three no podría elegirlas.
 *
 * @param probe - Un lienzo de prueba, por ejemplo `document.createElement('canvas')`.
 * @returns `true` si hay WebGL; `false` si no hay contexto o el navegador lo bloquea.
 * @example
 * supportsWebGL(document.createElement('canvas')) // false en jsdom
 */
export function supportsWebGL(probe: WebGLProbe): boolean {
  let context: WebGL2RenderingContext | WebGLRenderingContext | null
  try {
    context = probe.getContext('webgl2') ?? probe.getContext('webgl')
  } catch {
    return false
  }
  if (context === null) return false
  context.getExtension('WEBGL_lose_context')?.loseContext()
  return true
}
