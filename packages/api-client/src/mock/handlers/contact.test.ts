import { describe, expect, it } from 'vitest'
import { requestWithdrawal, sendContactMessage } from '../../services'
import { createMockApi, rawRequest } from '../../test/mock-api'

/** Hora fija de los pedidos, para comprobar la fecha con que se guarda cada mensaje. */
const NOW = new Date('2026-10-21T15:00:00.000Z')

/** Mensaje de contacto válido; cada test cambia lo que prueba. */
const VALID_CONTACT = {
  name: 'Lucía Pérez',
  email: 'lucia@ejemplo.com',
  orderNumber: 'GLP-12345',
  reason: 'Envío',
  message: 'Pedí un mate hace una semana y todavía no tengo novedades del envío.',
  website: null,
} as const

/** Arrepentimiento válido: solo el nombre y el email son obligatorios. */
const VALID_WITHDRAWAL = {
  name: 'Lucía Pérez',
  email: 'lucia@ejemplo.com',
  orderNumber: null,
  comment: null,
  website: null,
} as const

/** Manda un formulario con el cuerpo tal cual, sin pasar por el servicio. */
function post(mock: ReturnType<typeof createMockApi>, path: string, body: unknown) {
  return rawRequest(mock, path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /contact', () => {
  it('guarda el mensaje sin leer en la bandeja y resuelve sin contenido', async () => {
    const mock = createMockApi({ now: () => NOW })
    await expect(sendContactMessage(mock.api, VALID_CONTACT)).resolves.toBeUndefined()
    expect(mock.db.messages).toEqual([
      {
        id: 'msg-0001',
        kind: 'contact',
        name: 'Lucía Pérez',
        email: 'lucia@ejemplo.com',
        orderNumber: 'GLP-12345',
        reason: 'Envío',
        message: 'Pedí un mate hace una semana y todavía no tengo novedades del envío.',
        code: null,
        createdAt: '2026-10-21T15:00:00.000Z',
        read: false,
      },
    ])
  })

  it('responde 202 sin cuerpo', async () => {
    const mock = createMockApi()
    const response = await post(mock, '/contact', VALID_CONTACT)
    expect(response.status).toBe(202)
    expect(await response.text()).toBe('')
  })

  it('normaliza los datos y deja el pedido en null si no lo tiene', async () => {
    const mock = createMockApi()
    await sendContactMessage(mock.api, {
      name: '  Lucía Pérez ',
      email: ' LUCIA@Ejemplo.com ',
      reason: 'Otro',
      message: '  Quería preguntar por los colores.  ',
    })
    await sendContactMessage(mock.api, { ...VALID_CONTACT, orderNumber: ' glp-00042 ' })
    expect(mock.db.messages[0]).toMatchObject({
      id: 'msg-0001',
      name: 'Lucía Pérez',
      email: 'lucia@ejemplo.com',
      orderNumber: null,
      message: 'Quería preguntar por los colores.',
    })
    expect(mock.db.messages[1]).toMatchObject({ id: 'msg-0002', orderNumber: 'GLP-00042' })
  })

  it('descarta en silencio lo que llega con el campo trampa lleno', async () => {
    const mock = createMockApi()
    const response = await post(mock, '/contact', { ...VALID_CONTACT, website: 'spam' })
    expect(response.status).toBe(202)
    const invalid = await post(mock, '/contact', { website: 'spam' })
    expect(invalid.status).toBe(202)
    expect(mock.db.messages).toEqual([])
  })

  it('responde 422 con los mensajes en español de cada campo y no guarda nada', async () => {
    const mock = createMockApi()
    const response = await post(mock, '/contact', {
      name: 'L',
      email: 'no-es-un-email',
      orderNumber: 'GLP-1',
      reason: 'Queja',
      message: 'corto',
      website: null,
    })
    expect(response.status).toBe(422)
    expect(response.headers.get('Content-Type')).toBe('application/problem+json')
    expect(await response.json()).toMatchObject({
      type: 'validation_error',
      status: 422,
      errors: [
        { field: 'name', message: 'Contanos tu nombre' },
        { field: 'email', message: 'Ingresá un email válido' },
        { field: 'orderNumber', message: 'El número tiene el formato GLP-12345' },
        { field: 'reason' },
        { field: 'message', message: 'Escribí al menos 10 caracteres' },
      ],
    })
    expect(mock.db.messages).toEqual([])
  })

  it('pide los campos obligatorios si faltan y rechaza un mensaje de más de 2000 caracteres', async () => {
    const mock = createMockApi()
    const missing = await post(mock, '/contact', {})
    expect(missing.status).toBe(422)
    expect(await missing.json()).toMatchObject({
      errors: [
        { field: 'name', message: 'Contanos tu nombre' },
        { field: 'email', message: 'Ingresá un email válido' },
        { field: 'reason' },
        { field: 'message', message: 'Escribí al menos 10 caracteres' },
      ],
    })
    const long = await post(mock, '/contact', { ...VALID_CONTACT, message: 'a'.repeat(2001) })
    expect(await long.json()).toMatchObject({
      errors: [{ field: 'message', message: 'Máximo 2000 caracteres' }],
    })
    expect(mock.db.messages).toEqual([])
  })

  it('rechaza con 422 un cuerpo que no es JSON ni un objeto', async () => {
    const mock = createMockApi()
    const notJson = await rawRequest(mock, '/contact', { method: 'POST', body: 'hola' })
    expect(notJson.status).toBe(422)
    const list = await post(mock, '/contact', [VALID_CONTACT])
    expect(list.status).toBe(422)
    expect(mock.db.messages).toEqual([])
  })
})

