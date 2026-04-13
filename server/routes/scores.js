import { Router } from 'express'
import Score from '../models/Score.js'

const router = Router()

const RATE_WINDOW_MS = 60 * 1000
const RATE_LIMIT_POSTS = 20
const postRequestLog = new Map()

const sanitizeName = (value) =>
  value
    .trim()
    .replace(/[^a-zA-Z0-9 _-]/g, '')
    .slice(0, 16)

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))

function applyPostRateLimit(req, res, next) {
  if (req.method !== 'POST') {
    next()
    return
  }

  const key = req.ip || 'unknown'
  const now = Date.now()
  const recent = (postRequestLog.get(key) || []).filter((ts) => now - ts < RATE_WINDOW_MS)

  if (recent.length >= RATE_LIMIT_POSTS) {
    res.status(429).json({ message: 'Too many score submissions. Try again in a minute.' })
    return
  }

  recent.push(now)
  postRequestLog.set(key, recent)
  next()
}

router.use(applyPostRateLimit)

router.get('/', async (req, res) => {
  try {
    const page = clamp(Number.parseInt(req.query.page, 10) || 1, 1, 500)
    const limit = clamp(Number.parseInt(req.query.limit, 10) || 10, 1, 50)
    const skip = (page - 1) * limit
    const name = typeof req.query.name === 'string' ? sanitizeName(req.query.name) : ''

    const [rows, total] = await Promise.all([
      Score.find().sort({ score: -1, createdAt: 1 }).skip(skip).limit(limit).lean(),
      Score.countDocuments(),
    ])

    let playerRank = null
    if (name) {
      const bestRun = await Score.findOne({ name: new RegExp(`^${name}$`, 'i') })
        .sort({ score: -1, createdAt: 1 })
        .lean()

      if (bestRun) {
        const ahead = await Score.countDocuments({
          $or: [
            { score: { $gt: bestRun.score } },
            { score: bestRun.score, createdAt: { $lt: bestRun.createdAt } },
          ],
        })
        playerRank = ahead + 1
      }
    }

    if (req.query.page || req.query.limit || req.query.name) {
      res.json({
        items: rows,
        total,
        page,
        limit,
        playerRank,
      })
      return
    }

    res.json(rows)
  } catch (error) {
    console.error('[scores:get]', {
      message: error?.message,
      query: req.query,
    })
    res.status(500).json({ message: 'Failed to fetch leaderboard.' })
  }
})

router.post('/', async (req, res) => {
  try {
    const { name, score, duration, outcome } = req.body

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ message: 'Player name is required.' })
    }

    if (!Number.isFinite(score) || score < 0) {
      return res.status(400).json({ message: 'Score must be a valid number.' })
    }

    if (!Number.isFinite(duration) || duration < 0) {
      return res.status(400).json({ message: 'Duration must be a valid number.' })
    }

    if (outcome !== 'win' && outcome !== 'lose') {
      return res.status(400).json({ message: 'Outcome must be win or lose.' })
    }

    const cleanName = sanitizeName(name)
    if (!cleanName) {
      return res.status(400).json({ message: 'Player name has invalid characters.' })
    }

    const numericScore = Math.floor(score)
    const safeDuration = clamp(duration, 0, 60 * 60)
    const maxAllowedScore = Math.floor(safeDuration * 1600 + 50000)
    if (numericScore > maxAllowedScore) {
      return res.status(400).json({ message: 'Score looks invalid for this run duration.' })
    }

    const saved = await Score.create({
      name: cleanName,
      score: numericScore,
      duration: safeDuration,
      outcome,
    })

    return res.status(201).json(saved)
  } catch (error) {
    console.error('[scores:post]', {
      message: error?.message,
      body: {
        hasName: Boolean(req.body?.name),
        hasScore: Number.isFinite(req.body?.score),
        hasDuration: Number.isFinite(req.body?.duration),
        outcome: req.body?.outcome,
      },
    })
    return res.status(500).json({ message: 'Failed to save score.' })
  }
})

export default router
