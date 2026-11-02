import type { CSSProperties, ReactNode } from 'react'
import { EnvelopeIcon } from '@phosphor-icons/react/dist/ssr/Envelope'
import Link from 'next/link'
import type { Category, FooterContent, PublicSettings } from '@galpon/api-client'
import { asRoute } from '../../lib/routes'
import { Tag } from '../ui'
import { FooterRise, FooterRow } from './FooterRise'
import { FooterWordmark } from './FooterWordmark'
import { FooterYear } from './FooterYear'
import { LAYOUT_COPY } from './layout.copy'
import { Wordmark } from './Wordmark'
import './footer.css'

/** Línea superior con los extremos desvanecidos. */
const DIVIDER_STYLE: CSSProperties = {
  background:
    'linear-gradient(to right, transparent, var(--color-divider) 48px, var(--color-divider) calc(100% - 48px), transparent)',
}

/** Degradé del logo grande del final: apenas visible arriba y transparente abajo. */
const GHOST_WORDMARK_STYLE: CSSProperties = {
  background:
    'linear-gradient(180deg, color-mix(in srgb, var(--color-foreground) 16%, transparent), transparent 90%)',
}

/** Degradé de la palabra iluminada: cobre abajo y crema arriba. */
const LIT_WORDMARK_STYLE: CSSProperties = {
  background: 'linear-gradient(0deg, var(--color-accent-300), var(--color-cream))',
}

/** Estilo de los links de las columnas. */
const COLUMN_LINK = 'text-neutral-300 hover:text-foreground no-underline'

/** Estilo de los títulos de las columnas. */
const COLUMN_TITLE = 'text-[11px] tracking-[0.12em] text-neutral-500 uppercase'

/**
 * Da formato al CUIT para mostrarlo: `30712345671` queda `30-71234567-1`.
 *
 * @param cuit - CUIT de 11 dígitos pegados, como lo guarda el ajuste.
 * @returns El CUIT con guiones; si no son 11 dígitos, el texto sin cambios.
 */
export function formatCuit(cuit: string): string {
  return /^\d{11}$/.test(cuit) ? `${cuit.slice(0, 2)}-${cuit.slice(2, 10)}-${cuit.slice(10)}` : cuit
}

/**
 * Arma las líneas de texto de los datos del vendedor (spec 14.6), dejando afuera los que todavía
 * no se cargaron: razón social, CUIT y condición fiscal; domicilio y teléfono; área y horario de
 * atención.
 *
 * @param seller - Datos del vendedor de los ajustes públicos.
 * @returns Una línea por grupo, con los datos separados por " · "; vacío si no hay ninguno.
 */
export function sellerLines(seller: PublicSettings['seller']): string[] {
  const groups: (string | null)[][] = [
    [
      seller.legalName,
      seller.cuit === null ? null : `${LAYOUT_COPY.cuit} ${formatCuit(seller.cuit)}`,
      seller.taxCondition,
    ],
    [seller.address, seller.phone],
    [seller.supportArea, seller.supportHours],
  ]
  return groups
    .map((group) =>
      group.filter((part): part is string => part !== null && part !== '').join(' · '),
    )
    .filter((line) => line !== '')
}

/** Props de {@link FooterView}. */
export interface FooterViewProps {
  /** Textos del pie (`FooterContent`). */
  content: FooterContent
  /** Ajustes públicos: mail de contacto y datos del vendedor. */
  settings: PublicSettings
  /** Líneas de producto, para la columna "Tienda". */
  categories: readonly Category[]
}