describe('POST /withdrawals', () => {
  it('guarda la solicitud en la bandeja y devuelve su código', async () => {
    const mock = createMockApi({ now: () => NOW })
    await expect(requestWithdrawal(mock.api, VALID_WITHDRAWAL)).resolves.toEqual({
      code: 'ARR-000001',
    })
    expect(mock.db.messages).toEqual([
      {
        id: 'msg-0001',
        kind: 'withdrawal',
        name: 'Lucía Pérez',
        email: 'lucia@ejemplo.com',
        orderNumber: null,
        reason: null,
        message: null,
        code: 'ARR-000001',
        createdAt: '2026-10-21T15:00:00.000Z',
        read: false,
      },
    ])
  })

  it('responde 201', async () => {
    const mock = createMockApi()
    const response = await post(mock, '/withdrawals', VALID_WITHDRAWAL)
    expect(response.status).toBe(201)
    expect(await response.json()).toEqual({ code: 'ARR-000001' })
  })

  it('no exige el número de pedido ni el comentario, pero los guarda si vienen', async () => {
    const mock = createMockApi()
    await requestWithdrawal(mock.api, { name: 'Lucía Pérez', email: 'lucia@ejemplo.com' })
    await requestWithdrawal(mock.api, {
      ...VALID_WITHDRAWAL,
      orderNumber: 'glp-12345',
      comment: '  Me arrepentí de la compra.  ',
    })
    expect(mock.db.messages[0]).toMatchObject({ orderNumber: null, message: null })
    expect(mock.db.messages[1]).toMatchObject({
      orderNumber: 'GLP-12345',
      message: 'Me arrepentí de la compra.',
    })
  })

  it('da un código distinto a cada solicitud, aunque se mezclen con mensajes de contacto', async () => {
    const mock = createMockApi()
    await sendContactMessage(mock.api, VALID_CONTACT)
    const first = await requestWithdrawal(mock.api, VALID_WITHDRAWAL)
    const second = await requestWithdrawal(mock.api, VALID_WITHDRAWAL)
    const third = await requestWithdrawal(mock.api, VALID_WITHDRAWAL)
    const codes = [first.code, second.code, third.code]
    expect(codes).toEqual(['ARR-000001', 'ARR-000002', 'ARR-000003'])
    expect(new Set(codes).size).toBe(3)
    expect(mock.db.messages.map((message) => message.id)).toEqual([
      'msg-0001',
      'msg-0002',
      'msg-0003',
      'msg-0004',
    ])
  })

  it('sigue la numeración de lo que ya había en la base', async () => {
    const mock = createMockApi()
    mock.db.messages.push({
      id: 'msg-0001',
      kind: 'withdrawal',
      name: 'Ana',
      email: 'ana@ejemplo.com',
      orderNumber: null,
      reason: null,
      message: null,
      code: 'ARR-000041',
      createdAt: '2026-10-20T15:00:00Z',
      read: true,
    })
    await expect(requestWithdrawal(mock.api, VALID_WITHDRAWAL)).resolves.toEqual({
      code: 'ARR-000042',
    })
  })

  it('descarta en silencio lo que llega con el campo trampa lleno, pero responde como si anduviera', async () => {
    const mock = createMockApi()
    const response = await post(mock, '/withdrawals', { ...VALID_WITHDRAWAL, website: 'spam' })
    expect(response.status).toBe(201)
    expect(await response.json()).toEqual({ code: expect.stringMatching(/^ARR-\d{6}$/) as unknown })
    const invalid = await post(mock, '/withdrawals', { website: 'spam' })
    expect(invalid.status).toBe(201)
    expect(mock.db.messages).toEqual([])
  })

  it('responde 422 con los mensajes en español de cada campo y no guarda nada', async () => {
    const mock = createMockApi()
    const response = await post(mock, '/withdrawals', {
      name: 'Lucía 3',
      email: 'no-es-un-email',
      orderNumber: 'pedido-1',
      comment: 'a'.repeat(2001),
      website: null,
    })
    expect(response.status).toBe(422)
    expect(await response.json()).toMatchObject({
      type: 'validation_error',
      status: 422,
      errors: [
        { field: 'name', message: 'Usá solo letras' },
        { field: 'email', message: 'Ingresá un email válido' },
        { field: 'orderNumber', message: 'El número tiene el formato GLP-12345' },
        { field: 'comment', message: 'Máximo 2000 caracteres' },
      ],
    })
    expect(mock.db.messages).toEqual([])
  })

  it('pide el nombre y el email si faltan', async () => {
    const mock = createMockApi()
    const response = await post(mock, '/withdrawals', {})
    expect(response.status).toBe(422)
    expect(await response.json()).toMatchObject({
      errors: [
        { field: 'name', message: 'Requerido' },
        { field: 'email', message: 'Ingresá un email válido' },
      ],
    })
    expect(mock.db.messages).toEqual([])
  })
})
