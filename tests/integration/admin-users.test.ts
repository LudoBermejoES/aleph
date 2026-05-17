/// <reference types="node" />
import { describe, it, expect, beforeAll } from 'vitest'
import Database from 'better-sqlite3'
import { join } from 'path'
import { apiRaw, signUpAndLogin, signUpAndGetApiKey } from './helpers'

function promoteToAdmin(email: string) {
  const db = new Database(join(process.cwd(), 'data', 'aleph.db'))
  db.prepare('UPDATE user SET role = ? WHERE email = ?').run('admin', email)
  db.close()
}

describe('Admin user management API', () => {
  const adminEmail = `admin-${Date.now()}@example.com`
  const targetEmail = `target-${Date.now()}@example.com`
  const nonAdminEmail = `nonadmin-${Date.now()}@example.com`

  let adminApiKey = ''
  let nonAdminApiKey = ''
  let targetUserId = ''

  beforeAll(async () => {
    // Create admin user, promote via DB, get API key
    await signUpAndLogin(adminEmail, 'password123', 'Admin User')
    promoteToAdmin(adminEmail)
    adminApiKey = await signUpAndGetApiKey(adminEmail, 'password123', 'Admin User')

    // Create non-admin user
    nonAdminApiKey = await signUpAndGetApiKey(nonAdminEmail, 'password123', 'NonAdmin User')

    // Create a target user to edit/delete
    const { cookie, csrfToken } = await signUpAndLogin(targetEmail, 'password123', 'Target User')
    const keyRes = await apiRaw('/api/apikeys', {
      method: 'POST',
      headers: { Cookie: cookie, 'X-CSRF-Token': csrfToken },
      body: { name: 'target-key' },
    })
    const targetKey = (await keyRes.json()).key

    // Get target user's id from the list (using admin)
    const listRes = await apiRaw('/api/admin/users', {
      headers: { 'X-API-Key': adminApiKey },
    })
    const users = await listRes.json()
    const targetUser = users.find((u: { email: string }) => u.email === targetEmail)
    targetUserId = targetUser?.id ?? ''
    void targetKey
  })

  describe('GET /api/admin/users', () => {
    it('returns 200 and user list for admin', async () => {
      const res = await apiRaw('/api/admin/users', {
        headers: { 'X-API-Key': adminApiKey },
      })
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toBeGreaterThan(0)
      expect(data[0]).toHaveProperty('id')
      expect(data[0]).toHaveProperty('name')
      expect(data[0]).toHaveProperty('email')
      expect(data[0]).toHaveProperty('role')
    })

    it('returns 403 for non-admin', async () => {
      const res = await apiRaw('/api/admin/users', {
        headers: { 'X-API-Key': nonAdminApiKey },
      })
      expect(res.status).toBe(403)
    })

    it('returns 401 for unauthenticated', async () => {
      const res = await apiRaw('/api/admin/users')
      expect(res.status).toBe(401)
    })
  })

  describe('PATCH /api/admin/users/:id', () => {
    it('admin can update user name', async () => {
      const res = await apiRaw(`/api/admin/users/${targetUserId}`, {
        method: 'PATCH',
        headers: { 'X-API-Key': adminApiKey },
        body: { name: 'Updated Name' },
      })
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.name).toBe('Updated Name')
    })

    it('admin can update user email', async () => {
      const newEmail = `updated-${Date.now()}@example.com`
      const res = await apiRaw(`/api/admin/users/${targetUserId}`, {
        method: 'PATCH',
        headers: { 'X-API-Key': adminApiKey },
        body: { email: newEmail },
      })
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.email).toBe(newEmail)
    })

    it('admin can update user password', async () => {
      const res = await apiRaw(`/api/admin/users/${targetUserId}`, {
        method: 'PATCH',
        headers: { 'X-API-Key': adminApiKey },
        body: { password: 'newSecure123!' },
      })
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data).not.toHaveProperty('password')
    })

    it('returns 403 for non-admin', async () => {
      const res = await apiRaw(`/api/admin/users/${targetUserId}`, {
        method: 'PATCH',
        headers: { 'X-API-Key': nonAdminApiKey },
        body: { name: 'Hacked' },
      })
      expect(res.status).toBe(403)
    })

    it('returns 404 for nonexistent user', async () => {
      const res = await apiRaw('/api/admin/users/nonexistent-id', {
        method: 'PATCH',
        headers: { 'X-API-Key': adminApiKey },
        body: { name: 'Ghost' },
      })
      expect(res.status).toBe(404)
    })
  })

  describe('DELETE /api/admin/users/:id', () => {
    it('returns 403 when admin tries to delete themselves', async () => {
      // Get admin's own id
      const listRes = await apiRaw('/api/admin/users', { headers: { 'X-API-Key': adminApiKey } })
      const users = await listRes.json()
      const adminUser = users.find((u: { email: string }) => u.email === adminEmail)
      const res = await apiRaw(`/api/admin/users/${adminUser.id}`, {
        method: 'DELETE',
        headers: { 'X-API-Key': adminApiKey },
      })
      expect(res.status).toBe(403)
    })

    it('returns 404 for nonexistent user', async () => {
      const res = await apiRaw('/api/admin/users/nonexistent-id', {
        method: 'DELETE',
        headers: { 'X-API-Key': adminApiKey },
      })
      expect(res.status).toBe(404)
    })

    it('admin can delete a user (204)', async () => {
      const res = await apiRaw(`/api/admin/users/${targetUserId}`, {
        method: 'DELETE',
        headers: { 'X-API-Key': adminApiKey },
      })
      expect(res.status).toBe(204)
    })
  })
})
