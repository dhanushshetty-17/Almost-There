import { Router } from 'express'
import Score from '../models/Score.js'

const router = Router()

router.get('/', async (_req, res) => {
  try {
    const rows = await Score.find().sort({ score: -1, createdAt: 1 }).limit(10).lean()
    res.json(rows)
  } catch {
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

    const saved = await Score.create({
      name: name.trim().slice(0, 16),
      score: Math.floor(score),
      duration,
      outcome,
    })

    return res.status(201).json(saved)
  } catch {
    return res.status(500).json({ message: 'Failed to save score.' })
  }
})

export default router
