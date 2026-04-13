import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import mongoose from 'mongoose'
import scoreRoutes from './routes/scores.js'

const app = express()

const PORT = process.env.PORT || 5000
const MONGO_URI = process.env.MONGO_URI || ''
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || '*'

app.use(
  cors({
    origin: CLIENT_ORIGIN === '*' ? true : CLIENT_ORIGIN,
  }),
)
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'almost-there-api' })
})

app.use('/api/scores', scoreRoutes)

app.use((_req, res) => {
  res.status(404).json({ message: 'Route not found.' })
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
