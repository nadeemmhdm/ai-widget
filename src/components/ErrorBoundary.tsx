import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = { children: ReactNode }
type State = { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State { return { error } }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Nook UI crash', error, info)
    localStorage.setItem('nook.last-ui-crash.v1', JSON.stringify({ message: error.message, at: new Date().toISOString() }))
  }

  private recover = () => {
    localStorage.setItem('nook.petSize', '300')
    localStorage.removeItem('nook.behavior.v4')
    localStorage.removeItem('nook.last-ui-crash.v1')
    window.location.reload()
  }

  render() {
    if (!this.state.error) return this.props.children
    return <main className="fatal-recovery">
      <div className="fatal-card">
        <div className="fatal-icon">🐻</div>
        <h1>Nook recovered from a UI error</h1>
        <p>Your notes, todos and reminders are stored separately and are not cleared by recovery.</p>
        <small>{this.state.error.message}</small>
        <button onClick={this.recover}>Restart with safe settings</button>
      </div>
    </main>
  }
}
