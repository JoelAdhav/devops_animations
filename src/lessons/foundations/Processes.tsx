import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Cpu, Play, Power, RotateCw, Skull, Square } from 'lucide-react'
import type { Lesson } from '../types'
import { Shell, Tip } from '../../components/Story'
import { At, Box, Bubble, Card, Envelope, FileIcon, Link, Mover, Scene, Tag, Txt } from '../../components/Illustrations'
import { bouncy } from '../../lib/motion'
import type { Tone } from '../../components/Diagram'
import { useLoop } from '../../lib/useLoop'

function Headline({ children }: { children: string }) {
  return (
    <Txt x={280} y={46} cls="ill-label" anchor="middle" size={17}>
      {children}
    </Txt>
  )
}

/** A running process: a rounded chip with a spinning gear and PID. */
function Proc({ name, pid, tone = 'teal', state = 'run' }: { name: string; pid: number | string; tone?: Tone; state?: 'run' | 'dead' | 'stopping' }) {
  const t = state === 'dead' ? 'rose' : state === 'stopping' ? 'amber' : tone
  return (
    <g>
      <rect className="ill-outline" x={-62} y={-24} width={124} height={48} rx={14} style={{ fill: `color-mix(in srgb, var(--${t}) 35%, var(--paper))`, strokeWidth: 2 }} />
      {/* Rotation lives on an inner group: motion's transform would replace a translate on the same element. */}
      <g transform="translate(-42 0)">
      <motion.g
        animate={state === 'run' ? { rotate: 360 } : { rotate: 0 }}
        transition={state === 'run' ? { duration: 2.4, repeat: Infinity, ease: 'linear' } : bouncy}
      >
        <circle r={9} fill="var(--paper)" stroke="var(--ink)" strokeWidth={2} />
        {[0, 60, 120].map((a) => (
          <rect key={a} x={-2} y={-12} width={4} height={24} rx={1.5} fill="var(--ink)" transform={`rotate(${a})`} />
        ))}
        <circle r={4} fill={`var(--${t})`} stroke="var(--ink)" strokeWidth={1.5} />
      </motion.g>
      </g>
      <text className="ill-label" x={8} y={-2} style={{ fontSize: 13 }}>
        {name}
      </text>
      <text className="ill-sub" x={8} y={14}>
        PID {pid}
      </text>
    </g>
  )
}

/* ------------------------------------------------------------------ scenes */

function S0Program() {
  const t = useLoop(3, 1500)
  return (
    <>
      <Headline>A program on disk vs a process in memory</Headline>
      <At x={120} y={240}>
        <Box w={180} h={220} tone="slate" />
      </At>
      <Txt x={120} y={150} anchor="middle" cls="ill-label" size={14}>
        Disk (storage)
      </Txt>
      <At x={120} y={240}>
        <FileIcon tone="sky" title="/usr/sbin/nginx" />
      </At>
      <Txt x={120} y={320} anchor="middle" cls="ill-sub">
        just a file, doing nothing
      </Txt>
      <At x={400} y={240}>
        <Box w={240} h={260} tone="teal" />
      </At>
      <Txt x={400} y={130} anchor="middle" cls="ill-label" size={14}>
        Memory (RAM): running
      </Txt>
      <Link d="M212 240 H272" arrow delay={0.3} />
      <Txt x={242} y={228} anchor="middle" cls="ill-sub">
        run
      </Txt>
      <At x={400} y={200} show={t >= 1}>
        <Proc name="nginx" pid={812} />
      </At>
      <At x={400} y={270} show={t >= 2}>
        <Proc name="nginx" pid={813} />
      </At>
      <Txt x={400} y={340} anchor="middle" cls="ill-sub" show={t >= 2}>
        same program, two processes
      </Txt>
    </>
  )
}

const TREE: { id: string; name: string; pid: number; x: number; y: number; parent?: string; tone: Tone }[] = [
  { id: 'sd', name: 'systemd', pid: 1, x: 280, y: 100, tone: 'violet' },
  { id: 'ssh', name: 'sshd', pid: 640, x: 100, y: 210, parent: 'sd', tone: 'teal' },
  { id: 'ngx', name: 'nginx', pid: 812, x: 280, y: 210, parent: 'sd', tone: 'teal' },
  { id: 'cron', name: 'cron', pid: 700, x: 460, y: 210, parent: 'sd', tone: 'teal' },
  { id: 'bash', name: 'bash', pid: 2001, x: 100, y: 320, parent: 'ssh', tone: 'sky' },
  { id: 'w1', name: 'worker', pid: 813, x: 230, y: 320, parent: 'ngx', tone: 'sky' },
  { id: 'w2', name: 'worker', pid: 814, x: 350, y: 320, parent: 'ngx', tone: 'sky' },
  { id: 'top', name: 'top', pid: 2050, x: 100, y: 410, parent: 'bash', tone: 'amber' },
]

