import type { ReactNode } from 'react'
import { Tabs as RadixTabs } from 'radix-ui'

/** Una pestaña de {@link Tabs}. */
export interface TabItem {
  /** Valor que identifica la pestaña (el que recibe `onValueChange`). */
  value: string
  /** Texto visible. */
  label: string
  /** Cantidad que se muestra al lado del texto (por ejemplo, reseñas pendientes). */
  count?: number
}

/** Props de {@link Tabs}. */
export interface TabsProps {
  /** Pestaña elegida (controlado). */
  value: string
  /** Se llama al elegir otra pestaña; el valor no cambia hasta que quien lo usa lo pase. */
  onValueChange: (value: string) => void
  /** Nombre accesible de la lista de pestañas, por ejemplo "Estado de las reseñas". */
  label: string
  /** Pestañas, en orden. */
  items: readonly TabItem[]
  /**
   * Contenido de la pestaña elegida (su `tabpanel`). Sin él, el panel se dibuja igual, vacío, para
   * que el `aria-controls` de las pestañas apunte a un elemento que existe.
   */
  children?: ReactNode
}

/**
 * Pestañas controladas sobre Radix `Tabs`: se recorren con las flechas, la elegida lleva un
 * filete `accent` abajo y cada una puede mostrar un número. El panel (`tabpanel`) siempre está,
 * vacío si no hay `children`, porque cada pestaña lo nombra en `aria-controls`.
 *
 * @param props - Ver {@link TabsProps}.
 * @throws {RangeError} Si no hay pestañas, `value` no es una de ellas o algún `count` no es un
 *   entero mayor o igual a 0.
 * @example
 * <Tabs value={tab} onValueChange={setTab} label="Estado de las reseñas" items={tabs}>
 *   <ReviewList status={tab} />
 * </Tabs>
 */
export function Tabs({ value, onValueChange, label, items, children }: TabsProps): ReactNode {
  if (!items.some((item) => item.value === value)) {
    throw new RangeError(`La pestaña elegida "${value}" no está entre las pestañas de "${label}".`)
  }
  for (const item of items) {
    if (item.count !== undefined && (!Number.isInteger(item.count) || item.count < 0)) {
      throw new RangeError(
        `El número de la pestaña "${item.label}" tiene que ser un entero mayor o igual a 0; se recibió ${String(item.count)}.`,
      )
    }
  }
  return (
    <RadixTabs.Root value={value} onValueChange={onValueChange} className="flex flex-col gap-4">
      <RadixTabs.List
        aria-label={label}
        className="border-divider flex gap-1 overflow-x-auto border-b"
      >
        {items.map((item) => (
          <RadixTabs.Trigger
            key={item.value}
            value={item.value}
            className="hover:text-foreground focus-visible:outline-accent data-[state=active]:border-accent data-[state=active]:text-foreground -mb-px inline-flex min-h-9 shrink-0 cursor-pointer items-center gap-2 border-b-2 border-transparent px-3 py-2 text-sm font-medium text-neutral-400 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 motion-reduce:transition-none"
          >
            {item.label}
            {item.count !== undefined && (
              <>
                {' '}
                <span className="rounded-tag bg-foreground/10 px-1.5 py-0.5 text-[11px] leading-none tabular-nums">
                  {item.count}
                </span>
              </>
            )}
          </RadixTabs.Trigger>
        ))}
      </RadixTabs.List>
      <RadixTabs.Content value={value} className="outline-none">
        {children}
      </RadixTabs.Content>
    </RadixTabs.Root>
  )
}
