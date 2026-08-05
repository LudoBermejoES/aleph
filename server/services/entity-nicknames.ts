/** Trim a raw nickname submission down to its stored form. */
export function normalizeNickname(raw: string): string {
  return raw.trim()
}

/** Case-insensitive duplicate check against an entity's existing nicknames. */
export function isDuplicateNickname(nickname: string, existing: string[]): boolean {
  const lower = nickname.toLowerCase()
  return existing.some((n) => n.toLowerCase() === lower)
}
