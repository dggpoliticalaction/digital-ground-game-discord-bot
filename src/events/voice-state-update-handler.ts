import type { Client, VoiceState } from 'discord.js'

import { type EventHandler } from './event-handler.js'
import { AttendanceService } from '../services/attendance-service.js'
import { Logger } from '../services/logger.js'
import { MessageUtils } from '../utils/message-utils.js'

export class VoiceStateUpdateHandler implements EventHandler {
  constructor(
    private readonly attendanceService: AttendanceService,
    private readonly client: Client,
  ) {}

  public async process(oldState: VoiceState, newState: VoiceState): Promise<void> {
    const result = this.attendanceService.handleVoiceStateUpdate(oldState, newState)
    if (!result) return

    const { userId, channelName, entries } = result
    try {
      const user = await this.client.users.fetch(userId)
      const lines = entries.map((e) => `${e.displayName} (${e.id})`)
      const body =
        lines.length > 0
          ? `**Attendance for ${channelName}**\n\n${lines.join('\n')}`
          : `**Attendance for ${channelName}**\n\nNo one else was in the channel.`
      await MessageUtils.send(user, body)
    } catch (error) {
      Logger.error('Failed to send attendance DM', error)
    }
  }
}
