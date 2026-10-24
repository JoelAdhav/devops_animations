import { useEffect, useReducer, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { HeartPulse, Pause, Play, Scale, Send, Skull, Snail, RotateCcw } from 'lucide-react'
import type { Lesson } from './types'
import { Shell, Tip } from '../components/Story'
import { At, Box, Bubble, Card, Cloud, Database, Envelope, Link, Person, Scene, Server, Tag, Txt } from '../components/Illustrations'
import type { Tone } from '../components/Diagram'
import { bouncy, spring } from '../lib/motion'
import { useLoop } from '../lib/useLoop'
import { scenarios } from './LoadBalancingSims'

/* ------------------------------------------------------------------ scene pieces */

type Pt = { x: number; y: number }

const USER: Pt = { x: 70, y: 230 }
const LB: Pt = { x: 250, y: 230 }
const SRV: Pt[] = [
  { x: 470, y: 105 },
  { x: 470, y: 230 },
  { x: 470, y: 355 },
]
const NAMES = ['web-a', 'web-b', 'web-c']

function Headline({ children }: { children: string }) {
  return (
    <Txt x={280} y={46} cls="ill-label" anchor="middle" size={17}>
      {children}
    </Txt>
  )
}

/** The load balancer box. Pulses when `active`. */
function Balancer({ sub = 'shop.example.com', active }: { sub?: string; active?: boolean }) {
  return (
    <At x={LB.x} y={LB.y}>
      <motion.g animate={{ scale: active ? [1, 1.06, 1] : 1 }} transition={{ duration: 0.5 }}>
        <Box w={124} h={76} tone="teal" strong title="Load balancer" sub={sub} />
      </motion.g>
    </At>
  )
}

/** Three servers on the right, with wires from the load balancer. */
function Farm({ down = [], tones, titles, subs }: { down?: number[]; tones?: Tone[]; titles?: string[]; subs?: string[] }) {
  return (
    <>
      {SRV.map((s, i) => (
        <Link key={`w${i}`} d={`M312 230 C 370 230, 370 ${s.y}, 425 ${s.y}`} color={down.includes(i) ? 'var(--rose)' : 'var(--border-strong)'} dashed={down.includes(i)} delay={0.1 * i} />
      ))}
      {SRV.map((s, i) => (
        <At key={NAMES[i]} x={s.x} y={s.y} delay={0.1 * i}>
          <g transform="scale(0.72)">
            <Server title={titles?.[i] ?? NAMES[i]} sub={subs?.[i]} tone={tones?.[i] ?? 'violet'} down={down.includes(i)} />
          </g>
        </At>
      ))}
    </>
  )
}

/**
 * One request: flies from `from` through the load balancer to server `to`.
 * Keyed by `k`, so every new key starts a fresh flight.
 */
function Packet({ k, to, from = USER, via = LB, tone = 'amber', fail, n }: { k: string | number; to: Pt; from?: Pt; via?: Pt; tone?: Tone; fail?: boolean; n?: number | string }) {
  return (
    <motion.g
      key={k}
      initial={{ x: from.x + 40, y: from.y, opacity: 0 }}
      animate={{ x: [from.x + 40, via.x, to.x - 62], y: [from.y, via.y, to.y], opacity: fail ? [0, 1, 1] : [0, 1, 1, 0] }}
      transition={{ duration: 1.05, times: fail ? [0, 0.45, 1] : [0, 0.45, 0.9, 1], ease: 'easeInOut' }}
    >
      <Envelope tone={fail ? 'rose' : tone} n={n} scale={0.85} />
    </motion.g>
  )
}

function Users({ sub = '10,000 shoppers' }: { sub?: string }) {
  return (
    <>
      <At x={USER.x} y={USER.y}>
        <Person title="Users" sub={sub} />
      </At>
      <Link d="M110 230 H185" color="var(--border-strong)" />
    </>
  )
}

/* ------------------------------------------------------------------ scenes */

function S0Single() {
  const t = useLoop(6, 800)
  const cpu = [30, 55, 78, 94, 100, 100][t]
  const tone = cpu > 90 ? 'var(--rose)' : cpu > 70 ? 'var(--amber)' : 'var(--green)'
  const target = { x: 440, y: 230 }
  return (
    <>
      <Headline>One server can only do so much</Headline>
      <At x={USER.x} y={USER.y}>
        <Person title="Users" sub="sale starts now!" active />
      </At>
      <Link d="M110 230 H390" color="var(--border-strong)" />
      <At x={target.x} y={target.y}>
        <Server title="web-a" sub="the only server" down={t === 5} active={t > 1 && t < 5} />
      </At>
      {t < 5 && <Packet k={t} to={target} via={{ x: 250, y: 230 }} n={t + 1} />}
      <At x={400} y={340}>
        <text className="ill-sub" x={0} y={0} style={{ textAnchor: 'start' }}>
          CPU
        </text>
        <rect x={34} y={-11} width={86} height={14} rx={7} fill="var(--panel-3)" stroke="var(--ink)" strokeWidth={2} />
        <motion.rect x={34} y={-11} height={14} rx={7} animate={{ width: (86 * cpu) / 100, fill: tone }} transition={spring} />
      </At>
      <At x={440} y={150} show={t === 5}>
        <Bubble text="too busy… timeout" tone="rose" />
      </At>
      <Txt x={280} y={420} anchor="middle" cls="ill-sub">
        And if this one machine dies, the whole shop is offline.
      </Txt>
    </>
  )
}

function S1Intro() {
  const t = useLoop(3, 900)
  return (
    <>
      <Headline>A load balancer shares the work</Headline>
      <Users />
      <Balancer active />
      <Farm />
      <Packet k={t} to={SRV[t]} />
      <At x={LB.x} y={150}>
        <Tag text="one address for everyone" tone="teal" />
      </At>
    </>
  )
}

function S2RoundRobin() {
  const t = useLoop(6, 900)
  const counts = SRV.map((_, i) => Array.from({ length: t + 1 }, (_, j) => j).filter((j) => j % 3 === i).length)
  return (
    <>
      <Headline>Round robin: everyone takes turns</Headline>
      <Users />
      <Balancer />
      <Farm subs={counts.map((c) => `${c} request${c === 1 ? '' : 's'}`)} />
      <Packet k={t} to={SRV[t % 3]} n={t + 1} />
      {Array.from({ length: 6 }, (_, j) => (
        <At key={j} x={70 + j * 50} y={410} delay={j * 0.05}>
          <motion.g animate={{ scale: j === t ? 1.15 : 1 }} transition={bouncy}>
            <Tag text={`${j + 1}→${'ABC'[j % 3]}`} tone={j <= t ? 'amber' : 'slate'} filled={j === t} w={44} h={26} size={12} />
          </motion.g>
        </At>
      ))}
    </>
  )
}

const LEAST_FRAMES = [
  { conns: [3, 0, 1], to: 1 },
  { conns: [3, 1, 1], to: 2 },
  { conns: [2, 1, 2], to: 1 },
  { conns: [2, 2, 1], to: 2 },
]

function S3Least() {
  const t = useLoop(4, 1300)
  const f = LEAST_FRAMES[t]
  return (
    <>
      <Headline>Least connections: pick the least busy</Headline>
      <Users />
      <Balancer />
      <Farm subs={['slow uploads', '', '']} />
      <Packet k={t} to={SRV[f.to]} tone="green" />
      <At x={20} y={318}>
        <Card
          w={200}
          title="Open connections right now"
          tone="teal"
          highlight={f.to}
          lines={f.conns.map((c, i) => `${NAMES[i]}  ${'■'.repeat(c).padEnd(4, '·')} ${c}`)}
        />
      </At>
      <Txt x={250} y={130} anchor="middle" cls="ill-sub">
        round robin would hit busy web-a next
      </Txt>
    </>
  )
}

/** Which server gets each request in the health-check scene, and whether it fails. */
const HEALTH_ROUTE = [0, 1, 2, 1, 0, 2, 0, 2]

function S4Health() {
  const t = useLoop(8, 950)
  const bDown = t >= 2
  const bOut = t >= 4
  const to = HEALTH_ROUTE[t]
  const fail = to === 1 && bDown
  return (
    <>
      <Headline>Health checks: skip the sick server</Headline>
      <Users />
      <Balancer sub="checks /health" />
      <Farm down={bDown ? [1] : []} />
      {SRV.map((s, i) => {
        const bad = i === 1 && bDown
        return (
          <At key={i} x={372} y={s.y - (i === 1 ? 22 : 28)}>
            <motion.g key={`${t}-${i}`} initial={{ scale: 0.6 }} animate={{ scale: 1 }} transition={bouncy}>
              <Tag text={bad ? '✕ timeout' : '200 OK'} tone={bad ? 'rose' : 'green'} h={22} size={11} />
            </motion.g>
          </At>
        )
      })}
      <Packet k={t} to={SRV[to]} fail={fail} />
      <At x={20} y={318}>
        <Card
          w={208}
          title="Target health (what the LB sees)"
          tone={bOut ? 'rose' : 'teal'}
          highlight={bDown ? 1 : -1}
          lines={[
            { text: 'web-a  ● healthy', tone: 'green' },
            bOut ? { text: 'web-b  ✕ unhealthy', tone: 'rose' } : { text: `web-b  ● healthy${bDown ? ` (fails ${t - 1})` : ''}`, tone: bDown ? 'amber' : 'green' },
            { text: 'web-c  ● healthy', tone: 'green' },
          ]}
        />
      </At>
      <Txt x={250} y={100} anchor="middle" cls="ill-sub" fill={fail ? 'var(--rose)' : undefined}>
        {fail ? 'not detected yet: this user gets a 502' : bOut ? 'web-b is out of rotation until it passes again' : 'every 10 s: GET /health on each server'}
      </Txt>
    </>
  )
}

function S5Sticky() {
  const t = useLoop(6, 900)
  const joel = t % 2 === 0
  const joelAt = { x: 70, y: 160 }
  const priyaAt = { x: 70, y: 310 }
  return (
    <>
      <Headline>Sticky sessions vs shared sessions</Headline>
      <At x={joelAt.x} y={joelAt.y}>
        <g transform="scale(0.8)">
          <Person title="Joel" sub="cart: 2 items" tone="pink" active={joel} />
        </g>
      </At>
      <At x={priyaAt.x} y={priyaAt.y}>
        <g transform="scale(0.8)">
          <Person title="Priya" sub="cart: 1 item" tone="sky" active={!joel} />
        </g>
      </At>
      <Link d="M105 165 Q150 170 185 215 M105 305 Q150 300 185 245" color="var(--border-strong)" />
      <Balancer sub="cookie → server" />
      <Farm />
      <Packet k={t} from={joel ? joelAt : priyaAt} to={SRV[joel ? 0 : 2]} tone={joel ? 'pink' : 'sky'} />
      <At x={130} y={108}>
        <Tag text="AWSALB=web-a" tone="pink" mono h={24} size={11} />
      </At>
      <At x={190} y={338}>
        <Tag text="AWSALB=web-c" tone="sky" mono h={24} size={11} />
      </At>
      <At x={320} y={362} delay={0.6}>
        <g transform="scale(0.7)">
          <Database title="Redis" sub="shared sessions" tone="amber" />
        </g>
      </At>
      <Link d="M440 120 Q400 290 350 350 M440 245 Q410 320 350 358 M440 370 Q400 370 350 366" dashed color="var(--amber)" delay={0.8} />
      <Txt x={280} y={432} anchor="middle" cls="ill-sub" delay={0.9}>
        sticky = simple, but a dead server loses its carts. Redis keeps them safe.
      </Txt>
    </>
  )
}

const L7_REQS = [
  { path: 'GET /', to: 0, rule: 2 },
  { path: 'GET /api/orders', to: 1, rule: 0 },
  { path: 'GET /img/logo.png', to: 2, rule: 1 },
]

function S6Layer7() {
  const t = useLoop(3, 1300)
  const r = L7_REQS[t]
  const tones: Tone[] = ['sky', 'violet', 'amber']
  return (
    <>
      <Headline>Layer 7: route by what the request asks for</Headline>
      <Users sub="browsers" />
      <Balancer sub="ALB reads HTTP" />
      <Farm tones={tones} titles={['web', 'api', 'static']} subs={['tg-web', 'tg-api', 'tg-static']} />
      <Packet k={t} to={SRV[r.to]} tone={tones[r.to]} />
      <AnimatePresence mode="wait">
        <motion.g key={t} initial={{ scale: 0, opacity: 0, x: LB.x, y: LB.y - 44 }} animate={{ scale: 1, opacity: 1, x: LB.x, y: LB.y - 44 }} exit={{ scale: 0, opacity: 0 }} transition={bouncy}>
          <Bubble text={r.path} tone={tones[r.to]} />
        </motion.g>
      </AnimatePresence>
      <At x={20} y={300}>
        <Card w={210} title="Listener rules (in order)" tone="teal" highlight={r.rule} lines={['/api/*   → tg-api', '/img/*   → tg-static', 'default  → tg-web']} />
      </At>
      <Txt x={280} y={432} anchor="middle" cls="ill-sub">
        NLB (layer 4) only sees IP + port: faster, but it cannot read paths.
      </Txt>
    </>
  )
}

function S7Aws() {
  const t = useLoop(4, 900)
  const az = [
    { y: 150, name: 'AZ ap-south-1a' },
    { y: 330, name: 'AZ ap-south-1b' },
  ]
  const ec2 = [
    { x: 380, y: 160 },
    { x: 480, y: 160 },
    { x: 380, y: 340 },
    { x: 480, y: 340 },
  ]
  return (
    <>
      <Headline>On AWS: ALB + listeners + target group</Headline>
      <At x={62} y={230}>
        <Cloud title="Internet" w={0.8} />
      </At>
      <At x={205} y={230}>
        <Box w={104} h={110} tone="teal" strong title="ALB" sub="in 2 AZs" />
      </At>
      <At x={205} y={140}>
        <Tag text=":443 + ACM cert" tone="green" h={24} size={11} />
      </At>
      <At x={205} y={320}>
        <Tag text=":80 → redirect 443" tone="slate" h={24} size={11} />
      </At>
      <Link d="M108 230 H150" arrow />
      {az.map((a, i) => (
        <g key={a.name}>
          <At x={430} y={a.y} delay={0.1 * i}>
            <Box w={230} h={160} tone="slate" dashed />
          </At>
          <Txt x={330} y={a.y - 62} cls="ill-sub" delay={0.2}>
            {a.name}
          </Txt>
        </g>
      ))}
      {az.map((a, i) => (
        <Link key={a.name} d={`M258 230 C 290 230, 290 ${a.y}, 314 ${a.y}`} color={Math.floor(t / 2) === i ? 'var(--teal)' : 'var(--border-strong)'} width={3} arrow />
      ))}
      {ec2.map((e, i) => (
        <At key={i} x={e.x} y={e.y} delay={0.3 + i * 0.08}>
          <g transform="scale(0.55)">
            <Server title={`EC2 ${i + 1}`} tone="violet" active={i === t} />
          </g>
        </At>
      ))}
      <At x={430} y={426}>
        <Tag text="target group tg-web · health check GET /health" tone="teal" h={26} size={12} />
      </At>
    </>
  )
}

const PARTS = [S0Single, S1Intro, S2RoundRobin, S3Least, S4Health, S5Sticky, S6Layer7, S7Aws]

function LbScene({ step }: { step: number }) {
  const Part = PARTS[step] ?? S0Single
  return (
    <Scene label="How a load balancer works" h={440}>
      <AnimatePresence mode="wait">
        <motion.g key={step} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
          <Part />
        </motion.g>
      </AnimatePresence>
    </Scene>
  )
}

/* ------------------------------------------------------------------ playground */

type Algo = 'rr' | 'least'
type Srv = { up: boolean; slow: boolean; healthy: boolean; fails: number; passes: number; active: number; handled: number }
type Flight = { id: number; to: number; code: 200 | 502 | 503 }
type LabState = {
  srv: Srv[]
  algo: Algo
  next: number
  tick: number
  id: number
  inflight: { to: number; left: number }[]
  flights: Flight[]
  ok: number
  e502: number
  e503: number
  log: string[]
}

type LabAction = { type: 'tick'; send: boolean } | { type: 'send' } | { type: 'kill' | 'slow'; i: number } | { type: 'algo'; algo: Algo } | { type: 'reset' }

/** Health check every 3 ticks; 2 failures mark a target unhealthy, 2 passes bring it back. */
const CHECK_EVERY = 3
const THRESHOLD = 2

function initialLab(algo: Algo = 'rr'): LabState {
  return {
    srv: NAMES.map(() => ({ up: true, slow: false, healthy: true, fails: 0, passes: 0, active: 0, handled: 0 })),
    algo,
    next: 0,
    tick: 0,
    id: 0,
    inflight: [],
    flights: [],
    ok: 0,
    e502: 0,
    e503: 0,
    log: ['ALB ready: 3 healthy targets'],
  }
}

function sendOne(st: LabState): LabState {
  const id = st.id + 1
  const healthy = st.srv.map((s, i) => (s.healthy ? i : -1)).filter((i) => i >= 0)
  const log = (line: string) => [...st.log, line].slice(-6)
  if (!healthy.length) {
    return { ...st, id, e503: st.e503 + 1, flights: [...st.flights, { id, to: -1, code: 503 as const }].slice(-6), log: log('503 Service Unavailable: no healthy targets') }
  }
  let to: number
  if (st.algo === 'rr') {
    to = [0, 1, 2].map((k) => (st.next + k) % 3).find((i) => st.srv[i].healthy) ?? healthy[0]
  } else {
    // Least connections; ties go to whoever is next in turn so traffic still spreads.
    const order = [0, 1, 2].map((k) => (st.next + k) % 3).filter((i) => st.srv[i].healthy)
    to = order.reduce((best, i) => (st.srv[i].active < st.srv[best].active ? i : best), order[0])
  }
  const target = st.srv[to]
  const srv = st.srv.map((s, i) => (i === to && target.up ? { ...s, active: s.active + 1, handled: s.handled + 1 } : s))
  const code = target.up ? 200 : 502
  return {
    ...st,
    id,
    srv,
    next: (to + 1) % 3,
    inflight: target.up ? [...st.inflight, { to, left: target.slow ? 7 : 2 }] : st.inflight,
    flights: [...st.flights, { id, to, code: code as 200 | 502 }].slice(-6),
    ok: st.ok + (code === 200 ? 1 : 0),
    e502: st.e502 + (code === 502 ? 1 : 0),
    log: code === 502 ? log(`502 Bad Gateway: ${NAMES[to]} is dead but still marked healthy`) : st.log,
  }
}

function labReducer(st: LabState, a: LabAction): LabState {
  switch (a.type) {
    case 'reset':
      return initialLab(st.algo)
    case 'algo':
      return { ...st, algo: a.algo }
    case 'kill':
      return {
        ...st,
        srv: st.srv.map((s, i) => (i === a.i ? { ...s, up: !s.up, active: 0 } : s)),
        inflight: st.inflight.filter((r) => r.to !== a.i),
        log: [...st.log, `${NAMES[a.i]} ${st.srv[a.i].up ? 'crashed' : 'restarted'}`].slice(-6),
      }
    case 'slow':
      return { ...st, srv: st.srv.map((s, i) => (i === a.i ? { ...s, slow: !s.slow } : s)) }
    case 'send':
      return sendOne(st)
    case 'tick': {
      const tick = st.tick + 1
      // Finish requests that are done.
      const inflight = st.inflight.map((r) => ({ ...r, left: r.left - 1 }))
      const finished = inflight.filter((r) => r.left <= 0)
      let srv = st.srv.map((s, i) => ({ ...s, active: Math.max(0, s.active - finished.filter((r) => r.to === i).length) }))
      let log = st.log
      if (tick % CHECK_EVERY === 0) {
        srv = srv.map((s, i) => {
          if (s.up) {
            const passes = s.passes + 1
            if (!s.healthy && passes >= THRESHOLD) log = [...log, `health check: ${NAMES[i]} healthy again, back in rotation`].slice(-6)
            return { ...s, fails: 0, passes, healthy: s.healthy || passes >= THRESHOLD }
          }
          const fails = s.fails + 1
          if (s.healthy && fails >= THRESHOLD) log = [...log, `health check: ${NAMES[i]} failed ${fails}x, marked unhealthy`].slice(-6)
          return { ...s, passes: 0, fails, healthy: s.healthy && fails < THRESHOLD }
        })
      }
      const next = { ...st, tick, srv, log, inflight: inflight.filter((r) => r.left > 0) }
      return a.send ? sendOne(next) : next
    }
  }
}

const LAB_LB = { x: 120, y: 150 }
const LAB_SRV = [
  { x: 370, y: 55 },
  { x: 370, y: 150 },
  { x: 370, y: 245 },
]

function LbLab() {
  const [st, dispatch] = useReducer(labReducer, undefined, () => initialLab())
  const [playing, setPlaying] = useState(true)
  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight })
  }, [st.log])

  useEffect(() => {
    const t = setInterval(() => dispatch({ type: 'tick', send: playing }), 650)
    return () => clearInterval(t)
  }, [playing])

  const checking = st.tick % CHECK_EVERY === 0

  return (
    <div className="card stage">
      <div className="toolbar">
        <div className="seg" role="group" aria-label="Algorithm">
          <button aria-pressed={st.algo === 'rr'} onClick={() => dispatch({ type: 'algo', algo: 'rr' })}>
            Round robin
          </button>
          <button aria-pressed={st.algo === 'least'} onClick={() => dispatch({ type: 'algo', algo: 'least' })}>
            Least connections
          </button>
        </div>
        <button className="btn" onClick={() => setPlaying((p) => !p)}>
          {playing ? <Pause size={16} /> : <Play size={16} />} {playing ? 'Pause traffic' : 'Start traffic'}
        </button>
        <button className="btn" onClick={() => dispatch({ type: 'send' })}>
          <Send size={16} /> Send 1
        </button>
        <button className="btn" onClick={() => dispatch({ type: 'reset' })}>
          <RotateCcw size={16} /> Reset
        </button>
      </div>

      <svg viewBox="0 0 560 300" role="img" aria-label="Load balancer sending requests to three servers">
        <rect width="560" height="300" rx="16" className="scene-bg" />
        {LAB_SRV.map((s, i) => (
          <path
            key={i}
            d={`M180 150 C 255 150, 255 ${s.y}, ${s.x - 42} ${s.y}`}
            fill="none"
            stroke={st.srv[i].healthy ? 'var(--border-strong)' : 'var(--rose)'}
            strokeWidth={2.5}
            strokeDasharray={st.srv[i].healthy ? undefined : '6 6'}
          />
        ))}
        <g transform={`translate(${LAB_LB.x} ${LAB_LB.y})`}>
          <motion.g animate={{ scale: checking ? [1, 1.05, 1] : 1 }} transition={{ duration: 0.4 }}>
            <Box w={120} h={74} tone="teal" strong title="Load balancer" sub={st.algo === 'rr' ? 'round robin' : 'least conns'} />
          </motion.g>
        </g>
        <AnimatePresence>
          {checking && (
            <motion.g key={st.tick} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <text className="ill-sub" x={LAB_LB.x} y={LAB_LB.y + 58} style={{ textAnchor: 'middle', fill: 'var(--rose)' }}>
                ♥ health check
              </text>
            </motion.g>
          )}
        </AnimatePresence>
        {LAB_SRV.map((s, i) => {
          const sv = st.srv[i]
          return (
            <g key={i} transform={`translate(${s.x} ${s.y})`}>
              <g transform="scale(0.62)">
                <Server title="" tone={sv.slow ? 'amber' : 'violet'} down={!sv.up} active={sv.active > 0} />
              </g>
              <text className="ill-label" x={48} y={-8} style={{ textAnchor: 'start', fontSize: 13 }}>
                {NAMES[i]}
              </text>
              <text className="ill-sub" x={48} y={9} style={{ textAnchor: 'start' }}>
                {sv.handled} served · {sv.active} open
              </text>
              <text className="ill-sub" x={48} y={25} style={{ textAnchor: 'start', fill: sv.healthy ? 'var(--green)' : 'var(--rose)', fontWeight: 700 }}>
                {sv.healthy ? (sv.up ? 'healthy' : `healthy?! (${sv.fails} fail)`) : sv.up ? `checking (${sv.passes}/${THRESHOLD})` : 'unhealthy'}
              </text>
            </g>
          )
        })}
        {st.flights.map((f) =>
          f.to < 0 ? (
            <motion.g key={f.id} initial={{ x: 40, y: 150, opacity: 0 }} animate={{ x: [40, 70], opacity: [0, 1, 0] }} transition={{ duration: 0.9 }}>
              <Tag text="503" tone="rose" filled h={22} size={11} />
            </motion.g>
          ) : (
            <motion.g
              key={f.id}
              initial={{ x: 180, y: 150, opacity: 0 }}
              animate={{ x: [180, 250, LAB_SRV[f.to].x - 52], y: [150, (150 + LAB_SRV[f.to].y) / 2, LAB_SRV[f.to].y], opacity: f.code === 200 ? [0, 1, 1, 0] : [0, 1, 1] }}
              transition={{ duration: 0.6, times: f.code === 200 ? [0, 0.5, 0.9, 1] : [0, 0.5, 1] }}
            >
              <Envelope tone={f.code === 200 ? 'amber' : 'rose'} scale={0.7} n={f.code === 200 ? undefined : '✕'} />
            </motion.g>
          ),
        )}
      </svg>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {NAMES.map((n, i) => (
          <div key={n} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span className="mono" style={{ fontSize: 13, fontWeight: 700, width: 48 }}>
              {n}
            </span>
            <button className={`btn${st.srv[i].up ? ' danger' : ''}`} onClick={() => dispatch({ type: 'kill', i })}>
              {st.srv[i].up ? <Skull size={15} /> : <HeartPulse size={15} />} {st.srv[i].up ? 'Kill' : 'Revive'}
            </button>
            <button className="btn" aria-pressed={st.srv[i].slow} onClick={() => dispatch({ type: 'slow', i })} disabled={!st.srv[i].up}>
              <Snail size={15} /> Slow
            </button>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
        <div className="mini-table">
          <header>Responses</header>
          <div className="row">
            <span>200 OK</span>
            <motion.b key={st.ok} initial={{ scale: 1.4 }} animate={{ scale: 1 }} transition={bouncy} style={{ color: 'var(--green)' }}>
              {st.ok}
            </motion.b>
          </div>
          <div className="row">
            <span>502 Bad Gateway (dead target, not detected yet)</span>
            <b style={{ color: st.e502 ? 'var(--rose)' : undefined }}>{st.e502}</b>
          </div>
          <div className="row">
            <span>503 Service Unavailable (no healthy targets)</span>
            <b style={{ color: st.e503 ? 'var(--rose)' : undefined }}>{st.e503}</b>
          </div>
        </div>
        <div className="terminal">
          <header>
            <i />
            <i />
            <i />
            <span style={{ marginLeft: 6 }}>ALB events</span>
          </header>
          <div className="body" ref={logRef} style={{ height: 120 }}>
            {st.log.map((l, i) => (
              <div key={`${i}-${l}`} className={/502|503|unhealthy|crashed/.test(l) ? 'err' : /healthy again|ready|restarted/.test(l) ? 'ok' : undefined}>
                {l}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ lesson */

const lesson: Lesson = {
  id: 'load-balancing',
  title: 'Load balancing and health checks',
  track: 'Scaling and reliability',
  tone: 'teal',
  icon: Scale,
  summary:
    'One address in front, many servers behind. See round robin and least connections share traffic, watch health checks pull a dying server out of rotation, and learn how an AWS ALB routes by path.',
  minutes: 12,
  story: {
    Scene: LbScene,
    sections: [
      {
        title: 'One server is not enough',
        body: (
          <>
            <p>
              Your shop runs on one server. On a normal day that is fine. Then a sale starts, ten thousand people arrive at once, and the CPU hits
              100%. Requests queue up, pages time out, and checkout breaks.
            </p>
            <p>
              Worse, one server is a <strong>single point of failure</strong>: if it crashes, or you need to reboot it for an update, the whole site is
              down.
            </p>
            <Tip>One cashier in a supermarket. However fast they are, a big queue forms, and if they go on break, nobody can pay.</Tip>
          </>
        ),
      },
      {
        title: 'Put a load balancer in front',
        body: (
          <>
            <p>
              The fix is to run <strong>several identical servers</strong> and put a <strong>load balancer</strong> (LB) in front of them. Users only
              ever talk to the load balancer's address. It passes each request on to one of the servers behind it.
            </p>
            <ul>
              <li>
                <strong>More capacity:</strong> three servers handle about three times the traffic.
              </li>
              <li>
                <strong>No single point of failure:</strong> if one server dies, the others keep serving.
              </li>
              <li>
                <strong>Zero-downtime deploys:</strong> update servers one at a time while the rest carry the load.
              </li>
            </ul>
            <p>
              This is <strong>horizontal scaling</strong>: adding more machines. Making one machine bigger is <strong>vertical scaling</strong>, which
              has a ceiling and still leaves one point of failure.
            </p>
          </>
        ),
      },
      {
        title: 'Round robin',
        body: (
          <>
            <p>
              How does the LB pick a server? The simplest rule is <strong>round robin</strong>: A, then B, then C, then A again. Everyone takes turns.
            </p>
            <p>
              It is simple and fair when every request costs about the same. Its weakness: it ignores how busy each server actually is. A server stuck on
              slow requests still gets its turn.
            </p>
            <Tip kind="note">
              <b>Weighted</b> round robin gives bigger servers more turns, e.g. a server with weight 2 gets twice as many requests.
            </Tip>
          </>
        ),
      },
      {
        title: 'Least connections',
        body: (
          <>
            <p>
              <strong>Least connections</strong> (AWS calls it <em>least outstanding requests</em>) sends each new request to the server with the fewest
              requests still in progress.
            </p>
            <p>
              If web-a is busy with three slow file uploads, new requests go to web-b and web-c until web-a catches up. This is better when requests take
              very different amounts of time.
            </p>
            <Tip kind="pro">Asked "which algorithm would you use?", say: round robin by default, least outstanding requests when request times vary a lot.</Tip>
          </>
        ),
      },
      {
        title: 'Health checks',
        body: (
          <>
            <p>
              The LB must never send users to a dead server. So every few seconds it sends a small <strong>health check</strong> request, like{' '}
              <code>GET /health</code>, to every server.
            </p>
            <ul>
              <li>
                Answers <code>200 OK</code> in time: <strong>healthy</strong>.
              </li>
              <li>
                Fails a set number of times in a row (the <em>unhealthy threshold</em>, e.g. 2): marked <strong>unhealthy</strong> and taken out of
                rotation.
              </li>
              <li>
                Passes again enough times (the <em>healthy threshold</em>): put back in.
              </li>
            </ul>
            <p>
              Notice the gap: between a crash and the second failed check, some users still hit the dead server and get a <code>502 Bad Gateway</code>.
              Shorter intervals shrink that gap. If <em>every</em> target is unhealthy, the LB returns <code>503 Service Unavailable</code>.
            </p>
            <Shell>{`$ curl -i http://localhost/health
HTTP/1.1 200 OK
{"status":"ok","db":"ok"}`}</Shell>
          </>
        ),
      },
      {
        title: 'Sticky sessions (and why to avoid them)',
        body: (
          <>
            <p>
              Some apps keep a user's login or cart in the server's memory. If the next request lands on another server, the cart looks empty.
            </p>
            <p>
              <strong>Sticky sessions</strong> fix this: the LB sets a cookie (on AWS, <code>AWSALB</code>) and keeps sending that user to the same
              server. It works, but load becomes uneven, and if that server dies, its users lose their sessions.
            </p>
            <p>
              The better design is <strong>stateless servers</strong>: store sessions in a shared place like Redis (AWS ElastiCache) or a database.
              Then any server can serve any user, and you can add or remove servers freely.
            </p>
          </>
        ),
      },
      {
        title: 'Layer 4 vs layer 7',
        body: (
          <>
            <p>Load balancers work at two levels of the network stack:</p>
            <table className="data-table">
              <tbody>
                <tr>
                  <td>Layer 4 (NLB)</td>
                  <td>Sees only IP addresses and ports (TCP/UDP). Very fast, millions of requests per second, static IPs. Cannot read URLs.</td>
                </tr>
                <tr>
                  <td>Layer 7 (ALB)</td>
                  <td>Reads the HTTP request: path, host name, headers, cookies. Can route /api to one group and /img to another, and handle HTTPS.</td>
                </tr>
              </tbody>
            </table>
            <p>
              With an ALB, one load balancer can serve many services: <code>/api/*</code> to the API servers, <code>/img/*</code> to static servers,
              everything else to the website. Each rule points at a <strong>target group</strong>.
            </p>
          </>
        ),
      },
      {
        title: 'On AWS: ALB, listeners, target groups',
        body: (
          <>
            <p>An Application Load Balancer is built from three pieces:</p>
            <ul>
              <li>
                <strong>Listener:</strong> a port and protocol it accepts, e.g. <code>:443 HTTPS</code> with a certificate from ACM. A{' '}
                <code>:80</code> listener usually just redirects to 443.
              </li>
              <li>
                <strong>Rules:</strong> checked in order. "If path is /api/*, forward to tg-api."
              </li>
              <li>
                <strong>Target group:</strong> the servers (EC2 instances, containers, IPs or Lambda functions) plus the health check settings.
              </li>
            </ul>
            <p>
              The ALB lives in public subnets in <strong>at least two Availability Zones</strong>, and the servers sit in private subnets. If a whole AZ
              fails, the other keeps serving. An Auto Scaling group (next lesson) adds and removes servers in the target group automatically.
            </p>
            <Shell>{`$ aws elbv2 describe-target-health --target-group-arn $TG
web-a  healthy
web-b  unhealthy  Health checks failed with these codes: [404]`}</Shell>
          </>
        ),
      },
    ],
  },
  Playground: LbLab,
  playgroundIntro: 'Live traffic is flowing. Kill a server and count the 502s before the health check notices. Make one slow, then compare the two algorithms.',
  simulation: {
    intro: 'You are on call for an app behind an AWS ALB. The terminal has curl and a pretend aws CLI. Read the ticket and fix it.',
    scenarios,
  },
  terms: [
    { term: 'Load balancer', def: 'Sits in front of several servers and spreads requests across them.' },
    { term: 'Horizontal scaling', def: 'Adding more servers. Vertical scaling is making one server bigger.' },
    { term: 'Round robin', def: 'Send requests to each server in turn.' },
    { term: 'Least connections', def: 'Send each request to the server with the fewest requests in progress.' },
    { term: 'Health check', def: 'A regular request (e.g. GET /health) the LB uses to decide if a server can take traffic.' },
    { term: 'Target group', def: 'AWS: a set of targets (EC2, IPs, containers) plus their health check settings.' },
    { term: 'Listener', def: 'AWS: the port and protocol a load balancer accepts, with rules for where to forward.' },
    { term: 'Sticky session', def: 'Keeping a user on the same server using a cookie.' },
    { term: 'ALB / NLB', def: 'AWS Application LB (layer 7, HTTP aware) and Network LB (layer 4, TCP/UDP, very fast).' },
    { term: '502 vs 503', def: '502: the target answered badly or not at all. 503: no healthy target to send to.' },
  ],
  quiz: [
    {
      q: 'Requests take very different times (some are slow uploads). Which algorithm spreads load best?',
      options: ['Round robin', 'Least connections', 'Random', 'Sticky sessions'],
      answer: 1,
      why: 'Least connections looks at how busy each server is right now, so slow requests do not pile up on one server.',
    },
    {
      q: 'A server crashes. Health checks run every 10 s and the unhealthy threshold is 2. What happens in the next 20 s?',
      options: ['Nothing, the LB knows instantly', 'Some users get 502 errors until it is marked unhealthy', 'All users get 503', 'The LB restarts the server'],
      answer: 1,
      why: 'The LB only learns about the crash from failed checks. Until the second failure, requests still go there and fail.',
    },
    {
      q: 'Every target in the group is unhealthy. What does the ALB return?',
      options: ['200', '404', '502', '503'],
      answer: 3,
      why: '503 Service Unavailable: there is nowhere healthy to send the request.',
    },
    {
      q: 'You need to send /api/* to one set of servers and everything else to another. Which load balancer?',
      options: ['NLB', 'ALB', 'Either', 'Neither, use DNS'],
      answer: 1,
      why: 'Only a layer 7 load balancer (ALB) reads the URL path.',
    },
    {
      q: 'Why are stateless servers better than sticky sessions?',
      options: ['They are faster to boot', 'Any server can serve any user, so servers can die or scale freely', 'They do not need health checks', 'They use less memory'],
      answer: 1,
      why: 'With sessions in Redis or a database, losing or adding a server does not log anyone out or empty carts.',
    },
  ],
  interview: [
    {
      q: 'What is a load balancer and why use one?',
      a: 'It sits in front of several servers and spreads incoming requests across them. Benefits: more capacity (horizontal scaling), high availability because one server failing does not take the site down, and zero-downtime deploys by updating servers one at a time.',
    },
    {
      q: 'ALB vs NLB?',
      a: 'ALB works at layer 7: it understands HTTP, so it can route by path, host or header, terminate HTTPS and do redirects. NLB works at layer 4: TCP/UDP only, extremely high throughput and low latency, static IPs per AZ, preserves the client IP. Web apps usually use ALB; non-HTTP or very high traffic uses NLB.',
    },
    {
      q: 'A target keeps showing unhealthy. How do you debug it?',
      a: 'Check describe-target-health for the reason code. Compare the health check path, port and expected codes with what the app serves: curl the path from the instance. Check the security group allows the ALB to reach the port. Check the app is listening (ss -tulnp) and its logs. Watch for slow responses longer than the health check timeout.',
    },
    {
      q: 'What is connection draining (deregistration delay)?',
      a: 'When a target is removed, the LB stops sending new requests but lets in-flight ones finish for a set time (default 300 s on AWS). It prevents cutting off users mid-request during deploys or scale-in.',
    },
  ],
  commands: [
    { cmd: 'curl -i http://localhost/health', note: 'What does the health check see?' },
    { cmd: 'for i in 1 2 3 4 5 6; do curl -s $ALB | grep server; done', note: 'Watch requests rotate across servers' },
    { cmd: 'aws elbv2 describe-target-health --target-group-arn $TG', note: 'Which targets are healthy, and why not' },
    { cmd: 'aws elbv2 describe-target-groups --names tg-web', note: 'Health check path, interval, thresholds' },
    { cmd: 'aws elbv2 deregister-targets --target-group-arn $TG --targets Id=i-0abc', note: 'Take a server out of rotation' },
  ],
}

export default lesson
