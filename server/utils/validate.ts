import { type ZodSchema, ZodError, type ZodIssue } from 'zod'
import { readBody, createError } from 'h3'
import type { H3Event } from 'h3'

export async function validateBody<T>(event: H3Event, schema: ZodSchema<T>): Promise<T> {
  const body = await readBody(event)
  try {
    return schema.parse(body)
  } catch (err) {
    if (err instanceof ZodError) {
      const issues: ZodIssue[] = (err as ZodError).issues
      throw createError({
        statusCode: 422,
        message: 'Validation failed',
        data: {
          errors: issues.map((e: ZodIssue) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
      })
    }
    throw err
  }
}
