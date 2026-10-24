import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { SquareTerminal } from 'lucide-react'
import type { Lesson } from '../types'
import { Shell, Tip } from '../../components/Story'
import { At, Box, Card, FileIcon, Link, Mover, Scene, Tag, Txt } from '../../components/Illustrations'
import { bouncy, spring } from '../../lib/motion'
import type { Tone } from '../../components/Diagram'
import { useLoop } from '../../lib/useLoop'

function Headline({ children }: { children: string }) {
  return (
    <Txt x={280} y={46} cls="ill-label" anchor="middle" size={17}>
      {children}
    </Txt>
  )
}

/** Dark terminal panel drawn in SVG. */
function Term({ x, y, w, h, lines, title = 'bash' }: { x: number; y: number; w: number; h: number; lines: { text: string; c?: string }[]; title?: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect width={w} height={h} rx={14} fill="#1e2742" stroke="var(--ink)" strokeWidth={2.5} />
      <text x={14} y={20} style={{ fill: '#9fb0d6', fontFamily: 'var(--mono)', fontSize: 11 }}>
        {title}
      </text>
      <AnimatePresence initial={false}>
        {lines.map((l, k) => (
          <motion.text
            key={k + l.text}
            x={14}
            y={46 + k * 21}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            style={{ fill: l.c ?? '#dfe6f5', fontFamily: 'var(--mono)', fontSize: 12, whiteSpace: 'pre' }}
          >
            {l.text}
          </motion.text>
        ))}
      </AnimatePresence>
    </g>
  )
}

/* ------------------------------------------------------------------ scenes */

const SCRIPT = ['#!/bin/bash', 'echo "Backing up..."', 'mkdir -p ~/backup', 'cp ~/notes.txt ~/backup/', 'echo "Done!"']

function S0Script() {
  const t = useLoop(SCRIPT.length + 2, 900)
  const out = [
    { text: '$ chmod +x backup.sh', c: '#7cc4ff' },
    { text: '$ ./backup.sh', c: '#7cc4ff' },
    ...(t >= 2 ? [{ text: 'Backing up...' }] : []),
    ...(t >= 5 ? [{ text: 'Done!', c: '#86efac' }] : []),
  ]
  return (
    <>
      <Headline>A script = commands saved in a file</Headline>
      <At x={30} y={80}>
        <Card w={250} title="backup.sh" tone="green" lineH={26} highlight={Math.min(t, SCRIPT.length) - 1} lines={SCRIPT.map((l, i) => ({ text: l, tone: i === 0 ? 'violet' : undefined }))} />
      </At>
      <Term x={300} y={80} w={240} h={200} lines={out} />
      <Txt x={30} y={300} cls="ill-text">
        Runs top to bottom, one line at a time.
      </Txt>
      <Txt x={30} y={324} cls="ill-mono" size={12}>
        #!/bin/bash   ← "shebang": run me with bash
      </Txt>
      <Txt x={30} y={346} cls="ill-mono" size={12}>
        chmod +x      ← allow it to be executed
      </Txt>
      <Txt x={30} y={368} cls="ill-mono" size={12}>
        ./backup.sh   ← run it from this folder
      </Txt>
    </>
  )
}

function Jar({ name, value, tone = 'amber' as Tone }: { name: string; value: string; tone?: Tone }) {
  return (
    <g>
      <rect className="ill-outline" x={-60} y={-30} width={120} height={60} rx={14} style={{ fill: `color-mix(in srgb, var(--${tone}) 30%, var(--paper))` }} />
      <rect className="ill-outline" x={-44} y={-44} width={88} height={20} rx={6} style={{ fill: `var(--${tone})`, strokeWidth: 2 }} />
      <text className="ill-mono" y={-29} textAnchor="middle" style={{ fontWeight: 700, fontSize: 12, fill: '#1e2742' }}>
        {name}
      </text>
      <text className="ill-label" y={8} style={{ fontSize: 15, fontFamily: 'var(--mono)' }}>
        "{value}"
      </text>
    </g>
  )
}

