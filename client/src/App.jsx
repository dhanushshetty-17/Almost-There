import { AnimatePresence, motion } from 'framer-motion'
import Game from './Game'

const shellAnim = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2 } },
}

function App() {
  return (
    <main className="relative min-h-svh overflow-x-hidden overflow-y-auto bg-void text-slate-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-fuchsia-500/10 blur-3xl" />
      </div>

      <AnimatePresence mode="wait">
        <motion.div key="game-shell" {...shellAnim} className="relative z-10">
          <Game />
        </motion.div>
      </AnimatePresence>
    </main>
  )
}

export default App
