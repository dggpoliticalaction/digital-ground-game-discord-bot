import type { Client, GuildScheduledEvent } from 'discord.js'
import { createRequire } from 'node:module'

import { DGGP_GUILD_NAME } from '../constants/dggp-guild.js'
import { discordRecurrenceRuleToGoogleRRule } from '../utils/discord-recurrence-to-google-rrule.js'
import type { CalendarEventInput, GoogleCalendarService } from './google-calendar-service.js'
import { Logger } from './logger.js'

const require = createRequire(import.meta.url)
const Logs = require('../../lang/logs.json')

/** Preferred marker on Google event descriptions so listings map back to Discord (no local state). */
const DISCORD_ID_LINE = /Discord scheduled event ID \(sync\):\s*(\d+)/i
/** Legacy sync: description contained only the Discord UI URL. */
const DISCORD_EVENTS_URL = /discord(?:app)?\.com\/events\/\d+\/(\d+)/i

function extractDiscordScheduledEventIdFromGoogleDescription(
  description: string | null | undefined,
): string | null {
  if (!description) return null
  const fromLine = description.match(DISCORD_ID_LINE)?.[1]
  if (fromLine) return fromLine
  const fromUrl = description.match(DISCORD_EVENTS_URL)?.[1]
  if (fromUrl) return fromUrl
  return null
}

const DEFAULT_PAST_MS = 365 * 24 * 60 * 60 * 1000
const DEFAULT_FUTURE_MS = 3 * 365 * 24 * 60 * 60 * 1000
const WINDOW_PAD_MS = 7 * 24 * 60 * 60 * 1000

function discordScheduledEventTimeRange(event: GuildScheduledEvent): { start: Date; end: Date } {
  const start =
    event.scheduledStartAt ??
    (event.scheduledStartTimestamp ? new Date(event.scheduledStartTimestamp) : new Date())
  let end =
    event.scheduledEndAt ??
    (event.scheduledEndTimestamp
      ? new Date(event.scheduledEndTimestamp)
      : new Date(start.getTime() + 60 * 60 * 1000))
  if (end.getTime() <= start.getTime()) {
    end = new Date(start.getTime() + 60 * 60 * 1000)
  }
  return { start, end }
}

/**
 * Time bounds for `events.list`: default range extended by actual Discord event times (and
 * recurrence end), so empty calendars and long-running series still list correctly.
 */
function listWindowForDiscordEvents(discordEvents: Iterable<GuildScheduledEvent>): {
  timeMin: Date
  timeMax: Date
} {
  const now = Date.now()
  let minUtc = now - DEFAULT_PAST_MS
  let maxUtc = now + DEFAULT_FUTURE_MS

  for (const event of discordEvents) {
    const { start, end } = discordScheduledEventTimeRange(event)
    minUtc = Math.min(minUtc, start.getTime())
    maxUtc = Math.max(maxUtc, end.getTime())
    const ruleEnd = event.recurrenceRule?.endTimestamp
    if (ruleEnd != null && Number.isFinite(ruleEnd)) {
      maxUtc = Math.max(maxUtc, ruleEnd)
    }
  }

  return {
    timeMin: new Date(minUtc - WINDOW_PAD_MS),
    timeMax: new Date(maxUtc + WINDOW_PAD_MS),
  }
}

export function buildCalendarInputFromDiscordEvent(event: GuildScheduledEvent): CalendarEventInput {
  const { start, end } = discordScheduledEventTimeRange(event)
  const baseDescription = event.description
    ? `${event.description}\n\nSynced from DGGP Discord: ${event.url}`
    : `Synced from DGGP Discord: ${event.url}`
  const description = `${baseDescription}\n\nDiscord scheduled event ID (sync): ${event.id}`
  const location =
    event.entityMetadata && 'location' in event.entityMetadata
      ? (event.entityMetadata.location ?? null)
      : null

  let recurrence: string[] | null = null
  if (event.recurrenceRule) {
    const rrule = discordRecurrenceRuleToGoogleRRule(event.recurrenceRule, start)
    if (rrule) {
      recurrence = [rrule]
    } else {
      Logger.warn(
        `Calendar sync: Discord event ${event.id} has a recurrence rule that could not be mapped to Google RRULE; creating a single instance only.`,
      )
    }
  }

  return {
    summary: event.name,
    description,
    start,
    end,
    location,
    recurrence,
  }
}