function S1Vars() {
  const t = useLoop(3, 1500)
  return (
    <>
      <Headline>Variables: labelled boxes that hold text</Headline>
      <At x={280} y={100}>
        <Tag text='NAME="joel"   (no spaces around =)' mono tone="slate" w={330} />
      </At>
      <At x={140} y={200} delay={0.2} t={bouncy}>
        <Jar name="NAME" value="joel" />
      </At>
      <At x={400} y={200} show={t >= 1}>
        <Tag text='echo "Hello $NAME"' mono tone="sky" w={200} />
      </At>
      <Mover x={t >= 2 ? 380 : 140} y={t >= 2 ? 240 : 200} show={t >= 1}>
        <Tag text="joel" mono tone="amber" filled w={60} h={26} />
      </Mover>
      <At x={400} y={290} show={t >= 2}>
        <Tag text="Hello joel" mono tone="green" filled w={150} />
      </At>
      <Txt x={40} y={350} cls="ill-label" size={14}>
        Already set for you (environment variables):
      </Txt>
      {[
        ['$HOME', '/home/joel'],
        ['$USER', 'joel'],
        ['$PATH', 'where commands are found'],
      ].map(([k, v], i) => (
        <At key={k} x={100 + i * 180} y={390} delay={0.3 + i * 0.1}>
          <Tag text={`${k} → ${v}`} mono tone="violet" w={170} size={11} />
        </At>
      ))}
    </>
  )
}

function S2Args() {
  return (
    <>
      <Headline>Arguments and command substitution</Headline>
      <At x={280} y={100}>
        <Tag text="$ ./deploy.sh staging v2" mono tone="sky" size={15} h={40} w={280} />
      </At>
      {[
        ['$0', './deploy.sh'],
        ['$1', 'staging'],
        ['$2', 'v2'],
        ['$#', '2 (count)'],
      ].map(([k, v], i) => (
        <At key={k} x={100 + i * 120} y={180} delay={0.2 + i * 0.12} t={bouncy}>
          <Box w={106} h={58} tone={i === 0 ? 'slate' : i === 3 ? 'violet' : 'amber'} strong />
          <text className="ill-label" y={-4} style={{ fontSize: 16, fontFamily: 'var(--mono)' }}>
            {k}
          </text>
          <text className="ill-sub" y={15}>
            {v}
          </text>
        </At>
      ))}
      <At x={280} y={290} delay={0.7}>
        <Tag text="TODAY=$(date +%F)" mono tone="slate" w={230} />
      </At>
      <Link d="M280 310 V340" arrow delay={0.9} />
      <At x={280} y={370} delay={1}>
        <Tag text='TODAY="2026-10-24"' mono tone="green" filled w={230} />
      </At>
      <Txt x={280} y={418} anchor="middle" cls="ill-sub" delay={1.1}>
        $( ) runs a command and puts its output in place
      </Txt>
    </>
  )
}

const EXITS = [
  { cmd: 'ls /etc', code: 0 },
  { cmd: 'ls /nope', code: 2 },
  { cmd: 'mkdir app && cd app', code: 0, note: '&& → 2nd runs only if 1st succeeded' },
  { cmd: 'ping -c1 db || echo "DB down!"', code: 1, note: '|| → 2nd runs only if 1st failed' },
]

function S3Exit() {
  const t = useLoop(EXITS.length, 1700)
  return (
    <>
      <Headline>Every command ends with an exit code</Headline>
      <At x={170} y={110}>
        <Tag text="0 = success" tone="green" filled w={130} />
      </At>
      <At x={390} y={110}>
        <Tag text="1–255 = failure" tone="rose" filled w={150} />
      </At>
      {EXITS.map((e, i) => (
        <motion.g key={e.cmd} animate={{ opacity: i === t ? 1 : 0.35, x: i === t ? 6 : 0 }} transition={bouncy}>
          <text className="ill-mono" x={40} y={186 + i * 54} style={{ fontSize: 13, fontWeight: 700 }}>
            $ {e.cmd}
          </text>
          <g transform={`translate(${500} ${181 + i * 54})`}>
            <circle r={15} fill={e.code === 0 ? 'var(--green)' : 'var(--rose)'} stroke="var(--ink)" strokeWidth={2} />
            <text textAnchor="middle" y={5} style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 13, fill: '#1e2742' }}>
              {e.code}
            </text>
          </g>
          {e.note && (
            <text className="ill-sub" x={40} y={204 + i * 54} style={{ textAnchor: 'start' }}>
              {e.note}
            </text>
          )}
        </motion.g>
      ))}
      <Txt x={40} y={410} cls="ill-mono" size={12}>
        echo $?  → prints the last exit code · set -e → stop on first error
      </Txt>
    </>
  )
}