function S1Tree() {
  return (
    <>
      <Headline>Every process has a parent</Headline>
      {TREE.filter((n) => n.parent).map((n, i) => {
        const p = TREE.find((q) => q.id === n.parent)!
        return <Link key={n.id} d={`M${p.x} ${p.y + 24} V${(p.y + n.y) / 2} H${n.x} V${n.y - 24}`} color="var(--border-strong)" delay={0.2 + i * 0.08} />
      })}
      {TREE.map((n, i) => (
        <At key={n.id} x={n.x} y={n.y} delay={i * 0.1} t={bouncy}>
          <g transform="scale(0.85)">
            <Proc name={n.name} pid={n.pid} tone={n.tone} />
          </g>
        </At>
      ))}
      <Txt x={400} y={410} anchor="middle" cls="ill-sub">
        PID 1 starts everything else
      </Txt>
    </>
  )
}

const TOP_ROWS = [
  { pid: 2231, user: 'joel', cmd: 'python app.py', cpu: [85, 92, 97, 88], mem: 34 },
  { pid: 812, user: 'root', cmd: 'nginx', cpu: [3, 5, 2, 4], mem: 2 },
  { pid: 1650, user: 'mysql', cmd: 'mysqld', cpu: [8, 6, 12, 9], mem: 41 },
  { pid: 640, user: 'root', cmd: 'sshd', cpu: [0, 0, 1, 0], mem: 0 },
  { pid: 1, user: 'root', cmd: 'systemd', cpu: [0, 0, 0, 0], mem: 0 },
]

function S2Top() {
  const t = useLoop(4, 1200)
  return (
    <>
      <Headline>Watching processes live with top</Headline>
      <At x={30} y={80}>
        <g>
          <rect x={0} y={0} width={500} height={250} rx={16} fill="#1e2742" stroke="var(--ink)" strokeWidth={2.5} />
          <text x={16} y={28} style={{ fill: '#ffbe3d', fontFamily: 'var(--mono)', fontSize: 12 }}>
            load average: 1.42, 0.98, 0.71   Mem: 3.9G used of 8G
          </text>
          <text x={16} y={58} style={{ fill: '#9fb0d6', fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700 }}>
            {'  PID USER    %CPU %MEM COMMAND'}
          </text>
          {[...TOP_ROWS]
            .sort((a, b) => b.cpu[t] - a.cpu[t])
            .map((r, k) => (
              <motion.g key={r.pid} animate={{ y: 84 + k * 32 }} initial={false} transition={bouncy}>
                {k === 0 && <rect x={8} y={-17} width={484} height={26} rx={6} fill="color-mix(in srgb, var(--rose) 45%, transparent)" />}
                <text x={16} y={0} style={{ fill: '#dfe6f5', fontFamily: 'var(--mono)', fontSize: 12.5, whiteSpace: 'pre' }}>
                  {`${String(r.pid).padStart(5)} ${r.user.padEnd(7)} ${String(r.cpu[t]).padStart(4)} ${String(r.mem).padStart(4)} ${r.cmd}`}
                </text>
              </motion.g>
            ))}
        </g>
      </At>
      <At x={280} y={370} delay={0.4}>
        <Bubble text="python app.py is eating the CPU!" tone="rose" side="down" />
      </At>
    </>
  )
}

const FG_FRAMES = [
  { lines: ['$ python app.py', 'Serving on :8000…', '▌ (terminal is busy)'], attached: true },
  { lines: ['$ python app.py', 'Serving on :8000…', '^C  (Ctrl+C stops it)', '$ ▌'], attached: false, dead: true },
  { lines: ['$ python app.py &', '[1] 2345', '$ ▌ (terminal is free)'], attached: false },
  { lines: ['$ jobs', '[1]+ Running  python app.py &', '$ fg %1   (bring it back)'], attached: true },
]