/**
 * Pie de página (spec 9.5, 9.6 y 14.6): frase, bajada y mail; columnas Tienda (las líneas), Ayuda
 * (con el "Botón de arrepentimiento" destacado), Galpón y Legales; datos del vendedor y link a
 * Data Fiscal; "© año Galpón Mates", medios de pago y, 64 px más abajo (la bombilla del logo no
 * toca los medios de pago), el logo grande con recorte, que se ilumina de abajo hacia arriba
 * ({@link FooterWordmark}).
 *
 * En el inicio, en escritorio y con movimiento, el pie sube por encima de las reseñas quietas como
 * el del portafolio de Lucas ({@link FooterRise} y `footer.css`): borde de arriba en diagonal con
 * una línea fina, vidrio esmerilado, las filas ({@link FooterRow}) que entran en cascada pegadas
 * al scroll y GALPÓN al final, que sube en ola (20 franjas verticales, 12 en el celular). En las
 * demás páginas es sutil y va al final, en el flujo (Ruling MR-28): sus filas entran con un fundido
 * al llegar a la pantalla, GALPÓN va apagada y sube en ola al entrar. En todas, la palabra queda
 * cortada a la mitad de sus letras por el final de la página (Ruling MR-21).
 *
 * @param props - Ver {@link FooterViewProps}.
 */
