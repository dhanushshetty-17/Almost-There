import { useEffect, useMemo, useRef, useState } from 'react'
import MainMenu from './components/MainMenu'
import GameOverScreen from './components/GameOverScreen'
import Hud from './components/Hud'
import TutorialPage from './components/TutorialPage'
import SettingsPage from './components/SettingsPage'
import { trackEvent } from './lib/telemetry'
import { resolveApiBase } from './lib/apiBase'

const API_BASE = resolveApiBase()

const TUNING = {
  difficultyBands: [
    {
      until: 30,
      label: 'Warmup',
      difficultyMultiplier: 1,
      flipIntervalScale: 1.15,
      goalSpeedScale: 0.95,
      shardChance: 0.08,
      riftIntervalScale: 1.1,
      wallLimitScale: 1,
      nearWinDistance: 120,
      slowMoFactor: 0.6,
    },
    {
      until: 60,
      label: 'Pressure',
      difficultyMultiplier: 1.15,
      flipIntervalScale: 0.9,
      goalSpeedScale: 1.08,
      shardChance: 0.07,
      riftIntervalScale: 0.95,
      wallLimitScale: 0.92,
      nearWinDistance: 132,
      slowMoFactor: 0.5,
    },
    {
      until: Infinity,
      label: 'Overdrive',
      difficultyMultiplier: 1.35,
      flipIntervalScale: 0.78,
      goalSpeedScale: 1.18,
      shardChance: 0.05,
      riftIntervalScale: 0.82,
      wallLimitScale: 0.8,
      nearWinDistance: 145,
      slowMoFactor: 0.42,
    },
  ],
  audio: {
    ambientBaseGain: 0.02,
    ambientTensionGain: 0.018,
    ambientVolumeScale: 0.9,
    tensionMaxDistance: 260,
    tensionNearGain: 0.16,
  },
  feedback: {
    chromaticFlashDecay: 1.6,
    chromaticFlashNearGoal: 0.52,
    chromaticFlashWallHit: 0.34,
    nearWinSlowMoDuration: 0.6,
    wallHitFlashDuration: 0.22,
  },
  gameplay: {
    scorePerSecondBase: 10,
    scorePerSecondDifficulty: 2,
    shardPoints: 45,
    goalBonusPoints: 250,
    maxCombo: 8,
    maxRifts: 2,
    maxShards: 4,
  },
}

const GAME_MODES = {
  classic: {
    label: 'Classic',
    flipFactor: 1,
    fakeWinChance: 0.42,
    wallLimit: 2.9,
    goalSpeedFactor: 1,
  },
  chaos: {
    label: 'Chaos',
    flipFactor: 1.3,
    fakeWinChance: 0.55,
    wallLimit: 3,
    goalSpeedFactor: 1.15,
  },
  hardcore: {
    label: 'Hardcore',
    flipFactor: 1.45,
    fakeWinChance: 0.28,
    wallLimit: 2.2,
    goalSpeedFactor: 1.2,
  },
}

const DEFAULT_SETTINGS = {
  mode: 'classic',
  volume: 70,
  effects: 100,
  sensitivity: 100,
}

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))

const rand = (min, max) => Math.random() * (max - min) + min

const getDifficultyBand = (duration) => TUNING.difficultyBands.find((band) => duration < band.until) || TUNING.difficultyBands[TUNING.difficultyBands.length - 1]

const initialEngine = (width, height, mode = 'classic') => ({
  width,
  height,
  mode,
  player: { x: width * 0.2, y: height * 0.5, radius: 14, speed: 250, trailTick: 0 },
  goal: { x: width * 0.8, y: height * 0.5, radius: 18, speed: 205 },
  shards: [],
  rifts: [],
  particles: [],
  score: 0,
  duration: 0,
  difficulty: 1,
  combo: 1,
  comboTimer: 0,
  comboBest: 1,
  controlsFlipped: false,
  nextFlipAt: rand(6, 12),
  nextRiftAt: rand(8, 14),
  warning: 'Hold it together.',
  screenShake: 0,
  shakeX: 0,
  shakeY: 0,
  wallHits: 0,
  isGameOver: false,
  outcome: 'lose',
  fakeUiFlash: 0,
  chromaticFlash: 0,
  dashCooldown: 0,
  dashBurst: 0,
  slowMoTimer: 0,
  slowMoScale: 1,
  nearWinLock: 0,
  soundEnabled: true,
  mission: 0,
})

