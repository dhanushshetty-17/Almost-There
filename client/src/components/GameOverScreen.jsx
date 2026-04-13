import { useState } from 'react'

export default function GameOverScreen({
  score,
  outcome,
  duration,
  onRestart,
  onBack,
  onSaveScore,
  leaderboard,
}) {
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    if (!name.trim() || saved) {
      return
    }

    setSaving(true)
    await onSaveScore({
      name: name.trim().slice(0, 16),
      score,
      outcome,
      duration,
    })
    setSaving(false)
    setSaved(true)
  }

  const title = outcome === 'win' ? 'You Actually Won' : 'Game Over'
  const subtitle =
    outcome === 'win'
      ? 'Impossible. The target gave up first.'
      : 'You almost had it. Which is exactly the point.'

  return (
    <section className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-4 py-6 sm:px-8">
      <div className="grid w-full gap-4 md:grid-cols-5">
        <article className="panel-glow rounded-3xl border border-cyan-400/30 bg-slate-950/70 p-6 md:col-span-3 sm:p-8">
          <h2 className="font-arcade text-3xl text-cyan-100 sm:text-4xl">{title}</h2>
          <p className="mt-2 text-slate-300">{subtitle}</p>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2">
              <p className="text-[11px] uppercase text-slate-400">Score</p>
              <p className="font-arcade text-xl text-cyan-200">{Math.floor(score)}</p>
            </div>
            <div className="rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2">
              <p className="text-[11px] uppercase text-slate-400">Run Time</p>
              <p className="font-arcade text-xl text-fuchsia-200">{Math.floor(duration)}s</p>
            </div>
          </div>

          <form onSubmit={submit} className="mt-6 flex flex-col gap-3 sm:flex-row">
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={16}
              placeholder="Name for leaderboard"
              className="h-11 flex-1 rounded-xl border border-slate-600 bg-slate-900 px-3 text-slate-100 outline-none focus:border-cyan-300"
            />
            <button
              type="submit"
              disabled={saving || saved}
              className="game-btn h-11 border-cyan-300/40 bg-cyan-500/20 text-cyan-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saved ? 'Saved' : saving ? 'Saving...' : 'Save Score'}
            </button>
          </form>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              onClick={onRestart}
              className="game-btn border-emerald-300/40 bg-emerald-500/20 text-emerald-100"
            >
              Restart
            </button>
            <button
              onClick={onBack}
              className="game-btn border-fuchsia-300/40 bg-fuchsia-500/20 text-fuchsia-100"
            >
              Main Menu
            </button>
          </div>
        </article>

        <aside className="panel-glow rounded-3xl border border-fuchsia-400/30 bg-slate-950/70 p-6 md:col-span-2 sm:p-8">
          <h3 className="font-arcade text-xl text-fuchsia-100">Top 10</h3>
          <ol className="mt-4 space-y-2 text-sm text-slate-300">
            {leaderboard.length === 0 && <li>No scores yet.</li>}
            {leaderboard.map((entry, index) => (
              <li
                key={entry._id ?? `${entry.name}-${entry.score}-${index}`}
                className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2"
              >
                <span>
                  {index + 1}. {entry.name}
                </span>
                <span className="font-arcade text-cyan-200">{entry.score}</span>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </section>
  )
}
