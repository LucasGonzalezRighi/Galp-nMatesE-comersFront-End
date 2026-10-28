import type { ReactNode } from 'react'
import { PageHeader } from '../../../components/ui/PageHeader'
import { Section } from '../../../components/ui/Section'
import { AUTH_COPY } from '../auth.copy'
import { ChangePasswordForm } from './ChangePasswordForm'

/** Pantalla "Mi cuenta" (`/cuenta`): por ahora, cambiar la contraseña. */
export function AccountScreen(): ReactNode {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={AUTH_COPY.accountTitle} />
      <Section title={AUTH_COPY.changePasswordTitle}>
        <ChangePasswordForm />
      </Section>
    </div>
  )
}
