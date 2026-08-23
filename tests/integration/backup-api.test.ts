/// <reference types="node" />
import { describe, it, expect, beforeAll } from 'vitest'
import Database from 'better-sqlite3'
import { join } from 'path'
import { apiRaw, signUpAndLogin, signUpAndGetApiKey } from './helpers'

// Mismo mecanismo que `admin-users.test.ts:7`: el rol no es asignable desde el registro
// (`auth.ts` declara `role` con `input: false`), así que se promueve escribiendo en la BD.
function promoteToAdmin(email: string) {
  const db = new Database(join(process.cwd(), 'data', 'aleph.db'))
  db.prepare('UPDATE user SET role = ? WHERE email = ?').run('admin', email)
  db.close()
}

/**
 * ESTE FICHERO CODIFICABA LA VULNERABILIDAD COMO COMPORTAMIENTO ESPERADO.
 *
 * Antes afirmaba que un usuario recién registrado —rol `user`, no admin— obtenía **200** de
 * `GET /api/admin/backup` y 200/400 del POST. Eso no era una prueba de una funcionalidad: era
 * la descripción exacta del fallo. Los tres endpoints comprobaban solo que hubiera sesión, y el
 * registro está abierto, así que cualquiera con un correo podía listar copias, lanzar una y
 * —lo grave— restaurar una `key` arbitraria SOBRE la base de datos viva.
 *
 * Ahora afirma la propiedad de seguridad en las dos direcciones: sin sesión 401, con sesión pero
 * sin ser admin 403, y siendo admin pasa. La rama de 403 es la que habría fallado antes del
 * arreglo, y es la que evita que esto vuelva.
 */
describe('Backup Admin API (integration)', () => {
  const ts = Date.now()
  const adminEmail = `backup-admin-${ts}@example.com`
  const userEmail = `backup-user-${ts}@example.com`
  let adminApiKey = ''
  let userApiKey = ''

  beforeAll(async () => {
    await signUpAndLogin(adminEmail, 'password123', 'Backup Admin')
    promoteToAdmin(adminEmail)
    adminApiKey = await signUpAndGetApiKey(adminEmail, 'password123', 'Backup Admin')
    userApiKey = await signUpAndGetApiKey(userEmail, 'password123', 'Backup User')
  })

  it('GET /api/admin/backup returns 401 without auth', async () => {
    expect((await apiRaw('/api/admin/backup')).status).toBe(401)
  })

  it('POST /api/admin/backup returns 401 without auth', async () => {
    expect((await apiRaw('/api/admin/backup', { method: 'POST' })).status).toBe(401)
  })

  it('POST /api/admin/backup/restore returns 401 without auth', async () => {
    const res = await apiRaw('/api/admin/backup/restore', { method: 'POST', body: { key: 'test' } })
    expect(res.status).toBe(401)
  })

  // --- la regresión que importa: autenticado pero NO admin ---------------------------------

  it('GET /api/admin/backup returns 403 for a non-admin user', async () => {
    const res = await apiRaw('/api/admin/backup', { headers: { 'X-API-Key': userApiKey } })
    expect(res.status).toBe(403)
  })

  it('POST /api/admin/backup returns 403 for a non-admin user', async () => {
    const res = await apiRaw('/api/admin/backup', {
      method: 'POST',
      headers: { 'X-API-Key': userApiKey },
    })
    expect(res.status).toBe(403)
  })

  it('POST /api/admin/backup/restore returns 403 for a non-admin user', async () => {
    // El peor de los tres: restaurar sobrescribe la base de datos viva.
    const res = await apiRaw('/api/admin/backup/restore', {
      method: 'POST',
      headers: { 'X-API-Key': userApiKey },
      body: { key: 'arbitrary-archive-key' },
    })
    expect(res.status).toBe(403)
  })

  // --- y que un admin sigue pasando -------------------------------------------------------

  it('GET /api/admin/backup returns the archive list shape for an admin', async () => {
    const res = await apiRaw('/api/admin/backup', { headers: { 'X-API-Key': adminApiKey } })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toHaveProperty('configured')
    expect(data).toHaveProperty('archives')
    expect(Array.isArray(data.archives)).toBe(true)
  })

  it('POST /api/admin/backup reaches the handler for an admin', async () => {
    // 400 si R2 no está configurado en el entorno de pruebas, 200 si lo está. Lo que se prueba
    // es que la guarda deja pasar, no el resultado de la copia.
    const res = await apiRaw('/api/admin/backup', {
      method: 'POST',
      headers: { 'X-API-Key': adminApiKey },
    })
    expect([200, 400]).toContain(res.status)
  })
})
