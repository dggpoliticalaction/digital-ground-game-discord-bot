import { type JobService } from './job-service.js'
import { Logger } from './index.js'
import { Client } from 'discord.js'

import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const Logs = require('../../lang/logs.json')
const Config = require('../../config/config.json')

export class EventNotificationService {
    // This is an arbitrary-length array of reminder times (in minutes)
    private readonly reminderTimes: number[] = Config.jobs.eventNotification.reminderTimesInMins
    // This is the guild ID to search for events in (always DGGP)
    // TODO: This should live somewhere else
    // TODO: THIS IS HARDCODED TO MY TEST ENV
    private readonly guildId: string = '1459604256586731703'

  constructor(private jobService: JobService) {}

  public async start(client: Client): Promise<void> {
    Logger.info(Logs.info.eventNotifierStarted)

    try {
        // Fetch the guild + events
        const guild = await client.guilds.fetch(this.guildId);
        const events = await guild.scheduledEvents.fetch();

        // Log the details of each scheduled event
        events.forEach(event => {
        console.log(`Event: ${event.name}`);
        console.log(`Start Time: ${event.scheduledStartAt}`);
        console.log(`Channel: ${event.channel?.name || 'No channel assigned'}`);
        console.log(`Description: ${event.description || 'No description'}`);
        console.log(`User Count (Attendees): ${event.userCount || 0}`);
        console.log('---------------------------');
        });

        if (events.size === 0) {
            Logger.info("NO EVENTS SCHEDULED!")
        }

    } catch (error) {
        console.error('Error fetching scheduled events:', error);
    }

    // Create a job for each event reminder time (from config)

    // Schedule both notification jobs for each event (using JobService)

    // Setup listeners for event creation (create new ones)
    
    // Setup listeners for event cancellation (remove notification jobs)

    // Setup listeners for event modification (remove notification jobs, create new ones)

  }
}