function createAudioEngine(getVolume = () => 1) {
  const AudioCtx = window.AudioContext || window.webkitAudioContext
  if (!AudioCtx) {
    return
  }

  const audio = new AudioCtx()
  let ambientStarted = false
  let ambientNodes = null
  let enabled = true

  const ensureAmbient = () => {
    if (ambientStarted) {
      return ambientNodes
    }

    const ambientFilter = audio.createBiquadFilter()
    ambientFilter.type = 'lowpass'
    ambientFilter.frequency.value = 220
    ambientFilter.Q.value = 0.8

    const ambientGain = audio.createGain()
    ambientGain.gain.value = 0

    const tensionFilter = audio.createBiquadFilter()
    tensionFilter.type = 'bandpass'
    tensionFilter.frequency.value = 420
    tensionFilter.Q.value = 4

    const tensionGain = audio.createGain()
    tensionGain.gain.value = 0

    const ambientOscA = audio.createOscillator()
    ambientOscA.type = 'sine'
    ambientOscA.frequency.value = 55

    const ambientOscB = audio.createOscillator()
    ambientOscB.type = 'triangle'
    ambientOscB.frequency.value = 110

    const tensionOsc = audio.createOscillator()
    tensionOsc.type = 'sawtooth'
    tensionOsc.frequency.value = 88

    ambientOscA.connect(ambientFilter)
    ambientOscB.connect(ambientFilter)
    ambientFilter.connect(ambientGain)
    ambientGain.connect(audio.destination)

    tensionOsc.connect(tensionFilter)
    tensionFilter.connect(tensionGain)
    tensionGain.connect(audio.destination)

    ambientOscA.start()
    ambientOscB.start()
    tensionOsc.start()

    ambientStarted = true
    ambientNodes = {
      ambientGain,
      ambientFilter,
      ambientOscA,
      ambientOscB,
      tensionGain,
      tensionFilter,
      tensionOsc,
    }

    return ambientNodes
  }

  const updateLayers = ({ intensity = 0, tension = 0 }) => {
    const nodes = ensureAmbient()
    if (!nodes) {
      return
    }

    if (!enabled) {
      nodes.ambientGain.gain.setTargetAtTime(0, audio.currentTime, 0.03)
      nodes.tensionGain.gain.setTargetAtTime(0, audio.currentTime, 0.03)
      return
    }

    const volumeScale = getVolume() * TUNING.audio.ambientVolumeScale
    const ambientGainTarget = TUNING.audio.ambientBaseGain * volumeScale
    const tensionGainTarget = Math.min(TUNING.audio.ambientTensionGain + tension * TUNING.audio.tensionNearGain, 0.22) * volumeScale

    nodes.ambientGain.gain.setTargetAtTime(ambientGainTarget, audio.currentTime, 0.04)
    nodes.tensionGain.gain.setTargetAtTime(tensionGainTarget, audio.currentTime, 0.03)
    nodes.ambientFilter.frequency.setTargetAtTime(180 + intensity * 220, audio.currentTime, 0.04)
    nodes.tensionFilter.frequency.setTargetAtTime(360 + tension * 600, audio.currentTime, 0.04)
    nodes.tensionOsc.frequency.setTargetAtTime(72 + tension * 70, audio.currentTime, 0.03)
  }

  const trigger = (type = 'square', frequency = 440, duration = 0.06, gainValue = 0.02, glide = 0) => {
    if (!enabled) {
      return
    }

    const oscillator = audio.createOscillator()
    const gain = audio.createGain()

    oscillator.type = type
    oscillator.frequency.value = frequency
    if (glide !== 0) {
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(50, frequency + glide), audio.currentTime + duration)
    }
    gain.gain.value = gainValue * getVolume()

    oscillator.connect(gain)
    gain.connect(audio.destination)
    oscillator.start()

    gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + duration)
    oscillator.stop(audio.currentTime + duration)
  }

  const noiseBurst = (duration = 0.05, gainValue = 0.025) => {
    if (!enabled) {
      return
    }

    const buffer = audio.createBuffer(1, audio.sampleRate * duration, audio.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < data.length; i += 1) {
      data[i] = Math.random() * 2 - 1
    }

    const source = audio.createBufferSource()
    const gain = audio.createGain()
    source.buffer = buffer
    gain.gain.value = gainValue * getVolume()
    source.connect(gain)
    gain.connect(audio.destination)
    source.start()
    gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + duration)
    source.stop(audio.currentTime + duration)
  }

  return {
    audio,
    trigger,
    noiseBurst,
    updateLayers,
    setEnabled: (value) => {
      enabled = Boolean(value)
      if (!enabled) {
        const nodes = ensureAmbient()
        if (nodes) {
          nodes.ambientGain.gain.setTargetAtTime(0, audio.currentTime, 0.02)
          nodes.tensionGain.gain.setTargetAtTime(0, audio.currentTime, 0.02)
        }
      }
    },
    suspend: async () => {
      if (audio.state === 'running') {
        await audio.suspend()
      }
    },
    resume: async () => {
      if (audio.state !== 'running') {
        await audio.resume()
      }
    },
    unlock: async () => {
      if (audio.state !== 'running') {
        await audio.resume()
      }
    },
  }
}

function resizeCanvas(canvas) {
  const dpr = window.devicePixelRatio || 1
  const rect = canvas.getBoundingClientRect()

  canvas.width = Math.floor(rect.width * dpr)
  canvas.height = Math.floor(rect.height * dpr)

  const ctx = canvas.getContext('2d')
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  return { width: rect.width, height: rect.height }
}

function drawGlowCircle(ctx, x, y, radius, color, glow = 15) {
  ctx.save()
  ctx.shadowBlur = glow
  ctx.shadowColor = color
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function spawnParticle(engine, x, y, color) {
  engine.particles.push({
    x,
    y,
    vx: rand(-35, 35),
    vy: rand(-35, 35),
    life: rand(0.25, 0.7),
    age: 0,
    size: rand(1.5, 3.5),
    color,
  })

  if (engine.particles.length > 200) {
    engine.particles.shift()
  }
}

function spawnRift(engine) {
  if (engine.rifts.length >= 2) {
    return
  }

  engine.rifts.push({
    x: rand(80, engine.width - 80),
    y: rand(80, engine.height - 80),
    radius: rand(42, 72),
    ttl: rand(5, 8),
    age: 0,
    spin: rand(0, Math.PI * 2),
  })
}

async function fetchLeaderboard() {
  const response = await fetch(`${API_BASE}/scores`)
  if (!response.ok) {
    throw new Error('Could not fetch leaderboard')
  }
  const payload = await response.json()
  if (Array.isArray(payload)) {
    return {
      items: payload,
      total: payload.length,
      page: 1,
      limit: payload.length || 10,
      playerRank: null,
    }
  }
  return payload
}

async function fetchLeaderboardPage({ page = 1, limit = 10, name = '' } = {}) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  })

  if (name) {
    params.set('name', name)
  }

  const response = await fetch(`${API_BASE}/scores?${params.toString()}`)
  if (!response.ok) {
    throw new Error('Could not fetch leaderboard')
  }

  const payload = await response.json()
  return {
    items: payload.items || [],
    total: payload.total || 0,
    page: payload.page || page,
    limit: payload.limit || limit,
    playerRank: payload.playerRank ?? null,
  }
}

