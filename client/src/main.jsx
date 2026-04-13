import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { reportFrontendError } from './lib/telemetry'

window.addEventListener('error', (event) => {
  reportFrontendError('window_error', event.error || event.message, {
    filename: event.filename,
    line: event.lineno,
    column: event.colno,
  })
})

window.addEventListener('unhandledrejection', (event) => {
  reportFrontendError('unhandled_rejection', event.reason)
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
