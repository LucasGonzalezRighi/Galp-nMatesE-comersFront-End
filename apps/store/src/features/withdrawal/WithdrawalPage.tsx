import type { ReactNode } from 'react'
import { Reveal } from '@/components/motion'
import { WITHDRAWAL_COPY } from './withdrawal.copy'
import { WithdrawalForm } from './WithdrawalForm'

/**
 * Página `/arrepentimiento` (spec 9.6): explica en qué consiste el botón de arrepentimiento y
 * muestra el formulario, que no exige número de pedido ni registro.
 */
export function WithdrawalPage(): ReactNode {
  return (
    <main className="site-container flex flex-wrap items-start gap-x-[72px] gap-y-12 pt-[clamp(48px,7vw,96px)] pb-[clamp(72px,9vw,120px)]">
      <div className="flex min-w-0 flex-[1_1_380px] flex-col gap-[22px]">
        <span className="text-accent before:bg-accent flex items-center gap-3 text-[12px] tracking-[0.14em] uppercase before:h-px before:w-7 before:content-['']">
          {WITHDRAWAL_COPY.eyebrow}
        </span>
        <h1 className="text-[clamp(36px,4.4vw,64px)] leading-none tracking-[-0.035em]">
          <Reveal kind="rise" as="span">
            {WITHDRAWAL_COPY.title}
          </Reveal>
        </h1>
        <Reveal
          as="p"
          delay={120}
          className="max-w-[44ch] text-[16px] leading-[1.65] text-neutral-300"
        >
          {WITHDRAWAL_COPY.intro}
        </Reveal>
        <Reveal delay={220}>
          <ul className="m-0 flex max-w-[52ch] list-none flex-col gap-3 p-0 text-[14px] leading-[1.6] text-neutral-400">
            {WITHDRAWAL_COPY.notes.map((note) => (
              <li key={note} className="before:text-accent before:mr-2 before:content-['—']">
                {note}
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
      <Reveal delay={200} className="min-w-0 flex-[1_1_420px]">
        <WithdrawalForm />
      </Reveal>
    </main>
  )
}
