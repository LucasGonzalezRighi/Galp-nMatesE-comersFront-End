'use client'

import type { InputHTMLAttributes, ReactNode } from 'react'
import { Shake } from '@/components/motion'
import { Field, Input, Select } from '@/components/ui'
import type { StepForm } from './use-step-form'

/** Props comunes de los campos de un paso. */
interface BaseFieldProps<F extends string> {
  /** Estado de validación del paso. */
  form: StepForm<F>
  /** Campo. */
  name: F
  /** Etiqueta visible. */
  label: string
  /** Valor actual. */
  value: string
  /** Se llama con el valor nuevo. */
  onChange: (value: string) => void
  /** Clases del contenedor (por ejemplo, para ocupar toda la fila). */
  className?: string
}

/** Props de {@link TextField}. */
export interface TextFieldProps<F extends string> extends BaseFieldProps<F> {
  /** Tipo del campo. */
  type?: 'text' | 'email' | 'tel'
  /** Texto de ejemplo. */
  placeholder?: string
  /** Autocompletado del navegador. */
  autoComplete?: string
  /** Teclado en el celular. */
  inputMode?: InputHTMLAttributes<HTMLInputElement>['inputMode']
}

/**
 * Campo de texto de un paso del checkout: etiqueta, control y error accesibles (`Field`), dentro
 * de un `Shake` para marcar el error al intentar avanzar.
 *
 * @param props - Ver {@link TextFieldProps}.
 */
export function TextField<F extends string>({
  form,
  name,
  label,
  value,
  onChange,
  className,
  type = 'text',
  placeholder,
  autoComplete,
  inputMode,
}: TextFieldProps<F>): ReactNode {
  return (
    <Shake ref={form.shakeRef(name)} className={className}>
      <Field label={label} error={form.error(name)}>
        {(control) => (
          <Input
            {...control}
            ref={form.inputRef(name)}
            type={type}
            value={value}
            placeholder={placeholder}
            autoComplete={autoComplete}
            inputMode={inputMode}
            onChange={(event) => {
              onChange(event.target.value)
            }}
            onBlur={() => {
              form.touch(name)
            }}
          />
        )}
      </Field>
    </Shake>
  )
}

/** Props de {@link SelectField}. */
export interface SelectFieldProps<F extends string> extends BaseFieldProps<F> {
  /** Opción vacía del principio ("Elegí…"). */
  placeholder: string
  /** Opciones (valor y texto iguales). */
  options: readonly string[]
  /** Autocompletado del navegador. */
  autoComplete?: string
}

/**
 * Selector de un paso del checkout (por ejemplo, la provincia), con la misma validación que
 * {@link TextField}.
 *
 * @param props - Ver {@link SelectFieldProps}.
 */
export function SelectField<F extends string>({
  form,
  name,
  label,
  value,
  onChange,
  className,
  placeholder,
  options,
  autoComplete,
}: SelectFieldProps<F>): ReactNode {
  return (
    <Shake ref={form.shakeRef(name)} className={className}>
      <Field label={label} error={form.error(name)}>
        {(control) => (
          <Select
            {...control}
            ref={form.inputRef(name)}
            value={value}
            autoComplete={autoComplete}
            onChange={(event) => {
              onChange(event.target.value)
            }}
            onBlur={() => {
              form.touch(name)
            }}
          >
            <option value="">{placeholder}</option>
            {options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
        )}
      </Field>
    </Shake>
  )
}
