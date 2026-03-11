import type { GuildScheduledEvent, PartialGuildScheduledEvent } from 'discord.js'

import { Logger } from '../services/index.js'
import type { GoogleCalendarService } from '../services/google-calendar-service.js'
import {
  getGoogleEventId,
  removeSyncEntry,
  setGoogleEventId,
} from '../services/calendar-sync-store.js'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const Logs = require('../../lang/logs.json')

const DGGP_GUILD_NAME = 'DGG Political Action'

function buildCalendarInput(event: GuildScheduledEvent): {
  summary: string
  description: string | null
  start: Date
  end: Date
  location: string | null
} {
  const start =
    event.scheduledStartAt ?? (event.scheduledStartTimestamp ? new Date(event.scheduledStartTimestamp) : new Date())
  const end =
    event.scheduledEndAt ??
    (event.scheduledEndTimestamp ? new Date(event.scheduledEndTimestamp) : new Date(start.getTime() + 60 * 60 * 1000))
  const desc = event.description
    ? `${event.description}\n\nSynced from DGGP Discord: ${event.url}`
    : `Synced from DGGP Discord: ${event.url}`
  const location =
    event.entityMetadata && 'location' in event.entityMetadata ? event.entityMetadata.location ?? null : null
  return {
    summary: event.name,
    description: desc,
    start,
    end,
    location,
  }
}

function isDggpGuild(event: GuildScheduledEvent | PartialGuildScheduledEvent): boolean {
  const guild = event.guild
  return guild !== null && guild !== undefined && guild.name === DGGP_GUILD_NAME
}

export class GuildScheduledEventHandler {
  constructor(
    private calendarService: GoogleCalendarService,
    private statePath?: string,
  ) {}

  public async processCreate(event: GuildScheduledEvent): Promise<void> {
    if (!isDggpGuild(event) || !this.calendarService.isConfigured()) {
      return
    }
    try {
      const input = buildCalendarInput(event)
      const googleEventId = await this.calendarService.createEvent(input)
      if (googleEventId) {
        await setGoogleEventId(event.id, googleEventId, this.statePath)
        Logger.info(Logs.info.calendarSyncCreated.replace('{EVENT_NAME}', event.name))
      }
    } catch (error) {
      Logger.error(Logs.error.calendarSync.replace('{EVENT_NAME}', event.name), error)
    }
  }

  public async processUpdate(event: GuildScheduledEvent): Promise<void> {
    if (!isDggpGuild(event) || !this.calendarService.isConfigured()) {
      return
    }
    try {
      const googleEventId = await getGoogleEventId(event.id, this.statePath)
      if (!googleEventId) return
      const input = buildCalendarInput(event)
      const ok = await this.calendarService.updateEvent(googleEventId, input)
      if (ok) {
        Logger.info(Logs.info.calendarSyncUpdated.replace('{EVENT_NAME}', event.name))
      }
    } catch (error) {
      Logger.error(Logs.error.calendarSync.replace('{EVENT_NAME}', event.name), error)
    }
  }

  public async processDelete(event: GuildScheduledEvent | PartialGuildScheduledEvent): Promise<void> {
    // We only sync events for DGGP; if we have a mapping, this event was from DGGP (guild may be missing on partial)
    if (!this.calendarService.isConfigured()) {
      return
    }
    try {
      const googleEventId = await getGoogleEventId(event.id, this.statePath)
      if (!googleEventId) return
      const ok = await this.calendarService.deleteEvent(googleEventId)
      if (ok) {
        await removeSyncEntry(event.id, this.statePath)
        const eventName = event.name ?? 'Scheduled event'
        Logger.info(Logs.info.calendarSyncDeleted.replace('{EVENT_NAME}', eventName))
      }
    } catch (error) {
      Logger.error(Logs.error.calendarSync.replace('{EVENT_NAME}', event.name), error)
    }
  }
}