export function FooterView({ content, settings, categories }: FooterViewProps): ReactNode {
  const seller = sellerLines(settings.seller)
  const dataFiscalUrl = settings.seller.dataFiscalUrl
  return (
    <FooterRise className="site-footer relative overflow-clip pt-[72px]">
      {/* La línea fina que sigue el borde en diagonal: solo con el pie que sube (`footer.css`). */}
      <div aria-hidden="true" className="site-footer-line" />
      <div className="site-container flex flex-col">
        <div className="site-footer-divider mb-14 h-px" style={DIVIDER_STYLE} />
        {/*
         * Desde 1280 px los links arrancan al 40 % del contenedor (Ruling MR-23, Lucas: "más al
         * centro, hacia la izquierda"), o a 360 + 96 px si el 40 % queda más cerca de la frase.
         * Entre 1024 y 1280 px la columna de los links mide lo que piden (arranca antes del 40 %)
         * y la frase se angosta, así los cuatro grupos siguen en una fila.
         */}
        <div className="flex flex-wrap justify-between gap-x-16 gap-y-10 lg:grid lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-x-12 xl:grid-cols-[max(40%,456px)_minmax(0,1fr)] xl:gap-x-0">
          <FooterRow index={0} className="flex max-w-[360px] flex-[1_1_260px] flex-col gap-[14px]">
            <p className="text-[24px] tracking-[-0.02em]">{content.tagline}</p>
            <p className="text-[14px] text-neutral-400">{content.text}</p>
            <a
              href={`mailto:${settings.contactEmail}`}
              className="text-accent-300 hover:text-accent-200 inline-flex items-center gap-2 text-[14px] no-underline"
            >
              <EnvelopeIcon size={16} aria-hidden="true" />
              {settings.contactEmail}
            </a>
          </FooterRow>
          {/*
           * Los cuatro grupos de links son una fila desde 1024 px: entran de izquierda a derecha,
           * sin saltar de fila. Suman ~560 px; el aire entre grupos va de 24 px (hasta 1250 px) a
           * 48 px (desde ~1370 px): a 1280 px la columna mide 655 px y con 48 px LEGALES caía abajo.
           */}
          <div className="flex flex-wrap gap-x-12 gap-y-10 text-[14px] lg:flex-nowrap lg:gap-x-[clamp(24px,20vw_-_226px,48px)]">
            <FooterRow index={1}>
              <nav aria-label={LAYOUT_COPY.footerShop} className="flex flex-col gap-[10px]">
                <span className={COLUMN_TITLE}>{LAYOUT_COPY.footerShop}</span>
                {categories.map((category) => (
                  <Link
                    key={category.id}
                    href={asRoute(`/tienda/${category.slug}`)}
                    className={COLUMN_LINK}
                  >
                    {category.name}
                  </Link>
                ))}
              </nav>
            </FooterRow>
            <FooterRow index={1.25}>
              <nav aria-label={LAYOUT_COPY.footerHelp} className="flex flex-col gap-[10px]">
                <span className={COLUMN_TITLE}>{LAYOUT_COPY.footerHelp}</span>
                <Link href={asRoute('/preguntas-frecuentes')} className={COLUMN_LINK}>
                  {LAYOUT_COPY.faq}
                </Link>
                <Link href={asRoute('/preguntas-frecuentes#envios')} className={COLUMN_LINK}>
                  {LAYOUT_COPY.shipping}
                </Link>
                <Link href={asRoute('/preguntas-frecuentes#cambios')} className={COLUMN_LINK}>
                  {LAYOUT_COPY.returns}
                </Link>
                <Link href={asRoute('/contacto')} className={COLUMN_LINK}>
                  {LAYOUT_COPY.contact}
                </Link>
                <Link
                  href={asRoute('/arrepentimiento')}
                  className="text-accent hover:text-accent-300 no-underline"
                >
                  {LAYOUT_COPY.withdrawal}
                </Link>
              </nav>
            </FooterRow>
            <FooterRow index={1.5}>
              <nav aria-label={LAYOUT_COPY.footerSite} className="flex flex-col gap-[10px]">
                <span className={COLUMN_TITLE}>{LAYOUT_COPY.footerSite}</span>
                <Link href={asRoute('/nosotros')} className={COLUMN_LINK}>
                  {LAYOUT_COPY.about}
                </Link>
                <Link href={asRoute('/kit')} className={COLUMN_LINK}>
                  {LAYOUT_COPY.kit}
                </Link>
                <Link href={asRoute('/tienda')} className={COLUMN_LINK}>
                  {LAYOUT_COPY.catalog}
                </Link>
              </nav>
            </FooterRow>
            <FooterRow index={1.75}>
              <nav aria-label={LAYOUT_COPY.footerLegal} className="flex flex-col gap-[10px]">
                <span className={COLUMN_TITLE}>{LAYOUT_COPY.footerLegal}</span>
                <Link href={asRoute('/terminos')} className={COLUMN_LINK}>
                  {LAYOUT_COPY.terms}
                </Link>
                <Link href={asRoute('/privacidad')} className={COLUMN_LINK}>
                  {LAYOUT_COPY.privacy}
                </Link>
                {content.consumerDefenseUrl === null ? null : (
                  <a
                    href={content.consumerDefenseUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={COLUMN_LINK}
                  >
                    {LAYOUT_COPY.consumerDefense}
                  </a>
                )}
              </nav>
            </FooterRow>
          </div>
        </div>
        {seller.length === 0 && dataFiscalUrl === null ? null : (
          <FooterRow
            index={2}
            className="mt-12 flex flex-col gap-1 text-[12px] leading-[1.6] text-neutral-500"
          >
            {seller.map((line) => (
              <p key={line}>{line}</p>
            ))}
            {dataFiscalUrl === null ? null : (
              <a
                href={dataFiscalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent-300 hover:text-accent-200 self-start no-underline"
              >
                {LAYOUT_COPY.dataFiscal}
              </a>
            )}
          </FooterRow>
        )}
        <FooterRow
          index={3}
          className="relative z-20 flex flex-wrap items-center justify-between gap-[14px] pt-14 text-[12px] text-neutral-500"
        >
          <span>
            © <FooterYear /> {LAYOUT_COPY.brand}
          </span>
          {content.paymentMethods.length === 0 ? null : (
            <div className="flex flex-wrap items-center gap-[6px]">
              <span className="mr-1">{LAYOUT_COPY.paymentsWith}</span>
              {content.paymentMethods.map((method) => (
                <Tag key={method}>{method}</Tag>
              ))}
            </div>
          )}
        </FooterRow>
        {/* 64 px de aire: la bombilla del logo no toca los medios de pago. */}
        <FooterWordmark
          className="pointer-events-none z-10 mt-16 w-full"
          ghost={<Wordmark anchor="bottom" className="w-full" style={GHOST_WORDMARK_STYLE} />}
          lit={<Wordmark anchor="bottom" className="w-full" style={LIT_WORDMARK_STYLE} />}
        />
      </div>
    </FooterRise>
  )
}
