import { useEffect, useMemo, useRef, useState } from 'react'
import MainMenu from './components/MainMenu'
import GameOverScreen from './components/GameOverScreen'
import Hud from './components/Hud'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))

const rand = (min, max) => Math.random() * (max - min) + min

const initialEngine = (width, height) => ({
  width,
  height,
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
  dashCooldown: 0,
  dashBurst: 0,
  audioUnlocked: false,
  soundEnabled: true,
  mission: 0,
})

function createAudioEngine() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext
  if (!AudioCtx) {
    return
  }

  const audio = new AudioCtx()

  const trigger = (type = 'square', frequency = 440, duration = 0.06, gainValue = 0.02, glide = 0) => {
    const oscillator = audio.createOscillator()
    const gain = audio.createGain()

    oscillator.type = type
    oscillator.frequency.value = frequency
    if (glide !== 0) {
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(50, frequency + glide), audio.currentTime + duration)
    }
    gain.gain.value = gainValue

    oscillator.connect(gain)
    gain.connect(audio.destination)
    oscillator.start()

    gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + duration)
    oscillator.stop(audio.currentTime + duration)
  }

  const noiseBurst = (duration = 0.05, gainValue = 0.025) => {
    const buffer = audio.createBuffer(1, audio.sampleRate * duration, audio.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < data.length; i += 1) {
      data[i] = Math.random() * 2 - 1
    }

    const source = audio.createBufferSource()
    const gain = audio.createGain()
    source.buffer = buffer
    gain.gain.value = gainValue
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
  return response.json()
}

async function saveScore(payload) {
  const response = await fetch(`${API_BASE}/scores`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error('Could not save score')
  }

  return response.json()
}

