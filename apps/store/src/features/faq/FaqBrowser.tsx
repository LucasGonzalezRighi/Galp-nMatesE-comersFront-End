'use client'

import type { ReactNode } from 'react'
import { PlusIcon } from '@phosphor-icons/react/Plus'
import Link from 'next/link'
import { useCallback, useEffect, useId, useState } from 'react'
import type { FaqContent } from '@galpon/api-client'
import { Reveal } from '@/components/motion'
import { Button } from '@/components/ui'
import { cx } from '@/components/ui/cx'
import { asRoute } from '@/lib/routes'
import { faqCategoryFromHash } from './faq-hash'
import { FAQ_COPY } from './faq.copy'

/** Props de {@link FaqBrowser}. */
export interface FaqBrowserProps {
  /** Categorías de preguntas, en el orden en que se muestran. */
  categories: FaqContent['categories']
}

/** Línea fina que se desvanece en los extremos, bajo cada pregunta. */
const ITEM_DIVIDER =
  'bg-[linear-gradient(to_right,transparent,var(--color-neutral-800)_48px,var(--color-neutral-800)_calc(100%-48px),transparent)] bg-[length:100%_1px] bg-bottom bg-no-repeat'

/** Número de una pregunta con dos dígitos ("01"). */
function questionNumber(index: number): string {
  return String(index + 1).padStart(2, '0')
}

/**
 * Categorías y acordeón de preguntas (spec 9.5). Muestra una categoría por vez, con la primera
 * pregunta abierta; el ancla de la dirección (`#envios`) y los links que apuntan a ella la
 * eligen. El acordeón abre una pregunta por vez y anima la altura con `grid-template-rows`.
 *
 * @param props - Ver {@link FaqBrowserProps}.
 */
export function FaqBrowser({ categories }: FaqBrowserProps): ReactNode {
  const baseId = useId()
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '')
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  const selectCategory = useCallback((id: string) => {
    setCategoryId(id)
    setOpenIndex(0)
  }, [])

  useEffect(() => {
    const applyHash = (hash: string): void => {
      const id = faqCategoryFromHash(hash, categories)
      if (id !== null) selectCategory(id)
    }
    applyHash(window.location.hash)
    const onHashChange = (): void => {
      applyHash(window.location.hash)
    }
    // Un link a otra categoría de esta misma página (el del pie, el de Contacto) cambia la
    // dirección con `history.pushState`, que no dispara `hashchange`: se mira el link que se tocó.
    const onClick = (event: MouseEvent): void => {
      if (!(event.target instanceof Element)) return
      const href = event.target.closest('a[href]')?.getAttribute('href')
      if (href === undefined || href === null) return
      const url = new URL(href, window.location.href)
      if (url.origin === window.location.origin && url.pathname === window.location.pathname) {
        applyHash(url.hash)
      }
    }
    window.addEventListener('hashchange', onHashChange)
    document.addEventListener('click', onClick, true)
    return () => {
      window.removeEventListener('hashchange', onHashChange)
      document.removeEventListener('click', onClick, true)
    }
  }, [categories, selectCategory])

  const category = categories.find((candidate) => candidate.id === categoryId) ?? categories[0]

  return (
    <section className="site-container flex flex-wrap items-start gap-x-16 gap-y-8 pb-[clamp(72px,9vw,120px)]">
      {category === undefined ? null : (
        <div
          role="group"
          aria-label={FAQ_COPY.categories}
          className="flex flex-[0_1_260px] flex-wrap gap-2 min-[820px]:sticky min-[820px]:top-[88px]"
        >
          {categories.map((candidate) => {
            const selected = candidate.id === category.id
            return (
              <button
                key={candidate.id}
                type="button"
                id={candidate.id}
                aria-pressed={selected}
                onClick={() => {
                  selectCategory(candidate.id)
                }}
                className={cx(
                  'inline-flex h-9 cursor-pointer scroll-mt-24 items-center gap-2 rounded-full border px-[14px] text-[13px] transition-all duration-[350ms] motion-reduce:transition-none',
                  selected
                    ? 'text-accent-200 border-accent bg-accent/14'
                    : 'border-neutral-800 text-neutral-300 hover:border-neutral-700',
                )}
              >
                {candidate.label}
              </button>
            )
          })}
        </div>
      )}
      <div className="flex min-w-0 flex-[1_1_480px] flex-col">
        {category === undefined ? null : (
          <>
            <h2 className="mb-3 text-[28px] tracking-[-0.02em]">{category.label}</h2>
            <ul className="m-0 flex list-none flex-col p-0">
              {category.items.map((item, index) => {
                const open = openIndex === index
                const questionId = `${baseId}-${category.id}-q-${String(index)}`
                const answerId = `${baseId}-${category.id}-a-${String(index)}`
                return (
                  <Reveal as="li" key={`${category.id}-${String(index)}`} className={ITEM_DIVIDER}>
                    <h3 className="m-0 text-[18px] font-normal">
                      <button
                        type="button"
                        id={questionId}
                        aria-expanded={open}
                        aria-controls={answerId}
                        onClick={() => {
                          setOpenIndex(open ? null : index)
                        }}
                        className={cx(
                          'flex w-full cursor-pointer items-center gap-[18px] py-[22px] text-left tracking-[-0.01em] transition-colors duration-300 motion-reduce:transition-none',
                          open ? 'text-foreground' : 'text-neutral-200',
                        )}
                      >
                        <span className="text-accent text-[12px] tabular-nums">
                          {questionNumber(index)}
                        </span>
                        <span className="flex-1">{item.question}</span>
                        <span
                          aria-hidden="true"
                          className={cx(
                            'ease-spring grid size-8 flex-none place-items-center rounded-full shadow-[inset_0_0_0_1px_var(--color-neutral-700)] transition-transform duration-500 motion-reduce:transition-none',
                            open ? 'rotate-45' : 'rotate-0',
                          )}
                        >
                          <PlusIcon size={14} />
                        </span>
                      </button>
                    </h3>
                    <div
                      id={answerId}
                      role="region"
                      aria-labelledby={questionId}
                      inert={!open}
                      className={cx(
                        'ease-main grid transition-[grid-template-rows] duration-[550ms] motion-reduce:transition-none',
                        open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
                      )}
                    >
                      <div className="overflow-hidden">
                        <p
                          className={cx(
                            'm-0 max-w-[75ch] pr-[50px] pb-6 pl-[34px] text-[15.5px] leading-[1.7] text-neutral-300 transition-opacity duration-500 motion-reduce:transition-none',
                            open ? 'opacity-100' : 'opacity-0',
                          )}
                        >
                          {item.answer}
                        </p>
                      </div>
                    </div>
                  </Reveal>
                )
              })}
            </ul>
          </>
        )}
        <Reveal className="mt-12 flex flex-wrap items-center justify-between gap-4">
          <span className="text-[18px]">{FAQ_COPY.notFound}</span>
          <Button asChild size="lg">
            <Link href={asRoute('/contacto')}>{FAQ_COPY.contact}</Link>
          </Button>
        </Reveal>
      </div>
    </section>
  )
}
