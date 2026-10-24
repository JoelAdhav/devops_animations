import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Caption, type Callout } from '../components/Caption'
import { Controls } from '../components/Controls'
import { useStepper } from '../lib/useStepper'

type Line = { ins: string; size: string; secs: number; note: string; /** true if this layer changes when source code changes */ usesSource?: boolean }

const GOOD: Line[] = [
  { ins: 'FROM node:20-alpine', size: '135 MB', secs: 6, note: 'Base layer: a small Linux with Node installed, pulled from Docker Hub.' },
  { ins: 'WORKDIR /app', size: '0 B', secs: 0.1, note: 'Sets the working directory for the next instructions.' },
  { ins: 'COPY package*.json ./', size: '2 KB', secs: 0.1, note: 'Copies only the dependency list first. It rarely changes.' },
  { ins: 'RUN npm ci', size: '48 MB', secs: 38, note: 'Installs dependencies. The slowest step, so we want it cached.' },
  { ins: 'COPY . .', size: '1.2 MB', secs: 0.3, note: 'Copies your source code. This changes on almost every commit.', usesSource: true },
  { ins: 'CMD ["node", "server.js"]', size: '0 B', secs: 0, note: 'Metadata only: the command to start the app. No files change.' },
]

const BAD: Line[] = [
  GOOD[0],
  GOOD[1],
  { ins: 'COPY . .', size: '1.2 MB', secs: 0.3, note: 'Copies everything, source code included, before installing dependencies.', usesSource: true },
  { ins: 'RUN npm ci', size: '48 MB', secs: 38, note: 'Because the layer above changes on every commit, this 38-second install reruns every single build.' },
  GOOD[5],
]

type Mode = 'fresh' | 'rebuild'

