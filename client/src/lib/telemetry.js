const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

function postTelemetry(path, payload) {
  const body = JSON.stringify({
    ...payload,
    ts: new Date().toISOString(),
  })

  try {
    // sendBeacon keeps telemetry best-effort during page transitions.
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: 'application/json' })
      const queued = navigator.sendBeacon(`${API_BASE}${path}`, blob)
      if (queued) {
        return
      }
    }

    void fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    })
  } catch {
    // Never block gameplay on telemetry failure.
  }
}

export function trackEvent(event, data = {}) {
  postTelemetry('/analytics/events', {
    event,
    data,
  })
}

export function reportFrontendError(errorType, errorValue, extra = {}) {
  const message =
    typeof errorValue === 'string'
      ? errorValue
      : errorValue?.message || 'Unknown frontend error'

  postTelemetry('/analytics/errors', {
    errorType,
    message,
    stack: typeof errorValue === 'object' ? errorValue?.stack : undefined,
    path: window.location.pathname,
    userAgent: navigator.userAgent,
    extra,
  })
}
