import mongoose from 'mongoose'

const scoreSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 16,
    },
    score: {
      type: Number,
      required: true,
      min: 0,
      index: true,
    },
    duration: {
      type: Number,
      required: true,
      min: 0,
    },
    outcome: {
      type: String,
      enum: ['win', 'lose'],
      required: true,
    },
  },
  {
    timestamps: true,
  },
)

scoreSchema.index({ score: -1, createdAt: 1 })

const Score = mongoose.model('Score', scoreSchema)

export default Score