export default function Game() {
  const canvasRef = useRef(null)
  const rafRef = useRef(0)
  const keysRef = useRef({})
  const engineRef = useRef(null)
  const audioRef = useRef(null)

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
    progress: 0,
    playerX: 0,
    playerY: 0,
    goalX: 0,
    goalY: 0,
    fieldWidth: 1,
    fieldHeight: 1,
  })
  const [runResult, setRunResult] = useState({ score: 0, duration: 0, outcome: 'lose' })
  const [leaderboard, setLeaderboard] = useState([])
  const [pause, setPause] = useState(false)
  const [fakeOverlay, setFakeOverlay] = useState('')
  const [quitNotice, setQuitNotice] = useState('')

  const bgGradient = useMemo(
    () => ['#050611', '#080f26', '#101033', '#180c2b'],
    [],
  )

  useEffect(() => {
    audioRef.current = createAudioEngine()

    fetchLeaderboard().then(setLeaderboard).catch(() => undefined)
  }, [])

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

    const engine = initialEngine(size.width, size.height)
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
      engine.isGameOver = true
      engine.outcome = outcome
      setRunResult({ score: engine.score, duration: engine.duration, outcome })
      setScreen('end')
      setPause(false)
      fetchLeaderboard().then(setLeaderboard).catch(() => undefined)
      playSound(outcome === 'win' ? 'triangle' : 'sawtooth', outcome === 'win' ? 720 : 180, 0.12, 0.04)
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
        engine.duration += dt
        engine.comboTimer = Math.max(0, engine.comboTimer - dt)
        if (engine.comboTimer === 0) {
          engine.combo = 1
        }
        engine.combo = clamp(engine.combo, 1, 8)
        engine.comboBest = Math.max(engine.comboBest, engine.combo)

        const comboMultiplier = 1 + (engine.combo - 1) * 0.25
        engine.score += dt * (10 + engine.difficulty * 2) * comboMultiplier
        engine.difficulty = 1 + engine.duration * 0.04
        engine.dashCooldown = Math.max(0, engine.dashCooldown - dt)
        engine.dashBurst = Math.max(0, engine.dashBurst - dt * 3)

        if (engine.duration >= engine.nextRiftAt) {
          spawnRift(engine)
          engine.nextRiftAt += rand(8, 14) / engine.difficulty
        }

        if (Math.random() > 0.92) {
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
            engine.player.x += (dashX / dashMag) * 120
            engine.player.y += (dashY / dashMag) * 120
            engine.dashCooldown = 1.9
            engine.dashBurst = 1.2
            engine.warning = 'Turbo dash triggered!'
            engine.screenShake = 16
            playSound('square', 160, 0.08, 0.03)
            playNoise(0.04, 0.01)
            keysRef.current[' '] = false
          }
        }

        if (engine.duration >= engine.nextFlipAt) {
          engine.controlsFlipped = !engine.controlsFlipped
          engine.nextFlipAt += rand(5, 10) / engine.difficulty
          engine.warning = engine.controlsFlipped ? 'Controls Flipped!' : 'Controls stabilized... for now.'
          engine.screenShake = 14
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
        const speed = engine.player.speed * engine.difficulty
        const dashMultiplier = engine.dashBurst > 0 ? 1.4 : 1
        engine.player.x += (dx / mag) * speed * dt
        engine.player.y += (dy / mag) * speed * dt
        engine.player.x += (dx / mag) * speed * dt * (dashMultiplier - 1)
        engine.player.y += (dy / mag) * speed * dt * (dashMultiplier - 1)

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
          engine.wallHits += dt * 4
          engine.screenShake = 18
          engine.warning = 'Wall collision! Keep control!'

          if (Math.random() > 0.85) {
            engine.fakeUiFlash = 0.2
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
          const escape = ((engine.goal.speed * engine.difficulty) / (dist || 1)) * dt
          engine.goal.x += toGoalX * escape
          engine.goal.y += toGoalY * escape

          // Goal clamps slightly inside bounds so it always remains reachable.
          engine.goal.x = clamp(engine.goal.x, engine.goal.radius + 20, engine.width - engine.goal.radius - 20)
          engine.goal.y = clamp(engine.goal.y, engine.goal.radius + 20, engine.height - engine.goal.radius - 20)

          if (Math.random() > 0.985) {
            engine.warning = 'Too slow. Try harder.'
          }
        }

        engine.shards = engine.shards.filter((shard) => {
          shard.age += dt
          shard.wobble += dt * 5
          const shardDist = Math.hypot(engine.player.x - shard.x, engine.player.y - shard.y)
          const collected = shardDist < engine.player.radius + shard.radius + 4

          if (collected) {
            engine.score += 45
            engine.mission += 1
            engine.combo = Math.min(8, engine.combo + 1)
            engine.comboTimer = 2.4
            engine.comboBest = Math.max(engine.comboBest, engine.combo)
            engine.warning = 'Data shard collected.'
            engine.fakeUiFlash = 0.14
            engine.screenShake = 5
            playSound('triangle', 980, 0.05, 0.02)
            playNoise(0.02, 0.004)
          }

          return shard.age < shard.ttl && !collected
        })

        engine.rifts = engine.rifts.filter((rift) => {
          rift.age += dt
          rift.spin += dt * 3
          const active = rift.age < rift.ttl
          const insideRift = Math.hypot(engine.player.x - rift.x, engine.player.y - rift.y) < rift.radius

          if (insideRift) {
            engine.score += dt * 30 * comboMultiplier
            engine.comboTimer = 1.6
            engine.combo = Math.min(8, engine.combo + dt * 0.4)
            engine.warning = 'Rift boost active.'
            engine.fakeUiFlash = 0.08
          }

          return active
        })

        if (dist < engine.goal.radius + engine.player.radius + 2) {
          if (Math.random() < 0.42) {
            setFakeOverlay('YOU WIN!')
            setTimeout(() => setFakeOverlay(''), 700)
            engine.goal.x = rand(engine.width * 0.2, engine.width * 0.85)
            engine.goal.y = rand(engine.height * 0.2, engine.height * 0.85)
            engine.score += 250
            engine.warning = 'False alarm. Keep going.'
            playSound('triangle', 860, 0.05, 0.03)
          } else {
            endGame('win')
          }
        }

        if (engine.wallHits > 2.9) {
          endGame('lose')
        }

        if (Math.random() > 0.998) {
          engine.warning = Math.random() > 0.5 ? 'Connection unstable...' : 'Achievement Unlocked: Almost There'
          engine.fakeUiFlash = 0.25
        }

        engine.particles = engine.particles.filter((particle) => {
          particle.age += dt
          particle.x += particle.vx * dt
          particle.y += particle.vy * dt
          return particle.age < particle.life
        })

        engine.screenShake = Math.max(0, engine.screenShake - dt * 18)
        engine.shakeX = rand(-engine.screenShake, engine.screenShake)
        engine.shakeY = rand(-engine.screenShake, engine.screenShake)
        engine.fakeUiFlash = Math.max(0, engine.fakeUiFlash - dt)

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

      ctx.restore()

      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', onResize)
    }
  }, [screen, pause, bgGradient])

  const startGame = () => {
    setPause(false)
    setRunResult({ score: 0, duration: 0, outcome: 'lose' })
    setScreen('game')
    void audioRef.current?.unlock?.()
    if (engineRef.current?.soundEnabled !== false) {
      audioRef.current?.trigger('triangle', 520, 0.06, 0.025)
    }
  }

  const toggleSound = () => {
    const engine = engineRef.current
    if (engine) {
      engine.soundEnabled = !engine.soundEnabled
      setHud((prev) => ({ ...prev, soundEnabled: engine.soundEnabled }))
      if (engine.soundEnabled) {
        void audioRef.current?.unlock?.()
        audioRef.current?.trigger('triangle', 740, 0.05, 0.02)
      }
    }
  }

  const saveScoreAndRefresh = async (payload) => {
    try {
      await saveScore({ ...payload, score: Math.floor(payload.score) })
      const fresh = await fetchLeaderboard()
      setLeaderboard(fresh)
    } catch {
      // Ignore temporary network errors to avoid blocking gameplay flow.
    }
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
          onQuit={() => {
            setQuitNotice('You cannot quit that easily.')
            setTimeout(() => setQuitNotice(''), 1400)
          }}
        />
      </>
    )
  }

  if (screen === 'end') {
    return (
      <GameOverScreen
        score={runResult.score}
        outcome={runResult.outcome}
        duration={runResult.duration}
        leaderboard={leaderboard}
        onRestart={startGame}
        onBack={() => setScreen('menu')}
        onSaveScore={saveScoreAndRefresh}
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
                <button
                  type="button"
                  onClick={toggleSound}
                  className="rounded-full border border-slate-500/50 bg-slate-900/80 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-100 transition hover:border-cyan-300/60 hover:text-cyan-100"
                >
                  {hud.soundEnabled ? 'Sound On' : 'Sound Off'}
                </button>
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
    </section>
  )
}
