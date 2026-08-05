import type React from 'react'
import { useEditor } from 'tldraw'

/** Long edge (image area only) used to fit a full-bleed image to its natural ratio. */
export const ASPECT_FIT_TARGET_LONG_EDGE = 160

/**
 * Compute the shape's target width/height for a loaded image's aspect ratio, so 16:9 stays
 * 16:9, 2:3 stays 2:3, etc. — no letterboxing or forced cropping. `chromeHeight` is the
 * non-image space below the image (name row, tags row, label bar...), added on top of the
 * fitted image area.
 */
export function fitImageToAspectRatio(
  ratio: number,
  targetLongEdge: number,
  chromeHeight: number,
): { w: number; h: number } {
  const w = ratio >= 1 ? targetLongEdge : Math.round(targetLongEdge * ratio)
  const imageAreaH = ratio >= 1 ? Math.round(targetLongEdge / ratio) : targetLongEdge
  return { w, h: imageAreaH + chromeHeight }
}

/**
 * Whether a freshly-loaded image's ratio should be skipped (not re-fitted). True once the
 * shape's stored `aspectRatio` already matches the loaded image within a small epsilon —
 * this is what lets a user's manual resize afterward (which leaves `aspectRatio` untouched)
 * survive future re-renders/reloads instead of being silently overwritten.
 */
export function shouldSkipRefit(currentAspectRatio: number | undefined, newRatio: number): boolean {
  return !!currentAspectRatio && Math.abs(currentAspectRatio - newRatio) < 0.01
}

/**
 * Shared "fit the shape to its loaded image's true aspect ratio" behavior, used by every
 * card-style shape that shows a full-bleed portrait/crest/photo (location, character,
 * organization). Each shape passes its own `chromeHeight` since the non-image chrome
 * differs per shape and can vary per instance (e.g. optional tags row).
 */
export function useImageAspectFit<TType extends string>(
  shapeId: string,
  shapeType: TType,
  currentAspectRatio: number | undefined,
) {
  const editor = useEditor()

  return function handleImageLoad(e: React.SyntheticEvent<HTMLImageElement>, chromeHeight: number) {
    const img = e.currentTarget
    if (!img.naturalWidth || !img.naturalHeight) return
    const ratio = img.naturalWidth / img.naturalHeight
    if (shouldSkipRefit(currentAspectRatio, ratio)) return

    const { w, h } = fitImageToAspectRatio(ratio, ASPECT_FIT_TARGET_LONG_EDGE, chromeHeight)
    editor.updateShape({ id: shapeId, type: shapeType, props: { w, h, aspectRatio: ratio } })
  }
}
