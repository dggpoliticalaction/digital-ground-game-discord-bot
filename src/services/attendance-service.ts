import type { VoiceState } from 'discord.js'

export interface AttendanceEntry {
  id: string
  displayName: string
}

interface AttendanceSession {
  channelId: string
  guildId: string
  channelName: string
  /** Map of user id -> display name (includes everyone who was in the channel at any time) */
  members: Map<string, string>
}

/**
 * Tracks VC "attendance" per user: when a user runs /attendance we record who is in the channel
 * and keep updating as people join/leave. When the tracking user leaves, we return the final list.
 */
export class AttendanceService {
  /** Tracker user id -> session for that user's VC */
  private sessions = new Map<string, AttendanceSession>()

  /**
   * Start tracking attendance for a user in their current voice channel.
   * Returns true if started, false if already tracking or not in VC.
   */
  startTracking(
    userId: string,
    channelId: string,
    guildId: string,
    channelName: string,
    initialMembers: Array<{ id: string; displayName: string }>,
  ): boolean {
    if (this.sessions.has(userId)) {
      return false
    }
    const members = new Map<string, string>()
    for (const m of initialMembers) {
      members.set(m.id, m.displayName)
    }
    this.sessions.set(userId, {
      channelId,
      guildId,
      channelName,
      members,
    })
    return true
  }

  /**
   * Handle a voice state update: add/remove members from relevant sessions,
   * and if the tracker left the channel, return their attendance list and clear the session.
   */
  handleVoiceStateUpdate(
    oldState: VoiceState,
    newState: VoiceState,
  ): { userId: string; channelName: string; entries: AttendanceEntry[] } | null {
    const memberId = newState.member?.id ?? oldState.member?.id
    if (!memberId) return null

    const oldChannelId = oldState.channelId ?? null
    const newChannelId = newState.channelId ?? null
    const displayName =
      newState.member?.displayName ??
      oldState.member?.displayName ??
      newState.member?.user?.username ??
      oldState.member?.user?.username ??
      'Unknown'

    // Update all sessions that are for this channel (someone joined or left)
    const channelId = newChannelId ?? oldChannelId
    if (channelId) {
      for (const session of this.sessions.values()) {
        if (session.channelId !== channelId) continue
        if (newChannelId === channelId) {
          session.members.set(memberId, displayName)
        } else {
          session.members.delete(memberId)
        }
      }
    }

    // If this user was a tracker and they left their tracked channel, finalize and return
    const session = this.sessions.get(memberId)
    if (session && oldChannelId === session.channelId && newChannelId !== session.channelId) {
      this.sessions.delete(memberId)
      const entries: AttendanceEntry[] = Array.from(session.members.entries()).map(
        ([id, name]) => ({ id, displayName: name }),
      )
      return {
        userId: memberId,
        channelName: session.channelName,
        entries,
      }
    }

    return null
  }

  isTracking(userId: string): boolean {
    return this.sessions.has(userId)
  }

  stopTracking(userId: string): void {
    this.sessions.delete(userId)
  }
}
