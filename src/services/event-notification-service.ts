import { Logger } from './index.js'

import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const Logs = require('../../lang/logs.json')

export class EventNotificationService {
  public start(): void {
    Logger.info(Logs.info.EventNotifierStarted)

    // Fetch all currently scheduled events

    // Schedule both notification jobs for each event

    // Setup listeners for event creation (create new ones)
    
    // Setup listeners for event cancellation (remove notification jobs)

    // Setup listeners for event modification (remove notification jobs, create new ones)

  }
}