import type { ReactNode } from 'react'
import { Suspense } from 'react'
import { Reveal } from '@/components/motion'
import { ACCOUNT_COPY } from './account.copy'
import { AccountNav } from './AccountNav'
import { ForgotPasswordForm } from './ForgotPasswordForm'
import { LoginForm } from './LoginForm'
import { RegisterForm } from './RegisterForm'
import { ResetPasswordForm } from './ResetPasswordForm'

/** Márgenes de las páginas de la cuenta, los mismos de Contacto y Arrepentimiento. */
const PAGE =
  'mx-auto max-w-[1280px] px-[clamp(20px,5vw,64px)] pt-[clamp(48px,7vw,96px)] pb-[clamp(72px,9vw,120px)]'

/** Rótulo en cobre con la línea, sobre los títulos. */
const EYEBROW =
  "text-accent before:bg-accent flex items-center gap-3 text-[12px] tracking-[0.14em] uppercase before:h-px before:w-7 before:content-['']"

/** Props de {@link Bone}. */
interface BoneProps {
  /** Medidas del bloque. */
  className: string
}

/** Bloque gris que ocupa el lugar de algo que todavía se carga. */
function Bone({ className }: BoneProps): ReactNode {
  return <div className={`rounded-md bg-neutral-800 motion-safe:animate-pulse ${className}`} />
}

/**
 * Esqueleto de una página del área del cliente mientras se cargan sus datos (spec 9.7, "Cuenta:
 * esqueleto"). Es el `fallback` del `<Suspense>` de cada página.
 */
export function AccountSkeleton(): ReactNode {
  return (
    <div aria-hidden="true" className="flex flex-col gap-5">
      <Bone className="h-10 w-[min(320px,80%)]" />
      <Bone className="h-4 w-[min(420px,90%)]" />
      <Bone className="h-28 w-full" />
      <Bone className="h-28 w-full" />
    </div>
  )
}

/** Esqueleto de un formulario de acceso, mientras se lee la dirección. */
function FormSkeleton(): ReactNode {
  return (
    <div aria-hidden="true" className="bg-surface flex flex-col gap-4 rounded-lg p-8 shadow-sm">
      <Bone className="h-11 w-full" />
      <Bone className="h-11 w-full" />
      <Bone className="h-12 w-full" />
    </div>
  )
}

/** Props de {@link AuthShell}. */
interface AuthShellProps {
  /** Título de la página. */
  title: string
  /** Bajada bajo el título. */
  intro: string
  /** El formulario. */
  children: ReactNode
}

/** Página de acceso: título y bajada a la izquierda, formulario a la derecha (apilados en el celular). */
function AuthShell({ title, intro, children }: AuthShellProps): ReactNode {
  return (
    <main className={`${PAGE} flex flex-wrap items-start gap-x-[72px] gap-y-10`}>
      <div className="flex min-w-0 flex-[1_1_340px] flex-col gap-[22px]">
        <span className={EYEBROW}>{ACCOUNT_COPY.eyebrow}</span>
        <h1 className="text-[clamp(36px,4.4vw,64px)] leading-none tracking-[-0.035em]">
          <Reveal kind="rise" as="span">
            {title}
          </Reveal>
        </h1>
        <Reveal
          as="p"
          delay={120}
          className="max-w-[40ch] text-[16px] leading-[1.65] text-neutral-300"
        >
          {intro}
        </Reveal>
      </div>
      <div className="min-w-0 flex-[1_1_380px] lg:max-w-[480px]">
        <Suspense fallback={<FormSkeleton />}>{children}</Suspense>
      </div>
    </main>
  )
}

/** Página `/cuenta/ingresar`. */
export function LoginPage(): ReactNode {
  return (
    <AuthShell title={ACCOUNT_COPY.login.title} intro={ACCOUNT_COPY.login.intro}>
      <LoginForm />
    </AuthShell>
  )
}

/** Página `/cuenta/registro`. */
export function RegisterPage(): ReactNode {
  return (
    <AuthShell title={ACCOUNT_COPY.register.title} intro={ACCOUNT_COPY.register.intro}>
      <RegisterForm />
    </AuthShell>
  )
}

/** Página `/cuenta/recuperar`. */
export function ForgotPasswordPage(): ReactNode {
  return (
    <AuthShell title={ACCOUNT_COPY.forgot.title} intro={ACCOUNT_COPY.forgot.intro}>
      <ForgotPasswordForm />
    </AuthShell>
  )
}

/** Página `/cuenta/restablecer` (el código llega en `?token=`). */
export function ResetPasswordPage(): ReactNode {
  return (
    <AuthShell title={ACCOUNT_COPY.reset.title} intro={ACCOUNT_COPY.reset.intro}>
      <ResetPasswordForm />
    </AuthShell>
  )
}

/** Props de {@link AccountLayout}. */
export interface AccountLayoutProps {
  /** La página de la sección. */
  children: ReactNode
}

/**
 * Marco del área del cliente (`/cuenta`, pedidos y direcciones): el rótulo "Tu cuenta" y la
 * navegación a un costado (arriba en el celular) y la página de la sección.
 *
 * @param props - Ver {@link AccountLayoutProps}.
 */
export function AccountLayout({ children }: AccountLayoutProps): ReactNode {
  return (
    <main className={`${PAGE} flex flex-col gap-8 lg:flex-row lg:gap-16`}>
      <aside className="flex flex-col gap-4 lg:w-[200px] lg:flex-none">
        <span className={EYEBROW}>{ACCOUNT_COPY.eyebrow}</span>
        <AccountNav />
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </main>
  )
}
