import { createFileRoute, stripSearchParams } from '@tanstack/react-router'
import {
  MESSAGES_SEARCH_DEFAULTS,
  MessagesScreen,
  messagesSearchSchema,
} from '../../features/messages'

/** Ruta `/mensajes`: la bandeja, con el tipo (`?tipo=`), `?sinLeer=1` y la página en la URL. */
export const Route = createFileRoute('/_authenticated/mensajes')({
  validateSearch: messagesSearchSchema,
  search: { middlewares: [stripSearchParams(MESSAGES_SEARCH_DEFAULTS)] },
  component: MessagesPage,
})

function MessagesPage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  return (
    <MessagesScreen search={search} onSearchChange={(next) => void navigate({ search: next })} />
  )
}