function S4If() {
  const t = useLoop(2, 2600)
  const exists = t === 0
  return (
    <>
      <Headline>if: make decisions</Headline>
      <At x={30} y={80}>
        <Card w={260} lineH={22} tone="green" title="deploy.sh" lines={['if [ -f config.yml ]; then', '  echo "Deploying..."', 'else', '  echo "No config!"', '  exit 1', 'fi']} highlight={exists ? 1 : 3} />
      </At>
      <At x={420} y={130}>
        <g>
          <path className="ill-outline" d="M0 -40 L80 0 L0 40 L-80 0 Z" style={{ fill: 'color-mix(in srgb, var(--amber) 40%, var(--paper))' }} />
          <text className="ill-mono" textAnchor="middle" y={5} style={{ fontSize: 11.5, fontWeight: 700 }}>
            config.yml?
          </text>
        </g>
      </At>
      <Link d="M380 160 Q330 220 340 260" arrow color="var(--green)" />
      <Link d="M460 160 Q510 220 500 260" arrow color="var(--rose)" />
      <Txt x={330} y={210} cls="ill-sub" anchor="end">
        yes
      </Txt>
      <Txt x={510} y={210} cls="ill-sub">
        no
      </Txt>
      <At x={340} y={290}>
        <Tag text="Deploying..." tone="green" filled={exists} w={120} />
      </At>
      <At x={490} y={290}>
        <Tag text="exit 1" tone="rose" filled={!exists} w={90} />
      </At>
      <Mover x={exists ? 340 : 490} y={exists ? 250 : 250}>
        <circle r={9} fill="var(--amber)" stroke="var(--ink)" strokeWidth={2} />
      </Mover>
      <Txt x={30} y={352} cls="ill-mono" size={12}>
        -f file exists     -d dir exists     -z "$X" is empty
      </Txt>
      <Txt x={30} y={376} cls="ill-mono" size={12}>
        "$A" == "$B"       $N -eq 5    -gt  -lt  (numbers)
      </Txt>
      <Txt x={30} y={406} cls="ill-sub">
        spaces inside [ ] matter: [ -f x ] works, [-f x] doesn't
      </Txt>
    </>
  )
}

const LOGS = ['app.log', 'error.log', 'access.log', 'debug.log']

function S5Loop() {
  const t = useLoop(LOGS.length + 1, 1000)
  return (
    <>
      <Headline>for loops: repeat for each item</Headline>
      <At x={30} y={80}>
        <Card w={300} lineH={24} tone="green" title="compress.sh" lines={['for f in *.log; do', '  echo "Compressing $f"', '  gzip "$f"', 'done']} highlight={t < LOGS.length ? 2 : 3} />
      </At>
      {LOGS.map((l, i) => {
        const done = t > i
        return (
          <At key={l} x={110 + i * 110} y={290} delay={i * 0.06}>
            <motion.g animate={{ scale: t === i ? 1.25 : 1, y: t === i ? -8 : 0 }} transition={bouncy}>
              <FileIcon tone={done ? 'green' : 'sky'} title={done ? `${l}.gz` : l} />
            </motion.g>
          </At>
        )
      })}
      <Mover x={110 + Math.min(t, LOGS.length - 1) * 110} y={240} show={t < LOGS.length}>
        <Tag text="$f" mono tone="amber" filled w={44} h={26} />
      </Mover>
      <Txt x={280} y={380} anchor="middle" cls="ill-text" show={t === LOGS.length}>
        4 files done with 4 lines of code
      </Txt>
    </>
  )
}

const RAW = [
  '49.36.1.8 "GET /cart" 500',
  '10.0.0.7 "GET /" 200',
  '49.36.1.8 "POST /pay" 500',
  '66.2.9.1 "GET /cart" 500',
  '10.0.0.7 "GET /img" 200',
  '49.36.1.8 "GET /cart" 500',
]

const STAGES: { cmd: string; out: string[] }[] = [
  { cmd: 'cat access.log', out: RAW },
  { cmd: 'grep " 500"', out: RAW.filter((l) => l.endsWith(' 500')) },
  { cmd: "awk '{print $1}'", out: ['49.36.1.8', '49.36.1.8', '66.2.9.1', '49.36.1.8'] },
  { cmd: 'sort', out: ['49.36.1.8', '49.36.1.8', '49.36.1.8', '66.2.9.1'] },
  { cmd: 'uniq -c', out: ['3 49.36.1.8', '1 66.2.9.1'] },
]

