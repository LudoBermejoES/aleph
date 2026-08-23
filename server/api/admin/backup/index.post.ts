import { isBackupConfigured } from '../../../services/backup'
import { requireAdmin } from '../../../utils/requireAdmin'
import { logger } from '../../../utils/logger'

export default defineEventHandler(async (event) => {
  // Estos tres endpoints comprobaban solo que HUBIERA sesión, no que fuera admin, mientras
  // `admin/users/index.get.ts:7` sí llama a `requireAdmin`. Y el registro está abierto
  // (`emailAndPassword.enabled: true`, sin `disableSignUp`; `/api/auth/sign-up/email` responde
  // 400 de validación, no 404), así que la puerta no era "cualquier usuario autenticado" sino
  // cualquiera con un correo: registrarse y llamar a `restore` con una `key` arbitraria
  // sobrescribía la base de datos viva.
  const user = requireAdmin(event)

  if (!isBackupConfigured()) {
    throw createError({ statusCode: 400, message: 'Backup R2 credentials not configured' })
  }

  logger.info('backup: manual backup triggered', { userId: user.id })

  const result = await runTask('backup:run')

  return result
})
