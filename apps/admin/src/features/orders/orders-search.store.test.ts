import { afterEach, describe, expect, it } from 'vitest'
import { resetOrdersSearch, useOrdersSearchStore } from './orders-search.store'

afterEach(() => {
  useOrdersSearchStore.setState({ text: '' })
})

describe('resetOrdersSearch', () => {
  it('vacía el texto de la búsqueda', () => {
    useOrdersSearchStore.getState().setText('lucia.perez@example.com')

    resetOrdersSearch()

    expect(useOrdersSearchStore.getState().text).toBe('')
  })
})