function S3Fg() {
  const t = useLoop(FG_FRAMES.length, 1900)
  const f = FG_FRAMES[t]
  return (
    <>
      <Headline>Foreground and background</Headline>
      <At x={30} y={90}>
        <g>
          <rect x={0} y={0} width={290} height={200} rx={16} fill="#1e2742" stroke="var(--ink)" strokeWidth={2.5} />
          <AnimatePresence mode="wait">
            <motion.g key={t} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {f.lines.map((l, k) => (
                <text key={k} x={16} y={36 + k * 26} style={{ fill: l.startsWith('$') ? '#7cc4ff' : '#dfe6f5', fontFamily: 'var(--mono)', fontSize: 12.5 }}>
                  {l}
                </text>
              ))}
            </motion.g>
          </AnimatePresence>
        </g>
      </At>
      <Mover x={f.attached ? 260 : 440} y={f.attached ? 330 : 250}>
        <Proc name="python" pid={2345} state={f.dead ? 'dead' : 'run'} />
      </Mover>
      <Link d="M175 290 Q200 330 196 330" show={f.attached} color="var(--sky)" width={3} />
      <Txt x={440} y={320} anchor="middle" cls="ill-sub" show={!f.attached && !f.dead}>
        running in the background
      </Txt>
    </>
  )
}

const SIGNALS = [
  { sig: 'SIGTERM (15)', cmd: 'kill 2345', reply: 'Saving work… closing files… bye!', end: 'stopping' as const, tone: 'amber' as Tone },
  { sig: 'SIGKILL (9)', cmd: 'kill -9 2345', reply: '', end: 'dead' as const, tone: 'rose' as Tone },
  { sig: 'SIGHUP (1)', cmd: 'kill -HUP 812', reply: 'Reloading my config…', end: 'run' as const, tone: 'sky' as Tone },
]

function S4Signals() {
  const t = useLoop(SIGNALS.length * 2, 1400)
  const s = SIGNALS[Math.floor(t / 2)]
  const hit = t % 2 === 1
  return (
    <>
      <Headline>Signals: messages you send to a process</Headline>
      <At x={120} y={120}>
        <Tag text={`$ ${s.cmd}`} mono tone="slate" w={190} h={38} />
      </At>
      <Mover x={hit ? 380 : 140} y={hit ? 240 : 190}>
        <Envelope tone={s.tone} />
      </Mover>
      <Txt x={hit ? 380 : 140} y={hit ? 216 : 166} anchor="middle" cls="ill-mono" size={12}>
        {s.sig}
      </Txt>
      <At x={400} y={290}>
        <Proc name={s.sig.startsWith('SIGHUP') ? 'nginx' : 'python'} pid={s.sig.startsWith('SIGHUP') ? 812 : 2345} state={hit ? s.end : 'run'} />
      </At>
      <At x={400} y={250} show={hit && !!s.reply}>
        <Bubble text={s.reply} tone={s.tone} />
      </At>
      <Txt x={400} y={350} anchor="middle" cls="ill-label" fill="var(--rose)" show={hit && s.end === 'dead'}>
        killed instantly, no clean-up
      </Txt>
      <Txt x={280} y={410} anchor="middle" cls="ill-sub">
        Ctrl+C sends SIGINT · always try SIGTERM before SIGKILL
      </Txt>
    </>
  )
}

const BOOT = ['kernel', 'systemd (PID 1)', 'sshd.service', 'nginx.service', 'cron.service', 'docker.service']

function S5Daemons() {
  const t = useLoop(BOOT.length + 2, 650)
  return (
    <>
      <Headline>Services start at boot and run in the background</Headline>
      <At x={70} y={110}>
        <Tag text="⏻ power on" tone="amber" filled w={110} />
      </At>
      {BOOT.map((b, i) => (
        <At key={b} x={280} y={110 + i * 50} show={t > i} t={bouncy}>
          <Box w={220} h={38} tone={i < 2 ? 'violet' : 'green'} strong={i >= 2} />
          <text className="ill-mono" y={5} textAnchor="middle" style={{ fontWeight: 700 }}>
            {i >= 2 ? '● ' : ''}
            {b}
          </text>
        </At>
      ))}
      <Txt x={420} y={250} cls="ill-text" show={t > BOOT.length}>
        no terminal attached,
      </Txt>
      <Txt x={420} y={270} cls="ill-text" show={t > BOOT.length}>
        always running:
      </Txt>
      <Txt x={420} y={292} cls="ill-label" size={15} show={t > BOOT.length}>
        "daemons"
      </Txt>
    </>
  )
}

const SYSTEMCTL = [
  { cmd: 'systemctl status nginx', state: 'active (running)', tone: 'green' as Tone },
  { cmd: 'sudo systemctl stop nginx', state: 'inactive (dead)', tone: 'slate' as Tone },
  { cmd: 'sudo systemctl start nginx', state: 'active (running)', tone: 'green' as Tone },
  { cmd: 'sudo systemctl enable nginx', state: 'enabled: starts on boot', tone: 'sky' as Tone },
]

