/**
 * A one-shot "run once ready" gate for focusing a pin identified in the map's own URL
 * (`?pin=<id>`, show-entity-map-pins/design.md D3).
 *
 * `MapViewer.client.vue`'s `focusPin` looks a pin up in `markerPins`, which is populated
 * asynchronously (Leaflet loads, then `renderPins` runs) after the component mounts. Reading
 * the query string and calling `focusPin` from a point that runs BEFORE that population
 * finds nothing and returns -- no error, no retry, the request is silently lost (design.md:
 * "the page looks merely ordinary"). This queues at most one pending pin id and replays it
 * exactly once `markReady()` is called, so it no longer matters which of the two -- the URL
 * being read, or the markers finishing their async load -- happens first.
 *
 * Deliberately framework- and Leaflet-free: the actual race is unrenderable in this repo's
 * test setup (no jsdom+Leaflet component-mount precedent), but this is the piece of logic
 * that decides correctness, and it is fully testable in isolation.
 */
export interface PinFocusGate {
  /** Ask for `pinId` to be focused. Runs immediately if the gate is already ready, otherwise
   *  queues it (replacing any earlier still-pending request -- only the latest one matters). */
  request(pinId: string): void
  /** Mark markers as ready. Replays the pending request, if any, exactly once. Idempotent:
   *  calling it again with nothing pending is a no-op, and it never re-fires a request that
   *  already ran. */
  markReady(): void
}

export function createPinFocusGate(focus: (pinId: string) => void): PinFocusGate {
  let ready = false
  let pending: string | null = null

  return {
    request(pinId: string) {
      if (ready) {
        focus(pinId)
        return
      }
      pending = pinId
    },
    markReady() {
      ready = true
      if (pending === null) return
      const pinId = pending
      pending = null
      focus(pinId)
    },
  }
}
