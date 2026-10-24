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
