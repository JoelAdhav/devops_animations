import { useSyncExternalStore } from 'react'

// Browser storage can be unavailable (private mode, blocked site data), so every access is guarded.
function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* ignore: progress just won't persist */
  }
}

/** A list of ids saved in localStorage that React components can subscribe to. */
function listStore(key: string) {
  const listeners = new Set<() => void>()
  let items: string[] = (() => {
    try {
      const parsed = JSON.parse(read(key) ?? '[]')
      return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : []
    } catch {
      return []
    }
  })()
  const subscribe = (fn: () => void) => {
    listeners.add(fn)
    return () => listeners.delete(fn)
  }
  const set = (next: string[]) => {
    items = next
    write(key, JSON.stringify(items))
    listeners.forEach((fn) => fn())
  }
  return {
    use: () => useSyncExternalStore(subscribe, () => items),
    toggle: (id: string) => set(items.includes(id) ? items.filter((x) => x !== id) : [...items, id]),
    add: (id: string) => !items.includes(id) && set([...items, id]),
  }
}

const progress = listStore('dvl.progress')
const solvedSims = listStore('dvl.sims')

export const useCompleted = progress.use
export const toggleCompleted = progress.toggle

/** Ids of simulation scenarios the learner has finished. */
export const useSolved = solvedSims.use
export const markSolved = solvedSims.add

export type Theme = 'dark' | 'light'

export function loadTheme(): Theme {
  return read('dvl.theme') === 'dark' ? 'dark' : 'light'
}

export function saveTheme(theme: Theme) {
  write('dvl.theme', theme)
}

/** Versioned drafts are separate from completion so restarting a ticket preserves earned progress. */
export function readProgress<T>(key: string, valid: (value: unknown) => value is T): T | null {
  try {
    const value: unknown = JSON.parse(read(`dvl.draft.v1.${key}`) ?? 'null')
    return valid(value) ? value : null
  } catch {
    return null
  }
}

export function writeProgress(key: string, value: unknown) {
  try { write(`dvl.draft.v1.${key}`, JSON.stringify(value)) } catch { /* storage is optional */ }
}

export function clearProgress(key: string) {
  try { localStorage.removeItem(`dvl.draft.v1.${key}`) } catch { /* storage is optional */ }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function loadLastLesson(): { id: string; tab: 'learn' | 'sim' } | null {
  return readProgress('last-lesson', (v): v is { id: string; tab: 'learn' | 'sim' } =>
    isRecord(v) && typeof v.id === 'string' && (v.tab === 'learn' || v.tab === 'sim'))
}

export function saveLastLesson(id: string, tab: 'learn' | 'sim') {
  writeProgress('last-lesson', { id, tab })
}
