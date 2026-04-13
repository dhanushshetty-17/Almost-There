import { Router } from 'express'

const router = Router()

const clampText = (value, max = 160) => String(value || '').slice(0, max)

router.post('/events', (req, res) => {
  const { event, data, ts } = req.body || {}

  if (!event || typeof event !== 'string') {
    return res.status(400).json({ message: 'event is required' })
  }

  const payload = {
    event: clampText(event, 80),
    data: data && typeof data === 'object' ? data : {},
    ts: typeof ts === 'string' ? ts : new Date().toISOString(),
    ip: req.ip,
  }

  console.log('[analytics:event]', JSON.stringify(payload))
  return res.status(202).json({ ok: true })
})

router.post('/errors', (req, res) => {
  const { errorType, message, stack, path, userAgent, extra, ts } = req.body || {}

  const payload = {
    errorType: clampText(errorType || 'unknown', 80),
    message: clampText(message || 'Unknown error', 500),
    stack: clampText(stack || '', 1500),
    path: clampText(path || '', 300),
    userAgent: clampText(userAgent || '', 300),
    extra: extra && typeof extra === 'object' ? extra : {},
    ts: typeof ts === 'string' ? ts : new Date().toISOString(),
    ip: req.ip,
  }

  console.error('[analytics:frontend-error]', JSON.stringify(payload))
  return res.status(202).json({ ok: true })
})

export default router
