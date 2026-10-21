import { FormEvent, useEffect, useMemo, useState } from 'react'
import type { AiSettings } from '../services/ai'
import { checkForUpdates } from '../services/updater'
import {
  addNote,
  addTodo,
  cancelScheduled,
  completeTodo,
  createTimer,
  deleteCloudApiKey,
  getAllowedFileRoots,
  deleteNote,
  deleteTodo,
  listNotes,
  listScheduled,
  listTodos,
  setAllowedFileRoots,
  setCloudApiKey,
  type ScheduledItem,
} from '../services/native'
import { CHARACTER_DEFINITIONS, CHARACTER_IDS } from '../pet/characters/definitions'
import type {
  BehaviorSettings,
  CharacterId,
  DayPart,
  PetMood,
  PowerStatus,
  StoredNote,
  StoredTodo,
} from '../types/pet'

type Tab = 'chat' | 'notes' | 'todo' | 'timers'

type Props = {
  response: string
  busy: boolean
  mood: PetMood
  character: CharacterId
  petSize: number
  speechEnabled: boolean
  aiSettings: AiSettings
  behavior: BehaviorSettings
  power: PowerStatus
  dayPart: DayPart
  monitorCount: number
  effectivePerformance: 'quality' | 'balanced' | 'battery'
  cloudKeyConfigured: boolean
  onCloudKeyStatus: (value: boolean) => void
  onSubmit: (value: string) => void
  onClose: () => void
  onCharacter: (value: CharacterId) => void
  onPetSize: (value: number) => void
  onSpeech: (value: boolean) => void
  onAiSettings: (value: AiSettings) => void
  onBehavior: (value: BehaviorSettings) => void
  onNextMonitor: () => void
}

function formatDue(ms: number) {
  const diff = ms - Date.now()
  if (diff <= 0) return 'due now'
  if (diff < 60_000) return `${Math.ceil(diff / 1000)}s`
  if (diff < 3_600_000) return `${Math.ceil(diff / 60_000)}m`
  if (diff < 86_400_000) return `${Math.ceil(diff / 3_600_000)}h`
  return new Date(ms).toLocaleString()
}

function shortDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function CommandBubble(props: Props) {
  const [value, setValue] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [tab, setTab] = useState<Tab>('chat')
  const [keyDraft, setKeyDraft] = useState('')
  const [keyBusy, setKeyBusy] = useState(false)
  const [keyMessage, setKeyMessage] = useState('')
  const [notes, setNotes] = useState<StoredNote[]>([])
  const [todos, setTodos] = useState<StoredTodo[]>([])
  const [scheduled, setScheduled] = useState<ScheduledItem[]>([])
  const [miniInput, setMiniInput] = useState('')
  const [workspaceBusy, setWorkspaceBusy] = useState(false)
  const [fileRoots, setFileRoots] = useState<string[]>([])
  const [folderDraft, setFolderDraft] = useState('')
  const [folderMessage, setFolderMessage] = useState('')
  const [updateMessage, setUpdateMessage] = useState('Not checked')
  const [updateBusy, setUpdateBusy] = useState(false)
  const pet = CHARACTER_DEFINITIONS[props.character]

  const powerLabel = useMemo(() => {
    if (props.power.onAcPower === true) return 'Plugged in'
    if (props.power.batteryPercent != null) return `${props.power.batteryPercent}% battery`
    return 'Power unknown'
  }, [props.power])

  async function refreshWorkspace(target: Tab = tab) {
    try {
      if (target === 'notes') setNotes(await listNotes(50))
      if (target === 'todo') setTodos(await listTodos(true, 100))
      if (target === 'timers') setScheduled(await listScheduled(false))
    } catch {
      // Keep the panel usable even if a backend refresh fails.
    }
  }

  useEffect(() => { void refreshWorkspace(tab) }, [tab])
  useEffect(() => { void getAllowedFileRoots().then(setFileRoots).catch(() => undefined) }, [])

  function submit(event: FormEvent) {
    event.preventDefault()
    const text = value.trim()
    if (!text || props.busy) return
    setValue('')
    props.onSubmit(text)
  }

  async function saveKey() {
    if (!keyDraft.trim()) return
    setKeyBusy(true); setKeyMessage('')
    try {
      await setCloudApiKey(keyDraft)
      setKeyDraft('')
      props.onCloudKeyStatus(true)
      setKeyMessage('Saved securely in Windows Credential Manager.')
    } catch (error) { setKeyMessage(String(error)) }
    finally { setKeyBusy(false) }
  }

  async function removeKey() {
    setKeyBusy(true); setKeyMessage('')
    try {
      await deleteCloudApiKey()
      props.onCloudKeyStatus(false)
      setKeyDraft('')
      setKeyMessage('Cloud API key removed.')
    } catch (error) { setKeyMessage(String(error)) }
    finally { setKeyBusy(false) }
  }

  async function addWorkspaceItem() {
    const text = miniInput.trim()
    if (!text || workspaceBusy) return
    setWorkspaceBusy(true)
    try {
      if (tab === 'notes') await addNote(text)
      if (tab === 'todo') await addTodo(text)
      setMiniInput('')
      await refreshWorkspace(tab)
    } finally { setWorkspaceBusy(false) }
  }

  async function quickTimer(minutes: number) {
    setWorkspaceBusy(true)
    try {
      await createTimer(`${minutes}-minute timer`, minutes * 60)
      await refreshWorkspace('timers')
    } finally { setWorkspaceBusy(false) }
  }
  async function saveFileRoots(next: string[]) {
    setFolderMessage('')
    try {
      const saved = await setAllowedFileRoots(next)
      setFileRoots(saved)
      setFolderDraft('')
      setFolderMessage('Allowed folders updated.')
    } catch (error) { setFolderMessage(String(error)) }
  }

  async function addFileRoot() {
    const value = folderDraft.trim()
    if (!value || fileRoots.includes(value)) return
    await saveFileRoots([...fileRoots, value])
  }

  async function checkUpdates() {
    if (updateBusy) return
    setUpdateBusy(true)
    try {
      const result = await checkForUpdates()
      if (!result.configured) setUpdateMessage('Updater endpoint is not configured in this source build.')
      else if (!result.available) setUpdateMessage('You are up to date.')
      else {
        setUpdateMessage(`Version ${result.version} is available.`)
        if (result.install && window.confirm(`Install Nook ${result.version} now? The Windows app will close during installation.`)) await result.install()
      }
    } catch (error) { setUpdateMessage(`Update check failed: ${String(error)}`) }
    finally { setUpdateBusy(false) }
  }

  return (
    <section className="command-bubble" onPointerDown={(e) => e.stopPropagation()}>
      <header className="bubble-header">
        <div>
          <strong>{pet.emoji} Nook · {pet.name}</strong>
          <span className="online-dot" />
          <small>{props.busy ? 'Working…' : `${props.dayPart} · Ready`}</small>
        </div>
        <div className="header-actions">
          <button type="button" onClick={() => setSettingsOpen((v) => !v)} aria-label="Settings">⚙</button>
          <button type="button" onClick={props.onClose} aria-label="Close">×</button>
        </div>
      </header>

      {settingsOpen ? (
        <div className="settings-pane">
          <div className="setting-title">Character</div>
          <div className="character-grid">
            {CHARACTER_IDS.map((id) => {
              const item = CHARACTER_DEFINITIONS[id]
              return (
                <button type="button" key={id} className={props.character === id ? 'character-card selected' : 'character-card'} onClick={() => props.onCharacter(id)}>
                  <span>{item.emoji}</span><b>{item.name}</b><small>{item.movementLabel}</small>
                </button>
              )
            })}
          </div>
          <label>
            Pet size <b>{props.petSize}px</b>
            <input type="range" min="180" max="600" step="10" value={props.petSize} onChange={(e) => props.onPetSize(Number(e.target.value))} />
          </label>
          <label className="switch-row">Character speech <input type="checkbox" checked={props.speechEnabled} onChange={(e) => props.onSpeech(e.target.checked)} /></label>

          <div className="setting-title">Behavior</div>
          <label className="switch-row">Autonomous behavior <input type="checkbox" checked={props.behavior.autonomous} onChange={(e) => props.onBehavior({ ...props.behavior, autonomous: e.target.checked })} /></label>
          <label className="switch-row">Cursor gaze tracking <input type="checkbox" checked={props.behavior.cursorTracking} onChange={(e) => props.onBehavior({ ...props.behavior, cursorTracking: e.target.checked })} /></label>
          <label className="switch-row">Quiet night behavior <input type="checkbox" checked={props.behavior.quietAtNight} onChange={(e) => props.onBehavior({ ...props.behavior, quietAtNight: e.target.checked })} /></label>
          <label>
            Roaming
            <select value={props.behavior.roamMode} onChange={(e) => props.onBehavior({ ...props.behavior, roamMode: e.target.value as BehaviorSettings['roamMode'] })}>
              <option value="off">Stay in place</option>
              <option value="current-monitor">Current monitor</option>
              <option value="all-monitors">All monitors</option>
            </select>
          </label>
          <div className="monitor-row">
            <span>{props.monitorCount} display{props.monitorCount === 1 ? '' : 's'} detected</span>
            <button type="button" disabled={props.monitorCount < 2} onClick={props.onNextMonitor}>Next display</button>
          </div>

          <div className="setting-title">Performance</div>
          <label>
            Rendering mode
            <select value={props.behavior.performanceMode} onChange={(e) => props.onBehavior({ ...props.behavior, performanceMode: e.target.value as BehaviorSettings['performanceMode'] })}>
              <option value="auto">Auto · battery aware</option>
              <option value="quality">Quality</option>
              <option value="balanced">Balanced</option>
              <option value="battery">Battery saver</option>
            </select>
          </label>
          <div className="power-card"><span>⚡ {powerLabel}</span><b>{props.effectivePerformance}</b></div>

          <div className="setting-title">File access</div>
          <div className="folder-access-box">
            <div className="folder-list">
              {fileRoots.map((root) => <div className="folder-row" key={root}><span title={root}>{root}</span><button type="button" disabled={fileRoots.length <= 1} onClick={() => void saveFileRoots(fileRoots.filter((item) => item !== root))}>×</button></div>)}
            </div>
            <div className="folder-add-row"><input value={folderDraft} onChange={(e) => setFolderDraft(e.target.value)} placeholder="C:\\Users\\You\\Projects" /><button type="button" onClick={() => void addFileRoot()}>Add</button></div>
            <small>AI file search/open is restricted to these folders. Paths must already exist.</small>
            {folderMessage && <small className="credential-message">{folderMessage}</small>}
          </div>

          <div className="setting-title">Updates</div>
          <div className="update-card"><div><b>Nook AI Pet v1.0.0</b><small>{updateMessage}</small></div><button type="button" disabled={updateBusy} onClick={() => void checkUpdates()}>{updateBusy ? 'Checking…' : 'Check'}</button></div>

          <div className="setting-title">AI</div>
          <label>
            AI mode
            <select value={props.aiSettings.mode} onChange={(e) => props.onAiSettings({ ...props.aiSettings, mode: e.target.value as AiSettings['mode'] })}>
              <option value="auto">Auto · Cloud → Local fallback</option>
              <option value="local">Local Ollama</option>
              <option value="cloud">Ollama Cloud</option>
            </select>
          </label>
          <label>Local model <input value={props.aiSettings.localModel} onChange={(e) => props.onAiSettings({ ...props.aiSettings, localModel: e.target.value })} placeholder="qwen3.5:4b" /></label>
          <label>Cloud model <input value={props.aiSettings.cloudModel} onChange={(e) => props.onAiSettings({ ...props.aiSettings, cloudModel: e.target.value })} placeholder="qwen3.5:cloud" /></label>
          <div className="credential-box">
            <div className="credential-head"><span>Ollama Cloud key</span><b className={props.cloudKeyConfigured ? 'key-ok' : 'key-missing'}>{props.cloudKeyConfigured ? '● Secured' : '○ Not set'}</b></div>
            <div className="credential-row">
              <input type="password" autoComplete="off" value={keyDraft} onChange={(e) => setKeyDraft(e.target.value)} placeholder={props.cloudKeyConfigured ? 'Enter a new key to replace' : 'Paste API key'} />
              <button type="button" disabled={keyBusy || !keyDraft.trim()} onClick={saveKey}>Save</button>
              {props.cloudKeyConfigured && <button type="button" className="danger-lite" disabled={keyBusy} onClick={removeKey}>Remove</button>}
            </div>
            {keyMessage && <small className="credential-message">{keyMessage}</small>}
            <small>The key is not stored in localStorage or app settings.</small>
          </div>
        </div>
      ) : (
        <>
          <nav className="workspace-tabs" aria-label="Pet tools">
            {(['chat', 'notes', 'todo', 'timers'] as Tab[]).map((item) => <button key={item} className={tab === item ? 'active' : ''} onClick={() => setTab(item)} type="button">{item === 'chat' ? 'Chat' : item === 'notes' ? 'Notes' : item === 'todo' ? 'Todo' : 'Timers'}</button>)}
          </nav>

          {tab === 'chat' && <>
            <div className="mood-row mood-row-v4">
              <span title="Happiness">😊 {props.mood.happiness}</span><span title="Hunger">🍽️ {props.mood.hunger}</span><span title="Energy">⚡ {props.mood.energy}</span><span title="Affection">💛 {props.mood.affection}</span><span title="Boredom">🎲 {props.mood.boredom}</span>
            </div>
            <div className="response-box">{props.response || `Try “find resume.pdf”, “open VS Code”, “save this as a note”, or “set a timer for 10 minutes”.`}</div>
            <div className="quick-actions">
              <button type="button" onClick={() => props.onSubmit('dance')}>Dance</button>
              <button type="button" onClick={() => props.onSubmit('feed')}>{pet.favoriteFood.emoji} Feed</button>
              <button type="button" onClick={() => props.onSubmit('play')}>{pet.favoriteToy.emoji} Play</button>
              <button type="button" onClick={() => props.onSubmit('go to sleep')}>Sleep</button>
            </div>
          </>}

          {tab === 'notes' && <div className="workspace-panel">
            <div className="workspace-add"><input value={miniInput} onChange={(e) => setMiniInput(e.target.value)} placeholder="Write a quick note…" onKeyDown={(e) => { if (e.key === 'Enter') void addWorkspaceItem() }} /><button onClick={() => void addWorkspaceItem()} disabled={workspaceBusy}>+</button></div>
            <div className="workspace-list">
              {notes.length === 0 && <div className="empty-state">No notes yet.</div>}
              {notes.map((note) => <article className="workspace-item" key={note.id}><div><p>{note.text}</p><small>{shortDate(note.createdAt)}</small></div><button title="Delete note" onClick={async () => { await deleteNote(note.id); await refreshWorkspace('notes') }}>×</button></article>)}
            </div>
          </div>}

          {tab === 'todo' && <div className="workspace-panel">
            <div className="workspace-add"><input value={miniInput} onChange={(e) => setMiniInput(e.target.value)} placeholder="Add a task…" onKeyDown={(e) => { if (e.key === 'Enter') void addWorkspaceItem() }} /><button onClick={() => void addWorkspaceItem()} disabled={workspaceBusy}>+</button></div>
            <div className="workspace-list">
              {todos.length === 0 && <div className="empty-state">No tasks yet.</div>}
              {todos.map((todo) => <article className={`workspace-item todo-item ${todo.done ? 'done' : ''}`} key={todo.id}><button className="todo-check" title={todo.done ? 'Completed' : 'Complete'} disabled={todo.done} onClick={async () => { await completeTodo(todo.id); await refreshWorkspace('todo') }}>{todo.done ? '✓' : '○'}</button><div><p>{todo.text}</p><small>{todo.dueAt ? `Due ${shortDate(todo.dueAt)}` : shortDate(todo.createdAt)}</small></div><button title="Delete task" onClick={async () => { await deleteTodo(todo.id); await refreshWorkspace('todo') }}>×</button></article>)}
            </div>
          </div>}

          {tab === 'timers' && <div className="workspace-panel">
            <div className="timer-presets"><span>Quick timer</span>{[5, 10, 25].map((minutes) => <button type="button" key={minutes} disabled={workspaceBusy} onClick={() => void quickTimer(minutes)}>{minutes}m</button>)}</div>
            <div className="workspace-list">
              {scheduled.length === 0 && <div className="empty-state">No active timers or reminders.</div>}
              {scheduled.map((item) => <article className="workspace-item" key={item.id}><div><p>{item.kind === 'timer' ? '⏱' : '🔔'} {item.label}</p><small>{formatDue(item.dueAtMs)}</small></div><button title="Cancel" onClick={async () => { await cancelScheduled(item.id); await refreshWorkspace('timers') }}>×</button></article>)}
            </div>
          </div>}
        </>
      )}

      <form onSubmit={submit} className="command-form">
        <input autoFocus value={value} onChange={(e) => setValue(e.target.value)} placeholder={`Ask ${pet.name} or type a command…`} />
        <button type="submit" disabled={props.busy}>➜</button>
      </form>
    </section>
  )
}
