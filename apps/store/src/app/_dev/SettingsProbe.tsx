'use client'

import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { publicSettingsQuery, useApiClient } from '@galpon/api-client/react'

/**
 * Prueba del camino del navegador: pide los ajustes públicos a `/api/v1` del mismo dominio (en
 * modo de prueba, a la API simulada) y muestra el descuento del kit. Es temporal: se quita junto
 * con la página provisoria de inicio en P2.
 */
export function SettingsProbe(): ReactNode {
  const { data, isError, isPending } = useQuery(publicSettingsQuery(useApiClient()))
  if (isPending) return <p>Cargando los ajustes…</p>
  if (isError) return <p role="alert">No pudimos cargar los ajustes.</p>
  return <p>Descuento del kit: {data.kitDiscountPercent}%</p>
}
