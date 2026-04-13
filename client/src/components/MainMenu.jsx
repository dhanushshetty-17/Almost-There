import { motion } from 'framer-motion'

export default function MainMenu({ onStart, onQuit }) {
  return (
    <section className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-4 py-6 sm:px-8">
      <div className="panel-glow grid w-full gap-5 rounded-3xl border border-cyan-400/30 bg-slate-950/70 p-6 shadow-2xl backdrop-blur sm:p-10 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="mb-2 text-center font-arcade text-5xl tracking-wider text-cyan-200 sm:text-7xl lg:text-left"
          >
            Almost There!
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mx-auto mb-8 max-w-2xl text-center text-sm text-slate-300 sm:text-base lg:mx-0 lg:text-left"
          >
            Move to the glowing target. Expect your controls to betray you, fake victories, and shameless trolling.
          </motion.p>

          <div className="mx-auto flex max-w-md flex-col gap-3 lg:mx-0">
            <button
              onClick={onStart}
              className="game-btn border-cyan-300/40 bg-cyan-500/20 text-cyan-100 hover:bg-cyan-400/35"
            >
              Start Run
            </button>
            <button
              onClick={onQuit}
              className="game-btn border-fuchsia-300/40 bg-fuchsia-500/20 text-fuchsia-100 hover:bg-fuchsia-400/35"
            >
              Quit
            </button>
          </div>

          <div className="mt-6 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.22em] text-slate-400">
            <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1">Canvas Gameplay</span>
            <span className="rounded-full border border-fuchsia-400/30 bg-fuchsia-500/10 px-3 py-1">Audio Cues</span>
            <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1">Combo Scoring</span>
          </div>
        </div>

        <div className="grid gap-3">
          <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
            <p className="font-arcade text-sm text-cyan-100">Tutorial</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-300">
              <li>• Use WASD or arrow keys to move.</li>
              <li>• Press Space to dash through tight spots.</li>
              <li>• Collect gold shards to build combo points.</li>
              <li>• Purple rifts give bonus scoring while you stay inside them.</li>
              <li>• Press P to pause and the sound toggle to mute.</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
            <p className="font-arcade text-sm text-fuchsia-100">Feature Feed</p>
            <div className="mt-3 space-y-2 text-sm text-slate-300">
              <p>• Random control flips keep you guessing.</p>
              <p>• Goal AI flees when you get too close.</p>
              <p>• Fake YOU WIN popups still troll you.</p>
              <p>• Live scoreboard tracks your run and top scores.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