function S6Pipes() {
  const t = useLoop(STAGES.length + 1, 1500)
  const s = Math.min(t, STAGES.length - 1)
  return (
    <>
      <Headline>Pipes |  connect small tools into a machine</Headline>
      {STAGES.map((st, i) => (
        <g key={st.cmd}>
          <At x={64 + i * 108} y={100} delay={i * 0.06}>
            <motion.g animate={{ scale: i === s ? 1.08 : 1 }} transition={bouncy}>
              <Box w={102} h={40} tone={i === s ? 'amber' : i < s ? 'green' : 'slate'} strong={i <= s} />
              <text className="ill-mono" y={4} textAnchor="middle" style={{ fontSize: 9, fontWeight: 700 }}>
                {st.cmd}
              </text>
            </motion.g>
          </At>
          {i < STAGES.length - 1 && (
            <text className="ill-label" x={118 + i * 108} y={106} textAnchor="middle" style={{ fontSize: 18 }}>
              |
            </text>
          )}
        </g>
      ))}
      <rect className="ill-outline" x={60} y={150} width={440} height={240} rx={16} style={{ fill: '#1e2742' }} />
      <AnimatePresence initial={false}>
        {STAGES[s].out.map((l, k) => (
          <motion.text
            key={l + k}
            layout
            initial={{ opacity: 0, x: 90 }}
            animate={{ opacity: 1, x: 80, y: 184 + k * 30 }}
            exit={{ opacity: 0, x: 120 }}
            transition={spring}
            style={{ fill: s >= 4 ? '#86efac' : '#dfe6f5', fontFamily: 'var(--mono)', fontSize: 13.5 }}
          >
            {l}
          </motion.text>
        ))}
      </AnimatePresence>
      <Txt x={280} y={420} anchor="middle" cls="ill-sub">
        output of each command becomes input of the next
      </Txt>
    </>
  )
}

function S7Redirect() {
  const t = useLoop(3, 1500)
  return (
    <>
      <Headline>Redirection: send output where you want</Headline>
      <At x={120} y={220}>
        <Box w={140} h={70} tone="teal" strong title="./build.sh" />
      </At>
      <Link d="M190 200 H330" arrow color="var(--green)" width={3} />
      <Link d="M190 240 Q260 300 330 300" arrow color="var(--rose)" width={3} />
      <Txt x={260} y={190} anchor="middle" cls="ill-sub">
        stdout (1): normal output
      </Txt>
      <Txt x={250} y={318} anchor="middle" cls="ill-sub">
        stderr (2): errors
      </Txt>
      <At x={420} y={200} show={t >= 0}>
        <FileIcon tone="green" title="> build.log" />
      </At>
      <At x={420} y={300} show={t >= 1}>
        <FileIcon tone="rose" title="2> errors.log" />
      </At>
      <At x={420} y={110} show={t >= 2}>
        <g>
          <ellipse cx={0} cy={0} rx={34} ry={14} fill="var(--ink)" />
          <text className="ill-mono" y={34} textAnchor="middle" style={{ fontSize: 11.5 }}>
            /dev/null (black hole)
          </text>
        </g>
      </At>
      <Txt x={40} y={380} cls="ill-mono" size={12}>
        cmd &gt; out.log 2&gt;&amp;1   → both into one file
      </Txt>
      <Txt x={40} y={404} cls="ill-mono" size={12}>
        cmd &gt; /dev/null       → throw output away
      </Txt>
    </>
  )
}

const CRON = [
  { f: '0', n: 'minute' },
  { f: '2', n: 'hour' },
  { f: '*', n: 'day' },
  { f: '*', n: 'month' },
  { f: '*', n: 'weekday' },
]

