import { IMAGE_UPLOAD_RULES } from '@galpon/domain'

/**
 * Valor del atributo `accept` de los selectores de fotos del kit (`ImageDropzone` y
 * `SingleImageField`): los formatos de `IMAGE_UPLOAD_RULES` de `@galpon/domain` (JPEG, PNG y
 * WebP), separados por comas. Solo filtra el selector; validar el archivo es de
 * `components/media`.
 *
 * @example
 * <input type="file" accept={IMAGE_ACCEPT} />
 */
export const IMAGE_ACCEPT: string = IMAGE_UPLOAD_RULES.acceptedTypes.join(',')
