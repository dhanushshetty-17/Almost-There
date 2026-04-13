import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import mongoose from 'mongoose'
import scoreRoutes from './routes/scores.js'
import analyticsRoutes from './routes/analytics.js'

const app = express()

const PORT = process.env.PORT || 5000
const MONGO_URI = process.env.MONGO_URI || ''
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || '*'
const allowedOrigins = CLIENT_ORIGIN.split(',')
  .map((value) => value.trim())
  .filter(Boolean)

const isAllowedOrigin = (origin) => {
  if (!origin) {
    return true
  }

  if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
    return true
  }

  if (/^https:\/\/[\w-]+\.vercel\.app$/.test(origin)) {
    return true
  }

  if (/^http:\/\/localhost:\d+$/.test(origin) || /^http:\/\/127\.0\.0\.1:\d+$/.test(origin)) {
    return true
  }

  return false
}

app.use(
  cors({
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        callback(null, true)
        return
      }
      callback(new Error(`CORS blocked for origin: ${origin}`))
    },
  }),
)
app.use(express.json())

app.use((req, res, next) => {
  const start = Date.now()
  res.on('finish', () => {
    const durationMs = Date.now() - start
    console.log(`[api] ${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs}ms`)
  })
  next()
})

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'almost-there-api' })
})

app.use('/api/scores', scoreRoutes)
app.use('/api/analytics', analyticsRoutes)

app.use((_req, res) => {
  res.status(404).json({ message: 'Route not found.' })
})

app.use((error, req, res, _next) => {
  console.error('[api:error]', {
    method: req.method,
    url: req.originalUrl,
    message: error?.message,
    stack: error?.stack,
  })
  res.status(500).json({ message: 'Internal server error.' })
})

process.on('uncaughtException', (error) => {
  console.error('[process:uncaughtException]', error)
})

process.on('unhandledRejection', (reason) => {
  console.error('[process:unhandledRejection]', reason)
})

async function start() {
  try {
    if (!MONGO_URI) {
      throw new Error('MONGO_URI is missing. Add it to server/.env.')
    }

    await mongoose.connect(MONGO_URI)
    app.listen(PORT, () => {
      console.log(`API running on http://localhost:${PORT}`)
    })
  } catch (error) {
    console.error('Startup error:', error.message)
    process.exit(1)
  }
}

start()
