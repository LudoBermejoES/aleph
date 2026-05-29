import type { Calendar, CalendarDate, CalendarEvent, Timeline } from '~/types/api'

export function useCalendarApi(campaignId: string) {
  const base = `/api/campaigns/${campaignId}`

  // ─── Calendars ──────────────────────────────────────────────────────────────

  function getCalendars() {
    return $fetch<Calendar[]>(`${base}/calendars`)
  }

  function getCalendar(calendarId: string) {
    return $fetch<Calendar>(`${base}/calendars/${calendarId}`)
  }

  function createCalendar(body: Record<string, unknown>) {
    return $fetch<Calendar>(`${base}/calendars`, { method: 'POST', body })
  }

  function updateCalendar(calendarId: string, body: Record<string, unknown>) {
    return $fetch<Calendar>(`${base}/calendars/${calendarId}`, { method: 'PUT', body })
  }

  function deleteCalendar(calendarId: string) {
    return $fetch(`${base}/calendars/${calendarId}`, { method: 'DELETE' })
  }

  function getCalendarEvents(calendarId: string, params?: Record<string, string | number>) {
    return $fetch<CalendarEvent[]>(`${base}/calendars/${calendarId}/events`, { params })
  }

  function advanceCalendarDate(calendarId: string, body: Record<string, unknown>) {
    return $fetch<{ currentDate: CalendarDate }>(`${base}/calendars/${calendarId}/advance`, {
      method: 'POST',
      body,
    })
  }

  function deleteCalendarEvent(calendarId: string, eventId: string) {
    return $fetch(`${base}/calendars/${calendarId}/events/${eventId}`, { method: 'DELETE' })
  }

  // ─── Timelines ──────────────────────────────────────────────────────────────

  function getTimelines() {
    return $fetch<Timeline[]>(`${base}/timelines`)
  }

  function getTimeline(slug: string) {
    return $fetch<Timeline>(`${base}/timelines/${slug}`)
  }

  function createTimeline(body: Record<string, unknown>) {
    return $fetch<Timeline>(`${base}/timelines`, { method: 'POST', body })
  }

  function updateTimeline(slug: string, body: Record<string, unknown>) {
    return $fetch<Timeline>(`${base}/timelines/${slug}`, { method: 'PUT', body })
  }

  function deleteTimeline(slug: string) {
    return $fetch(`${base}/timelines/${slug}`, { method: 'DELETE' })
  }

  function createTimelineEvent(slug: string, body: Record<string, unknown>) {
    return $fetch(`${base}/timelines/${slug}/events`, { method: 'POST', body })
  }

  function deleteTimelineEvent(timelineSlug: string, eventId: string) {
    return $fetch(`${base}/timelines/${timelineSlug}/events/${eventId}`, { method: 'DELETE' })
  }

  return {
    // Calendars
    getCalendars,
    getCalendar,
    createCalendar,
    updateCalendar,
    deleteCalendar,
    getCalendarEvents,
    advanceCalendarDate,
    deleteCalendarEvent,
    // Timelines
    getTimelines,
    getTimeline,
    createTimeline,
    updateTimeline,
    deleteTimeline,
    createTimelineEvent,
    deleteTimelineEvent,
  }
}
