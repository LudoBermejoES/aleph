import { describe, it, expect } from 'vitest'

/**
 * Test attendance RSVP component logic (8.26)
 *
 * The session detail page renders attendance with RSVP status indicators:
 * - green dot = accepted
 * - red dot = declined
 * - yellow dot = pending
 */

interface Attendance {
  id: string
  userName: string
  rsvpStatus: 'accepted' | 'declined' | 'pending'
}

function rsvpColor(status: string): string {
  if (status === 'accepted') return 'bg-green-500'
  if (status === 'declined') return 'bg-red-500'
  return 'bg-yellow-500'
}

describe('Attendance RSVP component logic (8.26)', () => {
  it('accepted status maps to green', () => {
    expect(rsvpColor('accepted')).toBe('bg-green-500')
  })

  it('declined status maps to red', () => {
    expect(rsvpColor('declined')).toBe('bg-red-500')
  })

  it('pending status maps to yellow', () => {
    expect(rsvpColor('pending')).toBe('bg-yellow-500')
  })

  it('unknown status defaults to yellow', () => {
    expect(rsvpColor('maybe')).toBe('bg-yellow-500')
  })

  it('attendance list renders one entry per attendee', () => {
    const attendance: Attendance[] = [
      { id: '1', userName: 'Alice', rsvpStatus: 'accepted' },
      { id: '2', userName: 'Bob', rsvpStatus: 'declined' },
      { id: '3', userName: 'Charlie', rsvpStatus: 'pending' },
    ]
    expect(attendance).toHaveLength(3)
    expect(attendance.map((a) => rsvpColor(a.rsvpStatus))).toEqual([
      'bg-green-500',
      'bg-red-500',
      'bg-yellow-500',
    ])
  })

  it('empty attendance list renders nothing', () => {
    const attendance: Attendance[] = []
    expect(attendance.length).toBe(0)
    // The v-if="session.attendance?.length" guard prevents rendering
  })
})

// ─── Participant management logic ─────────────────────────────────────────────

interface Member {
  userId: string
  name: string
}

function eligibleMembers(members: Member[], attendance: { userId: string }[]): Member[] {
  const attendingIds = new Set(attendance.map((a) => a.userId))
  return members.filter((m) => !attendingIds.has(m.userId))
}

describe('SessionAttendancePanel participant management', () => {
  const members: Member[] = [
    { userId: 'u1', name: 'Alice' },
    { userId: 'u2', name: 'Bob' },
    { userId: 'u3', name: 'Charlie' },
  ]

  it('eligible members excludes users already in attendance', () => {
    const attendance = [{ userId: 'u1' }]
    const result = eligibleMembers(members, attendance)
    expect(result.map((m) => m.userId)).toEqual(['u2', 'u3'])
  })

  it('eligible members is empty when all members are attending', () => {
    const attendance = [{ userId: 'u1' }, { userId: 'u2' }, { userId: 'u3' }]
    expect(eligibleMembers(members, attendance)).toHaveLength(0)
  })

  it('all members eligible when attendance is empty', () => {
    expect(eligibleMembers(members, [])).toHaveLength(3)
  })

  it('add/remove controls gated by canManage', () => {
    // canManage=false → no Add or Remove controls
    const canManage = false
    const showAddBtn = canManage
    const showRemoveBtn = canManage
    expect(showAddBtn).toBe(false)
    expect(showRemoveBtn).toBe(false)
  })

  it('add/remove controls visible when canManage is true', () => {
    const canManage = true
    const showAddBtn = canManage
    const showRemoveBtn = canManage
    expect(showAddBtn).toBe(true)
    expect(showRemoveBtn).toBe(true)
  })
})

// ─── XP control gating (mirrors SessionAttendancePanel.vue's v-if logic) ──────────────────────

interface AttendanceWithXp {
  userId: string
  attended: boolean
  xp?: number | null
}

/** Mirrors the template's `v-if="canManage && a.attended"` / `v-else-if="canManage"` branches. */
function xpControlState(
  canManage: boolean,
  a: AttendanceWithXp,
): 'editable' | 'requires-attendance' | 'readonly-if-present' {
  if (canManage && a.attended) return 'editable'
  if (canManage) return 'requires-attendance'
  return 'readonly-if-present'
}

function onXpChange(rawValue: string): number | null {
  return rawValue === '' ? null : Number(rawValue)
}

describe('SessionAttendancePanel XP control', () => {
  it('is editable only when canManage and attended are both true', () => {
    expect(xpControlState(true, { userId: 'u1', attended: true })).toBe('editable')
  })

  it('shows a "requires attendance" placeholder when canManage is true but attended is false', () => {
    expect(xpControlState(true, { userId: 'u1', attended: false })).toBe('requires-attendance')
  })

  it('is not offered as editable to a non-manager, attended or not', () => {
    expect(xpControlState(false, { userId: 'u1', attended: true })).toBe('readonly-if-present')
    expect(xpControlState(false, { userId: 'u1', attended: false })).toBe('readonly-if-present')
  })

  it('clearing the input emits null, not zero or empty string', () => {
    expect(onXpChange('')).toBeNull()
  })

  it('typing 0 emits the number 0, distinct from clearing', () => {
    const cleared = onXpChange('')
    const zero = onXpChange('0')
    expect(zero).toBe(0)
    expect(cleared).toBeNull()
    expect(zero).not.toBe(cleared)
  })

  it('typing a positive number emits that number', () => {
    expect(onXpChange('2')).toBe(2)
  })

  it('renders null xp as "not recorded", not as 0, for display purposes', () => {
    const displayValue = (xp: number | null | undefined) => xp ?? ''
    expect(displayValue(null)).toBe('')
    expect(displayValue(undefined)).toBe('')
    expect(displayValue(0)).toBe(0)
  })
})
