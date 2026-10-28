import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { SortableItemHelpers } from './SortableList'
import { SortableList } from './SortableList'

interface Line {
  id: string
  name: string
}

const lines: Line[] = [
  { id: 'a', name: 'Mates' },
  { id: 'b', name: 'Bombillas' },
  { id: 'c', name: 'Yerbas' },
]

function renderLine(
  line: Line,
  { moveUp, moveDown, isFirst, isLast, dragHandle }: SortableItemHelpers,
) {
  return (
    <div>
      {dragHandle(`Arrastrar ${line.name}`)}
      <span>{line.name}</span>
      <button type="button" disabled={isFirst} onClick={moveUp}>
        {`Subir ${line.name}`}
      </button>
      <button type="button" disabled={isLast} onClick={moveDown}>
        {`Bajar ${line.name}`}
      </button>
    </div>
  )
}

/** La lista con los ítems que le pasa el test (el padre los cambia cuando el test quiere). */
function Lines({ items, onReorder }: { items: Line[]; onReorder: (items: Line[]) => void }) {
  return (
    <SortableList
      items={items}
      getKey={(line) => line.id}
      label="Líneas"
      onReorder={onReorder}
      renderItem={renderLine}
    />
  )
}

/** Padre que guarda el orden nuevo en el acto. */
function Harness({ onReorder }: { onReorder: (items: Line[]) => void }) {
  const [items, setItems] = useState(lines)
  return (
    <Lines
      items={items}
      onReorder={(next) => {
        onReorder(next)
        setItems(next)
      }}
    />
  )
}

function names(): string[] {
  const list = screen.getByRole('list', { name: 'Líneas' })
  return within(list)
    .getAllByRole('listitem')
    .map((item) => item.querySelector('span')?.textContent ?? '')
}

describe('SortableList', () => {
  it('dibuja cada ítem con su agarradera y sus límites', () => {
    render(<Harness onReorder={vi.fn()} />)

    expect(names()).toEqual(['Mates', 'Bombillas', 'Yerbas'])
    expect(screen.getByRole('button', { name: 'Arrastrar Mates' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Subir Mates' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Bajar Yerbas' })).toBeDisabled()
  })

  it('bajar mueve el ítem, llama a onReorder una vez y lo anuncia', async () => {
    const user = userEvent.setup()
    const onReorder = vi.fn()
    render(<Harness onReorder={onReorder} />)

    await user.click(screen.getByRole('button', { name: 'Bajar Mates' }))

    expect(names()).toEqual(['Bombillas', 'Mates', 'Yerbas'])
    expect(onReorder).toHaveBeenCalledTimes(1)
    expect(onReorder).toHaveBeenCalledWith([lines[1], lines[0], lines[2]])
    expect(screen.getByRole('status')).toHaveTextContent('Líneas: quedó en el lugar 2 de 3.')
  })

  it('subir mueve el ítem hacia arriba y lo anuncia', async () => {
    const user = userEvent.setup()
    const onReorder = vi.fn()
    render(<Harness onReorder={onReorder} />)

    await user.click(screen.getByRole('button', { name: 'Subir Yerbas' }))

    expect(names()).toEqual(['Mates', 'Yerbas', 'Bombillas'])
    expect(screen.getByRole('status')).toHaveTextContent('Líneas: quedó en el lugar 2 de 3.')
  })

  it('la agarradera mueve con las flechas del teclado', async () => {
    const user = userEvent.setup()
    const onReorder = vi.fn()
    render(<Harness onReorder={onReorder} />)

    screen.getByRole('button', { name: 'Arrastrar Bombillas' }).focus()
    await user.keyboard('{ArrowUp}')

    expect(names()).toEqual(['Bombillas', 'Mates', 'Yerbas'])
    expect(screen.getByRole('status')).toHaveTextContent('Líneas: quedó en el lugar 1 de 3.')
    expect(screen.getByRole('button', { name: 'Arrastrar Bombillas' })).toHaveFocus()
  })

  it('mover más allá de un borde no hace nada', async () => {
    const user = userEvent.setup()
    const onReorder = vi.fn()
    render(<Harness onReorder={onReorder} />)

    screen.getByRole('button', { name: 'Arrastrar Mates' }).focus()
    await user.keyboard('{ArrowUp}')

    expect(onReorder).not.toHaveBeenCalled()
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })

  it('conserva el orden nuevo hasta que el padre cambia items, aunque tarde', async () => {
    const user = userEvent.setup()
    const onReorder = vi.fn()
    const { rerender } = render(<Lines items={lines} onReorder={onReorder} />)

    await user.click(screen.getByRole('button', { name: 'Bajar Mates' }))
    // El padre todavía no pasó el orden nuevo (por ejemplo, espera a `cancelQueries`).
    expect(onReorder).toHaveBeenCalledWith([lines[1], lines[0], lines[2]])
    expect(names()).toEqual(['Bombillas', 'Mates', 'Yerbas'])
    rerender(<Lines items={[...lines]} onReorder={onReorder} />)
    expect(names()).toEqual(['Bombillas', 'Mates', 'Yerbas'])

    const reordered = [lines[1], lines[0], lines[2]].filter((line) => line !== undefined)
    rerender(<Lines items={reordered} onReorder={onReorder} />)
    expect(names()).toEqual(['Bombillas', 'Mates', 'Yerbas'])

    // Si después el padre vuelve atrás (falló el guardado), manda otra vez `items`.
    rerender(<Lines items={lines} onReorder={onReorder} />)
    expect(names()).toEqual(['Mates', 'Bombillas', 'Yerbas'])
  })

  it('si dos anuncios seguidos dicen lo mismo, el DOM cambia para que el lector lo repita', async () => {
    const user = userEvent.setup()
    render(<Harness onReorder={vi.fn()} />)
    const status = screen.getByRole('status')

    await user.click(screen.getByRole('button', { name: 'Bajar Mates' }))
    expect(status.textContent).toBe('Líneas: quedó en el lugar 2 de 3.')

    await user.click(screen.getByRole('button', { name: 'Subir Yerbas' }))
    expect(names()).toEqual(['Bombillas', 'Yerbas', 'Mates'])
    expect(status.textContent).toBe('Líneas: quedó en el lugar 2 de 3. ')

    await user.click(screen.getByRole('button', { name: 'Bajar Bombillas' }))
    expect(names()).toEqual(['Yerbas', 'Bombillas', 'Mates'])
    expect(status.textContent).toBe('Líneas: quedó en el lugar 2 de 3.')
  })
})