function S6Systemctl() {
  const t = useLoop(SYSTEMCTL.length, 1700)
  const s = SYSTEMCTL[t]
  return (
    <>
      <Headline>systemctl: the remote control for services</Headline>
      <At x={280} y={100}>
        <Tag text={`$ ${s.cmd}`} mono tone="slate" w={330} h={38} />
      </At>
      <motion.g key={t} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={bouncy} style={{ x: 280, y: 170 }}>
        <Box w={330} h={56} tone={s.tone} strong />
        <circle cx={-140} cy={0} r={8} fill={`var(--${s.tone})`} stroke="var(--ink)" strokeWidth={2} />
        <text className="ill-mono" x={-122} y={5} style={{ fontWeight: 700 }}>
          nginx.service: {s.state}
        </text>
      </motion.g>
      <At x={115} y={225} delay={0.2}>
        <Card
          w={330}
          title="/etc/systemd/system/myapp.service"
          tone="violet"
          lineH={20}
          lines={['[Unit]', 'Description=My web app', '[Service]', { text: 'ExecStart=/usr/bin/python3 /opt/app/app.py', tone: 'violet' }, 'User=app', { text: 'Restart=always', tone: 'green' }, '[Install]', 'WantedBy=multi-user.target']}
        />
      </At>
    </>
  )
}

function S7Crash() {
  const t = useLoop(6, 900)
  const crashed = t === 1 || t === 2
  const restarts = t >= 3 ? 1 : 0
  const logs = [
    'Started My web app.',
    'myapp.service: Main process exited, status=1/FAILURE',
    'myapp.service: Scheduled restart job, restart counter is at 1.',
    'Started My web app.',
  ]
  const shown = t === 0 ? 1 : t === 1 ? 2 : t === 2 ? 3 : 4
  return (
    <>
      <Headline>When an app crashes, systemd restarts it</Headline>
      <At x={150} y={150}>
        <Proc name="myapp" pid={t >= 3 ? 3120 : 3001} state={crashed ? 'dead' : 'run'} />
      </At>
      <At x={400} y={150}>
        <Tag text={crashed ? 'activating (auto-restart)' : 'active (running)'} tone={crashed ? 'amber' : 'green'} filled w={210} />
      </At>
      <Txt x={400} y={196} anchor="middle" cls="ill-sub">
        restarts: {restarts}
      </Txt>
      <At x={30} y={230}>
        <g>
          <rect x={0} y={0} width={500} height={170} rx={16} fill="#1e2742" stroke="var(--ink)" strokeWidth={2.5} />
          <text x={16} y={26} style={{ fill: '#9fb0d6', fontFamily: 'var(--mono)', fontSize: 11.5 }}>
            $ journalctl -u myapp -f
          </text>
          {logs.slice(0, shown).map((l, k) => (
            <motion.text key={k} x={16} y={56 + k * 28} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} style={{ fill: l.includes('FAILURE') ? '#ff9a92' : l.includes('restart') ? '#ffd27a' : '#86efac', fontFamily: 'var(--mono)', fontSize: 11 }}>
              {l}
            </motion.text>
          ))}
        </g>
      </At>
    </>
  )
}

function S8Resources() {
  const t = useLoop(5, 1100)
  const procs = [
    { name: 'mysqld', mem: 34, tone: 'amber' as Tone },
    { name: 'nginx', mem: 6, tone: 'teal' as Tone },
    { name: 'python app', mem: 22, tone: 'sky' as Tone },
    { name: 'leaky job', mem: 42, tone: 'rose' as Tone },
  ]
  const visible = procs.slice(0, Math.min(t + 1, 4))
  const oom = t === 4
  let x = 40
  return (
    <>
      <Headline>CPU and memory are limited</Headline>
      <Txt x={40} y={110} cls="ill-label" size={14}>
        RAM: 8 GB
      </Txt>
      <rect className="ill-outline" x={40} y={122} width={480} height={60} rx={14} style={{ fill: 'var(--panel-3)' }} />
      {visible.map((p) => {
        const w = (p.mem / 100) * 480
        const px = x
        x += w
        const killed = oom && p.name === 'leaky job'
        return (
          <motion.g key={p.name} initial={{ scaleX: 0, opacity: 0 }} animate={{ scaleX: 1, opacity: killed ? 0.2 : 1 }} transition={bouncy} style={{ originX: 0 }}>
            <rect x={px + 3} y={127} width={Math.max(0, Math.min(w, 520 - px - 6) - 6)} height={50} rx={10} style={{ fill: `color-mix(in srgb, var(--${p.tone}) 55%, var(--paper))` }} stroke="var(--ink)" strokeWidth={2} />
            <text className="ill-mono" x={px + 12} y={157} style={{ fontSize: 11.5, fontWeight: 700 }}>
              {p.name}
            </text>
          </motion.g>
        )
      })}
      <At x={400} y={250} show={t === 3}>
        <Tag text="memory full!" tone="rose" filled />
      </At>
      <At x={360} y={250} show={oom}>
        <Bubble text="OOM killer: I'm stopping 'leaky job' to save the system" tone="rose" side="down" w={380} />
      </At>
      <Txt x={40} y={350} cls="ill-mono" size={12.5}>
        $ free -m        → how much RAM is used / free
      </Txt>
      <Txt x={40} y={374} cls="ill-mono" size={12.5}>
        $ uptime         → load average: 1.42, 0.98, 0.71
      </Txt>
      <Txt x={40} y={398} cls="ill-sub">
        load ≈ number of CPU cores = fully busy
      </Txt>
    </>
  )
}

