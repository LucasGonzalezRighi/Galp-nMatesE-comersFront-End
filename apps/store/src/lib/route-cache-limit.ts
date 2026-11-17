import { readdir, rm, stat } from 'node:fs/promises'
import { join, relative } from 'node:path'

/**
 * Tope de la caché de páginas de Next en disco (pista 13 de la auditoría de seguridad).
 *
 * `next start` guarda cada página que genera en `.next/server/route-cache`: también la 404 de una
 * ficha o de una línea con un slug de forma válida que no existe (unos 70 kB por dirección). Next
 * no le pone tope a esa carpeta, así que alguien podría llenar el disco pidiendo miles de
 * direcciones inventadas. Este módulo la mide cada tanto y, si pasó el tope, borra las páginas
 * guardadas más viejas. Borrar una página es inocuo: la próxima visita la vuelve a generar.
 *
 * Se eligió el tope y no `experimental.isrFlushToDisk: false` (deja al optimizador de imágenes sin
 * su caché de disco) ni `dynamicParams = false` (cada producto nuevo pediría recompilar la tienda).
 */

/** Carpeta de la caché de páginas dentro de `.next`. */
export const ROUTE_CACHE_SUBPATH = join('server', 'route-cache')

/** Cada cuánto se mide la carpeta. */
export const ROUTE_CACHE_CHECK_INTERVAL_MS = 60_000

/** Pasado el tope se borra hasta esta fracción, para no podar en cada pasada. */
const PRUNE_TARGET_RATIO = 0.75

/** Una página más nueva que esto no se borra: Next puede estar a mitad de escribirla. */
const MIN_ENTRY_AGE_MS = 10_000

/**
 * Lo que distingue a los archivos de una misma página: `.html`, `.meta`, `.rsc`, `.prefetch.rsc`,
 * `.body` (las rutas) y todo lo que cuelga de su carpeta `.segments`.
 */
const ENTRY_SUFFIX = /(\.segments(?:\/.*)?|\.prefetch\.rsc|\.html|\.meta|\.rsc|\.body)$/

/** Resultado de una pasada de {@link pruneRouteCache}. */
export interface RouteCachePruneResult {
  /** Bytes que ocupaba la carpeta. */
  bytesBefore: number
  /** Bytes que ocupa después de podar. */
  bytesAfter: number
  /** Páginas guardadas que se borraron. */
  removedEntries: number
}

/** Opciones de {@link pruneRouteCache}. */
export interface PruneRouteCacheOptions {
  /** Carpeta de la caché (`.next/server/route-cache`). */
  directory: string
  /** Tope en bytes: un entero positivo. */
  maxBytes: number
}

/** Opciones de {@link startRouteCacheLimit}. */
export interface RouteCacheLimitOptions extends PruneRouteCacheOptions {
  /** Cada cuánto se repite la pasada; por omisión {@link ROUTE_CACHE_CHECK_INTERVAL_MS}. */
  intervalMs?: number
  /** Dónde se escriben los avisos; por omisión `process.stderr`. */
  log?: (message: string) => void
}

/** Control de la poda periódica que arranca {@link startRouteCacheLimit}. */
export interface RouteCacheLimit {
  /** Corta la poda periódica. */
  stop: () => void
  /** Se resuelve cuando termina la pasada en curso (o enseguida si no hay ninguna). */
  idle: () => Promise<void>
}

/** Una página guardada: sus archivos sueltos y, si tiene, su carpeta `.segments`. */
interface CacheEntry {
  /** Rutas a borrar (archivos y la carpeta `.segments`), sin repetir. */
  paths: Set<string>
  /** Bytes de todos sus archivos. */
  bytes: number
  /** Fecha de modificación más nueva entre sus archivos. */
  newestMtimeMs: number
}

/**
 * Clave de la página a la que pertenece un archivo de la caché: su ruta sin el sufijo que la
 * distingue, con `/` como separador.
 *
 * @param relativePath - Ruta del archivo relativa a la carpeta de la caché.
 * @returns La clave de la página; un archivo que no es de una página es su propia clave.
 * @example
 * routeCacheEntryKey('APP_PAGE/abc/$/producto/mate.segments/_tree.segment.rsc')
 * // 'APP_PAGE/abc/$/producto/mate'
 */
export function routeCacheEntryKey(relativePath: string): string {
  return relativePath.replaceAll('\\', '/').replace(ENTRY_SUFFIX, '')
}

/** Lo que hay que borrar para sacar ese archivo: él mismo o, si cuelga de `.segments`, esa carpeta. */
function removablePath(relativePath: string): string {
  const normalized = relativePath.replaceAll('\\', '/')
  const marker = normalized.indexOf('.segments/')
  return marker === -1 ? normalized : normalized.slice(0, marker + '.segments'.length)
}

/** Indica si el error es de un archivo o carpeta que no existe. */
function isMissing(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT'
}

