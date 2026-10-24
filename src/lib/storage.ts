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

const PROGRESS_KEY = 'dvl.progress'
const listeners = new Set<() => void>()
let completed: string[] = (() => {
  try {
    const parsed = JSON.parse(read(PROGRESS_KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : []
  } catch {
    return []
  }
})()

function subscribe(fn: () => void) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function useCompleted(): string[] {
  return useSyncExternalStore(subscribe, () => completed)
}

export function toggleCompleted(id: string) {
  completed = completed.includes(id) ? completed.filter((x) => x !== id) : [...completed, id]
  write(PROGRESS_KEY, JSON.stringify(completed))
  listeners.forEach((fn) => fn())
}

export type Theme = 'dark' | 'light'

export function loadTheme(): Theme {
  return read('dvl.theme') === 'dark' ? 'dark' : 'light'
}

export function saveTheme(theme: Theme) {
  write('dvl.theme', theme)
}
