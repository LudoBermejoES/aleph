/**
 * Radial layout: distribute `count` positions evenly in a circle.
 * Pure math — importable from Vue components for client-side use.
 */
export function radialLayout(
  centerX: number,
  centerY: number,
  count: number,
  radius: number,
): Array<{ x: number; y: number }> {
  if (count === 0) return []
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * 2 * Math.PI - Math.PI / 2
    return {
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius,
    }
  })
}
