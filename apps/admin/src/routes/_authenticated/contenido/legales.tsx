import { createFileRoute, stripSearchParams } from '@tanstack/react-router'
import {
  LEGAL_SEARCH_DEFAULTS,
  LegalContentScreen,
  legalSearchSchema,
} from '../../../features/content'

/**
 * Ruta `/contenido/legales`: los documentos legales, con el elegido en `?documento=terminos|privacidad`
 * (validado con `legalSearchSchema`; los términos, por omisión, no quedan en la URL).
 */
export const Route = createFileRoute('/_authenticated/contenido/legales')({
  validateSearch: legalSearchSchema,
  search: { middlewares: [stripSearchParams(LEGAL_SEARCH_DEFAULTS)] },
  component: LegalContentPage,
})

function LegalContentPage() {
  const { documento } = Route.useSearch()
  const navigate = Route.useNavigate()
  return (
    <LegalContentScreen
      tab={documento}
      onTabChange={(next) => void navigate({ search: { documento: next } })}
    />
  )
}
