import { describe, it, expect, vi, beforeEach } from 'vitest'
import { registerBroadcast, emitCampaignNotification } from '../../../server/utils/broadcast'

describe('broadcast utility', () => {
  beforeEach(() => {
    // Reset by registering a fresh mock
    registerBroadcast(vi.fn())
  })

  it('registerBroadcast stores the function', () => {
    const fn = vi.fn()
    registerBroadcast(fn)
    emitCampaignNotification('camp-1', 'Entity created')
    expect(fn).toHaveBeenCalledOnce()
  })

  it('emitCampaignNotification calls broadcast with correct JSON', () => {
    const fn = vi.fn()
    registerBroadcast(fn)
    emitCampaignNotification('camp-1', 'Strahd was updated', 'entity-update', 'user-42')

    expect(fn).toHaveBeenCalledWith('camp-1', expect.any(String))
    const payload = JSON.parse(fn.mock.calls[0][1])
    expect(payload.type).toBe('notification')
    expect(payload.campaignId).toBe('camp-1')
    expect(payload.message).toBe('Strahd was updated')
    expect(payload.notificationType).toBe('entity-update')
    expect(payload.actorUserId).toBe('user-42')
    expect(payload.timestamp).toBeGreaterThan(0)
  })

  it('emitCampaignNotification defaults notificationType to info', () => {
    const fn = vi.fn()
    registerBroadcast(fn)
    emitCampaignNotification('camp-1', 'Hello')

    const payload = JSON.parse(fn.mock.calls[0][1])
    expect(payload.notificationType).toBe('info')
  })

  it('emitCampaignNotification no-ops when no broadcast registered', () => {
    // Register null by casting (simulate no WS handler loaded)
    registerBroadcast(null as any)
    // Should not throw
    expect(() => emitCampaignNotification('camp-1', 'Test')).not.toThrow()
  })
})
