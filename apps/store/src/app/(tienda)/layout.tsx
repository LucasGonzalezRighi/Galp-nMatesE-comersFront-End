import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import Image from 'next/image'
import { Suspense } from 'react'
import { Footer, Header, TopBar } from '@/components/layout'
import { PageCurtain, PageEnter } from '@/components/motion'
import { cx } from '@/components/ui/cx'
import { CartDrawer, CartHydrator } from '@/features/cart'
import { SearchModal } from '@/features/search'
import { Toaster } from '@/features/toast'
import { inter } from '../fonts'
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
 * del cliente, barra superior de arrepentimiento, encabezado, la página (que entra con
 * `PageEnter`), pie, cortina entre secciones, panel del carrito, avisos e hidratación del carrito.
 * El simulador de Mercado Pago tiene su propio root layout, sin nada de esto (`(simulador)`).
 *
 * @param props - Ver {@link RootLayoutProps}.
 */
export default function RootLayout({ children }: RootLayoutProps): ReactNode {
  return (
    <html lang="es-AR" className={inter.variable}>
      <body>
        <Providers>
          <div className={cx('relative min-h-screen overflow-x-clip text-pretty', PAGE_BACKGROUND)}>
            <TopBar />
            <Header />
            <PageEnter>{children}</PageEnter>
            <Footer />
          </div>
          {/* La cortina lee el pathname: con Cache Components va dentro de un Suspense. */}
          <Suspense fallback={null}>
            <PageCurtain>
              <Image
                src="/brand/galpon-mark.png"
                alt=""
                width={64}
                height={85}
                className="h-auto w-[64px] opacity-90"
              />
            </PageCurtain>
          </Suspense>
          <CartDrawer />
          <Toaster />
          <SearchModal />
          <CartHydrator />
        </Providers>
      </body>
    </html>
  )
}
