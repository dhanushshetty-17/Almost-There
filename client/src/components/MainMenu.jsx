import { motion } from 'framer-motion'

const MotionH1 = motion.h1
const MotionP = motion.p

export default function MainMenu({ onStart, onQuit, onOpenTutorial, onOpenSettings }) {

  return (
    <section className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-4 py-6 sm:px-8">
      <div className="panel-glow grid w-full gap-5 rounded-3xl border border-cyan-400/30 bg-slate-950/70 p-6 shadow-2xl backdrop-blur sm:p-10">
        <div className="mx-auto w-full max-w-3xl">
          <MotionH1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="mb-2 text-center font-arcade text-5xl tracking-wider text-cyan-200 sm:text-7xl lg:text-left"
          >
            Almost There!
          </MotionH1>
          <MotionP
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mx-auto mb-8 max-w-2xl text-center text-sm text-slate-300 sm:text-base lg:mx-0 lg:text-left"
          >
            Move to the glowing target. Expect your controls to betray you, fake victories, and shameless trolling.
          </MotionP>

          <div className="mx-auto flex max-w-md flex-col gap-3">
            <button
              onClick={onStart}
              className="game-btn border-cyan-300/40 bg-cyan-500/20 text-cyan-100 hover:bg-cyan-400/35"
            >
              Start Run
            </button>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={onOpenTutorial}
                className="game-btn border-slate-300/30 bg-slate-500/10 text-slate-100 hover:bg-slate-400/20"
              >
                Tutorial
              </button>
              <button
                type="button"
                onClick={onOpenSettings}
                className="game-btn border-slate-300/30 bg-slate-500/10 text-slate-100 hover:bg-slate-400/20"
              >
                Settings
              </button>
            </div>
            <button
              onClick={onQuit}
              className="game-btn border-fuchsia-300/40 bg-fuchsia-500/20 text-fuchsia-100 hover:bg-fuchsia-400/35"
            >
              Quit
            </button>
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-2 text-[11px] uppercase tracking-[0.22em] text-slate-400">
            <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1">Canvas Gameplay</span>
            <span className="rounded-full border border-fuchsia-400/30 bg-fuchsia-500/10 px-3 py-1">Audio Cues</span>
            <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1">Combo Scoring</span>
            <span className="rounded-full border border-slate-400/30 bg-slate-500/10 px-3 py-1">Tutorial page</span>
            <span className="rounded-full border border-slate-400/30 bg-slate-500/10 px-3 py-1">Settings page</span>
          </div>
        </div>
      </div>
    </section>
  )
}