function S8Cron() {
  const t = useLoop(4, 1200)
  return (
    <>
      <Headline>cron: run scripts on a schedule</Headline>
      {CRON.map((c, i) => (
        <At key={i} x={80 + i * 70} y={120} delay={i * 0.08} t={bouncy}>
          <Box w={56} h={52} tone="violet" strong />
          <text className="ill-label" y={7} style={{ fontSize: 22, fontFamily: 'var(--mono)' }}>
            {c.f}
          </text>
          <text className="ill-sub" y={44} style={{ fontSize: 10.5 }}>
            {c.n}
          </text>
        </At>
      ))}
      <Txt x={420} y={116} cls="ill-mono" size={13}>
        /opt/backup.sh
      </Txt>
      <Txt x={420} y={136} cls="ill-sub">
        = every day at 02:00
      </Txt>
      <At x={150} y={300}>
        <g>
          <circle className="ill-outline" r={66} style={{ fill: 'var(--paper)' }} />
          {Array.from({ length: 12 }, (_, k) => (
            <line key={k} x1={0} y1={-56} x2={0} y2={-50} stroke="var(--ink)" strokeWidth={2} transform={`rotate(${k * 30})`} />
          ))}
          <motion.line x1={0} y1={0} x2={0} y2={-34} stroke="var(--ink)" strokeWidth={4} strokeLinecap="round" animate={{ rotate: t >= 3 ? 60 : 30 + t * 10 }} transition={bouncy} />
          <motion.line x1={0} y1={0} x2={0} y2={-50} stroke="var(--rose)" strokeWidth={2.5} strokeLinecap="round" animate={{ rotate: t >= 3 ? 0 : 280 + t * 25 }} transition={bouncy} />
          <circle r={5} fill="var(--ink)" />
        </g>
      </At>
      <At x={390} y={300} show={t >= 3}>
        <Tag text="02:00 → backup.sh runs ✓" tone="green" filled w={220} />
      </At>
      <Txt x={260} y={410} cls="ill-mono" size={12}>
        crontab -e   → edit your schedule
      </Txt>
    </>
  )
}

const STEPS = [S0Script, S1Vars, S2Args, S3Exit, S4If, S5Loop, S6Pipes, S7Redirect, S8Cron]

function BashScene({ step }: { step: number }) {
  const Part = STEPS[step] ?? S0Script
  return (
    <Scene label="Bash scripting" h={440}>
      <AnimatePresence mode="wait">
        <motion.g key={step} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
          <Part />
        </motion.g>
      </AnimatePresence>
    </Scene>
  )
}

/* ------------------------------------------------------------- playground */

const ACCESS_LOG = [
  '49.36.12.8 - - [24/Oct/2026:10:01:02] "GET /cart HTTP/1.1" 500 512',
  '10.0.0.7 - - [24/Oct/2026:10:01:03] "GET / HTTP/1.1" 200 5120',
  '49.36.12.8 - - [24/Oct/2026:10:01:05] "POST /pay HTTP/1.1" 500 230',
  '66.249.66.1 - - [24/Oct/2026:10:01:06] "GET /robots.txt HTTP/1.1" 404 0',
  '157.32.4.20 - - [24/Oct/2026:10:01:08] "GET /cart HTTP/1.1" 500 512',
  '10.0.0.7 - - [24/Oct/2026:10:01:09] "GET /img/logo.png HTTP/1.1" 200 8100',
  '49.36.12.8 - - [24/Oct/2026:10:01:11] "GET /cart HTTP/1.1" 500 512',
  '157.32.4.20 - - [24/Oct/2026:10:01:12] "GET /login HTTP/1.1" 200 2048',
  '66.249.66.1 - - [24/Oct/2026:10:01:14] "GET /old-page HTTP/1.1" 404 0',
  '49.36.12.8 - - [24/Oct/2026:10:01:15] "GET /cart HTTP/1.1" 500 512',
]

type StageId = 'grep' | 'awk' | 'sort' | 'uniq' | 'sortn' | 'head'

