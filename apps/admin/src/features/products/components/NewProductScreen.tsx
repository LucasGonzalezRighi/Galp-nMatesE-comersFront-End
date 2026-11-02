import type { ReactNode } from 'react'
import { PageHeader } from '../../../components/ui/PageHeader'
import { PRODUCT_FORM_COPY } from '../products.copy'
import { ProductForm } from './ProductForm'

/** Enlace "Productos" del encabezado. */
const BACK = { to: '/productos', label: PRODUCT_FORM_COPY.back } as const

/**
 * Pantalla `/productos/nuevo`: "Nuevo producto" con el formulario vacío. Al crear, avisa
 * "Producto creado." y lleva a la ficha del producto (`/productos/$id`).
 */
export function NewProductScreen(): ReactNode {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={PRODUCT_FORM_COPY.newTitle} back={BACK} />
      <ProductForm product={null} />
    </div>
  )
}