const STEPS = [S0Program, S1Tree, S2Top, S3Fg, S4Signals, S5Daemons, S6Systemctl, S7Crash, S8Resources]

function ProcScene({ step }: { step: number }) {
  const Part = STEPS[step] ?? S0Program
  return (
    <Scene label="Processes and services" h={440}>
      <AnimatePresence mode="wait">
        <motion.g key={step} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
          <Part />
        </motion.g>
      </AnimatePresence>
    </Scene>
  )
}

/* ------------------------------------------------------------- playground */

type SvcState = 'active' | 'inactive' | 'failed' | 'restarting' | 'booting'

function stamp() {
  return new Date().toTimeString().slice(0, 8)
}

function SystemctlSim() {
  const [state, setState] = useState<SvcState>('active')
  const [pid, setPid] = useState(3001)
  const [enabled, setEnabled] = useState(false)
  const [restartAlways, setRestartAlways] = useState(true)
  const [restarts, setRestarts] = useState(0)
  const [since, setSince] = useState(() => Date.now())
  const [now, setNow] = useState(() => Date.now())
  const [log, setLog] = useState<{ t: string; text: string; cls?: string }[]>([{ t: stamp(), text: 'Started myapp.service - My web app.', cls: 'ok' }])
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000)
    return () => {
      clearInterval(i)
      clearTimeout(timer.current)
    }
  }, [])

  const add = (text: string, cls?: string) => setLog((l) => [...l.slice(-7), { t: stamp(), text, cls }])
  const startProc = (msg = 'Started myapp.service - My web app.') => {
    setState('active')
    setPid((p) => p + 37 + Math.floor(Math.random() * 50))
    setSince(Date.now())
    add(msg, 'ok')
  }

  const busy = state === 'restarting' || state === 'booting'

  function act(a: 'start' | 'stop' | 'restart' | 'kill' | 'reboot') {
    clearTimeout(timer.current)
    if (a === 'start') {
      if (state === 'active') add('(already running, nothing to do)')
      else startProc()
    } else if (a === 'stop') {
      if (state !== 'active') add('(already stopped)')
      else {
        setState('inactive')
        add('Stopping myapp.service… SIGTERM sent. Stopped.', 'warn')
      }
    } else if (a === 'restart') {
      add('Stopping myapp.service…', 'warn')
      startProc()
    } else if (a === 'kill') {
      if (state !== 'active') {
        add('kill: no such process', 'err')
        return
      }
      add(`myapp.service: Main process exited, code=killed, status=9/KILL`, 'err')
      if (restartAlways) {
        setState('restarting')
        timer.current = window.setTimeout(() => {
          setRestarts((r) => r + 1)
          add('myapp.service: Scheduled restart job, restart counter is at ' + (restarts + 1) + '.', 'warn')
          startProc()
        }, 2000)
      } else {
        setState('failed')
        add('myapp.service: Failed with result \'signal\'. (Restart= not set, so it stays down)', 'err')
      }
    } else {
      setState('booting')
      add('-- Reboot --', 'warn')
      timer.current = window.setTimeout(() => {
        if (enabled) startProc('Started myapp.service (enabled, so it started at boot).')
        else {
          setState('inactive')
          add('System booted. myapp is disabled, so it did NOT start.', 'err')
        }
      }, 2200)
    }
  }

  const up = Math.max(0, Math.round((now - since) / 1000))
  const active = {
    active: <span className="ok">active (running) since {up}s ago</span>,
    inactive: <span className="dim">inactive (dead)</span>,
    failed: <span className="err">failed (Result: signal)</span>,
    restarting: <span className="warn">activating (auto-restart)</span>,
    booting: <span className="warn">… system is rebooting …</span>,
  }[state]
  const dot = state === 'active' ? 'var(--green)' : state === 'failed' ? 'var(--rose)' : state === 'inactive' ? 'var(--slate)' : 'var(--amber)'

  return (
    <div className="card stage">
      <div className="toolbar">
        <button className="btn" onClick={() => act('start')} disabled={busy}>
          <Play size={16} /> start
        </button>
        <button className="btn" onClick={() => act('stop')} disabled={busy}>
          <Square size={16} /> stop
        </button>
        <button className="btn" onClick={() => act('restart')} disabled={busy}>
          <RotateCw size={16} /> restart
        </button>
        <button className="btn danger" onClick={() => act('kill')} disabled={busy}>
          <Skull size={16} /> kill -9 (crash)
        </button>
        <button className="btn" onClick={() => act('reboot')} disabled={busy}>
          <Power size={16} /> reboot server
        </button>
      </div>
      <div className="toolbar" style={{ gap: 18 }}>
        <label className="switch">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => {
              setEnabled(e.target.checked)
              add(e.target.checked ? 'Created symlink → myapp.service (enabled at boot).' : 'Removed symlink (disabled at boot).', 'dim')
            }}
          />
          enabled (start at boot)
        </label>
        <label className="switch">
          <input type="checkbox" checked={restartAlways} onChange={(e) => setRestartAlways(e.target.checked)} />
          Restart=always in unit file
        </label>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
        <div className="terminal">
          <header>
            <i />
            <i />
            <i />
            <span style={{ marginLeft: 6 }}>$ systemctl status myapp</span>
          </header>
          <div className="body" style={{ height: 'auto', minHeight: 150 }}>
            <div>
              <motion.span animate={{ scale: state === 'active' ? [1, 1.3, 1] : 1 }} transition={{ repeat: state === 'active' ? Infinity : 0, duration: 1.6 }} style={{ display: 'inline-block', color: dot }}>
                ●
              </motion.span>{' '}
              myapp.service - My web app
            </div>
            <div>
              {'     Loaded: '}
              <span className={enabled ? 'ok' : 'dim'}>{enabled ? 'enabled' : 'disabled'}</span>
              {'; Restart='}
              {restartAlways ? 'always' : 'no'}
            </div>
            <div>
              {'     Active: '}
              {active}
            </div>
            {state === 'active' && <div>{`   Main PID: ${pid} (python3)`}</div>}
            <div className="dim">{`   Restarts: ${restarts}`}</div>
          </div>
        </div>
        <div className="terminal">
          <header>
            <i />
            <i />
            <i />
            <span style={{ marginLeft: 6 }}>$ journalctl -u myapp -f</span>
          </header>
          <div className="body" style={{ height: 'auto', minHeight: 150 }}>
            <AnimatePresence initial={false}>
              {log.map((l, i) => (
                <motion.div key={l.t + l.text + i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className={l.cls}>
                  <span className="dim">{l.t} </span>
                  {l.text}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
      <div className="callout tone-sky">
        <strong>Experiments to try</strong>
        Crash it with and without <code>Restart=always</code>. Then reboot with <code>enabled</code> off, and on. <b>start</b> runs it now;{' '}
        <b>enable</b> makes it start after every reboot. You usually want both.
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ lesson */

const lesson: Lesson = {
  id: 'processes',
  title: 'Processes and services',
  track: '',
  tone: 'teal',
  icon: Cpu,
  summary: 'What runs on a server: processes and PIDs, the process tree, top, background jobs, signals and kill, services with systemd, crash restarts, logs and memory limits.',
  minutes: 14,
  story: {
    Scene: ProcScene,
    sections: [
      {
        title: 'Program vs process',
        body: (
          <>
            <p>
              A <strong>program</strong> is just a file on disk, like <code>/usr/sbin/nginx</code>. It does nothing by itself.
            </p>
            <p>
              When you run it, the operating system loads it into memory and starts executing it. That running copy is a{' '}
              <strong>process</strong>. Each process gets a unique number, the <strong>PID</strong> (process ID).
            </p>
            <p>The same program can run as many processes at once. nginx usually runs one main process plus several workers.</p>
            <Tip>A recipe (program) vs actually cooking it (process). Two cooks can follow the same recipe at the same time.</Tip>
          </>
        ),
      },
      {
        title: 'The process tree',
        body: (
          <>
            <p>
              Every process is started by another process, its <strong>parent</strong>. When you SSH in, <code>sshd</code> starts
              your <code>bash</code> shell, and every command you type becomes a child of bash.
            </p>
            <p>
              At the very top is <strong>PID 1</strong>. On almost all modern Linux servers that is <strong>systemd</strong>, which
              starts everything else at boot.
            </p>
            <Shell>{`$ ps -ef --forest | head
root     1      0  /sbin/init (systemd)
root   640      1   \\_ sshd
joel  2001    640       \\_ bash`}</Shell>
          </>
        ),
      },
      {
        title: 'Seeing what is running',
        body: (
          <>
            <ul>
              <li>
                <code>ps aux</code>: a snapshot of every process: user, PID, CPU %, memory %, and the command.
              </li>
              <li>
                <code>ps aux | grep nginx</code>: find a specific one.
              </li>
              <li>
                <code>top</code> (or the nicer <code>htop</code>): a live view sorted by CPU, refreshing every few seconds. Press{' '}
                <code>q</code> to quit.
              </li>
            </ul>
            <p>
              When a server is slow, <code>top</code> is usually the first thing you open, to see which process is eating CPU or
              memory.
            </p>
          </>
        ),
      },
      {
        title: 'Foreground and background',
        body: (
          <>
            <p>
              Normally a command runs in the <strong>foreground</strong>: your terminal waits until it finishes. Press{' '}
              <code>Ctrl+C</code> to stop it.
            </p>
            <p>
              Add <code>&amp;</code> at the end to run it in the <strong>background</strong>, so you can keep typing. <code>jobs</code>{' '}
              lists background jobs and <code>fg</code> brings one back.
            </p>
            <p>
              But background jobs still die when you log out. <code>nohup command &amp;</code> survives logout, though for anything
              important you should use a proper <strong>service</strong> (next steps).
            </p>
          </>
        ),
      },
      {
        title: 'Signals and kill',
        body: (
          <>
            <p>
              You control processes by sending them <strong>signals</strong>. Despite its name, <code>kill</code> just sends a
              signal:
            </p>
            <table className="data-table">
              <tbody>
                <tr><td>SIGTERM (15)</td><td>"Please stop." The default for kill. The app can save work and exit cleanly.</td></tr>
                <tr><td>SIGKILL (9)</td><td>"Stop now." The kernel kills it instantly. No clean-up. Last resort.</td></tr>
                <tr><td>SIGINT (2)</td><td>What Ctrl+C sends.</td></tr>
                <tr><td>SIGHUP (1)</td><td>Many daemons treat it as "reload your config".</td></tr>
              </tbody>
            </table>
            <Shell>{`$ kill 2345        # polite SIGTERM
$ kill -9 2345     # force, only if it ignores TERM
$ pkill -f app.py  # by name instead of PID`}</Shell>
          </>
        ),
      },
      {
        title: 'Services (daemons)',
        body: (
          <>
            <p>
              Servers run programs that must always be up, with nobody logged in: the web server, SSH, the database, Docker.
              These background programs are called <strong>daemons</strong> or <strong>services</strong> (that's why many end in{' '}
              <em>d</em>: sshd, mysqld).
            </p>
            <p>
              At boot, systemd reads its list of enabled services and starts them in the right order. Its job is to keep them
              running.
            </p>
          </>
        ),
      },
      {
        title: 'systemctl: managing services',
        body: (
          <>
            <Shell>{`$ systemctl status nginx         # running? since when? last logs
$ sudo systemctl start nginx     # start now
$ sudo systemctl stop nginx      # stop now
$ sudo systemctl restart nginx   # stop + start
$ sudo systemctl reload nginx    # re-read config, no downtime
$ sudo systemctl enable nginx    # start automatically at boot
$ sudo systemctl disable nginx   # don't start at boot`}</Shell>
            <p>
              Each service is described by a <strong>unit file</strong> (e.g. <code>/etc/systemd/system/myapp.service</code>):
              what command to run, as which user, and whether to restart it. After editing one, run{' '}
              <code>sudo systemctl daemon-reload</code>.
            </p>
            <Tip kind="warn"><code>start</code> ≠ <code>enable</code>. Start runs it now; enable makes it come back after a reboot. Forgetting enable is a classic "it worked until the server restarted" bug.</Tip>
          </>
        ),
      },
      {
        title: 'Crashes, restarts and logs',
        body: (
          <>
            <p>
              With <code>Restart=always</code> (or <code>on-failure</code>) in the unit file, systemd notices when the process exits
              and starts it again automatically. That is how your app survives a crash at 3 a.m.
            </p>
            <p>
              Service output goes to the <strong>journal</strong>. Read it with <code>journalctl</code>:
            </p>
            <Shell>{`$ journalctl -u myapp -n 100      # last 100 lines
$ journalctl -u myapp -f          # follow live
$ journalctl -u myapp --since "10 min ago"`}</Shell>
            <Tip kind="pro">If a service keeps restarting in a loop, the reason is almost always in the first error lines of journalctl. The same idea as Kubernetes CrashLoopBackOff.</Tip>
          </>
        ),
      },
      {
        title: 'CPU, memory and the OOM killer',
        body: (
          <>
            <p>
              Every process uses <strong>CPU</strong> (thinking time) and <strong>memory</strong> (RAM). Both are limited.
            </p>
            <ul>
              <li>
                <code>free -m</code> shows memory used and available.
              </li>
              <li>
                <code>uptime</code> shows the <strong>load average</strong> over 1, 5 and 15 minutes. Roughly: a load equal to your number
                of CPU cores means fully busy; much higher means work is queuing up.
              </li>
              <li>
                <code>nproc</code> tells you how many cores you have.
              </li>
            </ul>
            <p>
              If memory runs out completely, Linux's <strong>OOM killer</strong> (Out Of Memory) picks a big process and kills it
              to save the system. If your app "randomly dies", check <code>dmesg | grep -i oom</code>.
            </p>
          </>
        ),
      },
    ],
  },
  Playground: SystemctlSim,
  playgroundIntro: 'You manage a service called myapp. Start, stop, crash and reboot it, and watch what systemd does and logs.',
  terms: [
    { term: 'Process', def: 'A running instance of a program, with its own PID and memory.' },
    { term: 'PID', def: 'Process ID, the unique number of a process.' },
    { term: 'PID 1 / systemd', def: 'The first process; starts and supervises everything else.' },
    { term: 'Daemon / service', def: 'A background process that runs without a terminal, e.g. nginx, sshd.' },
    { term: 'Signal', def: 'A message to a process: SIGTERM (stop nicely), SIGKILL (force), SIGHUP (reload).' },
    { term: 'Unit file', def: 'A systemd config file describing how to run a service.' },
    { term: 'enable vs start', def: 'start = run now; enable = start automatically at boot.' },
    { term: 'journalctl', def: 'Reads logs collected by systemd for each service.' },
    { term: 'Load average', def: 'Average number of processes wanting CPU over 1, 5 and 15 minutes.' },
    { term: 'OOM killer', def: 'Kernel feature that kills a process when memory runs out.' },
  ],
  quiz: [
    {
      q: 'What is the difference between a program and a process?',
      options: ['No difference', 'A program is a file on disk; a process is a running copy of it', 'A process is a file', 'Programs only run on Windows'],
      answer: 1,
      why: 'The program is the file; running it creates a process with its own PID.',
    },
    {
      q: 'Which signal should you try first to stop a process?',
      options: ['SIGKILL (9)', 'SIGTERM (15)', 'SIGHUP (1)', 'None'],
      answer: 1,
      why: 'SIGTERM lets the app clean up. Use SIGKILL only if it ignores TERM.',
    },
    {
      q: 'Your service runs fine but is gone after every reboot. What did you forget?',
      options: ['systemctl start', 'systemctl enable', 'systemctl reload', 'kill -9'],
      answer: 1,
      why: 'enable creates the link that makes systemd start it at boot.',
    },
    {
      q: 'Where do you look for why a systemd service keeps failing?',
      options: ['/tmp', 'journalctl -u <service>', 'ls -la', 'df -h'],
      answer: 1,
      why: 'journalctl shows the service’s output, including the error that made it exit.',
    },
  ],
  interview: [
    {
      q: 'A server is slow. How do you investigate?',
      a: 'uptime for load average, top/htop to see which process uses CPU or memory, free -m for memory and swap, df -h for full disks, iostat/vmstat for disk I/O, then check the app’s logs (journalctl -u app) around the time it slowed.',
    },
    {
      q: 'kill vs kill -9?',
      a: 'kill sends SIGTERM, asking the process to exit gracefully and clean up. kill -9 sends SIGKILL, which the process cannot catch; the kernel removes it immediately, which can leave corrupted files or locks. Try TERM first.',
    },
    {
      q: 'How would you run your app as a service on a Linux VM?',
      a: 'Write a systemd unit in /etc/systemd/system/app.service with ExecStart, User, WorkingDirectory, Environment and Restart=always. Then systemctl daemon-reload, systemctl enable --now app, and check with systemctl status app and journalctl -u app.',
    },
  ],
  commands: [
    { cmd: 'ps aux | grep nginx', note: 'Find a process and its PID' },
    { cmd: 'top   (or htop)', note: 'Live CPU and memory per process' },
    { cmd: 'kill <PID>  /  kill -9 <PID>', note: 'Stop politely / force' },
    { cmd: 'sudo systemctl status|start|stop|restart|enable nginx', note: 'Manage a service' },
    { cmd: 'journalctl -u nginx -f', note: 'Follow a service’s logs' },
    { cmd: 'free -m ; uptime ; nproc', note: 'Memory, load, CPU cores' },
  ],
}

export default lesson
