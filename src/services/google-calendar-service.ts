import { google, type calendar_v3 } from 'googleapis'
import { readFile } from 'node:fs/promises'

export interface CalendarEventInput {
  summary: string
  description?: string | null
  start: Date
  end: Date
  location?: string | null
}

function toRFC3339(d: Date): string {
  return d.toISOString()
}

export class GoogleCalendarService {
  private calendar: calendar_v3.Calendar | null = null
  private calendarId: string | null = null
  private credentialsPath: string | undefined
  private initPromise: Promise<void> | null = null

  constructor(
    calendarId: string | undefined,
    credentialsPath: string | undefined,
  ) {
    this.credentialsPath = calendarId && credentialsPath ? credentialsPath : undefined
    if (this.credentialsPath) {
      this.calendarId = calendarId ?? null
    }
  }

  private async ensureClient(): Promise<void> {
    if (this.calendar) return
    if (!this.credentialsPath) return
    if (this.initPromise) {
      await this.initPromise
      return
    }
    this.initPromise = this.initClient(this.credentialsPath)
    await this.initPromise
  }

  private async initClient(credentialsPath: string): Promise<void> {
    try {
      const raw = await readFile(credentialsPath, 'utf-8')
      const keys = JSON.parse(raw) as { client_email?: string; private_key?: string }
      if (!keys.client_email || !keys.private_key) {
        return
      }
      const auth = new google.auth.GoogleAuth({
        credentials: keys,
        scopes: ['https://www.googleapis.com/auth/calendar.events'],
      })
      this.calendar = google.calendar({ version: 'v3', auth })
    } catch {
      this.calendar = null
    }
  }

  /** True when calendar ID and credentials path are set (sync should be attempted). */
  public isConfigured(): boolean {
    return this.calendarId !== null && this.credentialsPath !== undefined
  }

  /** True after client has been successfully initialized. */
  public isEnabled(): boolean {
    return this.calendar !== null && this.calendarId !== null
  }

  public async createEvent(input: CalendarEventInput): Promise<string | null> {
    await this.ensureClient()
    if (!this.calendar || !this.calendarId) return null
    try {
      const res = await this.calendar.events.insert({
        calendarId: this.calendarId,
        requestBody: {
          summary: input.summary,
          description: input.description ?? undefined,
          start: { dateTime: toRFC3339(input.start), timeZone: 'UTC' },
          end: { dateTime: toRFC3339(input.end), timeZone: 'UTC' },
          location: input.location ?? undefined,
        },
      })
      return res.data.id ?? null
    } catch {
      return null
    }
  }

  public async updateEvent(
    eventId: string,
    input: CalendarEventInput,
  ): Promise<boolean> {
    await this.ensureClient()
    if (!this.calendar || !this.calendarId) return false
    try {
      await this.calendar.events.patch({
        calendarId: this.calendarId,
        eventId,
        requestBody: {
          summary: input.summary,
          description: input.description ?? undefined,
          start: { dateTime: toRFC3339(input.start), timeZone: 'UTC' },
          end: { dateTime: toRFC3339(input.end), timeZone: 'UTC' },
          location: input.location ?? undefined,
        },
      })
      return true
    } catch {
      return false
    }
  }

  public async deleteEvent(eventId: string): Promise<boolean> {
    await this.ensureClient()
    if (!this.calendar || !this.calendarId) return false
    try {
      await this.calendar.events.delete({
        calendarId: this.calendarId,
        eventId,
      })
      return true
    } catch {
      return false
    }
  }
}
