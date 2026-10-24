import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowRight, CheckCircle2, Circle, Eye, Lightbulb, PartyPopper, RotateCcw, Siren } from 'lucide-react'
import { Terminal } from './Terminal'
import { HOME, type CustomCommand, type Fs, type Result } from '../lib/vfs'
import { markSolved, useSolved } from '../lib/storage'
import type { SimState } from '../lib/sim'
import { bouncy, spring } from '../lib/motion'

export type Scenario = {
  id: string
  title: string
  level: 'Easy' | 'Medium' | 'Hard'
  /** Machine name shown in the prompt, e.g. web-01. */
  host: string
  /** The ticket or alert that starts the scenario. */
  brief: ReactNode
  setup: () => { fs: Fs; cwd?: string }
  goals: { text: string; check: (s: SimState) => boolean }[]
  hints: string[]
  solution: string[]
  /** What happened and how it is done at work. Shown when every goal is met. */
  debrief: ReactNode
  /** Extra commands for this scenario, e.g. a fake curl or aws CLI. */
  commands?: Record<string, CustomCommand>
  /** Optional live picture next to the goals, e.g. a disk gauge. */
  Visual?: ComponentType<{ state: SimState }>
}

const LEVEL_TONE = { Easy: 'green', Medium: 'amber', Hard: 'rose' } as const

function fresh(sc: Scenario): SimState {
  const { fs, cwd } = sc.setup()
  return { fs, cwd: cwd ?? HOME, log: [] }
}

function Run({ scenario, onNext }: { scenario: Scenario; onNext?: () => void }) {
  const [state, setState] = useState(() => fresh(scenario))
  const [round, setRound] = useState(0)
  const [hints, setHints] = useState(0)
  const [showSolution, setShowSolution] = useState(false)
  const done = useMemo(() => scenario.goals.map((g) => g.check(state)), [scenario, state])
  const solved = done.every(Boolean)
  const { Visual } = scenario

  useEffect(() => {
    if (solved) markSolved(scenario.id)
  }, [solved, scenario.id])

  function onRun(r: Result, line: string, prevCwd: string) {
    setState((s) => ({ fs: r.fs, cwd: r.cwd, log: [...s.log, { line, cwd: prevCwd, out: r.out.map((o) => o.text).join('\n') }] }))
  }

  function reset() {
    setState(fresh(scenario))
    setRound((n) => n + 1)
    setHints(0)
    setShowSolution(false)
  }

  return (
    <div className="sim-grid">
      <div className="sim-side">
        <section className="ticket">
          <header>
            <Siren size={16} /> Ticket · {scenario.host}
            <span className="chip" style={{ ['--tone' as string]: `var(--${LEVEL_TONE[scenario.level]})`, marginLeft: 'auto' }}>
              {scenario.level}
            </span>
          </header>
          <h3>{scenario.title}</h3>
          <div className="ticket-body">{scenario.brief}</div>
        </section>

        <div className="mini-table">
          <header>
            Goals · {done.filter(Boolean).length}/{scenario.goals.length}
          </header>
          {scenario.goals.map((g, i) => (
            <div className="row" key={g.text} style={{ fontFamily: 'var(--font)', justifyContent: 'flex-start', alignItems: 'center', fontSize: 13.5 }}>
              <motion.span animate={{ scale: done[i] ? [1, 1.45, 1] : 1 }} transition={bouncy} style={{ display: 'flex', flex: 'none' }}>
                {done[i] ? <CheckCircle2 size={17} color="var(--green)" /> : <Circle size={17} color="var(--faint)" />}
              </motion.span>
              <span style={{ textDecoration: done[i] ? 'line-through' : undefined, color: done[i] ? 'var(--muted)' : undefined }}>{g.text}</span>
            </div>
          ))}
        </div>

        {Visual && <Visual state={state} />}

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn" onClick={() => setHints((h) => Math.min(h + 1, scenario.hints.length))} disabled={hints >= scenario.hints.length}>
            <Lightbulb size={15} /> {hints ? 'Next hint' : 'Hint'}
          </button>
          <button className="btn" aria-pressed={showSolution} onClick={() => setShowSolution((v) => !v)}>
            <Eye size={15} /> Solution
          </button>
          <button className="btn" onClick={reset}>
            <RotateCcw size={15} /> Reset
          </button>
        </div>

        <AnimatePresence initial={false}>
          {scenario.hints.slice(0, hints).map((h, i) => (
            <motion.div key={h} className="tip tone-amber" style={{ margin: 0 }} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={spring}>
              <Lightbulb size={16} />
              <p>
                <b>Hint {i + 1}: </b>
                {h}
              </p>
            </motion.div>
          ))}
          {showSolution && (
            <motion.div key="solution" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={spring}>
              <code className="shell">
                {scenario.solution.map((c, i) => (
                  <span key={i}>
                    {c.startsWith('# ') ? (
                      <span className="c">{c}</span>
                    ) : (
                      <>
                        <span className="p">$ </span>
                        {c}
                      </>
                    )}
                    {i < scenario.solution.length - 1 && '\n'}
                  </span>
                ))}
              </code>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="sim-main">
        <Terminal key={`${scenario.id}-${round}`} fs={state.fs} cwd={state.cwd} host={scenario.host} onRun={onRun} commands={scenario.commands} height={440} autoFocus={round > 0} />
        <AnimatePresence>
          {solved && (
            <motion.section className="sim-solved" initial={{ opacity: 0, scale: 0.9, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0 }} transition={bouncy}>
              <h3>
                <PartyPopper size={20} /> Ticket closed!
              </h3>
              <div>{scenario.debrief}</div>
              {onNext && (
                <button className="btn primary" onClick={onNext} style={{ alignSelf: 'flex-start' }}>
                  Next scenario <ArrowRight size={16} />
                </button>
              )}
            </motion.section>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

/** Scenario picker plus the live ticket, goals and terminal for the chosen one. */
export function SimLab({ scenarios }: { scenarios: Scenario[] }) {
  const [active, setActive] = useState(0)
  const solved = useSolved()
  const sc = scenarios[active]

  return (
    <div className="sim-lab">
      <div className="sim-picker" role="tablist" aria-label="Scenarios">
        {scenarios.map((s, i) => {
          const isDone = solved.includes(s.id)
          return (
            <button key={s.id} role="tab" aria-selected={i === active} className={`sim-pick${i === active ? ' active' : ''}`} onClick={() => setActive(i)}>
              <span className={`nav-num${isDone ? ' done' : ''}`}>{isDone ? <CheckCircle2 size={13} strokeWidth={3} /> : i + 1}</span>
              <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2, minWidth: 0 }}>
                <b>{s.title}</b>
                <small className="muted">
                  {s.level} · {s.host}
                </small>
              </span>
            </button>
          )
        })}
      </div>
      <Run key={sc.id} scenario={sc} onNext={active < scenarios.length - 1 ? () => setActive(active + 1) : undefined} />
    </div>
  )
}
