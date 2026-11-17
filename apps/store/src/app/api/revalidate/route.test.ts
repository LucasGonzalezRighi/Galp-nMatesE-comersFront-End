import { beforeEach, describe, expect, it, vi } from 'vitest'

/** Etiquetas que se mandaron a regenerar en cada prueba. */
const revalidated = vi.hoisted(() => ({ tags: [] as string[] }))

vi.mock('next/cache', () => ({
  revalidateTag: (tag: string) => {
    revalidated.tags.push(tag)
  },
}))
vi.mock('@/lib/env', () => ({ getStoreEnv: () => ({ revalidateSecret: SECRET }) }))

const SECRET = 's'.repeat(32)

const { POST } = await import('./route')

/** Pedido al webhook con el secreto correcto y el cuerpo indicado. */
function webhook(body: BodyInit, headers: Record<string, string> = {}): Request {
  return new Request('http://localhost:3000/api/revalidate', {
    method: 'POST',
    headers: { 'x-revalidate-secret': SECRET, 'content-type': 'application/json', ...headers },
    body,
  })
}

/** Un cuerpo que llega en pedazos, sin `Content-Length`. */
function streamOf(text: string, chunkSize: number): ReadableStream<Uint8Array> {
  const bytes = new TextEncoder().encode(text)
  let offset = 0
  return new ReadableStream({
    pull(controller) {
      if (offset >= bytes.length) {
        controller.close()
        return
      }
      controller.enqueue(bytes.slice(offset, offset + chunkSize))
      offset += chunkSize
    },
  })
}

beforeEach(() => {
  revalidated.tags = []
})

describe('POST /api/revalidate', () => {
  it('sin el secreto responde 401', async () => {
    const response = await POST(webhook('{"tags":["products"]}', { 'x-revalidate-secret': 'x' }))

    expect(response.status).toBe(401)
    expect(revalidated.tags).toEqual([])
  })

  it('regenera las etiquetas válidas', async () => {
    const response = await POST(webhook('{"tags":["products","settings","products"]}'))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ revalidated: ['products', 'settings'] })
    expect(revalidated.tags).toEqual(['products', 'settings'])
  })

  it('un cuerpo de más de 8 kB responde 413 sin regenerar nada', async () => {
    const big = JSON.stringify({ tags: ['products'], relleno: 'x'.repeat(8 * 1024) })
    const response = await POST(webhook(big))

    expect(response.status).toBe(413)
    expect(revalidated.tags).toEqual([])
  })

  it('también sin Content-Length: corta al pasar los 8 kB', async () => {
    const big = JSON.stringify({ tags: ['products'], relleno: 'x'.repeat(8 * 1024) })
    const request = new Request('http://localhost:3000/api/revalidate', {
      method: 'POST',
      headers: { 'x-revalidate-secret': SECRET },
      body: streamOf(big, 1024),
      duplex: 'half',
    } as RequestInit)

    expect(request.headers.get('content-length')).toBeNull()
    expect((await POST(request)).status).toBe(413)
  })

  it('un cuerpo de 8 kB justos se acepta', async () => {
    const base = '{"tags":["products"],"relleno":""}'
    const exact = base.replace('""', `"${'x'.repeat(8 * 1024 - base.length)}"`)
    expect(new TextEncoder().encode(exact).length).toBe(8 * 1024)

    expect((await POST(webhook(exact))).status).toBe(200)
  })

  it('una etiqueta de más de 100 caracteres responde 422', async () => {
    const tag = `product:${'a'.repeat(93)}`
    const response = await POST(webhook(JSON.stringify({ tags: [tag] })))

    expect(response.status).toBe(422)
    expect(revalidated.tags).toEqual([])
  })

  it('un JSON roto responde 422', async () => {
    expect((await POST(webhook('{"tags":'))).status).toBe(422)
  })
})
