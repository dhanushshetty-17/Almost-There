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
  wallHits,
  wallLimit,
}) {
  const wallRatio = wallLimit > 0 ? Math.min(1, wallHits / wallLimit) : 0
  const wallPercent = Math.round(wallRatio * 100)
  const wallToneClass =
    wallRatio < 0.35
      ? 'from-emerald-400 via-cyan-300 to-sky-300'
      : wallRatio < 0.7
        ? 'from-amber-400 via-orange-400 to-rose-400'
        : 'from-rose-500 via-red-500 to-red-300'
  const wallStateText = wallRatio < 0.35 ? 'Stable' : wallRatio < 0.7 ? 'Warning' : 'Critical'
  const wallFillWidth = wallRatio > 0 ? Math.max(6, wallPercent) : 0

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

      <div className="rounded-2xl border border-rose-400/25 bg-slate-900/65 px-4 py-3">
        <div className="flex items-center justify-between gap-2 text-[11px] uppercase tracking-[0.2em] text-rose-200">
          <span>Wall Strain</span>
          <span>
            {wallHits.toFixed(1)} / {wallLimit.toFixed(1)}
          </span>
        </div>
        <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full border border-slate-700 bg-slate-950">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${wallToneClass} transition-all duration-200 ease-out`}
            style={{ width: `${wallFillWidth}%` }}
          />
        </div>
        <div className="mt-1 flex items-center justify-between text-[11px]">
          <p className="text-slate-400">Hit walls too often and the run ends.</p>
          <p className={wallRatio < 0.35 ? 'text-emerald-300' : wallRatio < 0.7 ? 'text-amber-300' : 'text-rose-300'}>{wallStateText} {wallPercent}%</p>
        </div>
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
