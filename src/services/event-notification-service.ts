import { type JobService } from './job-service.js'
import { Logger } from './index.js'
import { Client } from 'discord.js'

import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const Logs = require('../../lang/logs.json')
const Config = require('../../config/config.json')

export class EventNotificationService {
  private reminderTimes: number[] = Config.jobs.eventNotification.reminderTimesInMins

  constructor(private jobService: JobService) {}

  public start(client: Client): void {
    Logger.info(Logs.info.eventNotifierStarted)

    // Fetch all currently scheduled events

    // Create a job for each event reminder time (from config)

    // Schedule both notification jobs for each event (using JobService)

    // Setup listeners for event creation (create new ones)
    
    // Setup listeners for event cancellation (remove notification jobs)

    // Setup listeners for event modification (remove notification jobs, create new ones)

  }
}