export default function DockerBuild() {
  const [order, setOrder] = useState<'good' | 'bad'>('good')
  const [mode, setMode] = useState<Mode>('fresh')
  const lines = order === 'good' ? GOOD : BAD
  const total = lines.length + 2
  const s = useStepper(total, { interval: 1300 })

  // On a rebuild after a code change, everything from the first source-dependent layer onwards is invalidated.
  const invalidFrom = mode === 'rebuild' ? lines.findIndex((l) => l.usesSource) : 0
  const built = Math.min(s.step, lines.length)
  const cached = (i: number) => i < invalidFrom
  const buildTime = lines.slice(0, built).reduce((sum, l, i) => sum + (cached(i) ? 0 : l.secs), 0)
  const running = s.step >= lines.length + 1
  const requested = s.step >= lines.length + 2
  const curLine = s.step >= 1 && s.step <= lines.length ? s.step - 1 : -1

  function pick(next: { order?: 'good' | 'bad'; mode?: Mode }) {
    if (next.order) setOrder(next.order)
    if (next.mode) setMode(next.mode)
    s.reset()
  }

  let title: string
  let body: string
  let callout: Callout | undefined
  if (s.step === 0) {
    title = mode === 'fresh' ? 'docker build -t my-app:1.0 .' : 'You edited server.js. Rebuild.'
    body = mode === 'fresh'
      ? 'Each instruction in the Dockerfile creates one read-only layer. Press Play to build.'
      : 'Docker reuses a cached layer only if the instruction and everything above it are unchanged. Watch which layers rebuild.'
  } else if (curLine >= 0) {
    const l = lines[curLine]
    title = `Step ${curLine + 1}/${lines.length}: ${l.ins}`
    body = cached(curLine) ? 'CACHED: nothing above changed, so Docker reuses the existing layer instantly.' : l.note
    if (!cached(curLine) && mode === 'rebuild' && order === 'bad' && l.ins === 'RUN npm ci')
      callout = { tone: 'rose', title: 'Cache busted', body: 'Fix: copy package*.json and run npm ci before COPY . . so dependencies stay cached.' }
  } else if (!requested) {
    title = 'docker run -d -p 8080:3000 my-app:1.0'
    body = 'A container is the image layers (read-only) plus one thin writable layer on top. -p maps host port 8080 to port 3000 inside the container.'
  } else {
    title = 'curl http://localhost:8080'
    body = 'The request hits the host on 8080, Docker forwards it to 3000 in the container, and Node answers.'
    callout =
      mode === 'rebuild'
        ? {
            tone: order === 'good' ? 'green' : 'amber',
            title: `Rebuild took ${buildTime.toFixed(1)} s`,
            body: order === 'good' ? 'Dependencies stayed cached. Fast feedback on every commit.' : 'Every code change reinstalls all dependencies. Switch to the good order and compare.',
          }
        : { tone: 'sky', title: 'Next', body: 'Click "Edit code & rebuild" to see the layer cache at work.' }
  }

  return (
    <div className="card stage">
      <div className="toolbar">
        <span className="label">Dockerfile</span>
        <div className="seg" role="group" aria-label="Instruction order">
          <button aria-pressed={order === 'good'} onClick={() => pick({ order: 'good' })}>Good order</button>
          <button className="bad" aria-pressed={order === 'bad'} onClick={() => pick({ order: 'bad' })}>Bad order</button>
        </div>
        <span className="label" style={{ marginLeft: 8 }}>Build</span>
        <div className="seg" role="group" aria-label="Build type">
          <button aria-pressed={mode === 'fresh'} onClick={() => pick({ mode: 'fresh' })}>First build</button>
          <button aria-pressed={mode === 'rebuild'} onClick={() => pick({ mode: 'rebuild' })}>Edit code &amp; rebuild</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        {/* Dockerfile */}
        <div className="terminal" style={{ alignSelf: 'start' }}>
          <header><i /><i /><i /><span style={{ marginLeft: 6 }}>Dockerfile</span></header>
          <div className="body" style={{ height: 'auto', padding: '10px 0' }}>
            {lines.map((l, i) => (
              <motion.div
                key={order + i}
                animate={{
                  backgroundColor: i === curLine ? 'rgba(255,190,61,0.22)' : 'rgba(255,190,61,0)',
                }}
                style={{ padding: '3px 14px', display: 'flex', gap: 12 }}
              >
                <span className="dim" style={{ width: 14, textAlign: 'right' }}>{i + 1}</span>
                <span className={i < built ? (cached(i) ? 'ok' : 'cmdline') : ''}>{l.ins}</span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Image layers */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <span className="muted">Image my-app:1.0 (layers stack bottom-up)</span>
            <span className="mono">{buildTime.toFixed(1)} s</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column-reverse', gap: 6, minHeight: 250, justifyContent: 'flex-start' }}>
            <AnimatePresence>
              {lines.slice(0, built).map((l, i) => (
                <motion.div
                  key={order + mode + i}
                  initial={{ opacity: 0, y: -24, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                  className={`tone-${cached(i) ? 'green' : l.secs > 5 ? 'amber' : 'teal'}`}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid color-mix(in srgb, var(--tone) 45%, transparent)',
                    background: 'color-mix(in srgb, var(--tone) 12%, var(--panel-2))',
                    fontSize: 13,
                  }}
                >
                  <span className="mono" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.ins}</span>
                  <span style={{ display: 'flex', gap: 8, alignItems: 'center', flex: 'none' }}>
                    <span className="muted mono">{l.size}</span>
                    <span className="chip" style={{ fontSize: 11 }}>{cached(i) ? 'CACHED' : `${l.secs}s`}</span>
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Running container */}
      <AnimatePresence>
        {running && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <div className="zone-box" style={{ border: '1px dashed var(--border-strong)', borderRadius: 14, padding: 16, position: 'relative' }}>
              <div className="muted" style={{ fontSize: 12, marginBottom: 10 }}>Host machine (your laptop or EC2)</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <span className="chip tone-sky mono">curl :8080</span>
                <div style={{ flex: 1, minWidth: 80, height: 2, background: 'var(--border-strong)', position: 'relative' }}>
                  {requested && (
                    <motion.span
                      initial={{ left: '0%' }}
                      animate={{ left: '100%' }}
                      transition={{ duration: 0.9, ease: 'easeInOut' }}
                      style={{ position: 'absolute', top: -6, width: 14, height: 14, marginLeft: -7, borderRadius: '50%', background: 'var(--amber)' }}
                    />
                  )}
                </div>
                <span className="chip tone-amber mono">host :8080 → :3000</span>
                <div style={{ flex: 1, minWidth: 40, height: 2, background: 'var(--border-strong)' }} />
                <div className="tone-teal" style={{ border: '1.5px solid var(--tone)', borderRadius: 12, padding: 10, minWidth: 220, background: 'color-mix(in srgb, var(--tone) 8%, transparent)' }}>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>Container "web"</div>
                  <div style={{ fontSize: 12, padding: '4px 8px', borderRadius: 6, border: '1px dashed var(--tone)', marginBottom: 4 }}>
                    Writable layer (logs, temp files)
                  </div>
                  <div className="muted" style={{ fontSize: 12, padding: '4px 8px', borderRadius: 6, background: 'var(--panel-3)' }}>
                    {lines.length} read-only image layers
                  </div>
                  <div className="mono" style={{ fontSize: 12, marginTop: 6 }}>
                    node server.js listening on :3000{requested && <span style={{ color: 'var(--green)' }}> → 200 OK</span>}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Controls s={s} />
      <Caption id={`${order}-${mode}-${s.step}`} title={title} body={body} callout={callout} />
    </div>
  )
}
