import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import { cloneCategories, defaultMeta } from './defaults.ts'
import { currentYm, shiftMonth } from './date.ts'
import { applyRecurring } from './recurring.ts'
import type { AppState, Category, Entry, Meta, Recurring } from '../types.ts'

interface JizhangDB extends DBSchema {
  entries: { key: string; value: Entry }
  categories: { key: string; value: Category }
  recurring: { key: string; value: Recurring }
  meta: { key: string; value: Meta }
}

const META_KEY = 'app'

let database: Promise<IDBPDatabase<JizhangDB>> | null = null
let loading: Promise<{ state: AppState; added: Entry[] }> | null = null

function db() {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('indexedDB unavailable'))
  }
  if (!database) {
    database = openDB<JizhangDB>('jizhang', 1, {
      upgrade(store) {
        store.createObjectStore('entries', { keyPath: 'id' })
        store.createObjectStore('categories', { keyPath: 'id' })
        store.createObjectStore('recurring', { keyPath: 'id' })
        store.createObjectStore('meta')
      },
    })
  }
  return database
}

export function loadApp(): Promise<{ state: AppState; added: Entry[] }> {
  if (!loading) {
    loading = doLoad().catch((error: unknown) => {
      loading = null
      throw error
    })
  }
  return loading
}

async function doLoad(): Promise<{ state: AppState; added: Entry[] }> {
  const database = await db()
  let categories = await database.getAll('categories')
  let meta = await database.get('meta', META_KEY)
  const firstLaunch = !meta
  if (!meta) meta = defaultMeta()
  if (firstLaunch) {
    categories = cloneCategories()
    const tx = database.transaction(['categories', 'meta'], 'readwrite')
    for (const category of categories) tx.objectStore('categories').put(category)
    tx.objectStore('meta').put(meta, META_KEY)
    await tx.done
  }

  let entries = await database.getAll('entries')
  let recurrings = await database.getAll('recurring')
  const applied = applyRecurring(entries, recurrings, new Date())
  const recurringChanged = applied.recurrings.some((item, index) => item.appliedThrough !== recurrings[index]?.appliedThrough)
  if (applied.added.length > 0 || recurringChanged) {
    const tx = database.transaction(['entries', 'recurring'], 'readwrite')
    for (const entry of applied.added) tx.objectStore('entries').put(entry)
    for (const recurring of applied.recurrings) tx.objectStore('recurring').put(recurring)
    await tx.done
  }
  entries = applied.entries
  recurrings = applied.recurrings

  const month = currentYm()
  if (meta.summarySeenFor !== month) {
    const previous = shiftMonth(month, -1)
    const hasPrevious = entries.some((entry) => entry.date.startsWith(previous))
    if (!hasPrevious) {
      meta = { ...meta, summarySeenFor: month }
      await database.put('meta', meta, META_KEY)
    }
  }

  return {
    state: { entries, categories, recurrings, meta },
    added: applied.added,
  }
}

export async function saveMeta(meta: Meta): Promise<void> {
  const database = await db()
  await database.put('meta', meta, META_KEY)
}

export async function saveEntry(entry: Entry, meta: Meta): Promise<void> {
  const database = await db()
  const tx = database.transaction(['entries', 'meta'], 'readwrite')
  tx.objectStore('entries').put(entry)
  tx.objectStore('meta').put(meta, META_KEY)
  await tx.done
}

export async function removeEntry(id: string): Promise<void> {
  const database = await db()
  await database.delete('entries', id)
}

export async function saveCategory(category: Category): Promise<void> {
  const database = await db()
  await database.put('categories', category)
}

export async function removeCategory(id: string): Promise<void> {
  const database = await db()
  await database.delete('categories', id)
}

export async function removeRecurring(id: string): Promise<void> {
  const database = await db()
  await database.delete('recurring', id)
}

export async function saveEntriesAndRecurring(entries: Entry[], recurrings: Recurring[]): Promise<void> {
  const database = await db()
  const tx = database.transaction(['entries', 'recurring'], 'readwrite')
  for (const entry of entries) tx.objectStore('entries').put(entry)
  for (const recurring of recurrings) tx.objectStore('recurring').put(recurring)
  await tx.done
}

export async function replaceAll(state: AppState): Promise<void> {
  const database = await db()
  const tx = database.transaction(['entries', 'categories', 'recurring', 'meta'], 'readwrite')
  tx.objectStore('entries').clear()
  tx.objectStore('categories').clear()
  tx.objectStore('recurring').clear()
  tx.objectStore('meta').clear()
  for (const entry of state.entries) tx.objectStore('entries').put(entry)
  for (const category of state.categories) tx.objectStore('categories').put(category)
  for (const recurring of state.recurrings) tx.objectStore('recurring').put(recurring)
  tx.objectStore('meta').put(state.meta, META_KEY)
  await tx.done
}
