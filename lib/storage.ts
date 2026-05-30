const KNOWN_KEY    = 'topik_known'
const PROGRESS_KEY = 'topik_progress'

export function getKnown(): Set<number> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = localStorage.getItem(KNOWN_KEY)
    return raw ? new Set(JSON.parse(raw)) : new Set()
  } catch { return new Set() }
}

export function toggleKnown(id: number): Set<number> {
  const known = getKnown()
  if (known.has(id)) known.delete(id)
  else known.add(id)
  localStorage.setItem(KNOWN_KEY, JSON.stringify([...known]))
  return known
}

export function saveProgress(index: number, mode: string) {
  if (typeof window === 'undefined') return
  localStorage.setItem(PROGRESS_KEY, JSON.stringify({ index, mode, ts: Date.now() }))
}

export function getProgress(): { index: number; mode: string } | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(PROGRESS_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}
