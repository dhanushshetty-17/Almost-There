const MODE_INFO = {
  classic: {
    label: 'Classic',
    detail: 'Balanced and recommended for new players.',
  },
  chaos: {
    label: 'Chaos',
    detail: 'More trolling, faster pressure, higher score potential.',
  },
  hardcore: {
    label: 'Hardcore',
    detail: 'Fastest pace with the harshest control flips.',
  },
}

export default function SettingsPage({ settings, onSettingChange, onBack }) {
  const mode = settings?.mode || 'classic'

  return (
    <section className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-4 py-6 sm:px-8">
      <div className="panel-glow w-full rounded-3xl border border-cyan-400/30 bg-slate-950/75 p-6 shadow-2xl backdrop-blur sm:p-10">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-arcade text-sm text-cyan-100">Settings</p>
            <h2 className="mt-2 font-arcade text-4xl text-cyan-200 sm:text-5xl">Tune the Run</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              Keep the gameplay sliders separate from the menu so the UI stays clean and easier to use.
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
          {Object.entries(MODE_INFO).map(([key, info]) => {
            const active = mode === key
            return (
              <button
                key={key}
                type="button"
                onClick={() => onSettingChange?.('mode', key)}
                className={`rounded-2xl border p-4 text-left transition ${
                  active
                    ? 'border-cyan-300 bg-cyan-500/15 text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.15)]'
                    : 'border-slate-700 bg-slate-900/70 text-slate-300 hover:border-slate-500 hover:text-slate-100'
                }`}
              >
                <p className="font-arcade text-lg">{info.label}</p>
                <p className="mt-2 text-sm leading-5 text-slate-400">{info.detail}</p>
              </button>
            )
          })}
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          <label className="grid gap-2 rounded-2xl border border-slate-700 bg-slate-900/70 p-4 text-sm text-slate-300">
            Volume: {settings?.volume ?? 70}%
            <input
              type="range"
              min="0"
              max="100"
              value={settings?.volume ?? 70}
              onChange={(event) => onSettingChange?.('volume', Number(event.target.value))}
              className="accent-cyan-300"
            />
          </label>

          <label className="grid gap-2 rounded-2xl border border-slate-700 bg-slate-900/70 p-4 text-sm text-slate-300">
            Effectiveness: {settings?.effects ?? 100}%
            <input
              type="range"
              min="30"
              max="140"
              value={settings?.effects ?? 100}
              onChange={(event) => onSettingChange?.('effects', Number(event.target.value))}
              className="accent-fuchsia-300"
            />
          </label>

          <label className="grid gap-2 rounded-2xl border border-slate-700 bg-slate-900/70 p-4 text-sm text-slate-300">
            Sensitivity: {settings?.sensitivity ?? 100}%
            <input
              type="range"
              min="60"
              max="150"
              value={settings?.sensitivity ?? 100}
              onChange={(event) => onSettingChange?.('sensitivity', Number(event.target.value))}
              className="accent-amber-300"
            />
          </label>
        </div>

        <div className="mt-8 rounded-2xl border border-cyan-300/20 bg-slate-900/60 p-4 text-sm text-slate-300">
          <p className="font-arcade text-sm text-cyan-100">Notes</p>
          <p className="mt-2">Mode changes only apply to the next run. That keeps the current run stable while you play.</p>
        </div>
      </div>
    </section>
  )
}
