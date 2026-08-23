import { listArchives, isBackupConfigured } from '../../../services/backup'
import { requireAdmin } from '../../../utils/requireAdmin'

export default defineEventHandler(async (event) => {
  // Estos tres endpoints comprobaban solo que HUBIERA sesión, no que fuera admin, mientras
  // `admin/users/index.get.ts:7` sí llama a `requireAdmin`. Y el registro está abierto
  // (`emailAndPassword.enabled: true`, sin `disableSignUp`; `/api/auth/sign-up/email` responde
  // 400 de validación, no 404), así que la puerta no era "cualquier usuario autenticado" sino
  // cualquiera con un correo: registrarse y llamar a `restore` con una `key` arbitraria
  // sobrescribía la base de datos viva.
  requireAdmin(event)

  if (!isBackupConfigured()) {
    return { configured: false, archives: [] }
  }

  const archives = await listArchives()

  return {
    configured: true,
    archives: archives.map((a) => ({
      key: a.key,
      size: a.size,
      sizeMB: Math.round((a.size / 1024 / 1024) * 10) / 10,
      lastModified: a.lastModified.toISOString(),
    })),
  }
})
