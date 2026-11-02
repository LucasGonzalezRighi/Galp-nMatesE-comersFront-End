'use client'

import type { ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import type { Address, AddressBookInput } from '@galpon/api-client'
import { Button, Tag } from '@/components/ui'
import { createMyAddress, deleteMyAddress, updateMyAddress } from '@galpon/api-client'
import { myAddressesQuery, queryKeys, useApiClient } from '@galpon/api-client/react'
import { ACCOUNT_COPY } from './account.copy'
import { AddressForm } from './AddressForm'
import { withCsrf } from './csrf'
import { FormError } from './form-parts'
import { formatAddressLines } from './format-address'

const COPY = ACCOUNT_COPY.addresses

/** Qué se está editando: una dirección nueva, una existente (por id) o nada. */
type Editing = { kind: 'new' } | { kind: 'edit'; id: string } | null

/** Props de {@link AddressBook}. */
export interface AddressBookProps {
  /** Libreta leída en el servidor con la sesión del cliente (la predeterminada primero). */
  initialAddresses: Address[]
}

/** Nombre con el que se reconoce una dirección en los botones y en la tarjeta. */
function addressName(address: Address): string {
  return address.label ?? COPY.untitled
}

/**
 * Libreta de direcciones del cliente (`/cuenta/direcciones`): cada dirección con su nombre, la
 * marca "Predeterminada" y los botones para editarla o borrarla (con confirmación), y el acceso
 * para agregar una. Cada escritura va con el token CSRF y, al terminar, se vuelve a pedir la
 * libreta. Sin direcciones muestra "No tenés direcciones guardadas" (spec 9.7).
 *
 * @param props - Ver {@link AddressBookProps}.
 */
export function AddressBook({ initialAddresses }: AddressBookProps): ReactNode {
  const api = useApiClient()
  const queryClient = useQueryClient()
  const { data: addresses } = useQuery({ ...myAddressesQuery(api), initialData: initialAddresses })
  const [editing, setEditing] = useState<Editing>(null)
  const [confirming, setConfirming] = useState<string | null>(null)
  const [removing, setRemoving] = useState(false)
  const [removeError, setRemoveError] = useState<string | null>(null)

  const refresh = (): Promise<void> =>
    queryClient.invalidateQueries({ queryKey: queryKeys.myAddresses() })

  const save = async (input: AddressBookInput): Promise<void> => {
    await withCsrf(queryClient, api, () =>
      editing?.kind === 'edit'
        ? updateMyAddress(api, editing.id, input)
        : createMyAddress(api, input),
    )
    await refresh()
    setEditing(null)
  }

  const remove = async (id: string): Promise<void> => {
    setRemoving(true)
    setRemoveError(null)
    try {
      await withCsrf(queryClient, api, () => deleteMyAddress(api, id))
      await refresh()
      setConfirming(null)
    } catch {
      setRemoveError(ACCOUNT_COPY.networkError)
    } finally {
      setRemoving(false)
    }
  }

  const close = (): void => {
    setEditing(null)
  }

  return (
    <section className="flex flex-col gap-6">
      <h1 className="text-[clamp(32px,4vw,52px)] leading-none tracking-[-0.03em]">{COPY.title}</h1>
      {addresses.length === 0 && editing === null ? (
        <div className="bg-surface flex flex-col items-start gap-3 rounded-lg p-[clamp(20px,3vw,32px)] shadow-sm">
          <p className="m-0 text-[18px]">{COPY.empty}</p>
          <p className="m-0 text-[14px] text-neutral-400">{COPY.emptyText}</p>
          <Button
            variant="secondary"
            onClick={() => {
              setEditing({ kind: 'new' })
            }}
          >
            {COPY.add}
          </Button>
        </div>
      ) : null}
      {addresses.length > 0 ? (
        <ul className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2">
          {addresses.map((address) =>
            editing?.kind === 'edit' && editing.id === address.id ? (
              <li key={address.id} className="sm:col-span-2">
                <AddressForm address={address} onSave={save} onCancel={close} />
              </li>
            ) : (
              <li
                key={address.id}
                className="bg-surface flex flex-col items-start gap-2 rounded-lg p-[clamp(18px,2.4vw,24px)] shadow-sm"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[16px]">{addressName(address)}</span>
                  {address.isDefault ? <Tag variant="accent">{COPY.defaultTag}</Tag> : null}
                </div>
                {formatAddressLines(address).map((line) => (
                  <p key={line} className="m-0 text-[14px] text-neutral-300">
                    {line}
                  </p>
                ))}
                {confirming === address.id ? (
                  <div className="mt-2 flex flex-col gap-2">
                    <p className="m-0 text-[14px]">{COPY.confirmRemove}</p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        loading={removing}
                        onClick={() => {
                          void remove(address.id)
                        }}
                      >
                        {COPY.confirmRemoveYes}
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={removing}
                        onClick={() => {
                          setConfirming(null)
                          setRemoveError(null)
                        }}
                      >
                        {COPY.cancel}
                      </Button>
                    </div>
                    <FormError message={removeError ?? undefined} />
                  </div>
                ) : (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      aria-label={`${COPY.edit} ${addressName(address)}`}
                      onClick={() => {
                        setConfirming(null)
                        setEditing({ kind: 'edit', id: address.id })
                      }}
                    >
                      {COPY.edit}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label={`${COPY.remove} ${addressName(address)}`}
                      onClick={() => {
                        setEditing(null)
                        setConfirming(address.id)
                      }}
                    >
                      {COPY.remove}
                    </Button>
                  </div>
                )}
              </li>
            ),
          )}
        </ul>
      ) : null}
      {editing?.kind === 'new' ? (
        <AddressForm onSave={save} onCancel={close} />
      ) : addresses.length > 0 ? (
        <Button
          variant="secondary"
          className="self-start"
          onClick={() => {
            setConfirming(null)
            setEditing({ kind: 'new' })
          }}
        >
          {COPY.add}
        </Button>
      ) : null}
    </section>
  )
}
