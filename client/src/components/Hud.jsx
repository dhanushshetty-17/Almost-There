export default function Hud({
  score,
  difficulty,
  controlsFlipped,
  warning,
  paused,
  dashCooldown,
  soundEnabled,
  mission,
  shardCount,
}) {
  return (
    <aside className="grid gap-3 rounded-3xl border border-cyan-400/25 bg-slate-950/75 p-4 shadow-2xl shadow-cyan-900/20 backdrop-blur">
      <div className="rounded-2xl border border-cyan-400/30 bg-slate-900/65 px-4 py-3">
        <p className="font-arcade text-xs text-cyan-200">Score: {Math.floor(score)}</p>
        <p className="mt-1 text-xs text-slate-300">Difficulty {difficulty.toFixed(1)}x</p>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-sky-300 to-fuchsia-400 transition-all"
            style={{ width: `${Math.min(100, (1 - Math.min(dashCooldown, 1.9) / 1.9) * 100)}%` }}
          />
        </div>
        <p className="mt-1 text-[11px] text-slate-400">Dash {dashCooldown > 0 ? `${dashCooldown.toFixed(1)}s` : 'Ready'}</p>
      </div>

      <div className="rounded-2xl border border-slate-600/50 bg-slate-900/65 px-4 py-3">
        <p className="text-xs text-slate-300">WASD / Arrows to move</p>
        <p className="text-xs text-slate-300">Space to dash, P to pause</p>
        <p className="mt-1 text-[11px] text-cyan-200">Sound: {soundEnabled ? 'On' : 'Off'}</p>
      </div>

      <div className="rounded-2xl border border-fuchsia-400/30 bg-slate-900/65 px-4 py-3">
        <p className={`text-xs ${controlsFlipped ? 'text-red-300' : 'text-emerald-300'}`}>
          {controlsFlipped ? 'Controls Flipped!' : 'Controls Normal'}
        </p>
        <p className="mt-1 min-h-4 text-[11px] text-fuchsia-200">{paused ? 'Paused' : warning}</p>
        <p className="mt-1 text-[11px] text-slate-400">Mission {mission} | Shards {shardCount}</p>
      </div>
    </aside>
  )
}
