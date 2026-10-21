import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import { beginSessionRecovery, markSessionHealthy } from './services/recovery'
import './styles/global.css'

beginSessionRecovery()
window.setTimeout(markSessionHealthy, 7000)
window.addEventListener('beforeunload', markSessionHealthy)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary><App /></ErrorBoundary>
  </StrictMode>,
)
