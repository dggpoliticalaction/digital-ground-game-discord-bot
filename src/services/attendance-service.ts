import type { VoiceState } from 'discord.js'

export interface AttendanceEntry {
  id: string
  displayName: string
}

/** Plain-text body for a DM listing VC attendance (snapshot or tracked session). */
export function formatAttendanceDmBody(channelName: string, entries: AttendanceEntry[]): string {
  const lines = entries.map((e) => `${e.displayName} (${e.id})`)
  return lines.length > 0
    ? `**Attendance for ${channelName}**\n\n${lines.join('\n')}`
    : `**Attendance for ${channelName}**\n\nNo one else was in the channel.`
}

interface AttendanceSession {
  channelId: string
  guildId: string
  channelName: string
  /** Cumulative: everyone in the call when tracking started, plus anyone who joins later. */
  members: Map<string, string>
}

/**
 * Tracks VC attendance for `/attendance-track`: seeds with everyone currently in the channel when
 * the command runs; anyone who joins after that is added and never removed when they leave. When
 * the tracker leaves, the session ends and the list is sent by DM.
 */
export class AttendanceService {
  /** Tracker user id -> session for that user's VC */
  private sessions = new Map<string, AttendanceSession>()

  /**
   * Start tracking in the user's current voice channel.
   * `initialMembers` should include everyone in that channel at invocation (e.g. voiceChannel.members).
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
   * On voice state change: if a user joins or moves into a tracked channel, add them to that
   * session’s cumulative roster. If the tracker leaves their tracked channel, finalize and return
   * the roster for the attendance DM.
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

    if (newChannelId !== null && oldChannelId !== newChannelId) {
      for (const session of this.sessions.values()) {
        if (session.channelId !== newChannelId) continue
        session.members.set(memberId, displayName)
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
