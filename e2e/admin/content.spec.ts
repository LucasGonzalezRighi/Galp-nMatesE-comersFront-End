import { gotoAdmin, logInAsAdmin, screenHeading, toast } from '../support/admin'
import { expect, test } from '../support/test'

/** La pregunta que se agrega en "Envíos". */
const QUESTION = '¿Envían en el día dentro de CABA?'

/** Su respuesta. */
const ANSWER = 'Sí, en moto si comprás antes de las 12. Te avisamos por mail cuando sale.'

test.describe('dashboard: contenido', () => {
  test.beforeEach(async ({ page }) => {
    await logInAsAdmin(page)
    await gotoAdmin(page, { path: '/contenido/preguntas', heading: 'Contenido' })
  })

  test('agrega una pregunta, la guarda y sigue ahí después de recargar', async ({ page }) => {
    const questions = page.getByRole('list', { name: 'Preguntas de Envíos' })
    await expect(questions.getByRole('group')).toHaveCount(3)
    await page
      .getByRole('group', { name: 'Envíos', exact: true })
      .getByRole('button', { name: 'Agregar pregunta' })
      .click()
    await expect(questions.getByRole('group')).toHaveCount(4)

    const added = questions.getByRole('group', { name: 'Pregunta 4' })
    await added.getByRole('textbox', { name: 'Pregunta' }).fill(QUESTION)
    await added.getByRole('textbox', { name: 'Respuesta' }).fill(ANSWER)
    await expect(page.getByText('Cambios sin guardar')).toBeVisible()
    await page.getByRole('button', { name: 'Guardar cambios' }).click()
    await expect(toast(page, 'Contenido guardado.')).toBeVisible()

    await page.reload()
    await expect(screenHeading(page, 'Contenido')).toBeVisible()
    const reloaded = page
      .getByRole('list', { name: 'Preguntas de Envíos' })
      .getByRole('group', { name: 'Pregunta 4' })
    await expect(reloaded.getByRole('textbox', { name: 'Pregunta' })).toHaveValue(QUESTION)
    await expect(reloaded.getByRole('textbox', { name: 'Respuesta' })).toHaveValue(ANSWER)
  })

  test('salir con cambios sin guardar pregunta antes', async ({ page }) => {
    const question = page
      .getByRole('list', { name: 'Preguntas de Envíos' })
      .getByRole('group', { name: 'Pregunta 1' })
      .getByRole('textbox', { name: 'Pregunta' })
    await question.fill(QUESTION)
    const settingsLink = page
      .getByRole('navigation', { name: 'Principal' })
      .getByRole('link', { name: 'Ajustes' })
    const confirm = page.getByRole('alertdialog', { name: '¿Salir sin guardar?' })

    await settingsLink.click()
    await expect(confirm).toBeVisible()
    await confirm.getByRole('button', { name: 'Seguir editando' }).click()
    await expect(confirm).toBeHidden()
    await expect(page).toHaveURL(/\/contenido\/preguntas$/)
    await expect(question).toHaveValue(QUESTION)

    await settingsLink.click()
    await confirm.getByRole('button', { name: 'Salir sin guardar' }).click()
    await expect(screenHeading(page, 'Ajustes')).toBeVisible()
  })
})
