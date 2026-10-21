import type { CharacterId, PetAction, PowerStatus, StoredNote, StoredTodo } from '../types/pet'

export const inTauri = () => '__TAURI_INTERNALS__' in window

export type ScheduledItem = {
  id: string
  kind: 'timer' | 'reminder'
  label: string
  dueAtMs: number
  status: 'pending' | 'fired' | 'cancelled'
  createdAt: string
}

export type FileResult = { name: string; path: string; parent: string }
export type AppResult = { name: string; path: string; source: string }

export type AgentEffect = {
  kind: 'action' | 'character' | 'feed' | 'play'
  value: string
}

export type AgentResponse = {
  message: string
  effects: AgentEffect[]
  toolsUsed: string[]
  provider: 'local' | 'cloud'
}

async function invoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  const api = await import('@tauri-apps/api/core')
  return api.invoke<T>(command, args)
}

const TODO_KEY = 'nook.todos.v1'
const NOTE_KEY = 'nook.notes.v1'

function browserRead<T>(key: string): T[] {
  try { return JSON.parse(localStorage.getItem(key) ?? '[]') as T[] } catch { return [] }
}
function browserWrite<T>(key: string, value: T[]) { localStorage.setItem(key, JSON.stringify(value)) }

export async function addNote(text: string): Promise<StoredNote> {
  if (inTauri()) return invoke('add_note', { text })
  const items = browserRead<StoredNote>(NOTE_KEY)
  const note = { id: crypto.randomUUID(), text, createdAt: new Date().toISOString() }
  items.unshift(note); browserWrite(NOTE_KEY, items); return note
}

export async function listNotes(limit = 20): Promise<StoredNote[]> {
  if (inTauri()) return invoke('list_notes', { limit })
  return browserRead<StoredNote>(NOTE_KEY).slice(0, limit)
}

export async function searchNotes(query: string, limit = 20): Promise<StoredNote[]> {
  if (inTauri()) return invoke('search_notes', { query, limit })
  const lower = query.toLowerCase()
  return browserRead<StoredNote>(NOTE_KEY).filter((n) => n.text.toLowerCase().includes(lower)).slice(0, limit)
}

export async function deleteNote(id: string) {
  if (inTauri()) return invoke<void>('delete_note', { id })
  browserWrite(NOTE_KEY, browserRead<StoredNote>(NOTE_KEY).filter((n) => n.id !== id))
}

export async function addTodo(text: string, dueAt?: string | null): Promise<StoredTodo> {
  if (inTauri()) return invoke('add_todo', { text, dueAt: dueAt ?? null })
  const items = browserRead<StoredTodo>(TODO_KEY)
  const todo: StoredTodo = { id: crypto.randomUUID(), text, done: false, createdAt: new Date().toISOString(), dueAt: dueAt ?? null }
  items.unshift(todo); browserWrite(TODO_KEY, items); return todo
}

export async function listTodos(includeDone = false, limit = 50): Promise<StoredTodo[]> {
  if (inTauri()) return invoke('list_todos', { includeDone, limit })
  return browserRead<StoredTodo>(TODO_KEY).filter((t) => includeDone || !t.done).slice(0, limit)
}

export async function completeTodo(idOrText: string): Promise<StoredTodo> {
  if (inTauri()) return invoke('complete_todo', { idOrText })
  const items = browserRead<StoredTodo>(TODO_KEY)
  const lower = idOrText.toLowerCase()
  const item = items.find((t) => !t.done && (t.id === idOrText || t.text.toLowerCase().includes(lower)))
  if (!item) throw new Error('No matching open todo was found.')
  item.done = true; browserWrite(TODO_KEY, items); return item
}

export async function deleteTodo(id: string) {
  if (inTauri()) return invoke<void>('delete_todo', { id })
  browserWrite(TODO_KEY, browserRead<StoredTodo>(TODO_KEY).filter((t) => t.id !== id))
}