function PipelineLab() {
  const [pattern, setPattern] = useState(' 500 ')
  const [field, setField] = useState(1)
  const [on, setOn] = useState<Record<StageId, boolean>>({ grep: true, awk: true, sort: true, uniq: true, sortn: true, head: false })

  const stages: { id: StageId; label: string; fn: (l: string[]) => string[] }[] = [
    { id: 'grep', label: `grep "${pattern}"`, fn: (l) => l.filter((x) => x.includes(pattern)) },
    { id: 'awk', label: `awk '{print $${field}}'`, fn: (l) => l.map((x) => x.split(/\s+/)[field - 1] ?? '') },
    { id: 'sort', label: 'sort', fn: (l) => [...l].sort() },
    {
      id: 'uniq',
      label: 'uniq -c',
      fn: (l) => {
        const out: string[] = []
        let prev: string | null = null
        let n = 0
        for (const x of [...l, '\u0000']) {
          if (x === prev) n++
          else {
            if (prev !== null) out.push(`${String(n).padStart(4)} ${prev}`)
            prev = x
            n = 1
          }
        }
        return out
      },
    },
    { id: 'sortn', label: 'sort -nr', fn: (l) => [...l].sort((a, b) => parseFloat(b) - parseFloat(a) || a.localeCompare(b)) },
    { id: 'head', label: 'head -3', fn: (l) => l.slice(0, 3) },
  ]

  let output = ACCESS_LOG
  const parts = ['cat access.log']
  for (const s of stages) {
    if (!on[s.id]) continue
    output = s.fn(output)
    parts.push(s.label)
  }
  const cmd = parts.join(' | ')

  return (
    <div className="card stage">
      <div className="toolbar">
        <span className="label">Stages</span>
        {stages.map((s) => (
          <button key={s.id} className="btn" aria-pressed={on[s.id]} onClick={() => setOn((o) => ({ ...o, [s.id]: !o[s.id] }))} style={{ fontFamily: 'var(--mono)', fontSize: 12.5 }}>
            {s.label}
          </button>
        ))}
      </div>
      <div className="toolbar">
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14 }}>
          grep pattern
          <input className="text-input" value={pattern} onChange={(e) => setPattern(e.target.value)} style={{ width: 120 }} aria-label="grep pattern" />
        </label>
        <span className="muted" style={{ fontSize: 13 }}>
          try: <code> 404 </code> <code>POST</code> <code>/cart</code>
        </span>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, marginLeft: 'auto' }}>
          awk field
          <input type="range" min={1} max={7} step={1} value={field} onChange={(e) => setField(Number(e.target.value))} style={{ width: 100 }} />
          <code>${field}</code>
        </label>
      </div>
      <div className="terminal">
        <header>
          <i />
          <i />
          <i />
          <span style={{ marginLeft: 6 }}>bash</span>
        </header>
        <div className="body" style={{ height: 260 }}>
          <div className="cmdline" style={{ marginBottom: 6 }}>
            $ {cmd}
          </div>
          <AnimatePresence initial={false}>
            {output.map((l, i) => (
              <motion.div key={l + i} layout initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={spring}>
                {l || ' '}
              </motion.div>
            ))}
          </AnimatePresence>
          {output.length === 0 && <div className="dim">(no output: nothing matched)</div>}
        </div>
      </div>
      <div className="callout tone-amber">
        <strong>The classic incident question</strong>
        "Which IP is causing the most 500 errors?" is exactly the default pipeline above: filter, extract a field, sort, count, sort
        by count. Add <code>head -3</code> for the top three.
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ lesson */

