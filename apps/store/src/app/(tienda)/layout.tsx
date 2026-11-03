import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import { Footer, Header } from '@/components/layout'
import { PageEnter } from '@/components/motion'
import { cx } from '@/components/ui/cx'
import { CartDrawer, CartHydrator } from '@/features/cart'
import { PageTransitionProvider } from '@/features/intro'
import { SearchModal } from '@/features/search'
import { Toaster } from '@/features/toast'
import { manrope } from '../fonts'
import '../globals.css'
import { Providers } from '../providers'
import { PAGE_BACKGROUND, SITE_METADATA, SITE_VIEWPORT } from '../site-shell'

/** Título, descripción y `metadataBase` comunes (ver {@link SITE_METADATA}). */
export const metadata: Metadata = SITE_METADATA

/** Color de la barra del navegador en el celular (ver {@link SITE_VIEWPORT}). */
export const viewport: Viewport = SITE_VIEWPORT

/** Props de {@link RootLayout}. */
interface RootLayoutProps {
  /** La página que se está mostrando. */
  children: ReactNode
}

/**
 * Root layout de la tienda, el grupo `(tienda)` (spec 9.5): idioma, tipografía, proveedores
 * del cliente, encabezado, la página (que entra con `PageEnter`), pie (con el "Botón de
 * arrepentimiento": sin barra arriba desde el 2026-11-03, Ruling IC-1), panel del carrito, avisos
 * e hidratación del carrito. Todo va dentro de `PageTransitionProvider` (Ruling MR-29): la intro
 * del inicio y el telón que baja al cambiar de sección desde el menú y se abre como un libro.
 * El simulador de Mercado Pago tiene su propio root layout, sin nada de esto (`(simulador)`).
 *
 * @param props - Ver {@link RootLayoutProps}.
 */
export default function RootLayout({ children }: RootLayoutProps): ReactNode {
  return (
    <html lang="es-AR" className={manrope.variable}>
      <body>
        <Providers>
          <PageTransitionProvider>
            <div
              className={cx('relative min-h-screen overflow-x-clip text-pretty', PAGE_BACKGROUND)}
            >
              <Header />
              <PageEnter>{children}</PageEnter>
              <Footer />
            </div>
            <CartDrawer />
            <Toaster />
            <SearchModal />
            <CartHydrator />
          </PageTransitionProvider>
        </Providers>
      </body>
    </html>
  )
}
