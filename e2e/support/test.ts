import { expect, test as base } from '@playwright/test'

/** Un mensaje de consola que delata una violación de la política de seguridad de contenido (CSP). */
function isCspViolation(text: string): boolean {
  return text.includes('Content Security Policy') || text.includes('Refused to')
}

/**
 * `test` de Playwright con un fixture automático, `cspGuard`, que junta los mensajes de consola de
 * la página que son violaciones de la CSP y hace fallar el test si hubo alguno.
 */
export const test = base.extend<{ cspGuard: undefined }>({
  cspGuard: [
    async ({ page }, use) => {
      const violations: string[] = []
      page.on('console', (message) => {
        const text = message.text()
        if (isCspViolation(text)) violations.push(text)
      })
      await use(undefined)
      expect(violations, 'La página violó la política de seguridad de contenido (CSP)').toEqual([])
    },
    { auto: true },
  ],
})

export { expect }
