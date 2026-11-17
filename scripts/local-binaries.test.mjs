import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { parse } from 'yaml'

/** Raíz del repositorio. */
const ROOT = fileURLToPath(new URL('..', import.meta.url))

/** Lee un JSON del repositorio. */
function readJson(path) {
  return JSON.parse(readFileSync(join(ROOT, path), 'utf8'))
}

/** Los `package.json` del workspace: la raíz, `apps/*` y `packages/*`. */
function manifestPaths() {
  const nested = ['apps', 'packages'].flatMap((folder) =>
    readdirSync(join(ROOT, folder), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => `${folder}/${entry.name}/package.json`),
  )
  return ['package.json', ...nested]
}

/** Cada comando de los scripts de npm y de los hooks de lefthook, con su origen. */
function commands() {
  const fromScripts = manifestPaths().flatMap((path) =>
    Object.entries(readJson(path).scripts ?? {}).map(([name, run]) => ({
      where: `${path} → ${name}`,
      run,
    })),
  )
  const hooks = parse(readFileSync(join(ROOT, 'lefthook.yml'), 'utf8'))
  const fromHooks = Object.entries(hooks).flatMap(([hook, config]) =>
    (config.jobs ?? []).map((job) => ({
      where: `lefthook.yml → ${hook}.${job.name}`,
      run: job.run,
    })),
  )
  return [...fromScripts, ...fromHooks]
}

describe('binarios de las herramientas', () => {
  it('npx solo corre binarios instalados (--no-install), nunca baja uno del registro', () => {
    const fetching = commands().filter(
      ({ run }) => /\bnpx\s/.test(run) && !/\bnpx\s+--no-install\s/.test(run),
    )
    expect(fetching).toEqual([])
  })

  it('ningún comando pide una versión suelta fuera de la lockfile (paquete@versión, --yes)', () => {
    const pinned = commands().filter(({ run }) =>
      /\bnpx\b.*(--yes|\s-y\s|\s[\w@/.-]+@\d)/.test(run),
    )
    expect(pinned).toEqual([])
  })

  it('openapi-typescript está en las devDependencies de @galpon/api-client con la versión fijada', () => {
    const versions = readJson('scripts/dependency-versions.json')
    const apiClient = readJson('packages/api-client/package.json')

    expect(apiClient.devDependencies['openapi-typescript']).toBe(versions['openapi-typescript'])
    expect(
      readJson('package-lock.json').packages['packages/api-client/node_modules/openapi-typescript'],
    ).toMatchObject({
      version: versions['openapi-typescript'],
      integrity: expect.stringMatching(/^sha512-/),
    })
  })

  it('el typecheck de @galpon/api-client usa el TypeScript del workspace, no el 5.x que openapi-typescript pide como peer', () => {
    // openapi-typescript 7.13.0 pide typescript ^5.x: npm lo deja en packages/api-client/node_modules,
    // con su `tsc` en el .bin de esa carpeta, que le ganaría a la raíz con un `tsc` a secas.
    const { scripts } = readJson('packages/api-client/package.json')

    expect(scripts.typecheck).toBe('node ../../node_modules/typescript/bin/tsc --noEmit')
    expect(readJson('node_modules/typescript/package.json').version).toBe(
      readJson('scripts/dependency-versions.json').typescript,
    )
  })
})
