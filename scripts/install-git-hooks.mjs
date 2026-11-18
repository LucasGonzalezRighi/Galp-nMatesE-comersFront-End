// @ts-check
/**
 * `prepare` del workspace: instala los hooks de git de lefthook en las compus de desarrollo y no
 * hace nada en las compilaciones de Vercel o de un CI, donde no hay hooks que instalar (y donde el
 * binario de lefthook puede no estar: la compilación de la tienda en Vercel cortaba con
 * "lefthook: command not found").
 *
 * Se saltea si hay `CI` o `VERCEL` en el entorno, o si la carpeta no es un repositorio de git.
 * Si no, corre el `lefthook` instalado en `node_modules` (nunca lo baja del registro) y, si falla,
 * sale con su mismo código.
 *
 * @module
 */
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Raíz del repositorio. */
const ROOT = fileURLToPath(new URL('..', import.meta.url))

/**
 * Por qué no hay que instalar los hooks, o `null` si hay que instalarlos.
 *
 * @param {NodeJS.ProcessEnv} env - El entorno del proceso.
 * @param {boolean} hasGit - Si la raíz tiene `.git` (carpeta o archivo, como en un worktree).
 * @returns {string | null} El motivo, en español, o `null`.
 */
export function skipReason(env, hasGit) {
  if (env.VERCEL) return 'compilación de Vercel'
  if (env.CI) return 'integración continua'
  if (!hasGit) return 'la carpeta no es un repositorio de git'
  return null
}

const isMain = process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1]

if (isMain) {
  const reason = skipReason(process.env, existsSync(join(ROOT, '.git')))
  if (reason !== null) {
    console.log(`Hooks de git salteados: ${reason}.`)
  } else {
    const result = spawnSync('npx', ['--no-install', 'lefthook', 'install'], {
      cwd: ROOT,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    })
    process.exitCode = result.status ?? 1
  }
}
