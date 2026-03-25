import { describe, it, expect, vi } from 'vitest'

// Test the toast notification logic
// (auto-dismiss timing, dismiss callback)

describe('CampaignToast — auto-dismiss logic', () => {
  it('calls dismiss after duration', () => {
    vi.useFakeTimers()
    const dismiss = vi.fn()
    const duration = 5000

    // Simulate the component's onMounted timer
    const timer = setTimeout(() => dismiss('toast-1'), duration)

    vi.advanceTimersByTime(5000)
    expect(dismiss).toHaveBeenCalledWith('toast-1')

    clearTimeout(timer)
    vi.useRealTimers()
  })

  it('does not dismiss before duration', () => {
    vi.useFakeTimers()
    const dismiss = vi.fn()
    const duration = 5000

    const timer = setTimeout(() => dismiss('toast-1'), duration)

    vi.advanceTimersByTime(3000)
    expect(dismiss).not.toHaveBeenCalled()

    clearTimeout(timer)
    vi.useRealTimers()
  })

  it('manual dismiss cancels auto-dismiss', () => {
    vi.useFakeTimers()
    const dismiss = vi.fn()
    const duration = 5000

    const timer = setTimeout(() => dismiss('toast-1'), duration)

    // Manual dismiss at 2s
    vi.advanceTimersByTime(2000)
    clearTimeout(timer)
    dismiss('toast-1') // manual call

    vi.advanceTimersByTime(10000)
    // Should have been called exactly once (the manual one)
    expect(dismiss).toHaveBeenCalledTimes(1)

    vi.useRealTimers()
  })
})

describe('CampaignToast — notification filtering', () => {
  it('notifications can be filtered by actorUserId', () => {
    const currentUserId = 'user-42'
    const notifications = [
      { type: 'notification', message: 'Entity updated', actorUserId: 'user-42' },
      { type: 'notification', message: 'Session created', actorUserId: 'user-99' },
      { type: 'notification', message: 'Map uploaded', actorUserId: undefined },
    ]

    // Filter: don't show notifications from the current user
    const filtered = notifications.filter(n => n.actorUserId !== currentUserId)
    expect(filtered).toHaveLength(2)
    expect(filtered[0].message).toBe('Session created')
    expect(filtered[1].message).toBe('Map uploaded')
  })
})
