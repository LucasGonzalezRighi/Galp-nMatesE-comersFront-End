import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useId } from 'react'
import { adminSettingsQuery, useApiClient } from '@galpon/api-client/react'
import { LEGAL_MARKERS, legalMarkerValues } from '@galpon/domain'
import { CONTENT_COPY, legalMarkerCode } from '../content.copy'

/** Clases de cada recuadro de la ayuda (las mismas del aviso de Legales). */
const BOX_CLASS = 'border-divider bg-surface flex min-w-0 flex-col gap-2 rounded-lg border p-4'

/**
 * Ayuda de Legales, debajo del aviso: cómo se escribe el texto (párrafos, `## ` títulos, `- `
 * listas y enlaces, LA-1) y los 8 marcadores de los datos del vendedor (LA-2) con su código
 * `{{clave}}`, su nombre y el valor de hoy (`legalMarkerValues` sobre `adminSettingsQuery`) o
 * "Falta cargarlo en Ajustes". La tienda es la que reemplaza los marcadores: el editor guarda el
 * texto tal cual. Mientras cargan los ajustes (o si fallan) se ven el código y el nombre.
 */
export function LegalHelp(): ReactNode {
  const api = useApiClient()
  const settings = useQuery(adminSettingsQuery(api))
  const formatId = useId()
  const markersId = useId()
  const values = settings.data === undefined ? undefined : legalMarkerValues(settings.data)
  return (
    <div className="grid gap-4 text-sm lg:grid-cols-2 lg:items-start">
      <section aria-labelledby={formatId} className={BOX_CLASS}>
        <h2 id={formatId} className="text-foreground text-sm font-medium">
          {CONTENT_COPY.legalHelpTitle}
        </h2>
        <ul className="flex list-disc flex-col gap-1 pl-5 text-neutral-300">
          {CONTENT_COPY.legalHelpLines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </section>
      <section aria-labelledby={markersId} className={BOX_CLASS}>
        <h2 id={markersId} className="text-foreground text-sm font-medium">
          {CONTENT_COPY.legalMarkersTitle}
        </h2>
        <p className="text-neutral-300">{CONTENT_COPY.legalMarkersHint}</p>
        <ul className="flex flex-col gap-1.5">
          {LEGAL_MARKERS.map((marker) => {
            const value = values?.[marker]
            return (
              <li key={marker} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <code className="text-foreground font-mono text-xs">{legalMarkerCode(marker)}</code>
                <span className="text-neutral-400">{CONTENT_COPY.legalMarkers[marker]}</span>
                {values !== undefined && (
                  <span className="min-w-0 break-words text-neutral-300">
                    {value ?? CONTENT_COPY.markerMissing}
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
