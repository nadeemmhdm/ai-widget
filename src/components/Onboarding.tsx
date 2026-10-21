import { useMemo, useState } from 'react'
import { CHARACTER_DEFINITIONS } from '../pet/characters/definitions'
import { setCloudApiKey } from '../services/native'
import type { AiSettings } from '../services/ai'
import type { BehaviorSettings, CharacterId } from '../types/pet'

type Props = {
  initialCharacter: CharacterId
  initialAi: AiSettings
  initialBehavior: BehaviorSettings
  onFinish: (value: { character: CharacterId; ai: AiSettings; behavior: BehaviorSettings; speech: boolean }) => void
}

export function Onboarding({ initialCharacter, initialAi, initialBehavior, onFinish }: Props) {
  const [step, setStep] = useState(0)
  const [character, setCharacter] = useState(initialCharacter)
  const [ai, setAi] = useState(initialAi)
  const [behavior, setBehavior] = useState(initialBehavior)
  const [speech, setSpeech] = useState(true)
  const [apiKey, setApiKey] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const pet = useMemo(() => CHARACTER_DEFINITIONS[character], [character])

  async function finish() {
    setSaving(true); setMessage('')
    try {
      if (apiKey.trim()) await setCloudApiKey(apiKey.trim())
      localStorage.setItem('nook.onboarding.v1', 'complete')
      onFinish({ character, ai, behavior, speech })
    } catch (error) {
      setMessage(`Could not save the cloud key: ${String(error)}`)
      return
    } finally { setSaving(false) }
  }

  return <div className="onboarding-backdrop">
    <section className="onboarding-card">
      <div className="onboarding-brand"><span>✦</span><b>Nook AI Pet</b><small>Windows desktop companion</small></div>
      <div className="onboarding-progress">{[0,1,2,3].map((n) => <i key={n} className={n <= step ? 'active' : ''} />)}</div>

      {step === 0 && <div className="onboarding-page">
        <div className="onboarding-pet">{pet.emoji}</div>
        <h2>Choose your companion</h2>
        <p>You can switch characters later from Settings.</p>
        <div className="onboarding-characters">{(Object.keys(CHARACTER_DEFINITIONS) as CharacterId[]).map((id) => {
          const item = CHARACTER_DEFINITIONS[id]
          return <button key={id} className={id === character ? 'selected' : ''} onClick={() => setCharacter(id)}><span>{item.emoji}</span><b>{item.name}</b><small>{item.movementLabel}</small></button>
        })}</div>
      </div>}

      {step === 1 && <div className="onboarding-page">
        <h2>Set up AI</h2>
        <p>Auto mode uses Ollama Cloud when configured and falls back to your local Ollama model.</p>
        <label>AI mode<select value={ai.mode} onChange={(e) => setAi({ ...ai, mode: e.target.value as AiSettings['mode'] })}><option value="auto">Auto · Cloud → Local</option><option value="local">Local Ollama only</option><option value="cloud">Ollama Cloud only</option></select></label>
        <label>Local model<input value={ai.localModel} onChange={(e) => setAi({ ...ai, localModel: e.target.value })} /></label>
        <label>Cloud model<input value={ai.cloudModel} onChange={(e) => setAi({ ...ai, cloudModel: e.target.value })} /></label>
        <label>Ollama Cloud API key <small>optional</small><input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Stored securely in Windows Credential Manager" /></label>
      </div>}

      {step === 2 && <div className="onboarding-page">
        <h2>Pet behavior</h2>
        <p>These defaults can be changed any time.</p>
        <label className="onboarding-switch">Autonomous movement<input type="checkbox" checked={behavior.autonomous} onChange={(e) => setBehavior({ ...behavior, autonomous: e.target.checked })} /></label>
        <label className="onboarding-switch">Cursor gaze tracking<input type="checkbox" checked={behavior.cursorTracking} onChange={(e) => setBehavior({ ...behavior, cursorTracking: e.target.checked })} /></label>
        <label className="onboarding-switch">Character speech<input type="checkbox" checked={speech} onChange={(e) => setSpeech(e.target.checked)} /></label>
        <label>Performance<select value={behavior.performanceMode} onChange={(e) => setBehavior({ ...behavior, performanceMode: e.target.value as BehaviorSettings['performanceMode'] })}><option value="auto">Auto · battery aware</option><option value="quality">Quality</option><option value="balanced">Balanced</option><option value="battery">Battery saver</option></select></label>
      </div>}

      {step === 3 && <div className="onboarding-page onboarding-ready">
        <div className="onboarding-pet">{pet.emoji}</div><h2>{pet.name} is ready</h2>
        <p>Click the pet to open Chat, Notes, Todo and Timers. Drag the pet anywhere on your screen.</p>
        <div className="ready-grid"><span>📝 Notes</span><span>✅ Todo</span><span>⏱ Timers</span><span>🤖 AI tools</span></div>
        {message && <small className="onboarding-error">{message}</small>}
      </div>}

      <footer className="onboarding-actions">
        <button className="secondary" disabled={step === 0 || saving} onClick={() => setStep((v) => v - 1)}>Back</button>
        {step < 3 ? <button onClick={() => setStep((v) => v + 1)}>Continue</button> : <button disabled={saving} onClick={() => void finish()}>{saving ? 'Saving…' : 'Start Nook'}</button>}
      </footer>
    </section>
  </div>
}
