// @vitest-environment jsdom

import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CONTACT_COPY } from './contact.copy'
import { COPIED_DURATION_MS, CopyEmailButton } from './CopyEmailButton'

const writeText = vi.fn<(text: string) => Promise<void>>()

beforeEach(() => {
  vi.useFakeTimers()
  writeText.mockReset()
  writeText.mockResolvedValue(undefined)
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('CopyEmailButton', () => {
  it('copia el email, dice "Copiado" y vuelve a "Copiar" a los 1,8 s', async () => {
    render(<CopyEmailButton email="galpon.mates@gmail.com" />)
    expect(screen.getByRole('button', { name: CONTACT_COPY.copy })).toBeInTheDocument()

    await act(async () => {
      screen.getByRole('button', { name: CONTACT_COPY.copy }).click()
      await Promise.resolve()
    })

    expect(writeText).toHaveBeenCalledWith('galpon.mates@gmail.com')
    expect(screen.getByRole('button', { name: CONTACT_COPY.copied })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(CONTACT_COPY.copiedAnnouncement)

    act(() => {
      vi.advanceTimersByTime(COPIED_DURATION_MS)
    })

    expect(screen.getByRole('button', { name: CONTACT_COPY.copy })).toBeInTheDocument()
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })

  it('no dice "Copiado" si el navegador no deja copiar', async () => {
    writeText.mockRejectedValue(new DOMException('Denegado', 'NotAllowedError'))
    render(<CopyEmailButton email="galpon.mates@gmail.com" />)

    await act(async () => {
      screen.getByRole('button', { name: CONTACT_COPY.copy }).click()
      await Promise.resolve()
    })

    expect(screen.getByRole('button', { name: CONTACT_COPY.copy })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: CONTACT_COPY.copied })).toBeNull()
  })
})