/** Lee la carpeta y agrupa sus archivos por página. Sin la carpeta, no hay páginas. */
async function readEntries(directory: string): Promise<Map<string, CacheEntry>> {
  const entries = new Map<string, CacheEntry>()
  let files
  try {
    files = await readdir(directory, { recursive: true, withFileTypes: true })
  } catch (error) {
    if (isMissing(error)) return entries
    throw error
  }
  for (const file of files) {
    if (!file.isFile()) continue
    const absolutePath = join(file.parentPath, file.name)
    let info
    try {
      info = await stat(absolutePath)
    } catch (error) {
      // Next lo borró o lo reemplazó entre el listado y la lectura.
      if (isMissing(error)) continue
      throw error
    }
    const relativePath = relative(directory, absolutePath)
    const key = routeCacheEntryKey(relativePath)
    const entry = entries.get(key) ?? { paths: new Set<string>(), bytes: 0, newestMtimeMs: 0 }
    entry.paths.add(removablePath(relativePath))
    entry.bytes += info.size
    entry.newestMtimeMs = Math.max(entry.newestMtimeMs, info.mtimeMs)
    entries.set(key, entry)
  }
  return entries
}

/**
 * Mide la caché de páginas y, si pasó el tope, borra páginas enteras, las más viejas primero,
 * hasta dejarla en el 75 % del tope. No toca las escritas en los últimos segundos.
 *
 * @param options - Carpeta y tope.
 * @returns Cuánto ocupaba, cuánto ocupa y cuántas páginas borró.
 * @throws {RangeError} En español, si `maxBytes` no es un entero positivo.
 * @throws {Error} Si la carpeta existe pero no se puede leer.
 */
export async function pruneRouteCache(
  options: PruneRouteCacheOptions,
): Promise<RouteCachePruneResult> {
  const { directory, maxBytes } = options
  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0) {
    throw new RangeError(
      `El tope de la caché de páginas tiene que ser un entero positivo de bytes, y recibió ${String(maxBytes)}.`,
    )
  }
  const entries = await readEntries(directory)
  const bytesBefore = [...entries.values()].reduce((total, entry) => total + entry.bytes, 0)
  if (bytesBefore <= maxBytes) return { bytesBefore, bytesAfter: bytesBefore, removedEntries: 0 }

  const target = Math.floor(maxBytes * PRUNE_TARGET_RATIO)
  const newestAllowed = Date.now() - MIN_ENTRY_AGE_MS
  const oldestFirst = [...entries.values()]
    .filter((entry) => entry.newestMtimeMs <= newestAllowed)
    .sort((a, b) => a.newestMtimeMs - b.newestMtimeMs)

  let bytesAfter = bytesBefore
  let removedEntries = 0
  for (const entry of oldestFirst) {
    if (bytesAfter <= target) break
    // El `.html` (o el `.body`) primero: sin él Next ya no sirve la página a medio borrar.
    const paths = [...entry.paths].sort(
      (a, b) => Number(/\.(html|body)$/.test(b)) - Number(/\.(html|body)$/.test(a)),
    )
    for (const path of paths) {
      await rm(join(directory, path), { recursive: true, force: true })
    }
    bytesAfter -= entry.bytes
    removedEntries += 1
  }
  return { bytesBefore, bytesAfter, removedEntries }
}

/** Bytes en MB con un decimal, para los avisos. */
function megabytes(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(1)
}

/**
 * Arranca la poda periódica de la caché de páginas: una pasada ya y otra cada `intervalMs`. Nunca
 * rompe el servidor: un error queda como aviso en el log. El temporizador no mantiene vivo al
 * proceso.
 *
 * @param options - Carpeta, tope, intervalo y dónde avisar.
 * @returns Cómo cortarla y cómo esperar a la pasada en curso.
 */
export function startRouteCacheLimit(options: RouteCacheLimitOptions): RouteCacheLimit {
  const { directory, maxBytes, intervalMs = ROUTE_CACHE_CHECK_INTERVAL_MS } = options
  const log =
    options.log ??
    ((message: string) => {
      process.stderr.write(`${message}\n`)
    })
  let running: Promise<void> | null = null

  const pass = (): void => {
    // Si la pasada anterior sigue (una carpeta enorme), esta se saltea.
    if (running !== null) return
    running = pruneRouteCache({ directory, maxBytes })
      .then((result) => {
        if (result.removedEntries > 0) {
          log(
            `Aviso: la caché de páginas de la tienda pasó el tope de ${megabytes(maxBytes)} MB (ocupaba ${megabytes(result.bytesBefore)} MB): se borraron ${String(result.removedEntries)} páginas guardadas, las más viejas.`,
          )
        }
      })
      .catch((error: unknown) => {
        log(
          `No se pudo revisar la caché de páginas de la tienda: ${error instanceof Error ? error.message : String(error)}`,
        )
      })
      .finally(() => {
        running = null
      })
  }

  pass()
  const timer = setInterval(pass, intervalMs)
  timer.unref()
  return {
    stop: () => {
      clearInterval(timer)
    },
    idle: () => running ?? Promise.resolve(),
  }
}
