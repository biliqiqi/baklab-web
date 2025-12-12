import type { SearchState } from './router'

type LooseSearchState = Record<
  string,
  string | number | boolean | undefined | null
>

const isStrictSearchState = (value: unknown): value is SearchState => {
  if (!value || typeof value !== 'object') {
    return false
  }

  return Object.values(value as Record<string, unknown>).every(
    (entry) => typeof entry === 'string' || typeof entry === 'undefined'
  )
}

const isLooseSearchState = (value: unknown): value is LooseSearchState => {
  if (!value || typeof value !== 'object') {
    return false
  }

  return Object.values(value as Record<string, unknown>).every(
    (entry) =>
      typeof entry === 'string' ||
      typeof entry === 'number' ||
      typeof entry === 'boolean' ||
      typeof entry === 'undefined' ||
      entry === null
  )
}

export const ensureSearchState = (value: unknown): SearchState => {
  if (isStrictSearchState(value)) {
    return value
  }

  if (!isLooseSearchState(value)) {
    return {}
  }

  const next: SearchState = {}
  Object.entries(value).forEach(([key, entry]) => {
    if (entry === undefined || entry === null) {
      return
    }
    next[key] = String(entry)
  })
  return next
}

export const omitSearchParams = (
  state: unknown,
  keys: string[]
): SearchState => {
  const baseState = ensureSearchState(state)
  if (keys.length === 0) {
    return { ...baseState }
  }

  const next: SearchState = { ...baseState }
  keys.forEach((key) => {
    delete next[key]
  })
  return next
}

export const updateSearchParams = (
  state: unknown,
  values: Record<string, string | undefined>,
  keysToRemove: string[] = []
): SearchState => {
  const next = omitSearchParams(state, keysToRemove)

  Object.entries(values).forEach(([key, value]) => {
    if (value === undefined || value === '') {
      delete next[key]
    } else {
      next[key] = value
    }
  })

  return next
}

export const withSearchUpdater =
  (updater: (state: SearchState) => SearchState) =>
  (prev: unknown): SearchState =>
    updater(ensureSearchState(prev))
