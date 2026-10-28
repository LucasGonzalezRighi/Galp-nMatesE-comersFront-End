import type { ReactNode } from 'react'
import { useEffect } from 'react'
import type { LoginFormProps } from './LoginForm'
import { UI_COPY } from '../../../components/ui/ui.copy'
import { AUTH_COPY } from '../auth.copy'
import { LoginForm } from './LoginForm'

/** Props de {@link LoginScreen}. */
export interface LoginScreenProps {
  /** Se llama con la sesión recién abierta; la ruta la guarda y navega. */
  onSuccess: LoginFormProps['onSuccess']
}

/**
 * Pantalla de ingreso (`/login`): "Galpón Mates", "Ingresá para administrar la tienda." y el
 * formulario. Pone `document.title` = "Ingresar · Galpón Admin".
 *
 * @param props - Ver {@link LoginScreenProps}.
 */
export function LoginScreen({ onSuccess }: LoginScreenProps): ReactNode {
  useEffect(() => {
    document.title = `${AUTH_COPY.loginDocumentTitle}${UI_COPY.documentTitleSuffix}`
  }, [])

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center gap-6 p-6">
      <header className="flex flex-col gap-1">
        <h1>{AUTH_COPY.loginTitle}</h1>
        <p className="text-neutral-400">{AUTH_COPY.loginDescription}</p>
      </header>
      <LoginForm onSuccess={onSuccess} />
    </main>
  )
}
