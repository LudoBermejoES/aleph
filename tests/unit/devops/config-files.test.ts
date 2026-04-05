import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const root = join(__dirname, '../../..')

describe('DevOps config files', () => {
  it('.env.example exists and contains expected variable names', () => {
    const path = join(root, '.env.example')
    expect(existsSync(path), '.env.example must exist').toBe(true)
    const content = readFileSync(path, 'utf-8')
    expect(content).toContain('BETTER_AUTH_SECRET')
    expect(content).toContain('BETTER_AUTH_URL')
    expect(content).toContain('NODE_ENV')
    expect(content).toContain('NUXT_PUBLIC_HOCUSPOCUS_URL')
  })

  it('.prettierrc exists and contains expected keys', () => {
    const path = join(root, '.prettierrc')
    expect(existsSync(path), '.prettierrc must exist').toBe(true)
    const config = JSON.parse(readFileSync(path, 'utf-8'))
    expect(config.semi).toBe(false)
    expect(config.singleQuote).toBe(true)
    expect(config.trailingComma).toBe('all')
    expect(config.printWidth).toBe(100)
  })

  it('package.json has format, format:check, and prepare scripts', () => {
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf-8'))
    expect(pkg.scripts.format).toBeDefined()
    expect(pkg.scripts['format:check']).toBeDefined()
    expect(pkg.scripts.prepare).toBeDefined()
  })

  it('docker-compose.yml contains env_file', () => {
    const path = join(root, 'docker-compose.yml')
    expect(existsSync(path), 'docker-compose.yml must exist').toBe(true)
    const content = readFileSync(path, 'utf-8')
    expect(content).toContain('env_file')
  })
})
