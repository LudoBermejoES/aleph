export default defineEventHandler(() => {
  throw createError({ statusCode: 405, message: 'Transactions are immutable and cannot be deleted' })
})