export async function createTimer(label: string, durationSeconds: number): Promise<ScheduledItem> {
  if (!inTauri()) {
    return { id: crypto.randomUUID(), kind: 'timer', label, dueAtMs: Date.now() + durationSeconds * 1000, status: 'pending', createdAt: new Date().toISOString() }
  }
  return invoke('create_timer', { label, durationSeconds: Math.round(durationSeconds) })
}

export async function createReminder(label: string, dueAt: string): Promise<ScheduledItem> {
  if (!inTauri()) {
    return { id: crypto.randomUUID(), kind: 'reminder', label, dueAtMs: new Date(dueAt).getTime(), status: 'pending', createdAt: new Date().toISOString() }
  }
  return invoke('create_reminder', { label, dueAt })
}

export async function listScheduled(includeFinished = false): Promise<ScheduledItem[]> {
  if (!inTauri()) return []
  return invoke('list_scheduled', { includeFinished })
}

export async function cancelScheduled(id: string) {
  if (!inTauri()) return
  await invoke<void>('cancel_scheduled', { id })
}

export async function getAllowedFileRoots(): Promise<string[]> {
  if (!inTauri()) return []
  return invoke<string[]>('get_allowed_file_roots')
}

export async function setAllowedFileRoots(roots: string[]): Promise<string[]> {
  if (!inTauri()) throw new Error('Folder permissions are available in the Windows app.')
  return invoke<string[]>('set_allowed_file_roots', { roots })
}

export async function searchFiles(query: string, limit = 12): Promise<FileResult[]> {
  if (!inTauri()) return []
  return invoke('search_files', { query, limit })
}

export async function openFile(path: string) {
  if (!inTauri()) return false
  await invoke<void>('open_file', { path })
  return true
}

export async function searchApps(query: string, limit = 12): Promise<AppResult[]> {
  if (!inTauri()) return []
  return invoke('search_apps', { query, limit })
}

export async function launchApp(name: string): Promise<AppResult | null> {
  if (!inTauri()) return null
  return invoke('launch_app', { name })
}

export async function setCloudApiKey(apiKey: string) {
  if (!inTauri()) throw new Error('Secure API-key storage is available in the Windows app.')
  await invoke<void>('set_cloud_api_key', { apiKey })
}

export async function hasCloudApiKey() {
  if (!inTauri()) return false
  return invoke<boolean>('has_cloud_api_key')
}

export async function deleteCloudApiKey() {
  if (!inTauri()) return
  await invoke<void>('delete_cloud_api_key')
}

export async function getPowerStatus(): Promise<PowerStatus> {
  if (!inTauri()) return { onAcPower: null, batteryPercent: null, batterySaverRecommended: false }
  return invoke<PowerStatus>('system_power_status')
}

export async function runAgent(input: {
  prompt: string
  mode: 'local' | 'cloud' | 'auto'
  localModel: string
  cloudModel: string
  character: CharacterId
}): Promise<AgentResponse> {
  if (!inTauri()) {
    return { message: 'AI backend is available in the Tauri desktop build. Deterministic local commands still work in browser preview.', effects: [], toolsUsed: [], provider: 'local' }
  }
  return invoke('assistant_run', { request: input })
}

export async function migrateLegacyLocalStorage() {
  if (!inTauri() || localStorage.getItem('nook.sqlite.migrated.v1') === 'true') return
  const notes = browserRead<StoredNote>(NOTE_KEY)
  const todos = browserRead<StoredTodo>(TODO_KEY)
  for (const note of notes) {
    try { await addNote(note.text) } catch { /* best-effort migration */ }
  }
  for (const todo of todos) {
    try {
      const inserted = await addTodo(todo.text, todo.dueAt ?? null)
      if (todo.done) await completeTodo(inserted.id)
    } catch { /* best-effort migration */ }
  }
  localStorage.setItem('nook.sqlite.migrated.v1', 'true')
}

export function isPetAction(value: string): value is PetAction {
  return ['idle','walk','dance','hurt','angry','sleep','happy','eat','play','wave','surprised'].includes(value)
}