async function saveScore(payload) {
  let response
  try {
    response = await fetch(`${API_BASE}/scores`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch {
    throw new Error('Cannot reach leaderboard server. Please try again in a few seconds.')
  }

  if (!response.ok) {
    let message = 'Could not save score'
    try {
      const errorPayload = await response.json()
      if (errorPayload?.message) {
        message = errorPayload.message
      }
    } catch {
      // Keep fallback message when response body is not JSON.
    }
    throw new Error(message)
  }

  return response.json()
}

export default function Game() {
  const canvasRef = useRef(null)
  const rafRef = useRef(0)
  const keysRef = useRef({})
  const engineRef = useRef(null)
  const audioRef = useRef(null)
  const settingsRef = useRef(DEFAULT_SETTINGS)
  const hasTrackedSessionRef = useRef(false)
  const leaderboardLimitRef = useRef(10)

  const [screen, setScreen] = useState('menu')
  const [hud, setHud] = useState({
    score: 0,
    difficulty: 1,
    controlsFlipped: false,
    warning: '',
    paused: false,
    dashCooldown: 0,
    soundEnabled: true,
    mission: 0,
    shardCount: 0,
    combo: 1,
    riftCount: 0,
    wallHits: 0,
    wallLimit: 1,
    progress: 0,
    playerX: 0,
    playerY: 0,
    goalX: 0,
    goalY: 0,
    fieldWidth: 1,
    fieldHeight: 1,
  })
  const [runResult, setRunResult] = useState({ score: 0, duration: 0, outcome: 'lose', reason: '' })
  const [leaderboard, setLeaderboard] = useState([])
  const [leaderboardInfo, setLeaderboardInfo] = useState({
    total: 0,
    page: 1,
    limit: 10,
    playerRank: null,
  })
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [settingsBackTarget, setSettingsBackTarget] = useState('menu')
  const [settingsBackPause, setSettingsBackPause] = useState(false)
  const [pause, setPause] = useState(false)
  const [fakeOverlay, setFakeOverlay] = useState('')
  const [quitNotice, setQuitNotice] = useState('')
  const [showTouchControls, setShowTouchControls] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 900px)').matches : false,
  )
  const [joystickVector, setJoystickVector] = useState({ x: 0, y: 0 })
  const joystickRef = useRef({ active: false, originX: 0, originY: 0, x: 0, y: 0, rect: null, pointerId: null })

  const bgGradient = useMemo(
    () => ['#050611', '#080f26', '#101033', '#180c2b'],
    [],
  )

  useEffect(() => {
    settingsRef.current = settings
  }, [settings])

  useEffect(() => {
    leaderboardLimitRef.current = leaderboardInfo.limit || 10
  }, [leaderboardInfo.limit])

  useEffect(() => {
    if (!hasTrackedSessionRef.current) {
      hasTrackedSessionRef.current = true
      trackEvent('session_start', {
        mode: settingsRef.current.mode,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        platform: navigator.platform,
      })
    }

    audioRef.current = createAudioEngine(() => settingsRef.current.volume / 100)

    fetchLeaderboard()
      .then((data) => {
        setLeaderboard(data.items || [])
        setLeaderboardInfo({
          total: data.total || 0,
          page: data.page || 1,
          limit: data.limit || 10,
          playerRank: data.playerRank ?? null,
        })
      })
      .catch(() => undefined)

    const mediaQuery = window.matchMedia('(max-width: 900px)')
    const onMediaChange = (event) => {
      setShowTouchControls(event.matches)
    }

    mediaQuery.addEventListener('change', onMediaChange)

    return () => {
      mediaQuery.removeEventListener('change', onMediaChange)
    }
  }, [])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) {
      return undefined
    }

    const active = screen === 'game' && soundEnabled
    audio.setEnabled?.(active)
    if (active) {
      void audio.resume?.()
    } else {
      void audio.suspend?.()
    }

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        void audio.suspend?.()
        return
      }
      if (screen === 'game' && soundEnabled) {
        void audio.resume?.()
      }
    }

    const onPageExit = () => {
      void audio.suspend?.()
    }

    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', onPageExit)
    window.addEventListener('beforeunload', onPageExit)

    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', onPageExit)
      window.removeEventListener('beforeunload', onPageExit)
    }
  }, [screen, soundEnabled])

  useEffect(() => {
    const onKeyDown = (event) => {
      const key = event.key.toLowerCase()

      if (key === 'p' && screen === 'game') {
        setPause((value) => !value)
      }

      if (screen === 'game' && key === ' ') {
        event.preventDefault()
      }

      keysRef.current[key] = true
    }

    const onKeyUp = (event) => {
      keysRef.current[event.key.toLowerCase()] = false
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [screen])

  useEffect(() => {
    if (screen !== 'game') {
      cancelAnimationFrame(rafRef.current)
      return undefined
    }

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const size = resizeCanvas(canvas)

    const engine = initialEngine(size.width, size.height, settingsRef.current.mode)
    engine.soundEnabled = soundEnabled
    engineRef.current = engine

    const audio = audioRef.current
    const playSound = (...args) => {
      if (engine.soundEnabled) {
        audio?.trigger(...args)
      }
    }
    const playNoise = (...args) => {
      if (engine.soundEnabled) {
        audio?.noiseBurst(...args)
      }
    }

    const onResize = () => {
      const next = resizeCanvas(canvas)
      engine.width = next.width
      engine.height = next.height
      engine.player.x = clamp(engine.player.x, 0, engine.width)
      engine.player.y = clamp(engine.player.y, 0, engine.height)
      engine.goal.x = clamp(engine.goal.x, 0, engine.width)
      engine.goal.y = clamp(engine.goal.y, 0, engine.height)
    }

    window.addEventListener('resize', onResize)

    let previous = performance.now()

    const endGame = (outcome) => {
      const reason =
        outcome === 'lose'
          ? 'Too many wall collisions. Time only raises difficulty, and move count does not end the run.'
          : ''
      engine.isGameOver = true
      engine.outcome = outcome
      setRunResult({ score: engine.score, duration: engine.duration, outcome, reason })
      setScreen('end')
      setPause(false)
      trackEvent('game_over', {
        outcome,
        score: Math.floor(engine.score),
        duration: Number(engine.duration.toFixed(2)),
        mode: engine.mode,
        wallHits: Number(engine.wallHits.toFixed(2)),
      })
      fetchLeaderboardPage({ page: 1, limit: leaderboardLimitRef.current })
        .then((data) => {
          setLeaderboard(data.items)
          setLeaderboardInfo(data)
        })
        .catch(() => undefined)
      playSound(outcome === 'win' ? 'triangle' : 'sawtooth', outcome === 'win' ? 720 : 180, 0.12, 0.04)
      if (outcome === 'win') {
        playSound('sine', 980, 0.09, 0.028)
      } else {
        playSound('square', 130, 0.1, 0.02, -45)
      }
    }

    const spawnShard = () => {
      if (engine.shards.length > 4 || Math.random() > 0.07) {
        return
      }

      engine.shards.push({
        x: rand(40, engine.width - 40),
        y: rand(40, engine.height - 40),
        radius: rand(8, 12),
        ttl: rand(4, 6),
        age: 0,
        wobble: rand(0, Math.PI * 2),
      })
    }

    const loop = (time) => {
      const dt = Math.min((time - previous) / 1000, 0.033)
      previous = time

      if (!pause && !engine.isGameOver) {
        const currentSettings = settingsRef.current
        const modeConfig = GAME_MODES[engine.mode] || GAME_MODES.classic
        const band = getDifficultyBand(engine.duration)
        const effectsScale = clamp(currentSettings.effects / 100, 0.2, 1.5)
        const sensitivityScale = clamp(currentSettings.sensitivity / 100, 0.5, 1.6)
        const timeScale = engine.slowMoTimer > 0 ? engine.slowMoScale : 1
        const scaledDt = dt * timeScale

        engine.duration += dt
        engine.comboTimer = Math.max(0, engine.comboTimer - scaledDt)
        if (engine.comboTimer === 0) {
          engine.combo = 1
        }
        engine.combo = clamp(engine.combo, 1, TUNING.gameplay.maxCombo)
        engine.comboBest = Math.max(engine.comboBest, engine.combo)

        const comboMultiplier = 1 + (engine.combo - 1) * 0.25
        engine.score += scaledDt * (TUNING.gameplay.scorePerSecondBase + engine.difficulty * TUNING.gameplay.scorePerSecondDifficulty) * comboMultiplier
        engine.difficulty = 1 + engine.duration * 0.04 * modeConfig.flipFactor * band.difficultyMultiplier
        engine.dashCooldown = Math.max(0, engine.dashCooldown - scaledDt)
        engine.dashBurst = Math.max(0, engine.dashBurst - scaledDt * 3)
        engine.nearWinLock = Math.max(0, engine.nearWinLock - dt)

        if (engine.duration >= engine.nextRiftAt) {
          spawnRift(engine)
          engine.nextRiftAt += rand(8, 14) / (engine.difficulty * modeConfig.flipFactor * band.riftIntervalScale)
        }

        if (Math.random() > 1 - band.shardChance) {
          spawnShard()
        }

        const spacePressed = Boolean(keysRef.current[' '])
        if (spacePressed && engine.dashCooldown === 0) {
          const keys = keysRef.current
          let dashX = 0
          let dashY = 0

          if (keys.w || keys.arrowup) dashY -= 1
          if (keys.s || keys.arrowdown) dashY += 1
          if (keys.a || keys.arrowleft) dashX -= 1
          if (keys.d || keys.arrowright) dashX += 1

          if (dashX !== 0 || dashY !== 0) {
            const dashMag = Math.hypot(dashX, dashY) || 1
            engine.player.x += (dashX / dashMag) * 120 * sensitivityScale
            engine.player.y += (dashY / dashMag) * 120 * sensitivityScale
            engine.dashCooldown = 1.9
            engine.dashBurst = 1.2
            engine.warning = 'Turbo dash triggered!'
            engine.screenShake = 16 * effectsScale
            engine.chromaticFlash = Math.max(engine.chromaticFlash, TUNING.feedback.chromaticFlashWallHit)
            playSound('square', 160, 0.08, 0.03)
            playSound('triangle', 420, 0.06, 0.018, 120)
            playNoise(0.04, 0.01)
            keysRef.current[' '] = false
          }
        }

        if (engine.duration >= engine.nextFlipAt) {
          engine.controlsFlipped = !engine.controlsFlipped
          engine.nextFlipAt += rand(5, 10) / (engine.difficulty * modeConfig.flipFactor * band.flipIntervalScale)
          engine.warning = engine.controlsFlipped ? 'Controls Flipped!' : 'Controls stabilized... for now.'
          engine.screenShake = 14 * effectsScale
          playSound('square', engine.controlsFlipped ? 220 : 540, 0.06, 0.03)
          playNoise(0.03, 0.006)
        }

        const keys = keysRef.current
        let dx = 0
        let dy = 0

        if (keys.w || keys.arrowup) dy -= 1
        if (keys.s || keys.arrowdown) dy += 1
        if (keys.a || keys.arrowleft) dx -= 1
        if (keys.d || keys.arrowright) dx += 1

        if (engine.controlsFlipped) {
          dx *= -1
          dy *= -1
        }

        const mag = Math.hypot(dx, dy) || 1
        const speed = engine.player.speed * engine.difficulty * sensitivityScale
        const dashMultiplier = engine.dashBurst > 0 ? 1.4 : 1
        engine.player.x += (dx / mag) * speed * scaledDt
        engine.player.y += (dy / mag) * speed * scaledDt
        engine.player.x += (dx / mag) * speed * scaledDt * (dashMultiplier - 1)
        engine.player.y += (dy / mag) * speed * scaledDt * (dashMultiplier - 1)

        if (dx !== 0 || dy !== 0) {
          engine.player.trailTick += dt
          if (engine.player.trailTick > 0.02) {
            spawnParticle(engine, engine.player.x, engine.player.y, engine.dashBurst > 0 ? 'rgba(255, 211, 77, 0.9)' : 'rgba(56, 248, 255, 0.85)')
            engine.player.trailTick = 0
          }
        }

        const hitWallX = engine.player.x < engine.player.radius || engine.player.x > engine.width - engine.player.radius
        const hitWallY = engine.player.y < engine.player.radius || engine.player.y > engine.height - engine.player.radius

        if (hitWallX || hitWallY) {
          engine.player.x = clamp(engine.player.x, engine.player.radius, engine.width - engine.player.radius)
          engine.player.y = clamp(engine.player.y, engine.player.radius, engine.height - engine.player.radius)
          engine.wallHits += scaledDt * 4
          engine.screenShake = 18 * effectsScale
          engine.warning = 'Wall collision! Keep control!'
          engine.chromaticFlash = Math.max(engine.chromaticFlash, TUNING.feedback.chromaticFlashWallHit)

          if (Math.random() > 0.85) {
            engine.fakeUiFlash = TUNING.feedback.wallHitFlashDuration * effectsScale
          }

          playSound('sawtooth', 140, 0.05, 0.02)
          playNoise(0.03, 0.01)
        } else {
          engine.wallHits = Math.max(0, engine.wallHits - dt * 0.9)
        }

        const toGoalX = engine.goal.x - engine.player.x
        const toGoalY = engine.goal.y - engine.player.y
        const dist = Math.hypot(toGoalX, toGoalY)

        if (dist < 150) {
          const escape = ((engine.goal.speed * modeConfig.goalSpeedFactor * band.goalSpeedScale * engine.difficulty) / (dist || 1)) * scaledDt
          engine.goal.x += toGoalX * escape
          engine.goal.y += toGoalY * escape

          // Goal clamps slightly inside bounds so it always remains reachable.
          engine.goal.x = clamp(engine.goal.x, engine.goal.radius + 20, engine.width - engine.goal.radius - 20)
          engine.goal.y = clamp(engine.goal.y, engine.goal.radius + 20, engine.height - engine.goal.radius - 20)

          if (Math.random() > 0.985) {
            engine.warning = 'Too slow. Try harder.'
          }
        }

        if (dist < band.nearWinDistance && engine.slowMoTimer <= 0 && engine.nearWinLock <= 0) {
          engine.slowMoTimer = TUNING.feedback.nearWinSlowMoDuration
          engine.slowMoScale = band.slowMoFactor
          engine.chromaticFlash = Math.max(engine.chromaticFlash, TUNING.feedback.chromaticFlashNearGoal)
          engine.fakeUiFlash = Math.max(engine.fakeUiFlash, TUNING.feedback.chromaticFlashNearGoal * effectsScale)
          engine.nearWinLock = 1.2
        }

        engine.shards = engine.shards.filter((shard) => {
          shard.age += scaledDt
          shard.wobble += scaledDt * 5
          const shardDist = Math.hypot(engine.player.x - shard.x, engine.player.y - shard.y)
          const collected = shardDist < engine.player.radius + shard.radius + 4

          if (collected) {
            engine.score += TUNING.gameplay.shardPoints
            engine.mission += 1
            engine.combo = Math.min(TUNING.gameplay.maxCombo, engine.combo + 1)
            engine.comboTimer = 2.4
            engine.comboBest = Math.max(engine.comboBest, engine.combo)
            engine.warning = 'Data shard collected.'
            engine.fakeUiFlash = 0.14 * effectsScale
            engine.screenShake = 5 * effectsScale
            playSound('triangle', 980, 0.05, 0.02)
            playSound('sine', 1240, 0.04, 0.014)
            playNoise(0.02, 0.004)
          }

          return shard.age < shard.ttl && !collected
        })

        engine.rifts = engine.rifts.filter((rift) => {
          rift.age += scaledDt
          rift.spin += scaledDt * 3
          const active = rift.age < rift.ttl
          const insideRift = Math.hypot(engine.player.x - rift.x, engine.player.y - rift.y) < rift.radius

          if (insideRift) {
            engine.score += scaledDt * 30 * comboMultiplier
            engine.comboTimer = 1.6
            engine.combo = Math.min(TUNING.gameplay.maxCombo, engine.combo + scaledDt * 0.4)
            engine.warning = 'Rift boost active.'
            engine.fakeUiFlash = 0.08 * effectsScale
          }

          return active
        })

        if (dist < engine.goal.radius + engine.player.radius + 2) {
          if (Math.random() < modeConfig.fakeWinChance) {
            setFakeOverlay('YOU WIN!')
            setTimeout(() => setFakeOverlay(''), 700)
            engine.goal.x = rand(engine.width * 0.2, engine.width * 0.85)
            engine.goal.y = rand(engine.height * 0.2, engine.height * 0.85)
            engine.score += TUNING.gameplay.goalBonusPoints
            engine.warning = 'False alarm. Keep going.'
            playSound('triangle', 860, 0.05, 0.03)
            playSound('sine', 1120, 0.035, 0.016)
          } else {
            endGame('win')
          }
        }

        if (engine.wallHits > modeConfig.wallLimit * band.wallLimitScale) {
          endGame('lose')
        }

        if (Math.random() > 0.998) {
          engine.warning = Math.random() > 0.5 ? 'Connection unstable...' : 'Achievement Unlocked: Almost There'
          engine.fakeUiFlash = 0.25 * effectsScale
        }

        engine.particles = engine.particles.filter((particle) => {
          particle.age += scaledDt
          particle.x += particle.vx * scaledDt
          particle.y += particle.vy * scaledDt
          return particle.age < particle.life
        })

        engine.screenShake = Math.max(0, engine.screenShake - scaledDt * 18)
        engine.shakeX = rand(-engine.screenShake, engine.screenShake) * effectsScale
        engine.shakeY = rand(-engine.screenShake, engine.screenShake) * effectsScale
        engine.fakeUiFlash = Math.max(0, engine.fakeUiFlash - scaledDt)
        engine.chromaticFlash = Math.max(0, engine.chromaticFlash - scaledDt * TUNING.feedback.chromaticFlashDecay)
        engine.slowMoTimer = Math.max(0, engine.slowMoTimer - dt)

        audio?.updateLayers({
          intensity: clamp(engine.duration / 90, 0, 1),
          tension: clamp(1 - dist / TUNING.audio.tensionMaxDistance, 0, 1),
        })

        setHud({
          score: engine.score,
          difficulty: engine.difficulty,
          controlsFlipped: engine.controlsFlipped,
          warning: engine.warning,
          paused: false,
          dashCooldown: engine.dashCooldown,
          soundEnabled: engine.soundEnabled,
          mission: engine.mission,
          shardCount: engine.shards.length,
          combo: engine.combo,
          riftCount: engine.rifts.length,
          wallHits: engine.wallHits,
          wallLimit: modeConfig.wallLimit * band.wallLimitScale,
          progress: clamp(engine.duration / 90, 0, 1),
          playerX: engine.player.x,
          playerY: engine.player.y,
          goalX: engine.goal.x,
          goalY: engine.goal.y,
          fieldWidth: engine.width,
          fieldHeight: engine.height,
        })
      } else {
        setHud((prev) => ({ ...prev, paused: true }))
      }

      ctx.save()
      ctx.clearRect(0, 0, engine.width, engine.height)

      const gradient = ctx.createLinearGradient(0, 0, engine.width, engine.height)
      gradient.addColorStop(0, bgGradient[0])
      gradient.addColorStop(0.35, bgGradient[1])
      gradient.addColorStop(0.7, bgGradient[2])
      gradient.addColorStop(1, bgGradient[3])
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, engine.width, engine.height)

      ctx.translate(engine.shakeX, engine.shakeY)

      // Grid shader style background for a cyberpunk arena feel.
      ctx.save()
      ctx.globalAlpha = 0.24
      ctx.strokeStyle = 'rgba(125, 143, 255, 0.2)'
      ctx.lineWidth = 1
      for (let x = 0; x < engine.width; x += 40) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, engine.height)
        ctx.stroke()
      }
      for (let y = 0; y < engine.height; y += 40) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(engine.width, y)
        ctx.stroke()
      }
      ctx.restore()

      drawGlowCircle(ctx, engine.goal.x, engine.goal.y, engine.goal.radius + 5, 'rgba(248, 83, 255, 0.2)', 20)
      drawGlowCircle(ctx, engine.goal.x, engine.goal.y, engine.goal.radius, '#f95cff', 28)

      engine.rifts.forEach((rift) => {
        const pulse = 1 + Math.sin(rift.spin) * 0.12
        drawGlowCircle(ctx, rift.x, rift.y, rift.radius + 12 * pulse, 'rgba(126, 87, 255, 0.08)', 20)
        drawGlowCircle(ctx, rift.x, rift.y, rift.radius * pulse, 'rgba(155, 120, 255, 0.35)', 22)
        drawGlowCircle(ctx, rift.x, rift.y, rift.radius * 0.45, 'rgba(255, 255, 255, 0.12)', 12)
      })

      engine.shards.forEach((shard) => {
        const pulse = 1 + Math.sin(shard.wobble) * 0.12
        drawGlowCircle(ctx, shard.x, shard.y, shard.radius + 4 * pulse, 'rgba(255, 204, 77, 0.12)', 18)
        drawGlowCircle(ctx, shard.x, shard.y, shard.radius * pulse, '#ffd04d', 22)
      })

      drawGlowCircle(ctx, engine.player.x, engine.player.y, engine.player.radius + 4, 'rgba(20, 246, 255, 0.18)', 20)
      drawGlowCircle(ctx, engine.player.x, engine.player.y, engine.player.radius + (engine.dashBurst > 0 ? 3 : 0), '#17f6ff', 25)

      if (engine.dashBurst > 0) {
        drawGlowCircle(ctx, engine.player.x, engine.player.y, engine.player.radius + 12, 'rgba(255, 211, 77, 0.12)', 26)
      }

      engine.particles.forEach((particle) => {
        const alpha = 1 - particle.age / particle.life
        ctx.fillStyle = particle.color.replace('0.85', alpha.toFixed(2))
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
        ctx.fill()
      })

      if (engine.fakeUiFlash > 0) {
        ctx.fillStyle = `rgba(255, 255, 255, ${engine.fakeUiFlash * 0.35})`
        ctx.fillRect(0, 0, engine.width, engine.height)
      }

      if (engine.chromaticFlash > 0) {
        ctx.save()
        ctx.globalCompositeOperation = 'screen'
        ctx.globalAlpha = engine.chromaticFlash * 0.3
        ctx.fillStyle = 'rgba(255, 0, 80, 0.3)'
        ctx.fillRect(-3, 0, engine.width, engine.height)
        ctx.fillStyle = 'rgba(0, 255, 255, 0.28)'
        ctx.fillRect(3, 0, engine.width, engine.height)
        ctx.globalAlpha = engine.chromaticFlash * 0.55
        drawGlowCircle(ctx, engine.goal.x - 4, engine.goal.y, engine.goal.radius + 10, 'rgba(255, 64, 128, 0.22)', 18)
        drawGlowCircle(ctx, engine.goal.x + 4, engine.goal.y, engine.goal.radius + 10, 'rgba(64, 224, 255, 0.22)', 18)
        drawGlowCircle(ctx, engine.player.x - 3, engine.player.y, engine.player.radius + 8, 'rgba(255, 64, 128, 0.2)', 18)
        drawGlowCircle(ctx, engine.player.x + 3, engine.player.y, engine.player.radius + 8, 'rgba(64, 224, 255, 0.2)', 18)
        ctx.restore()
      }

      ctx.restore()

      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', onResize)
    }
  }, [screen, pause, bgGradient, soundEnabled])

  const startGame = () => {
    setPause(false)
    setRunResult({ score: 0, duration: 0, outcome: 'lose', reason: '' })
    setScreen('game')
    void audioRef.current?.unlock?.()
    if (soundEnabled) {
      audioRef.current?.trigger('triangle', 520, 0.06, 0.025)
    }
  }

  const toggleSound = () => {
    setSoundEnabled((prev) => {
      const next = !prev
      const engine = engineRef.current
      if (engine) {
        engine.soundEnabled = next
      }
      setHud((prev) => ({ ...prev, soundEnabled: next }))
      audioRef.current?.setEnabled?.(next && screen === 'game')
      if (next) {
        void audioRef.current?.unlock?.()
        audioRef.current?.trigger('triangle', 740, 0.05, 0.02)
      }
      return next
    })
  }

  const saveScoreAndRefresh = async (payload) => {
    try {
      await saveScore({ ...payload, score: Math.floor(payload.score) })
      trackEvent('save_score', {
        name: payload.name,
        score: Math.floor(payload.score),
        duration: Number(payload.duration?.toFixed?.(2) ?? payload.duration),
        outcome: payload.outcome,
      })
      const fresh = await fetchLeaderboardPage({
        page: 1,
        limit: leaderboardInfo.limit || 10,
        name: payload.name,
      })
      setLeaderboard(fresh.items)
      setLeaderboardInfo(fresh)
    } catch (error) {
      trackEvent('save_score_failed', {
        name: payload.name,
        score: Math.floor(payload.score),
        outcome: payload.outcome,
        message: error?.message || 'unknown error',
      })
      throw error
    }
  }

  const changeLeaderboardPage = async (nextPage) => {
    try {
      const totalPages = Math.max(1, Math.ceil((leaderboardInfo.total || leaderboard.length || 1) / (leaderboardInfo.limit || 10)))
      const target = clamp(nextPage, 1, totalPages)
      const fresh = await fetchLeaderboardPage({
        page: target,
        limit: leaderboardInfo.limit || 10,
      })
      setLeaderboard(fresh.items)
      setLeaderboardInfo((prev) => ({ ...fresh, playerRank: prev.playerRank ?? fresh.playerRank }))
    } catch {
      // Keep current page on temporary fetch errors.
    }
  }

  const updateSetting = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  const openMenuPage = (page) => {
    setScreen(page)
    setPause(false)
  }

  const openSettingsPage = (fromScreen) => {
    const fromGame = fromScreen === 'game'
    setSettingsBackTarget(fromGame ? 'game' : 'menu')
    setSettingsBackPause(fromGame ? pause : false)
    setScreen('settings')
    setPause(false)
  }

  const handleSettingsBack = () => {
    if (settingsBackTarget === 'game') {
      setScreen('game')
      setPause(settingsBackPause)
      return
    }
    openMenuPage('menu')
  }

  const goHomeFromGame = () => {
    const engine = engineRef.current
    if (engine && !engine.isGameOver) {
      trackEvent('rage_quit', {
        mode: engine.mode,
        score: Math.floor(engine.score),
        duration: Number(engine.duration.toFixed(2)),
      })
    }
    resetJoystick()
    setPause(false)
    setScreen('menu')
  }

  const setControlKey = (key, value) => {
    keysRef.current[key] = value
  }

  const getEventPoint = (event) => {
    if (event.touches && event.touches.length > 0) {
      return {
        x: event.touches[0].clientX,
        y: event.touches[0].clientY,
      }
    }
    if (event.changedTouches && event.changedTouches.length > 0) {
      return {
        x: event.changedTouches[0].clientX,
        y: event.changedTouches[0].clientY,
      }
    }
    return {
      x: event.clientX ?? 0,
      y: event.clientY ?? 0,
    }
  }

  const applyJoystickPoint = (clientX, clientY, moveOnly = false) => {
    const joystick = joystickRef.current
    const rect = joystick.rect
    if (!rect) {
      return
    }
    const dx = clientX - joystick.originX
    const dy = clientY - joystick.originY
    const distance = Math.hypot(dx, dy)
    const maxDistance = Math.min(rect.width, rect.height) * 0.4
    const clamped = Math.min(distance, maxDistance)
    const angle = Math.atan2(dy, dx)
    const normalizedX = clamped / maxDistance * Math.cos(angle)
    const normalizedY = clamped / maxDistance * Math.sin(angle)

    joystick.x = normalizedX
    joystick.y = normalizedY
    setJoystickVector({ x: normalizedX, y: normalizedY })

    if (!moveOnly) {
      if (Math.abs(normalizedX) > 0.2) {
        setControlKey(normalizedX > 0 ? 'd' : 'a', true)
        setControlKey(normalizedX > 0 ? 'a' : 'd', false)
      }
      if (Math.abs(normalizedY) > 0.2) {
        setControlKey(normalizedY > 0 ? 's' : 'w', true)
        setControlKey(normalizedY > 0 ? 'w' : 's', false)
      }
    }
  }

  const resetJoystick = () => {
    joystickRef.current = { active: false, originX: 0, originY: 0, x: 0, y: 0, rect: null, pointerId: null }
    setJoystickVector({ x: 0, y: 0 })
    setControlKey('w', false)
    setControlKey('a', false)
    setControlKey('s', false)
    setControlKey('d', false)
  }

  const tapDash = (event) => {
    event.preventDefault()
    setControlKey(' ', true)
    window.setTimeout(() => setControlKey(' ', false), 90)
  }

  const handleJoystickDown = (event) => {
    event.preventDefault()
    const rect = event.currentTarget.getBoundingClientRect()
    const point = getEventPoint(event)
    joystickRef.current = {
      active: true,
      originX: point.x,
      originY: point.y,
      x: 0,
      y: 0,
      rect,
      pointerId: event.pointerId,
    }
    try {
      event.currentTarget.setPointerCapture?.(event.pointerId)
    } catch {
      // Ignore pointer capture failures on unsupported browsers.
    }
    setControlKey(' ', false)
    applyJoystickPoint(point.x, point.y)
  }

  const handleJoystickMove = (event) => {
    if (!joystickRef.current.active) {
      return
    }
    event.preventDefault()
    const point = getEventPoint(event)
    applyJoystickPoint(point.x, point.y)
  }

  const handleJoystickUp = (event) => {
    event.preventDefault()
    resetJoystick()
  }

  if (screen === 'menu') {
    return (
      <>
        {quitNotice ? (
          <div className="absolute left-1/2 top-4 z-30 -translate-x-1/2 rounded-xl border border-fuchsia-300/50 bg-fuchsia-500/20 px-3 py-2 text-sm text-fuchsia-100">
            {quitNotice}
          </div>
        ) : null}
        <MainMenu
          onStart={startGame}
          settings={settings}
          onSettingChange={updateSetting}
          onOpenTutorial={() => openMenuPage('tutorial')}
          onOpenSettings={() => openSettingsPage('menu')}
          onQuit={() => {
            setQuitNotice('You cannot quit that easily.')
            setTimeout(() => setQuitNotice(''), 1400)
          }}
        />
      </>
    )
  }

  if (screen === 'tutorial') {
    return <TutorialPage onBack={() => openMenuPage('menu')} />
  }

  if (screen === 'settings') {
    return <SettingsPage settings={settings} onSettingChange={updateSetting} onBack={handleSettingsBack} />
  }

  if (screen === 'end') {
    return (
      <GameOverScreen
        score={runResult.score}
        outcome={runResult.outcome}
        duration={runResult.duration}
        reason={runResult.reason}
        leaderboard={leaderboard}
        leaderboardInfo={leaderboardInfo}
        onRestart={startGame}
        onBack={() => setScreen('menu')}
        onSaveScore={saveScoreAndRefresh}
        onPageChange={changeLeaderboardPage}
      />
    )
  }

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-3 py-3 sm:px-8 sm:py-6 lg:h-[calc(100svh-1.5rem)] lg:flex-row lg:items-stretch lg:overflow-hidden">
      <aside className="w-full lg:h-full lg:w-[20rem] lg:flex-none lg:overflow-y-auto lg:pr-1">
        <div className="grid gap-4">
          <div className="launcher-shell rounded-[1.9rem] border border-cyan-300/25 bg-slate-950/80 p-4 shadow-2xl shadow-cyan-900/30 backdrop-blur">
            <div className="launcher-header rounded-[1.4rem] border border-cyan-400/25 bg-gradient-to-br from-cyan-500/15 via-slate-950/40 to-fuchsia-500/10 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-arcade text-sm text-cyan-100">Almost There OS</p>
                  <p className="mt-1 text-[11px] uppercase tracking-[0.22em] text-slate-400">Run Control Panel</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={goHomeFromGame}
                    className="rounded-full border border-fuchsia-400/40 bg-fuchsia-500/15 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-fuchsia-100 transition hover:border-fuchsia-300/70 hover:bg-fuchsia-500/25"
                  >
                    Home
                  </button>
                  <button
                    type="button"
                    onClick={toggleSound}
                    className="rounded-full border border-slate-500/50 bg-slate-900/80 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-100 transition hover:border-cyan-300/60 hover:text-cyan-100"
                  >
                    {hud.soundEnabled ? 'Sound On' : 'Sound Off'}
                  </button>
                </div>
              </div>

              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-sky-300 to-fuchsia-400 transition-all"
                  style={{ width: `${Math.min(100, hud.progress * 100)}%` }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                <span>Mission Progress</span>
                <span>{Math.round(hud.progress * 100)}%</span>
              </div>

              <div className="mt-4 grid gap-3 rounded-xl border border-slate-700/80 bg-slate-900/60 p-3">
                <button
                  type="button"
                  onClick={() => openSettingsPage('game')}
                  className="game-btn border-cyan-300/40 bg-cyan-500/15 text-cyan-100 hover:bg-cyan-500/30"
                >
                  Open Settings
                </button>
                <p className="text-[11px] text-slate-400">
                  Tune mode, volume, effects, and sensitivity in the Settings page.
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-4">
              <Hud {...hud} paused={pause} />

              <div className="rounded-[1.35rem] border border-cyan-300/20 bg-slate-900/75 p-4">
                <div className="flex items-center justify-between">
                  <p className="font-arcade text-sm text-cyan-100">Field Radar</p>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Minimap</p>
                </div>

                <div className="relative mt-3 aspect-square overflow-hidden rounded-2xl border border-slate-700 bg-slate-950">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.08),transparent_55%),linear-gradient(to_bottom,rgba(255,255,255,0.03),transparent)]" />
                  <div className="absolute inset-0 opacity-50 [background-image:linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)] [background-size:18px_18px]" />

                  <div
                    className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-300 shadow-[0_0_18px_rgba(34,211,238,0.9)]"
                    style={{
                      left: `${(hud.playerX / Math.max(1, hud.fieldWidth)) * 100}%`,
                      top: `${(hud.playerY / Math.max(1, hud.fieldHeight)) * 100}%`,
                    }}
                  />
                  <div
                    className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-fuchsia-300 shadow-[0_0_18px_rgba(244,114,182,0.9)]"
                    style={{
                      left: `${(hud.goalX / Math.max(1, hud.fieldWidth)) * 100}%`,
                      top: `${(hud.goalY / Math.max(1, hud.fieldHeight)) * 100}%`,
                    }}
                  />
                  {hud.shardCount > 0 ? (
                    <div className="absolute right-2 top-2 rounded-full border border-amber-300/30 bg-amber-400/10 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-amber-200">
                      {hud.shardCount} shard(s)
                    </div>
                  ) : null}
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-200">
                  <div className="rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2">
                    <p className="text-[10px] uppercase text-slate-400">Current</p>
                    <p className="font-arcade text-base text-cyan-200">{Math.floor(hud.score)}</p>
                  </div>
                  <div className="rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2">
                    <p className="text-[10px] uppercase text-slate-400">Combo</p>
                    <p className="font-arcade text-base text-fuchsia-200">x{hud.combo.toFixed(1)}</p>
                  </div>
                  <div className="rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2">
                    <p className="text-[10px] uppercase text-slate-400">Shards</p>
                    <p className="font-arcade text-base text-amber-200">{hud.shardCount}</p>
                  </div>
                  <div className="rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2">
                    <p className="text-[10px] uppercase text-slate-400">Rifts</p>
                    <p className="font-arcade text-base text-violet-200">{hud.riftCount}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-[1.35rem] border border-slate-700/80 bg-slate-900/75 p-4">
                <div className="flex items-center justify-between">
                  <p className="font-arcade text-sm text-fuchsia-100">Top 3 Board</p>
                  <span className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Leaderboard</span>
                </div>
                <ol className="mt-3 space-y-2 text-xs text-slate-300">
                  {leaderboard.slice(0, 3).map((entry, index) => (
                    <li key={entry._id ?? `${entry.name}-${entry.score}-${index}`} className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2">
                      <span>
                        {index + 1}. {entry.name}
                      </span>
                      <span className="font-arcade text-cyan-200">{entry.score}</span>
                    </li>
                  ))}
                  {leaderboard.length === 0 ? <li className="text-slate-500">No scores yet.</li> : null}
                </ol>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <div className="relative h-[62svh] min-h-[320px] w-full overflow-hidden rounded-2xl border border-cyan-300/25 bg-slate-950/60 shadow-2xl shadow-cyan-900/35 lg:h-full lg:flex-1">
        <canvas ref={canvasRef} className="h-full w-full cursor-crosshair" />

        {fakeOverlay ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <p className="animate-pulse font-arcade text-5xl text-emerald-300 drop-shadow-[0_0_18px_rgba(110,255,179,0.9)]">
              {fakeOverlay}
            </p>
          </div>
        ) : null}

        {pause ? (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/55">
            <p className="font-arcade text-3xl text-cyan-200">Paused</p>
          </div>
        ) : null}
      </div>

      {showTouchControls ? (
        <div className="grid w-full gap-3 rounded-2xl border border-cyan-300/25 bg-slate-950/75 p-3 lg:hidden">
          <p className="text-center text-[11px] uppercase tracking-[0.18em] text-slate-400">Touch Controls</p>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
            <div
              className="relative aspect-square w-full max-w-[220px] justify-self-center rounded-full border border-cyan-300/25 bg-slate-900/60"
              style={{ touchAction: 'none' }}
              onPointerDown={handleJoystickDown}
              onPointerMove={handleJoystickMove}
              onPointerUp={handleJoystickUp}
              onPointerLeave={handleJoystickUp}
              onPointerCancel={handleJoystickUp}
              onTouchStart={handleJoystickDown}
              onTouchMove={handleJoystickMove}
              onTouchEnd={handleJoystickUp}
              onTouchCancel={handleJoystickUp}
            >
              <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(34,211,238,0.08),transparent_60%)]" />
              <div className="absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border border-slate-500 bg-slate-950/80 shadow-[0_0_18px_rgba(34,211,238,0.15)]" />
              <div
                className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-200/50 bg-cyan-400/60 shadow-[0_0_20px_rgba(34,211,238,0.4)] transition-transform"
                style={{
                  transform: `translate(calc(-50% + ${joystickVector.x * 60}px), calc(-50% + ${joystickVector.y * 60}px))`,
                }}
              />
            </div>

            <div className="grid gap-2 self-center sm:justify-self-end">
              <button
                type="button"
                onPointerDown={tapDash}
                className="rounded-xl border border-amber-300/50 bg-amber-400/15 px-4 py-3 text-sm font-semibold text-amber-100 active:bg-amber-400/35"
              >
                Dash
              </button>
              <button
                type="button"
                onPointerDown={(event) => {
                  event.preventDefault()
                  setPause((value) => !value)
                }}
                className="rounded-xl border border-slate-500/50 bg-slate-900/80 px-4 py-3 text-sm font-semibold text-slate-100 active:bg-slate-700"
              >
                Pause
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