/**
 * Reconcile: list Google Calendar events, compare to DGGP Discord scheduled events, create only
 * those Discord events that are not already represented on Google (matched by id in description).
 */
export async function syncDggpScheduledEventsToGoogle(
  client: Client,
  calendarService: GoogleCalendarService,
): Promise<void> {
  if (!calendarService.isConfigured()) {
    Logger.info(
      'Calendar sync: skipped — set GOOGLE_CALENDAR_ID and GOOGLE_APPLICATION_CREDENTIALS (or GOOGLE_CALENDAR_CREDENTIALS).',
    )
    return
  }

  if (!(await calendarService.ensureInitialized())) {
    return
  }

  const guild = client.guilds.cache.find(
    (g) => g.name === DGGP_GUILD_NAME || g.name === 'DGGPATestServer',
  )
  if (!guild) {
    Logger.info(`Calendar sync: guild "${DGGP_GUILD_NAME}" not in cache; skip.`)
    return
  }

  let events
  try {
    events = await guild.scheduledEvents.fetch()
  } catch (error) {
    Logger.error(Logs.error.calendarSync.replace('{EVENT_NAME}', 'scheduledEvents.fetch'), error)
    return
  }

  const { timeMin, timeMax } = listWindowForDiscordEvents(events.values())
  const googleEvents = await calendarService.listEventsBetween(timeMin, timeMax)
  if (googleEvents.length === 0) {
    Logger.info(
      'Calendar sync: Google Calendar returned no events in this sync window (empty or brand-new calendar is expected); will create Google events for any Discord events not already synced.',
    )
  }
  Logger.info(
    `Calendar sync: loaded ${googleEvents.length} Google Calendar event(s) in window ${timeMin.toISOString()} → ${timeMax.toISOString()}.`,
  )

  const discordIdToGoogleId = new Map<string, string>()
  googleEvents.forEach((ge) => {
    const discordEventId = extractDiscordScheduledEventIdFromGoogleDescription(ge.description)
    if (!discordEventId) {
      return
    }
    // Recurring Google series expanded with singleEvents=true yields many instances sharing one
    // Discord id in the description; keep the first id only.
    if (!discordIdToGoogleId.has(discordEventId)) {
      discordIdToGoogleId.set(discordEventId, ge.id)
    }
  })
  Logger.info(
    `Calendar sync: ${discordIdToGoogleId.size} Google event(s) tied to a Discord scheduled event id (matched in description).`,
  )

  let created = 0
  let skipped = 0

  for (const event of events.values()) {
    const input = buildCalendarInputFromDiscordEvent(event)
    Logger.info(
      `Calendar sync (Discord): id=${event.id} name=${JSON.stringify(event.name)} start=${input.start.toISOString()} end=${input.end.toISOString()} status=${event.status} url=${event.url}`,
    )

    if (discordIdToGoogleId.has(event.id)) {
      skipped++
      continue
    }

    try {
      const googleEventId = await calendarService.createEvent(input)
      if (googleEventId) {
        created++
        Logger.info(
          `Calendar sync (Google): CREATED discordId=${event.id} googleEventId=${googleEventId} summary=${JSON.stringify(input.summary)}`,
        )
      } else {
        Logger.warn(
          `Calendar sync (Google): CREATE returned no id for discordId=${event.id} summary=${JSON.stringify(input.summary)}`,
        )
      }
    } catch (error) {
      Logger.error(Logs.error.calendarSync.replace('{EVENT_NAME}', event.name), error)
    }
  }

  Logger.info(
    `Calendar sync job finished: ${events.size} Discord event(s); ${skipped} already on Google; ${created} created.`,
  )
}
