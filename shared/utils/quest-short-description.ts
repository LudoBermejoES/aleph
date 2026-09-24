/**
 * The cap on a quest's short description (add-quest-short-description, design D3).
 *
 * This number is NOT a style preference: it is the only thing that makes the quests list's promise
 * true. The list renders `shortDescription` whole -- no ellipsis, no `line-clamp` -- so "it always
 * fits" has to be guaranteed by the field's length, not by CSS. Remove the cap and the list is back
 * to the wall of text that `buildExcerpt` was introduced to stop.
 *
 * It lives here, in exactly one module, because three layers need it: the server's zod schema (the
 * only enforcement that cannot be bypassed), the form's character counter, and the tests. Written
 * out by hand in each of them it becomes a 200, a 250 and a 200 the first time someone adjusts it,
 * and the disagreement only surfaces when a save fails with a message the UI swore was impossible.
 *
 * 200 fits two card lines at phone width. The sibling precedent, `entities.board_summary`, uses 120,
 * which suits a graph label but is too tight for the point of a quest.
 */
export const QUEST_SHORT_DESCRIPTION_MAX_LENGTH = 200
