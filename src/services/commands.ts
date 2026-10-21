import { CHARACTER_DEFINITIONS, CHARACTER_IDS } from '../pet/characters/definitions'
import type { ActivePetItem, CharacterId, PetAction } from '../types/pet'
import { addNote, addTodo, cancelScheduled, completeTodo, createReminder, createTimer, launchApp, listNotes, listScheduled, listTodos, searchFiles, searchNotes } from './native'

export type CommandResult = {
  message: string
  action?: PetAction
  switchCharacter?: CharacterId
  item?: ActivePetItem
}

function parseDuration(input: string) {
  const match = input.match(/(\d+(?:\.\d+)?)\s*(second|seconds|sec|s|minute|minutes|min|m|hour|hours|hr|h)\b/i)
  if (!match) return null
  const value = Number(match[1])
  const unit = match[2].toLowerCase()
  const multiplier = unit.startsWith('h') ? 3_600_000 : unit.startsWith('m') ? 60_000 : 1_000
  return value * multiplier
}

export async function runLocalCommand(raw: string, character: CharacterId): Promise<CommandResult | null> {
  const input = raw.trim()
  const lower = input.toLowerCase()
  const pet = CHARACTER_DEFINITIONS[character]
  if (!input) return { message: 'Type a command and I’ll help.' }

  for (const id of CHARACTER_IDS) {
    const def = CHARACTER_DEFINITIONS[id]
    if (new RegExp(`\\b(switch|change|be|become|select)\\s+(?:to\\s+)?${def.name.toLowerCase()}\\b`, 'i').test(input)) {
      return { message: `${def.emoji} ${def.name} selected.`, switchCharacter: id, action: 'happy' }
    }
  }

  if (/\b(dance|dancing)\b/.test(lower)) return { message: `${pet.name} is dancing!`, action: 'dance' }
  if (/\b(sleep|go to sleep|nap)\b/.test(lower)) return { message: 'Okay. I’m getting sleepy.', action: 'sleep' }
  if (/\b(walk|walk around|slither|trot|waddle)\b/.test(lower)) return { message: `${pet.name} will ${pet.movementLabel} around.`, action: 'walk' }
  if (/\b(wave|say hi)\b/.test(lower)) return { message: 'Hi! 👋', action: 'wave' }

  if (/\b(feed|eat|food|snack|honey|bamboo|egg|leaves)\b/.test(lower)) {
    return { message: `${pet.favoriteFood.emoji} ${pet.name} is enjoying ${pet.favoriteFood.label.toLowerCase()}.`, action: 'eat', item: { kind: 'food', id: pet.favoriteFood.id, label: pet.favoriteFood.label } }
  }
  if (/\b(play|toy|ball|pinecone)\b/.test(lower)) {
    return { message: `${pet.favoriteToy.emoji} Play time with ${pet.favoriteToy.label.toLowerCase()}!`, action: 'play', item: { kind: 'toy', id: pet.favoriteToy.id, label: pet.favoriteToy.label } }
  }

  const completeMatch = input.match(/(?:complete|finish|done)\s+(?:todo\s+)?(.+)/i)
  if (completeMatch?.[1]) {
    const todo = await completeTodo(completeMatch[1].trim())
    return { message: `Completed: “${todo.text}”.`, action: 'happy' }
  }

  const todoMatch = input.match(/(?:add|save)\s+(.+?)\s+(?:to|as)\s+(?:my\s+)?todo(?:\s+list)?/i) ?? input.match(/todo\s*[:\-]\s*(.+)/i)
  if (todoMatch?.[1]) {
    const todo = await addTodo(todoMatch[1].trim())
    return { message: `Added to your todo: “${todo.text}”.`, action: 'happy' }
  }
  if (/\b(show|list)\b.*\btodo/.test(lower)) {
    const todos = (await listTodos(false, 8)).slice(0, 8)
    return { message: todos.length ? `Your todos: ${todos.map((t, i) => `${i + 1}. ${t.text}`).join('  ')}` : 'Your todo list is empty.' }
  }

  const searchNoteMatch = input.match(/(?:find|search)\s+(?:my\s+)?notes?\s+(?:for\s+)?(.+)/i)
  if (searchNoteMatch?.[1]) {
    const notes = await searchNotes(searchNoteMatch[1].trim(), 6)
    return { message: notes.length ? `Matching notes: ${notes.map((n, i) => `${i + 1}. ${n.text}`).join('  ')}` : 'No matching notes found.' }
  }
  const noteMatch = input.match(/(?:save|remember|note)\s*(?:this)?\s*(?:as\s+a\s+note)?\s*[:\-]?\s*(.+)/i)
  if (noteMatch?.[1] && noteMatch[1].trim().length > 2 && !lower.startsWith('show')) {
    const note = await addNote(noteMatch[1].trim())
    return { message: `Saved note: “${note.text}”.`, action: 'happy' }
  }
  if (/\b(show|list)\b.*\bnotes?/.test(lower)) {
    const notes = (await listNotes(6)).slice(0, 6)
    return { message: notes.length ? `Recent notes: ${notes.map((n, i) => `${i + 1}. ${n.text}`).join('  ')}` : 'You do not have any saved notes yet.' }
  }

  const reminderMatch = input.match(/remind\s+me\s+in\s+(.+?)\s+(?:to|about)\s+(.+)/i)
  if (reminderMatch) {
    const duration = parseDuration(reminderMatch[1])
    if (duration && duration >= 1_000) {
      const reminder = await createReminder(reminderMatch[2].trim(), new Date(Date.now() + duration).toISOString())
      return { message: `Reminder set: “${reminder.label}”.`, action: 'happy' }
    }
  }

  if (/\b(timer|alarm)\b/.test(lower)) {
    const duration = parseDuration(input)
    if (duration && duration >= 1_000) {
      const item = await createTimer('Timer', Math.round(duration / 1000))
      const seconds = Math.round(duration / 1000)
      return { message: `Timer set for ${seconds >= 60 ? `${Math.round(seconds / 60)} minute(s)` : `${seconds} seconds`} (persistent).`, action: 'happy' }
    }
  }
  const cancelMatch = input.match(/(?:cancel|stop)\s+(?:the\s+)?(?:timer|reminder)\s*(.*)/i)
  if (cancelMatch) {
    const items = await listScheduled(false)
    const query = cancelMatch[1]?.trim().toLowerCase() ?? ''
    const item = query ? items.find((x) => x.label.toLowerCase().includes(query) || x.id === query) : items[0]
    if (!item) return { message: 'I could not find a matching pending timer or reminder.' }
    await cancelScheduled(item.id)
    return { message: `Cancelled ${item.kind}: “${item.label}”.` }
  }
  if (/\b(show|list)\b.*\b(timer|reminder|scheduled)/.test(lower)) {
    const items = await listScheduled(false)
    return { message: items.length ? `Pending: ${items.slice(0, 8).map((x, i) => `${i + 1}. ${x.label} · ${new Date(x.dueAtMs).toLocaleString()}`).join('  ')}` : 'No pending timers or reminders.' }
  }

  const fileMatch = input.match(/(?:find|search(?:\s+for)?)\s+(?:a\s+)?(?:file\s+)?(?:named\s+)?["“]?(.+?)["”]?$/i)
  if (fileMatch?.[1] && !/\b(notes?|todo|app|application)\b/i.test(input)) {
    const query = fileMatch[1].trim()
    const files = await searchFiles(query, 8)
    if (files.length) return { message: `Found ${files.length}: ${files.map((f, i) => `${i + 1}. ${f.name} — ${f.parent}`).join('  ')}` }
    if (/\bfile\b/i.test(input)) return { message: `I couldn’t find a file matching “${query}” in your allowed user folders.` }
  }

  const appMatch = input.match(/\b(?:open|launch|start)\s+(.+)$/i)
  if (appMatch?.[1]) {
    const appName = appMatch[1].trim()
    const app = await launchApp(appName)
    if (app) return { message: `Opening ${app.name}.`, action: 'happy' }
  }

  return null
}
