import { spawnSync } from 'node:child_process'
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
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
  /** @type {(() => void)[]} */
  const cleanups = []

  afterEach(() => {
    // Al revés: primero se borra el enlace y después la carpeta a la que apunta.
    for (const cleanup of cleanups.splice(0).reverse()) cleanup()
  })

  /**
   * Crea una carpeta temporal y devuelve su ruta real: en macOS `tmpdir()` pasa por un
   * symlink (/var -> /private/var) y en Windows puede venir con nombres cortos 8.3.
   *
   * @param {string} prefix - Prefijo del nombre de la carpeta.
   * @returns {string} Ruta real de la carpeta creada.
   */
  function createTempDir(prefix) {
    const dir = realpathSync(mkdtempSync(join(tmpdir(), prefix)))
    cleanups.push(() => {
      rmSync(dir, { recursive: true, force: true })
    })
    return dir
  }

  /**
   * Arma un workspace temporal con una copia del script y los package.json dados.
   *
   * @param {Record<string, object>} manifests - package.json por ruta relativa.
   * @returns {string} Raíz del workspace.
   */
  function createWorkspace(manifests) {
    const root = createTempDir('galpon-versions-')
    mkdirSync(join(root, 'scripts'))
    copyFileSync(script, join(root, 'scripts', 'check-dependency-versions.mjs'))
    writeFileSync(join(root, 'scripts', 'dependency-versions.json'), JSON.stringify(VERSIONS))
    for (const [path, json] of Object.entries(manifests)) {
      mkdirSync(dirname(join(root, path)), { recursive: true })
      writeFileSync(join(root, path), JSON.stringify(json))
    }
    mkdirSync(join(root, 'packages', 'sin-manifiesto'), { recursive: true })
    return root
  }

  /**
   * Crea un enlace a la carpeta dada: junction en Windows (no pide permisos de
   * administrador) y symlink de carpeta en el resto de los sistemas.
   *
   * @param {string} target - Carpeta a la que apunta el enlace.
   * @returns {string} Ruta del enlace.
   */
  function createLink(target) {
    const link = join(createTempDir('galpon-versions-enlace-'), 'workspace')
    symlinkSync(target, link, 'junction')
    cleanups.push(() => {
      unlinkSync(link)
    })
    return link
  }

  /**
   * Corre con node la copia del script que está en el workspace.
   *
   * @param {string} root - Raíz del workspace, o un enlace a ella.
   * @returns {import('node:child_process').SpawnSyncReturns<string>} Resultado de correr el script.
   */
  function runScript(root) {
    return spawnSync(process.execPath, [join(root, 'scripts', 'check-dependency-versions.mjs')], {
      encoding: 'utf8',
    })
  }

  it('sale con 0 y dice cuántos package.json revisó cuando todos respetan las versiones', () => {
    const root = createWorkspace({
      'package.json': { devDependencies: { typescript: '6.0.3', '@galpon/config': '*' } },
      'apps/store/package.json': { dependencies: { next: '16.4.2' } },
      'packages/domain/package.json': { name: '@galpon/domain' },
    })
    const result = runScript(root)
    expect(result.stderr).toBe('')
    expect(result.status).toBe(0)
    // Solo existe si el script corrió: la raíz, apps/store y packages/domain (sin-manifiesto no cuenta).
    expect(result.stdout).toBe(
      'Las versiones coinciden con scripts/dependency-versions.json (package.json revisados: 3).\n',
    )
  })

  it('imprime los problemas de cada package.json y sale con 1', () => {
    const root = createWorkspace({
      'package.json': { devDependencies: { typescript: '^6.0.3' } },
      'apps/store/package.json': { dependencies: { next: '^16.4.2' } },
      'packages/domain/package.json': { dependencies: { lodash: '4.17.21' } },
    })
    const result = runScript(root)
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

  it('informa la ruta y el motivo cuando un package.json no es JSON válido, y sale con 1', () => {
    const root = createWorkspace({ 'package.json': { name: 'raiz' } })
    mkdirSync(join(root, 'apps', 'store'), { recursive: true })
    writeFileSync(join(root, 'apps', 'store', 'package.json'), '{ "dependencies": ')
    const result = runScript(root)
    expect(result.status).toBe(1)
    expect(result.stdout).toBe('')
    // Un solo renglón en español con la ruta relativa; sin la traza de un SyntaxError sin atrapar.
    expect(result.stderr).toMatch(/^apps\/store\/package\.json: JSON inválido \(.+\)\n$/)
  })

  it('informa la ruta y el motivo cuando scripts/dependency-versions.json no es JSON válido', () => {
    const root = createWorkspace({ 'package.json': { name: 'raiz' } })
    writeFileSync(join(root, 'scripts', 'dependency-versions.json'), '{ "next": 16.4.2 }')
    const result = runScript(root)
    expect(result.status).toBe(1)
    expect(result.stdout).toBe('')
    expect(result.stderr).toMatch(/^scripts\/dependency-versions\.json: JSON inválido \(.+\)\n$/)
  })

  it.each([
    ['null', 'null'],
    ['un arreglo', '[]'],
    ['un texto', '"x"'],
  ])(
    'rechaza un package.json válido que es %s y no un objeto, y sale con 1',
    (_description, text) => {
      const root = createWorkspace({ 'package.json': { name: 'raiz' } })
      mkdirSync(join(root, 'apps', 'store'), { recursive: true })
      writeFileSync(join(root, 'apps', 'store', 'package.json'), text)
      const result = runScript(root)
      expect(result.status).toBe(1)
      expect(result.stdout).toBe('')
      expect(result.stderr).toBe('apps/store/package.json: JSON inválido (se esperaba un objeto)\n')
    },
  )

  it.each([
    ['null', 'null'],
    ['un arreglo', '[]'],
    ['un texto', '"x"'],
  ])(
    'rechaza un dependency-versions.json válido que es %s y no un objeto, y sale con 1',
    (_description, text) => {
      const root = createWorkspace({ 'package.json': { name: 'raiz' } })
      writeFileSync(join(root, 'scripts', 'dependency-versions.json'), text)
      const result = runScript(root)
      expect(result.status).toBe(1)
      expect(result.stdout).toBe('')
      expect(result.stderr).toBe(
        'scripts/dependency-versions.json: JSON inválido (se esperaba un objeto)\n',
      )
    },
  )

  it('también revisa cuando se lo invoca por un enlace (junction o symlink)', () => {
    const root = createWorkspace({
      'package.json': { devDependencies: { typescript: '^6.0.3' } },
    })
    const result = runScript(createLink(root))
    expect(result.status).toBe(1)
    expect(result.stderr).toContain(
      'package.json: "typescript" declara "^6.0.3" y la versión fijada es "6.0.3"',
    )
  })
})
