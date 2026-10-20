// @ts-check
/**
 * Verifica que cada `package.json` del workspace use las versiones fijadas en
 * `scripts/dependency-versions.json`, la fuente única de versiones del front.
 *
 * Ejecutado directo (`npm run lint` lo corre) revisa la raíz, `apps/*` y `packages/*`,
 * imprime los problemas y sale con 1 si encuentra alguno.
 *
 * @module
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

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

/**
 * Lee los `package.json` de la raíz, `apps/*` y `packages/*`.
 *
 * @param {string} root - Carpeta raíz del workspace.
 * @returns {{ path: string, json: object }[]} Los manifiestos encontrados, con ruta relativa.
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
  return paths.map((path) => ({
    path,
    json: /** @type {object} */ (JSON.parse(readFileSync(join(root, path), 'utf8'))),
  }))
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const root = fileURLToPath(new URL('..', import.meta.url))
  const versions = /** @type {Record<string, string>} */ (
    JSON.parse(readFileSync(join(root, 'scripts', 'dependency-versions.json'), 'utf8'))
  )
  const problems = findVersionProblems(readWorkspaceManifests(root), versions)
  if (problems.length > 0) {
    process.stderr.write(
      `Versiones de dependencias que no coinciden con scripts/dependency-versions.json:\n${problems
        .map((problem) => `  - ${problem}\n`)
        .join('')}`,
    )
    process.exitCode = 1
  }
}
