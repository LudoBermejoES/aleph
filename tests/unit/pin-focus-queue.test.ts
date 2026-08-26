import { describe, it, expect, vi } from 'vitest'
import { createPinFocusGate } from '../../app/utils/pinFocusQueue'

// show-entity-map-pins/design.md D3, task 4.3: "write a test that fails when [focusing] is
// triggered too early" -- the race is a MapViewer/Leaflet timing problem that this repo has
// no jsdom+Leaflet component-mount precedent to reproduce directly, so these exercise the
// piece of logic that actually decides correctness: whether a request made BEFORE readiness
// is lost (the bug) or replayed once ready (the fix), independent of Leaflet/DOM entirely.

describe('createPinFocusGate (show-entity-map-pins/design.md D3)', () => {
  it('does NOT focus immediately when requested before the gate is ready -- this is the exact bug: an early call must not silently fire with markers absent', () => {
    const focus = vi.fn()
    const gate = createPinFocusGate(focus)

    gate.request('pin-1')

    expect(focus).not.toHaveBeenCalled()
  })

  it('replays a request made before readiness exactly once markReady() fires, rather than losing it', () => {
    const focus = vi.fn()
    const gate = createPinFocusGate(focus)

    gate.request('pin-1')
    gate.markReady()

    expect(focus).toHaveBeenCalledTimes(1)
    expect(focus).toHaveBeenCalledWith('pin-1')
  })

  it('a request made AFTER readiness runs immediately, with no queueing', () => {
    const focus = vi.fn()
    const gate = createPinFocusGate(focus)

    gate.markReady()
    gate.request('pin-1')

    expect(focus).toHaveBeenCalledTimes(1)
    expect(focus).toHaveBeenCalledWith('pin-1')
  })

  it('markReady with nothing pending is a no-op', () => {
    const focus = vi.fn()
    const gate = createPinFocusGate(focus)

    gate.markReady()

    expect(focus).not.toHaveBeenCalled()
  })

  it('markReady only ever replays a pending request once, even if called again later', () => {
    const focus = vi.fn()
    const gate = createPinFocusGate(focus)

    gate.request('pin-1')
    gate.markReady()
    gate.markReady()

    expect(focus).toHaveBeenCalledTimes(1)
  })

  it('only the LATEST pending request survives if request() is called more than once before ready', () => {
    const focus = vi.fn()
    const gate = createPinFocusGate(focus)

    gate.request('pin-1')
    gate.request('pin-2')
    gate.markReady()

    expect(focus).toHaveBeenCalledTimes(1)
    expect(focus).toHaveBeenCalledWith('pin-2')
  })

  it('a request after a replay already happened runs immediately (ready stays true)', () => {
    const focus = vi.fn()
    const gate = createPinFocusGate(focus)

    gate.request('pin-1')
    gate.markReady()
    gate.request('pin-2')

    expect(focus).toHaveBeenNthCalledWith(1, 'pin-1')
    expect(focus).toHaveBeenNthCalledWith(2, 'pin-2')
    expect(focus).toHaveBeenCalledTimes(2)
  })
})
