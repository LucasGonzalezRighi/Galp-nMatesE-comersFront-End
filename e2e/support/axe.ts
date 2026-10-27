import type { Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

/** Reglas de WCAG 2.0 y 2.1 de nivel A y AA. */
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']

/** Una violación de accesibilidad que informa axe. */
type Violation = Awaited<ReturnType<AxeBuilder['analyze']>>['violations'][number]

/** Resume una violación en una línea: la regla, cuántos elementos y el primero. */
function describeViolation(violation: Violation): string {
  const first = violation.nodes[0]?.target.join(' ') ?? '(sin elemento)'
  return `${violation.id} [${violation.impact ?? '?'}] x${String(violation.nodes.length)}: ${violation.help} (${first})`
}

/**
 * Lo que axe encuentra en la página y es serio o crítico (el mismo criterio que `a11y.spec.ts`).
 *
 * @param page - Página ya cargada, en el estado a revisar.
 * @returns Una línea por violación; vacío si no hay.
 */
export async function seriousViolations(page: Page): Promise<string[]> {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()
  return results.violations
    .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
    .map(describeViolation)
}
