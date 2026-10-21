// @ts-check
/**
 * Verifica que cada `package.json` del workspace use las versiones fijadas en
 * `scripts/dependency-versions.json`, la fuente única de versiones del front.
 *
 * Ejecutado directo (`npm run lint` lo corre) revisa la raíz, `apps/*` y `packages/*`,
 * imprime los problemas y sale con 1 si encuentra alguno; si no, dice cuántos `package.json` revisó.
 *
 * @module
 */
import { existsSync, readdirSync, readFileSync, realpathSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Secciones de un `package.json` que se revisan. */
const SECTIONS = /** @type {const} */ (['dependencies', 'devDependencies', 'peerDependencies'])

/** Prefijo de los paquetes propios del workspace, que se declaran con `"*"`. */
const OWN_SCOPE = '@galpon/'

/**
 * Busca dependencias que se desvían de las versiones fijadas.
 *
 * Reglas: un paquete `@galpon/*` se declara `"*"`; cualquier otro tiene que estar en
 * `dependency-versions.json`, con la versión exacta en `dependencies` y `devDependencies`
 * y con `^` más esa versión en `peerDependencies`.
 *
 * @param {{ path: string, json: object }[]} manifests - Cada `package.json` con su ruta relativa a la raíz.
 * @param {Record<string, string>} versions - Versiones fijadas, por nombre de paquete.
 * @returns {string[]} Un mensaje en español por problema; vacío si todo coincide.
 */
export function findVersionProblems(manifests, versions) {
  /** @type {string[]} */
  const problems = []
  for (const { path, json } of manifests) {
    for (const section of SECTIONS) {
      const declared = /** @type {Record<string, string> | undefined} */ (
        /** @type {Record<string, unknown>} */ (json)[section]
      )
      for (const [name, range] of Object.entries(declared ?? {})) {
        if (name.startsWith(OWN_SCOPE)) {
          if (range !== '*') {
            problems.push(
              `${path}: "${name}" declara "${range}" y los paquetes propios se declaran "*"`,
            )
          }
          continue
        }
        const pinned = versions[name]
        if (pinned === undefined) {
          problems.push(`${path}: "${name}" no está en scripts/dependency-versions.json`)
          continue
        }
        const expected = section === 'peerDependencies' ? `^${pinned}` : pinned
        if (range !== expected) {
          problems.push(
            `${path}: "${name}" declara "${range}" y la versión fijada es "${expected}"`,
          )
        }
      }
    }
  }
  return problems
}

/** Error de un archivo que no es JSON válido; su mensaje ya está listo para mostrarse. */
class InvalidJsonError extends Error {}

/**
 * Lee y parsea un archivo JSON del workspace.
 *
 * @param {string} root - Carpeta raíz del workspace.
 * @param {string} path - Ruta del archivo relativa a la raíz, con `/` (es la que se muestra).
 * @returns {object} El contenido ya parseado, siempre un objeto.
 * @throws {InvalidJsonError} Si el archivo no es JSON válido o no es un objeto (`null`, un arreglo
 *   o un valor suelto): `<ruta>: JSON inválido (<motivo>)`.
 */
function readJson(root, path) {
  let parsed
  try {
    parsed = JSON.parse(readFileSync(join(root, path), 'utf8'))
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new InvalidJsonError(`${path}: JSON inválido (${error.message})`, { cause: error })
    }
    throw error
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new InvalidJsonError(`${path}: JSON inválido (se esperaba un objeto)`)
  }
  return parsed
}

/**
 * Lee los `package.json` de la raíz, `apps/*` y `packages/*`.
 *
 * @param {string} root - Carpeta raíz del workspace.
 * @returns {{ path: string, json: object }[]} Los manifiestos encontrados, con ruta relativa.
 * @throws {InvalidJsonError} Si algún `package.json` no es JSON válido.
 */
function readWorkspaceManifests(root) {
  const paths = ['package.json']
  for (const folder of ['apps', 'packages']) {
    if (!existsSync(join(root, folder))) continue
    for (const entry of readdirSync(join(root, folder), { withFileTypes: true })) {
      const path = `${folder}/${entry.name}/package.json`
      if (entry.isDirectory() && existsSync(join(root, path))) paths.push(path)
    }
  }
  return paths.map((path) => ({ path, json: /** @type {object} */ (readJson(root, path)) }))
}

/**
 * Indica si este archivo es el punto de entrada de `node` (y no un import, como en los tests).
 *
 * Compara las rutas reales de los dos lados: Node resuelve los enlaces del punto de entrada y
 * `process.argv[1]` llega sin resolver, así que invocado por una junction o un symlink el
 * chequeo no correría y el proceso saldría con 0 sin revisar nada.
 *
 * @returns {boolean} `true` si se ejecutó con `node scripts/check-dependency-versions.mjs`.
 */
function isEntryPoint() {
  const entry = process.argv[1]
  if (entry === undefined || !existsSync(entry)) return false
  return realpathSync(entry) === realpathSync(fileURLToPath(import.meta.url))
}

if (isEntryPoint()) {
  try {
    const root = fileURLToPath(new URL('..', import.meta.url))
    const versions = /** @type {Record<string, string>} */ (
      readJson(root, 'scripts/dependency-versions.json')
    )
    const manifests = readWorkspaceManifests(root)
    const problems = findVersionProblems(manifests, versions)
    if (problems.length > 0) {
      const list = problems.map((problem) => `  - ${problem}\n`).join('')
      process.stderr.write(
        `Versiones de dependencias que no coinciden con scripts/dependency-versions.json:\n${list}`,
      )
      process.exitCode = 1
    } else {
      // Confirma que el chequeo corrió: un guard que no corre también saldría con 0.
      const count = String(manifests.length)
      process.stdout.write(
        `Las versiones coinciden con scripts/dependency-versions.json (package.json revisados: ${count}).\n`,
      )
    }
  } catch (error) {
    // Un JSON roto es un problema del repo, no un fallo del script: se informa sin traza.
    if (!(error instanceof InvalidJsonError)) throw error
    process.stderr.write(`${error.message}\n`)
    process.exitCode = 1
  }
}
