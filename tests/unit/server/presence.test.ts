import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  addUserPresence,
  removeUserPresence,
  getPresenceList,
  scheduleRemoval,
  cancelRemoval,
  clearAllPresence,
  getCampaignPresence,
} from '../../../server/services/presence'

describe('presence service', () => {
  beforeEach(() => {
    clearAllPresence()
  })

  describe('addUserPresence', () => {
    it('adds a user to the campaign presence', () => {
      addUserPresence('camp-1', 'user-1', 'Alice', 'dm')
      const list = getPresenceList('camp-1')
      expect(list).toHaveLength(1)
      expect(list[0]).toEqual({ userId: 'user-1', name: 'Alice', role: 'dm' })
    })

    it('multiple users in same campaign', () => {
      addUserPresence('camp-1', 'user-1', 'Alice', 'dm')
      addUserPresence('camp-1', 'user-2', 'Bob', 'player')
      expect(getPresenceList('camp-1')).toHaveLength(2)
    })

    it('users in different campaigns are separate', () => {
      addUserPresence('camp-1', 'user-1', 'Alice', 'dm')
      addUserPresence('camp-2', 'user-2', 'Bob', 'player')
      expect(getPresenceList('camp-1')).toHaveLength(1)
      expect(getPresenceList('camp-2')).toHaveLength(1)
    })

    it('re-adding same user updates their info', () => {
      addUserPresence('camp-1', 'user-1', 'Alice', 'player')
      addUserPresence('camp-1', 'user-1', 'Alice', 'editor')
      const list = getPresenceList('camp-1')
      expect(list).toHaveLength(1)
      expect(list[0].role).toBe('editor')
    })
  })

  describe('removeUserPresence', () => {
    it('removes a user from the campaign', () => {
      addUserPresence('camp-1', 'user-1', 'Alice', 'dm')
      addUserPresence('camp-1', 'user-2', 'Bob', 'player')
      removeUserPresence('camp-1', 'user-1')
      const list = getPresenceList('camp-1')
      expect(list).toHaveLength(1)
      expect(list[0].userId).toBe('user-2')
    })

    it('removing last user cleans up campaign map', () => {
      addUserPresence('camp-1', 'user-1', 'Alice', 'dm')
      removeUserPresence('camp-1', 'user-1')
      expect(getPresenceList('camp-1')).toHaveLength(0)
    })

    it('removing non-existent user is a no-op', () => {
      addUserPresence('camp-1', 'user-1', 'Alice', 'dm')
      removeUserPresence('camp-1', 'user-999')
      expect(getPresenceList('camp-1')).toHaveLength(1)
    })
  })

  describe('getPresenceList', () => {
    it('returns empty array for unknown campaign', () => {
      expect(getPresenceList('nonexistent')).toEqual([])
    })

    it('returns userId, name, role for each user', () => {
      addUserPresence('camp-1', 'u1', 'Alice', 'dm')
      addUserPresence('camp-1', 'u2', 'Bob', 'player')
      const list = getPresenceList('camp-1')
      expect(list).toEqual([
        { userId: 'u1', name: 'Alice', role: 'dm' },
        { userId: 'u2', name: 'Bob', role: 'player' },
      ])
    })
  })

  describe('scheduleRemoval', () => {
    it('removes user after grace period', async () => {
      vi.useFakeTimers()
      addUserPresence('camp-1', 'user-1', 'Alice', 'dm')

      const onRemoved = vi.fn()
      scheduleRemoval('camp-1', 'user-1', 5000, onRemoved)

      // Still present before timer fires
      expect(getPresenceList('camp-1')).toHaveLength(1)

      vi.advanceTimersByTime(5000)

      expect(getPresenceList('camp-1')).toHaveLength(0)
      expect(onRemoved).toHaveBeenCalledOnce()

      vi.useRealTimers()
    })

    it('user still present during grace period', () => {
      vi.useFakeTimers()
      addUserPresence('camp-1', 'user-1', 'Alice', 'dm')
      scheduleRemoval('camp-1', 'user-1', 5000)

      vi.advanceTimersByTime(3000)
      // Still within grace period
      expect(getPresenceList('camp-1')).toHaveLength(1)

      vi.useRealTimers()
    })
  })

  describe('cancelRemoval', () => {
    it('cancels a pending removal', () => {
      vi.useFakeTimers()
      addUserPresence('camp-1', 'user-1', 'Alice', 'dm')
      scheduleRemoval('camp-1', 'user-1', 5000)

      const cancelled = cancelRemoval('camp-1', 'user-1')
      expect(cancelled).toBe(true)

      vi.advanceTimersByTime(10000)
      // User should still be present
      expect(getPresenceList('camp-1')).toHaveLength(1)

      vi.useRealTimers()
    })

    it('returns false if no pending removal', () => {
      expect(cancelRemoval('camp-1', 'user-1')).toBe(false)
    })
  })

  describe('addUserPresence cancels pending removal', () => {
    it('re-connecting cancels the grace period removal', () => {
      vi.useFakeTimers()
      addUserPresence('camp-1', 'user-1', 'Alice', 'dm')
      scheduleRemoval('camp-1', 'user-1', 5000)

      // User reconnects within grace period
      vi.advanceTimersByTime(2000)
      addUserPresence('camp-1', 'user-1', 'Alice', 'dm')

      vi.advanceTimersByTime(10000)
      // User should still be present (reconnection cancelled the removal)
      expect(getPresenceList('camp-1')).toHaveLength(1)

      vi.useRealTimers()
    })
  })
})