const lesson: Lesson = {
  id: 'bash',
  title: 'Bash scripting',
  track: '',
  tone: 'green',
  icon: SquareTerminal,
  summary: 'Automate anything: scripts, variables, arguments, exit codes, if and loops, pipes, redirection, and scheduling jobs with cron.',
  minutes: 15,
  story: {
    Scene: BashScene,
    sections: [
      {
        title: 'Scripts: commands in a file',
        body: (
          <>
            <p>
              The program that reads your commands in a terminal is called the <strong>shell</strong>. On Linux it's usually{' '}
              <strong>bash</strong>.
            </p>
            <p>
              A <strong>script</strong> is just a text file containing commands. Bash runs them top to bottom, exactly as if you typed
              them. DevOps is about automation, and scripts are the simplest automation there is.
            </p>
            <Shell>{`$ nano backup.sh          # write the file
$ chmod +x backup.sh      # make it executable
$ ./backup.sh             # run it`}</Shell>
            <p>
              The first line, <code>#!/bin/bash</code>, is the <strong>shebang</strong>: it tells Linux which program should run the
              file. Lines starting with <code>#</code> are comments.
            </p>
          </>
        ),
      },
      {
        title: 'Variables',
        body: (
          <>
            <p>
              A <strong>variable</strong> stores a value under a name. Set it with <code>NAME="joel"</code> (no spaces around{' '}
              <code>=</code>!) and read it with a dollar sign: <code>$NAME</code>.
            </p>
            <Shell>{`NAME="joel"
echo "Hello $NAME"        # Hello joel
echo 'Hello $NAME'        # Hello $NAME  (single quotes: no expansion)`}</Shell>
            <p>
              <strong>Environment variables</strong> are set for you: <code>$HOME</code>, <code>$USER</code>, and{' '}
              <code>$PATH</code> (the list of folders Linux searches for commands). <code>export VAR=value</code> passes a variable to
              programs you start. Apps often read config like database URLs from environment variables.
            </p>
            <Tip kind="pro">Always wrap variables in double quotes: <code>"$FILE"</code>. Otherwise a filename with a space breaks your script.</Tip>
          </>
        ),
      },
      {
        title: 'Arguments and $( )',
        body: (
          <>
            <p>Scripts can take input when you run them. Inside the script:</p>
            <table className="data-table">
              <tbody>
                <tr><td>$1, $2…</td><td>the first, second… argument</td></tr>
                <tr><td>$#</td><td>how many arguments were given</td></tr>
                <tr><td>$@</td><td>all arguments</td></tr>
                <tr><td>$0</td><td>the script's own name</td></tr>
              </tbody>
            </table>
            <p>
              <strong>Command substitution</strong> <code>$(command)</code> runs a command and inserts its output:
            </p>
            <Shell>{`TODAY=$(date +%F)                 # 2026-10-24
tar -czf "backup-$TODAY.tar.gz" ~/app`}</Shell>
          </>
        ),
      },
      {
        title: 'Exit codes, && and ||',
        body: (
          <>
            <p>
              Every command finishes with an <strong>exit code</strong>: <code>0</code> means success, anything else means failure.{' '}
              <code>echo $?</code> shows the last one. CI/CD pipelines use exactly this to decide pass or fail.
            </p>
            <ul>
              <li>
                <code>a &amp;&amp; b</code>: run b only if a succeeded.
              </li>
              <li>
                <code>a || b</code>: run b only if a failed.
              </li>
            </ul>
            <p>
              Put <code>set -euo pipefail</code> near the top of scripts: stop at the first error, treat unset variables as errors,
              and catch failures inside pipes. It prevents scripts from blindly continuing after something broke.
            </p>
          </>
        ),
      },
      {
        title: 'if: making decisions',
        body: (
          <>
            <Shell>{`if [ -f config.yml ]; then
  echo "Deploying..."
elif [ -d config ]; then
  echo "Found a config folder"
else
  echo "No config!" >&2
  exit 1
fi`}</Shell>
            <p>Common tests inside the brackets:</p>
            <table className="data-table">
              <tbody>
                <tr><td>-f / -d</td><td>file / directory exists</td></tr>
                <tr><td>-z "$X"</td><td>variable is empty</td></tr>
                <tr><td>"$A" == "$B"</td><td>strings are equal</td></tr>
                <tr><td>-eq -ne -gt -lt</td><td>number comparisons</td></tr>
              </tbody>
            </table>
            <Tip kind="warn">The spaces inside <code>[ ]</code> are required. <code>[ -f x ]</code> works; <code>[-f x]</code> is an error.</Tip>
          </>
        ),
      },
      {
        title: 'Loops',
        body: (
          <>
            <Shell>{`for f in *.log; do        # every .log file here
  gzip "$f"
done

for server in web1 web2 web3; do
  ssh "$server" uptime
done

while read -r line; do     # each line of a file
  echo "User: $line"
done < users.txt`}</Shell>
            <p>Loops turn "do this on 50 servers" or "for every file" into a few lines.</p>
          </>
        ),
      },
      {
        title: 'Pipes: the superpower',
        body: (
          <>
            <p>
              The pipe <code>|</code> sends one command's output into the next command's input. Linux has many small tools that each
              do one thing; pipes chain them into something powerful.
            </p>
            <Shell>{`$ cat access.log | grep " 500" | awk '{print $1}' | sort | uniq -c | sort -nr | head -3
      4 49.36.12.8
      1 157.32.4.20`}</Shell>
            <table className="data-table">
              <tbody>
                <tr><td>grep</td><td>keep lines that match</td></tr>
                <tr><td>awk '{'{print $1}'}'</td><td>pick a column (fields split by spaces)</td></tr>
                <tr><td>sort / uniq -c</td><td>sort, then count repeated lines</td></tr>
                <tr><td>head / tail</td><td>first / last lines</td></tr>
                <tr><td>wc -l</td><td>count lines</td></tr>
              </tbody>
            </table>
          </>
        ),
      },
      {
        title: 'Redirection',
        body: (
          <>
            <p>
              A program has two output streams: <strong>stdout</strong> (1, normal output) and <strong>stderr</strong> (2,
              errors). You can send each wherever you want:
            </p>
            <table className="data-table">
              <tbody>
                <tr><td>&gt; file</td><td>stdout to a file (overwrite)</td></tr>
                <tr><td>&gt;&gt; file</td><td>append</td></tr>
                <tr><td>2&gt; err.log</td><td>errors to a file</td></tr>
                <tr><td>&gt; all.log 2&gt;&amp;1</td><td>both into one file</td></tr>
                <tr><td>&gt; /dev/null</td><td>throw it away</td></tr>
                <tr><td>&lt; file</td><td>read input from a file</td></tr>
              </tbody>
            </table>
          </>
        ),
      },
      {
        title: 'Scheduling with cron',
        body: (
          <>
            <p>
              <strong>cron</strong> runs commands on a schedule. Edit your list with <code>crontab -e</code>. Each line has five time
              fields, then the command:
            </p>
            <Shell>{`# minute hour day month weekday   command
  0      2    *   *     *         /opt/backup.sh >> /var/log/backup.log 2>&1
  */5    *    *   *     *         /opt/health-check.sh
  0      9    *   *     1         /opt/weekly-report.sh   # Mondays 09:00`}</Shell>
            <p>
              A <code>*</code> means "every". <code>*/5</code> means "every 5". Tip: crontab.guru explains any schedule in plain
              English. Always redirect cron output to a log, or you'll never know why a job failed.
            </p>
          </>
        ),
      },
    ],
  },
  Playground: PipelineLab,
  playgroundIntro: 'A real web server access log. Turn pipeline stages on and off, change the grep pattern and the awk column, and watch the output change.',
  terms: [
    { term: 'Shell / bash', def: 'The program that reads and runs your commands.' },
    { term: 'Script', def: 'A file of commands run top to bottom.' },
    { term: 'Shebang', def: '#!/bin/bash on line 1: which interpreter runs the script.' },
    { term: 'Variable', def: 'A named value: NAME="x", read with $NAME.' },
    { term: 'Environment variable', def: 'A variable passed to programs, e.g. $HOME, $PATH, DATABASE_URL.' },
    { term: 'Exit code', def: '0 = success, non-zero = failure. $? holds the last one.' },
    { term: 'Pipe ( | )', def: 'Sends one command’s output into the next command.' },
    { term: 'stdout / stderr', def: 'Normal output (1) and error output (2).' },
    { term: 'cron', def: 'Scheduler that runs commands at set times.' },
  ],
  quiz: [
    {
      q: 'What is wrong with `NAME = "joel"`?',
      options: ['Nothing', 'Spaces around = are not allowed in bash', 'Names must be lowercase', 'Needs a $'],
      answer: 1,
      why: 'Bash treats it as running a command called NAME. Write NAME="joel".',
    },
    {
      q: 'What does `make build && make deploy` do if the build fails?',
      options: ['Deploys anyway', 'Does not deploy', 'Retries the build', 'Deletes the build'],
      answer: 1,
      why: '&& only runs the second command when the first exits with 0.',
    },
    {
      q: 'What does `0 2 * * *` mean in cron?',
      options: ['Every 2 minutes', 'Every day at 02:00', 'On the 2nd of each month', 'Every 2 hours'],
      answer: 1,
      why: 'Fields: minute=0, hour=2, any day, any month, any weekday.',
    },
    {
      q: 'Which command sends both normal output and errors into out.log?',
      options: ['cmd > out.log', 'cmd 2> out.log', 'cmd > out.log 2>&1', 'cmd | out.log'],
      answer: 2,
      why: '> sends stdout to the file, then 2>&1 sends stderr to the same place.',
    },
  ],
  interview: [
    {
      q: 'Find the top 5 IPs hitting your server from an access log.',
      a: "awk '{print $1}' access.log | sort | uniq -c | sort -nr | head -5. Add grep first to filter, e.g. only 500 errors.",
    },
    {
      q: 'How do you make a bash script safer?',
      a: 'set -euo pipefail, quote variables ("$x"), check inputs and required files with if, use absolute paths, log output, test with shellcheck, and make it idempotent so running it twice is safe.',
    },
    {
      q: 'Write a script that alerts when disk usage is over 80%.',
      a: "USAGE=$(df / --output=pcent | tail -1 | tr -dc '0-9'); if [ \"$USAGE\" -gt 80 ]; then echo \"Disk at $USAGE%\" | mail -s alert ops@x.com; fi. Schedule it with cron every 5 minutes.",
    },
  ],
  commands: [
    { cmd: 'chmod +x script.sh && ./script.sh', note: 'Make executable and run' },
    { cmd: 'bash -x script.sh', note: 'Debug: print each command as it runs' },
    { cmd: 'echo $?', note: 'Exit code of the last command' },
    { cmd: "grep ERROR app.log | wc -l", note: 'Count error lines' },
    { cmd: 'crontab -e  /  crontab -l', note: 'Edit / list scheduled jobs' },
    { cmd: 'shellcheck script.sh', note: 'Lint a script for common bugs' },
  ],
}

export default lesson
