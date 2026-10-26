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
import { inter } from './fonts'
import './globals.css'
import { Providers } from './providers'

/** Título (con plantilla "· Galpón Mates") y descripción por omisión de todas las páginas. */
export const metadata: Metadata = {
  title: { default: 'Galpón Mates', template: '%s · Galpón Mates' },
  description: 'Mates, bombillones y yerba con envío a todo el país.',
}

/** Color de la barra del navegador en el celular, el del fondo de la tienda. */
export const viewport: Viewport = {
  themeColor: '#1a1210',
}

/** Props de {@link RootLayout}. */
interface RootLayoutProps {
  /** La página que se está mostrando. */
  children: ReactNode
}

/** Fondo de la tienda (el del diseño): un resplandor cobrizo arriba a la derecha sobre el fondo liso. */
const PAGE_BACKGROUND =
  'bg-background bg-[radial-gradient(1200px_720px_at_82%_-160px,color-mix(in_srgb,var(--color-accent-900)_75%,transparent),transparent_60%)]'

/**
 * Estructura común de todas las páginas de la tienda (spec 9.5): idioma, tipografía, proveedores
 * del cliente, barra superior de arrepentimiento, encabezado, la página (que entra con
 * `PageEnter`), pie, cortina entre secciones, panel del carrito, avisos e hidratación del carrito.
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
