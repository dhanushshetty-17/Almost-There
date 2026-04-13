export default function TutorialPage({ onBack }) {
  return (
    <section className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-4 py-6 sm:px-8">
      <div className="panel-glow w-full rounded-3xl border border-cyan-400/30 bg-slate-950/75 p-6 shadow-2xl backdrop-blur sm:p-10">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-arcade text-sm text-cyan-100">Tutorial</p>
            <h2 className="mt-2 font-arcade text-4xl text-cyan-200 sm:text-5xl">How to Play</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              Learn the game in a clean, visual layout before you start. The goal looks simple. The game is not.
            </p>
          </div>
          <button
            type="button"
            onClick={onBack}
            className="game-btn border-fuchsia-300/40 bg-fuchsia-500/20 text-fuchsia-100 hover:bg-fuchsia-400/35"
          >
            Back
          </button>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          <article className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Move</p>
            <div className="mt-3 grid grid-cols-3 gap-1 text-center text-xs text-slate-200">
              <span></span>
              <span className="rounded border border-slate-600 bg-slate-950 px-2 py-2">W</span>
              <span></span>
              <span className="rounded border border-slate-600 bg-slate-950 px-2 py-2">A</span>
              <span className="rounded border border-slate-600 bg-slate-950 px-2 py-2">S</span>
              <span className="rounded border border-slate-600 bg-slate-950 px-2 py-2">D</span>
            </div>
            <p className="mt-3 text-sm text-slate-300">Use WASD, arrow keys, or the mobile joystick.</p>
          </article>

          <article className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Survive</p>
            <div className="mt-3 rounded-xl border border-fuchsia-400/30 bg-fuchsia-500/10 p-3 text-sm text-fuchsia-100">
              Control flips, goal runs away, and fake wins try to trick you.
            </div>
            <p className="mt-3 text-sm text-slate-300">Watch the left panel for score, combo, and progress.</p>
          </article>

          <article className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Score</p>
            <div className="mt-3 h-2 rounded-full bg-slate-800">
              <div className="h-full w-3/4 rounded-full bg-gradient-to-r from-amber-300 to-fuchsia-400" />
            </div>
            <div className="mt-3 space-y-2 text-sm text-slate-300">
              <p>• Collect gold shards for bonus points.</p>
              <p>• Stay in purple rifts for extra score.</p>
              <p>• Use dash when the target gets close.</p>
            </div>
          </article>
        </div>

        <div className="mt-6 rounded-2xl border border-cyan-300/20 bg-slate-900/60 p-4">
          <p className="font-arcade text-sm text-cyan-100">Visual Flow</p>
          <div className="mt-3 grid gap-2 text-sm text-slate-300 sm:grid-cols-4">
            <div className="rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2">1. Start run</div>
            <div className="rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2">2. Chase goal</div>
            <div className="rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2">3. Collect shards</div>
            <div className="rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2">4. Save score</div>
          </div>
        </div>
      </div>
    </section>
  )
}
