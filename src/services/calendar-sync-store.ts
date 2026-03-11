import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const DEFAULT_STATE_PATH = join(__dirname, '../../config/calendar-sync-state.json')

export type CalendarSyncState = Record<string, string>

async function ensureDir(path: string): Promise<void> {
  const { mkdir } = await import('node:fs/promises')
  await mkdir(dirname(path), { recursive: true })
}

export async function loadSyncState(
  statePath: string = DEFAULT_STATE_PATH,
): Promise<CalendarSyncState> {
  try {
    const raw = await readFile(statePath, 'utf-8')
    const data = JSON.parse(raw) as unknown
    if (data !== null && typeof data === 'object' && !Array.isArray(data)) {
      return data as CalendarSyncState
    }
  } catch {
    // file missing or invalid
  }
  return {}
}

export async function saveSyncState(
  state: CalendarSyncState,
  statePath: string = DEFAULT_STATE_PATH,
): Promise<void> {
  await ensureDir(statePath)
  await writeFile(statePath, JSON.stringify(state, null, 2), 'utf-8')
}

export async function getGoogleEventId(
  discordEventId: string,
  statePath?: string,
): Promise<string | undefined> {
  const state = await loadSyncState(statePath)
  return state[discordEventId]
}

export async function setGoogleEventId(
  discordEventId: string,
  googleEventId: string,
  statePath?: string,
): Promise<void> {
  const state = await loadSyncState(statePath)
  state[discordEventId] = googleEventId
  await saveSyncState(state, statePath)
}

export async function removeSyncEntry(
  discordEventId: string,
  statePath?: string,
): Promise<void> {
  const state = await loadSyncState(statePath)
  delete state[discordEventId]
  await saveSyncState(state, statePath)
}
