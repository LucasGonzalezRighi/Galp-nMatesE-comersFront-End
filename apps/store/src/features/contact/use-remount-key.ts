'use client'

import { useEffect, useState } from 'react'

/**
 * Número que cambia cada vez que el componente deja de estar a la vista: al desmontarse y también
 * cuando Cache Components lo oculta con `<Activity>`, que conserva el estado pero limpia los
 * efectos. Se usa como `key` de un formulario con estado final ("Mensaje enviado") para que al
 * volver a entrar a la página aparezca vacío y no con la confirmación anterior.
 */
export function useRemountKey(): number {
  const [key, setKey] = useState(0)
  useEffect(
    () => () => {
      setKey((current) => current + 1)
    },
    [],
  )
  return key
}
