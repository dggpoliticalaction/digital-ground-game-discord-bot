import { Job } from './index.js'
import { Logger } from '../services/index.js'
import { Guild, GuildScheduledEvent } from 'discord.js'

import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const Logs = require('../../lang/logs.json')
const Config = require('../../config/config.json')

export class EventNotificationJob extends Job {
  public name = 'Event {ID} Notification'
  public schedule: string
  public log: boolean = true
  public override runOnce: boolean = true
  public override initialDelaySecs: number = 0

  private eventID: string
  private reminderTimes: number[] = Config.jobs.eventNotification.reminderTimesInMins

  constructor(event: GuildScheduledEvent) {
    super()

    // Update the event title and schedule
    this.schedule = this.scheduleFromDate(event.scheduledStartAt)
    this.name.replace("{ID}", event.id)

    Logger.info("Job created!")
  }
  
  private scheduleFromDate(eventStart: Date | null): string {
    return ""
  }

  public async run(): Promise<void> {
    Logger.info("Job running!")
  }
}