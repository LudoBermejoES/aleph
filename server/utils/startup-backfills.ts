/**
 * Whether `server/plugins/watcher.ts` should run its one-time data backfills on boot.
 *
 * The backfills are the right thing in production — they are how an index that predates a
 * feature ever gets populated — but they are also the reason a fresh checkout could not run
 * `nuxt dev` or `npm run test:integration` on some machines: the embedding backfill drags
 * `@huggingface/transformers` -> `onnxruntime-node` into the boot path, and that native addon
 * cannot be loaded twice in one process. Once the dev server reloads its server bundle, the
 * second `dlopen` is rejected and EVERY api route answers
 * `500 Module did not self-register: .../onnxruntime_binding.node`.
 *
 * So this is an escape hatch, not a feature: unset (the default, and what production runs) the
 * backfills run exactly as before. `STARTUP_BACKFILLS_ENABLED=false` skips them for this
 * process only, changing no data and no schema.
 *
 * Naming and shape deliberately mirror `SEARCH_SEMANTIC_ENABLED` in `nuxt.config.ts`: the
 * string `'false'` is the ONLY value that disables it, so a typo (`0`, `no`, `FALSE`) leaves
 * the safe behaviour in place rather than silently turning production's backfills off.
 */
export function startupBackfillsEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return env.STARTUP_BACKFILLS_ENABLED !== 'false'
}
