import { spawnSync } from 'node:child_process'
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import { findVersionProblems } from './check-dependency-versions.mjs'

const VERSIONS = { next: '16.4.2', react: '19.3.1', typescript: '6.0.3' }

describe('findVersionProblems', () => {
  it('acepta versiones exactas, peers con ^ y paquetes propios con "*"', () => {
    const problems = findVersionProblems(
      [
        {
          path: 'apps/store/package.json',
          json: {
            dependencies: { next: '16.4.2', '@galpon/domain': '*' },
            devDependencies: { typescript: '6.0.3' },
            peerDependencies: { react: '^19.3.1' },
          },
        },
        { path: 'package.json', json: { name: 'sin-dependencias' } },
      ],
      VERSIONS,
    )
    expect(problems).toEqual([])
  })

  it('marca versiones distintas de la fijada en dependencies y devDependencies', () => {
    const problems = findVersionProblems(
      [
        {
          path: 'apps/store/package.json',
          json: { dependencies: { next: '^16.4.2' }, devDependencies: { typescript: '~6.0.3' } },
        },
      ],
      VERSIONS,
    )
    expect(problems).toEqual([
      'apps/store/package.json: "next" declara "^16.4.2" y la versión fijada es "16.4.2"',
      'apps/store/package.json: "typescript" declara "~6.0.3" y la versión fijada es "6.0.3"',
    ])
  })

  it('pide ^ más la versión fijada en peerDependencies', () => {
    const problems = findVersionProblems(
      [
        {
          path: 'packages/api-client/package.json',
          json: { peerDependencies: { react: '19.3.1' } },
        },
      ],
      VERSIONS,
    )
    expect(problems).toEqual([
      'packages/api-client/package.json: "react" declara "19.3.1" y la versión fijada es "^19.3.1"',
    ])
  })

  it('marca paquetes que no están en scripts/dependency-versions.json', () => {
    const problems = findVersionProblems(
      [{ path: 'packages/domain/package.json', json: { dependencies: { lodash: '4.17.21' } } }],
      VERSIONS,
    )
    expect(problems).toEqual([
      'packages/domain/package.json: "lodash" no está en scripts/dependency-versions.json',
    ])
  })

  it('exige "*" para los paquetes propios @galpon/*', () => {
    const problems = findVersionProblems(
      [{ path: 'package.json', json: { devDependencies: { '@galpon/config': 'workspace:*' } } }],
      VERSIONS,
    )
    expect(problems).toEqual([
      'package.json: "@galpon/config" declara "workspace:*" y los paquetes propios se declaran "*"',
    ])
  })
})

describe('check-dependency-versions ejecutado directo', () => {
  const script = join(dirname(fileURLToPath(import.meta.url)), 'check-dependency-versions.mjs')
  /** @type {string[]} */
  const workspaces = []

  afterEach(() => {
    for (const dir of workspaces.splice(0)) rmSync(dir, { recursive: true, force: true })
  })

  /**
   * Arma un workspace temporal con una copia del script y los package.json dados.
   *
   * @param {Record<string, object>} manifests - package.json por ruta relativa.
   * @returns {import('node:child_process').SpawnSyncReturns<string>} Resultado de correr el script.
   */
  function runInWorkspace(manifests) {
    const root = mkdtempSync(join(tmpdir(), 'galpon-versions-'))
    workspaces.push(root)
    mkdirSync(join(root, 'scripts'))
    copyFileSync(script, join(root, 'scripts', 'check-dependency-versions.mjs'))
    writeFileSync(join(root, 'scripts', 'dependency-versions.json'), JSON.stringify(VERSIONS))
    for (const [path, json] of Object.entries(manifests)) {
      mkdirSync(dirname(join(root, path)), { recursive: true })
      writeFileSync(join(root, path), JSON.stringify(json))
    }
    mkdirSync(join(root, 'packages', 'sin-manifiesto'), { recursive: true })
    return spawnSync(process.execPath, [join(root, 'scripts', 'check-dependency-versions.mjs')], {
      encoding: 'utf8',
    })
  }

  it('sale con 0 cuando la raíz, apps/* y packages/* respetan las versiones', () => {
    const result = runInWorkspace({
      'package.json': { devDependencies: { typescript: '6.0.3', '@galpon/config': '*' } },
      'apps/store/package.json': { dependencies: { next: '16.4.2' } },
      'packages/domain/package.json': { name: '@galpon/domain' },
    })
    expect(result.status).toBe(0)
    expect(result.stderr).toBe('')
  })

  it('imprime los problemas de cada package.json y sale con 1', () => {
    const result = runInWorkspace({
      'package.json': { devDependencies: { typescript: '^6.0.3' } },
      'apps/store/package.json': { dependencies: { next: '^16.4.2' } },
      'packages/domain/package.json': { dependencies: { lodash: '4.17.21' } },
    })
    expect(result.status).toBe(1)
    expect(result.stderr).toContain(
      'package.json: "typescript" declara "^6.0.3" y la versión fijada es "6.0.3"',
    )
    expect(result.stderr).toContain(
      'apps/store/package.json: "next" declara "^16.4.2" y la versión fijada es "16.4.2"',
    )
    expect(result.stderr).toContain(
      'packages/domain/package.json: "lodash" no está en scripts/dependency-versions.json',
    )
  })
})
