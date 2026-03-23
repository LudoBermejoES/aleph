import { db } from '../../db'
import { entities } from '../../db/schema'

export default defineEventHandler(async () => {
  const allEntities = db.select().from(entities).all()
  return allEntities
})
