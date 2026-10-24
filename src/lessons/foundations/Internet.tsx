import { useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Globe, Send } from 'lucide-react'
import type { Lesson } from '../types'
import { Shell, Tip } from '../../components/Story'
import { At, Box, Bubble, Card, Cloud, Envelope, Laptop, Link, Mover, Router, Scene, Server, Tag, Txt } from '../../components/Illustrations'
import { useLoop } from '../../lib/useLoop'

/* ------------------------------------------------------------------ scenes */

function Headline({ children }: { children: string }) {
  return (
    <Txt x={280} y={46} cls="ill-label" anchor="middle" size={17}>
      {children}
    </Txt>
  )
}

function S0Network() {
  const t = useLoop(2, 1600)
  return (
    <>
      <Headline>A network = devices that can message each other</Headline>
      <Link d="M186 300 H374" width={4} color="var(--border-strong)" />
      <At x={130} y={270}>
        <Laptop title="Your laptop" active={t === 0} />
      </At>
      <At x={430} y={270} delay={0.1}>
        <Laptop title="Friend's laptop" tone="pink" active={t === 1} />
      </At>
      <Mover x={t === 0 ? 210 : 350} y={282}>
        <Envelope />
      </Mover>
      <At x={130} y={200} show={t === 0}>
        <Bubble text="Hi Priya!" />
      </At>
      <At x={430} y={200} show={t === 1}>
        <Bubble text="Hey, got it!" tone="pink" />
      </At>
      <Txt x={280} y={400} anchor="middle" cls="ill-sub" delay={0.3}>
        cable or Wi-Fi: the path messages travel on
      </Txt>
    </>
  )
}

function S1ClientServer() {
  const t = useLoop(4, 1400)
  const goingOut = t < 2
  return (
    <>
      <Headline>Client asks. Server answers.</Headline>
      <Link d="M180 300 H392" dashed color="var(--border-strong)" />
      <At x={120} y={280}>
        <Laptop title="Client" sub="your browser" active={t === 0 || t === 3} />
      </At>
      <At x={445} y={270} delay={0.1}>
        <Server title="Server" sub="always on, waiting" active={t === 1 || t === 2} />
      </At>
      <Mover x={t === 0 || t === 3 ? 195 : 380} y={258}>
        <Envelope tone={goingOut ? 'amber' : 'green'} />
      </Mover>
      <At x={130} y={185} show={t === 0}>
        <Bubble text="Can I have your homepage?" />
      </At>
      <At x={420} y={180} show={t === 2}>
        <Bubble text="Sure, here it is!" tone="green" />
      </At>
      <Txt x={286} y={235} anchor="middle" cls="ill-sub" show={goingOut}>
        request →
      </Txt>
      <Txt x={286} y={235} anchor="middle" cls="ill-sub" show={!goingOut}>
        ← response
      </Txt>
    </>
  )
}

const PAGE_TONES = ['amber', 'sky', 'pink', 'teal'] as const

function S2Packets() {
  const t = useLoop(9, 650)
  return (
    <>
      <Headline>Big data is split into small, numbered packets</Headline>
      <At x={30} y={80}>
        <Card
          w={170}
          title="homepage (2 MB)"
          tone="violet"
          lines={[
            { text: '<html> ...', tone: 'amber' },
            { text: 'photo.jpg', tone: 'sky' },
            { text: 'article text', tone: 'pink' },
            { text: 'footer', tone: 'teal' },
          ]}
        />
      </At>
      <At x={110} y={330}>
        <Server title="Server" />
      </At>
      <At x={460} y={330} delay={0.1}>
        <Laptop title="You" />
      </At>
      <Link d="M160 330 H392" dashed color="var(--border-strong)" />
      {PAGE_TONES.map((tone, k) => {
        const p = Math.max(0, Math.min(1, (t - k) / 4))
        return (
          <Mover key={tone} x={170 + p * 210} y={250 - (k % 2) * 30} show={t >= k}>
            <Envelope tone={tone} n={k + 1} />
          </Mover>
        )
      })}
      <Txt x={300} y={110} cls="ill-text" show={t > 2}>
        Each packet carries:
      </Txt>
      <Txt x={300} y={132} cls="ill-mono" show={t > 3}>
        • who it is from
      </Txt>
      <Txt x={300} y={152} cls="ill-mono" show={t > 3}>
        • who it is for
      </Txt>
      <Txt x={300} y={172} cls="ill-mono" show={t > 3}>
        • its number (1 of 4)
      </Txt>
    </>
  )
}

function S3Ip() {
  return (
    <>
      <Headline>Every device has an IP address</Headline>
      <At x={110} y={320}>
        <Laptop title="Your laptop" />
      </At>
      <At x={110} y={230} delay={0.2}>
        <Tag text="192.168.1.5" mono tone="sky" />
      </At>
      <At x={450} y={310} delay={0.1}>
        <Server title="example.com" />
      </At>
      <At x={450} y={212} delay={0.3}>
        <Tag text="93.184.216.34" mono tone="violet" />
      </At>
      <At x={170} y={78} delay={0.4}>
        <Card w={220} title="packet label" tone="amber" lines={['From: 192.168.1.5', 'To:   93.184.216.34', 'Data: GET /']} highlight={1} />
      </At>
      <Link d="M170 320 Q280 360 392 320" dashed arrow color="var(--border-strong)" delay={0.5} />
      <Txt x={280} y={410} anchor="middle" cls="ill-sub" delay={0.6}>
        4 numbers, each 0 to 255, separated by dots
      </Txt>
    </>
  )
}

const ROUTE = [
  [70, 262],
  [190, 300],
  [315, 300],
  [415, 150],
  [480, 250],
]

function S4Route() {
  const t = useLoop(ROUTE.length, 1100)
  return (
    <>
      <Headline>Your packet's trip out of the house</Headline>
      <At x={415} y={150}>
        <Cloud title="Internet" w={1.1} />
      </At>
      <Link d="M120 352 H150 M232 352 H272 M330 318 Q340 210 368 172 M470 168 Q490 200 488 240" dashed color="var(--border-strong)" />
      <At x={68} y={330}>
        <Laptop title="Laptop" sub="192.168.1.5" active={t === 0} />
      </At>
      <At x={192} y={350} delay={0.1}>
        <Router title="Wi-Fi router" sub="49.36.12.8" active={t === 1} />
      </At>
      <At x={318} y={350} delay={0.2}>
        <Router title="ISP" sub="Jio / Airtel" tone="amber" active={t === 2} />
      </At>
      <At x={485} y={318} delay={0.3}>
        <Server title="Server" active={t === 4} />
      </At>
      <Mover x={ROUTE[t][0]} y={ROUTE[t][1] - 40}>
        <Envelope n={1} />
      </Mover>
      <Txt x={30} y={100} cls="ill-mono" size={12} show={t >= 1}>
        Router: private → public IP (NAT)
      </Txt>
      <Txt x={30} y={122} cls="ill-mono" size={12} show={t >= 2}>
        ISP: connects you onward
      </Txt>
    </>
  )
}

const R: Record<string, [number, number]> = {
  r1: [160, 225],
  r2: [250, 150],
  r3: [250, 300],
  r4: [350, 150],
  r5: [350, 300],
  r6: [430, 225],
}
const PATH_A = [[60, 225], R.r1, R.r2, R.r4, R.r6, [512, 225]]
const PATH_B = [[60, 225], R.r1, R.r3, R.r5, R.r6, [512, 225]]

function S5Hops() {
  const t = useLoop(PATH_A.length + 1, 800)
  const i = Math.min(t, PATH_A.length - 1)
  const j = Math.max(0, Math.min(t - 1, PATH_B.length - 1))
  return (
    <>
      <Headline>Routers pass packets along, hop by hop</Headline>
      <At x={290} y={225}>
        <Box w={360} h={250} tone="sky" dashed />
      </At>
      <Txt x={290} y={124} anchor="middle" cls="zone-label">
        the internet: thousands of routers
      </Txt>
      {[
        ['r1', 'r2'],
        ['r1', 'r3'],
        ['r2', 'r4'],
        ['r3', 'r5'],
        ['r2', 'r3'],
        ['r4', 'r6'],
        ['r5', 'r6'],
        ['r4', 'r5'],
      ].map(([a, b]) => (
        <line key={a + b} x1={R[a][0]} y1={R[a][1]} x2={R[b][0]} y2={R[b][1]} stroke="var(--border-strong)" strokeWidth={2.5} />
      ))}
      <line x1={86} y1={225} x2={140} y2={225} stroke="var(--border-strong)" strokeWidth={2.5} />
      <line x1={450} y1={225} x2={486} y2={225} stroke="var(--border-strong)" strokeWidth={2.5} />
      {Object.entries(R).map(([k, [x, y]], n) => (
        <At key={k} x={x} y={y} delay={n * 0.05}>
          <Tag text={`R${n + 1}`} tone="teal" w={40} h={32} />
        </At>
      ))}
      <At x={56} y={225}>
        <Tag text="You" tone="amber" w={56} />
      </At>
      <At x={514} y={225}>
        <Tag text="Server" tone="violet" w={64} />
      </At>
      <Mover x={PATH_A[i][0]} y={PATH_A[i][1] - 30}>
        <Envelope n={1} scale={0.85} />
      </Mover>
      <Mover x={PATH_B[j][0]} y={PATH_B[j][1] + 30}>
        <Envelope n={2} tone="sky" scale={0.85} />
      </Mover>
      <Txt x={290} y={395} anchor="middle" cls="ill-sub">
        packet 1 and packet 2 can take different roads
      </Txt>
    </>
  )
}

function S6Reassemble() {
  const phase = useLoop(4, 1500)
  const arrival = [3, 1, 4, 2]
  return (
    <>
      <Headline>Packets arrive mixed up and are put back in order</Headline>
      <At x={460} y={330}>
        <Laptop title="You" active={phase === 3} />
      </At>
      {arrival.map((n, slot) => {
        const pos = phase === 0 ? slot : n - 1
        const tone = PAGE_TONES[n - 1]
        return (
          <Mover key={n} x={phase === 3 ? 460 : 90 + pos * 80} y={phase === 3 ? 290 : 180} show={phase !== 3}>
            <Envelope tone={tone} n={n} scale={1.2} />
          </Mover>
        )
      })}
      <Txt x={90} y={240} cls="ill-mono" show={phase === 0}>
        arrived: 3, 1, 4, 2
      </Txt>
      <Txt x={90} y={240} cls="ill-mono" show={phase === 1 || phase === 2}>
        sorted:  1, 2, 3, 4  ✓ none missing
      </Txt>
      <At x={250} y={300} show={phase === 3}>
        <Card w={140} title="homepage" tone="green" lines={['<html> ...', 'photo.jpg', 'article text', 'footer']} lineH={18} />
      </At>
      <Txt x={40} y={400} cls="ill-sub" show={phase === 2}>
        a missing number? → ask the sender to resend just that one
      </Txt>
    </>
  )
}

const LAYERS = [
  { name: 'Link: Wi-Fi / Ethernet frame', sub: 'from MAC aa:bb… to router MAC', tone: 'slate' as const },
  { name: 'Internet: IP packet', sub: 'from 192.168.1.5 → to 93.184.216.34', tone: 'sky' as const },
  { name: 'Transport: TCP segment', sub: 'port 51514 → port 443, packet #1', tone: 'violet' as const },
  { name: 'Application: HTTP', sub: 'GET /index.html', tone: 'amber' as const },
]

function S7Layers() {
  return (
    <>
      <Headline>Layers: envelopes inside envelopes</Headline>
      {LAYERS.map((l, i) => {
        const inset = i * 30
        return (
          <At key={l.name} x={280} y={240 + inset / 2} delay={i * 0.25}>
            <Box w={480 - inset * 2} h={310 - inset * 2.4} tone={l.tone} strong={i === 3} />
            <text className="ill-label" x={0} y={-(310 - inset * 2.4) / 2 + 22} style={{ fontSize: 14 }}>
              {l.name}
            </text>
            <text className="ill-sub" x={0} y={-(310 - inset * 2.4) / 2 + 38}>
              {l.sub}
            </text>
          </At>
        )
      })}
    </>
  )
}

function Dots({ y, h, n, dur, color }: { y: number; h: number; n: number; dur: number; color: string }) {
  return (
    <>
      {Array.from({ length: n }, (_, k) => (
        <motion.circle
          key={k}
          r={6}
          cy={y + ((k * 37) % Math.max(1, h - 16)) + 8}
          fill={color}
          stroke="var(--ink)"
          strokeWidth={2}
          initial={{ cx: 70 }}
          animate={{ cx: [70, 490] }}
          transition={{ duration: dur, repeat: Infinity, ease: 'linear', delay: (k * dur) / n }}
        />
      ))}
    </>
  )
}

function S8Speed() {
  return (
    <>
      <Headline>Bandwidth vs latency</Headline>
      <Txt x={60} y={98} cls="ill-label" size={15}>
        Bandwidth: how much fits at once
      </Txt>
      <rect className="ill-outline" x={60} y={110} width={440} height={90} rx={20} style={{ fill: 'color-mix(in srgb, var(--sky) 15%, var(--paper))' }} />
      <Dots y={112} h={86} n={12} dur={2.2} color="var(--amber)" />
      <Txt x={500} y={226} anchor="end" cls="ill-sub">
        wide pipe: 100 Mbps fibre moves lots of data together
      </Txt>
      <Txt x={60} y={280} cls="ill-label" size={15}>
        Latency: how long one trip takes
      </Txt>
      <rect className="ill-outline" x={60} y={292} width={440} height={30} rx={15} style={{ fill: 'color-mix(in srgb, var(--pink) 15%, var(--paper))' }} />
      <Dots y={294} h={26} n={1} dur={3.2} color="var(--pink)" />
      <Txt x={60} y={352} cls="ill-mono">
        Pune → Mumbai server  ≈ 10 ms
      </Txt>
      <Txt x={60} y={374} cls="ill-mono">
        Pune → US server      ≈ 230 ms (distance!)
      </Txt>
    </>
  )
}

const STEPS = [S0Network, S1ClientServer, S2Packets, S3Ip, S4Route, S5Hops, S6Reassemble, S7Layers, S8Speed]

function InternetScene({ step }: { step: number }) {
  const Part = STEPS[step] ?? S0Network
  return (
    <Scene label="How the internet works" h={440}>
      <AnimatePresence mode="wait">
        <motion.g key={step} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
          <Part />
        </motion.g>
      </AnimatePresence>
    </Scene>
  )
}

/* ------------------------------------------------------------- playground */

type Pkt = { n: number; text: string; route: [number, number][]; lost: boolean; arrived: boolean; key: string; dur: number }

const SENDER: [number, number] = [70, 140]
const RECEIVER: [number, number] = [490, 140]
const GRID: [number, number][][] = [
  [
    [200, 60],
    [200, 220],
  ],
  [
    [360, 60],
    [360, 220],
  ],
]

function randomRoute(): [number, number][] {
  const a = GRID[0][Math.floor(Math.random() * 2)]
  const b = GRID[1][Math.floor(Math.random() * 2)]
  return [SENDER, a, b, RECEIVER]
}

function PacketPlayground() {
  const [msg, setMsg] = useState('Hello from Pune!')
  const [lose, setLose] = useState(false)
  const [packets, setPackets] = useState<Pkt[]>([])
  const [order, setOrder] = useState<number[]>([])
  const [error, setError] = useState('')
  const run = useRef(0)

  function send() {
    const text = msg.trim()
    if (!text) {
      setError('Type a message first.')
      return
    }
    run.current += 1
    const chunks = text.match(/.{1,4}/g) ?? []
    setOrder([])
    setPackets(
      chunks.map((c, i) => ({
        n: i + 1,
        text: c,
        route: randomRoute(),
        lost: lose && i === 1,
        arrived: false,
        key: `${run.current}-${i}-a`,
        dur: 1.6 + Math.random() * 1.4,
      })),
    )
  }

  function onArrive(p: Pkt) {
    if (p.lost) {
      // The receiver notices the gap and asks for a resend.
      setTimeout(() => {
        setPackets((ps) => ps.map((x) => (x.n === p.n ? { ...x, lost: false, route: randomRoute(), key: x.key + 'r', dur: 1.6 + Math.random() * 1.4 } : x)))
      }, 900)
      return
    }
    setPackets((ps) => ps.map((x) => (x.n === p.n ? { ...x, arrived: true } : x)))
    setOrder((o) => (o.includes(p.n) ? o : [...o, p.n]))
  }

  const total = packets.length
  const complete = total > 0 && order.length === total
  const assembled = packets.filter((p) => order.includes(p.n)).sort((a, b) => a.n - b.n)

  return (
    <div className="card stage">
      <div className="toolbar">
        <input
          className="text-input"
          value={msg}
          maxLength={32}
          aria-label="Message to send"
          aria-invalid={!!error}
          onChange={(e) => {
            setMsg(e.target.value)
            setError('')
          }}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          style={{ flex: '1 1 220px', fontFamily: 'var(--font)' }}
        />
        <button className="btn primary" onClick={send}>
          <Send size={16} /> Send
        </button>
        <label className="switch">
          <input type="checkbox" checked={lose} onChange={(e) => setLose(e.target.checked)} />
          Lose packet #2 on the way
        </label>
        {error && <span className="field-error">{error}</span>}
      </div>
      <svg viewBox="0 0 560 280" role="img" aria-label="Packets travelling through routers">
        <rect width="560" height="280" rx="16" className="scene-bg" />
        {GRID[0].map((a) =>
          GRID[1].map((b) => <line key={`${a}-${b}`} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="var(--border-strong)" strokeWidth={2} />),
        )}
        {GRID[0].map((a) => (
          <line key={`s${a}`} x1={SENDER[0]} y1={SENDER[1]} x2={a[0]} y2={a[1]} stroke="var(--border-strong)" strokeWidth={2} />
        ))}
        {GRID[1].map((b) => (
          <line key={`r${b}`} x1={b[0]} y1={b[1]} x2={RECEIVER[0]} y2={RECEIVER[1]} stroke="var(--border-strong)" strokeWidth={2} />
        ))}
        {GRID.flat().map(([x, y], i) => (
          <g key={i} transform={`translate(${x} ${y})`}>
            <Tag text={`R${i + 1}`} tone="teal" w={42} />
          </g>
        ))}
        <g transform={`translate(${SENDER[0]} ${SENDER[1]}) scale(0.7)`}>
          <Laptop title="Sender" />
        </g>
        <g transform={`translate(${RECEIVER[0]} ${RECEIVER[1]}) scale(0.7)`}>
          <Laptop title="Receiver" tone="pink" />
        </g>
        {packets.map((p, i) => {
          const pts = p.lost ? p.route.slice(0, 3) : p.route
          return (
            !p.arrived && (
              <motion.g
                key={p.key}
                initial={{ x: SENDER[0], y: SENDER[1] - 30, opacity: 0 }}
                animate={{ x: pts.map((q) => q[0]), y: pts.map((q) => q[1] - 30), opacity: p.lost ? [1, 1, 0] : 1 }}
                transition={{ duration: p.dur, delay: p.key.endsWith('r') ? 0 : i * 0.35, ease: 'easeInOut' }}
                onAnimationComplete={() => onArrive(p)}
              >
                <Envelope n={p.n} tone={p.lost ? 'rose' : 'amber'} scale={0.8} />
              </motion.g>
            )
          )
        })}
      </svg>
      <div className="mini-tables">
        <div className="mini-table">
          <header>Arrival order</header>
          <div className="row">
            <span>{order.length ? order.join(', ') : '-'}</span>
            <span className="muted">{total ? `${order.length}/${total}` : ''}</span>
          </div>
        </div>
        <div className="mini-table">
          <header>Reassembled by number</header>
          <div className="row" style={{ justifyContent: 'flex-start', gap: 4, flexWrap: 'wrap' }}>
            {packets.map((p) => (
              <span
                key={p.n}
                style={{
                  padding: '0 4px',
                  borderRadius: 6,
                  background: order.includes(p.n) ? 'color-mix(in srgb, var(--green) 20%, transparent)' : 'var(--panel-3)',
                  whiteSpace: 'pre',
                }}
              >
                {order.includes(p.n) ? p.text : '·'.repeat(p.text.length)}
              </span>
            ))}
          </div>
        </div>
      </div>
      <AnimatePresence>
        {complete && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="callout tone-green">
            <strong>Message delivered: "{assembled.map((p) => p.text).join('')}"</strong>
            Packets arrived in the order {order.join(', ')}, and were put back in order 1 to {total}.
            {lose && ' Packet 2 got lost, so the receiver asked for it again.'}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ------------------------------------------------------------------ lesson */

const lesson: Lesson = {
  id: 'internet',
  title: 'How the internet works',
  track: '',
  tone: 'sky',
  icon: Globe,
  summary: 'From zero: what a network is, clients and servers, packets, IP addresses, routers, and the layers every message passes through.',
  minutes: 12,
  story: {
    Scene: InternetScene,
    sections: [
      {
        title: 'A network is devices talking',
        body: (
          <>
            <p>
              A <strong>network</strong> is two or more devices (laptops, phones, servers) connected so they can send each other
              messages. The connection can be a cable or Wi-Fi radio waves.
            </p>
            <p>
              <strong>The internet</strong> is simply a gigantic network made by connecting millions of smaller networks: your
              home Wi-Fi, your college network, Google's data centres, all linked together.
            </p>
            <Tip>The postal system. Houses (devices) send letters (messages) through post offices and roads (routers and cables).</Tip>
          </>
        ),
      },
      {
        title: 'Clients and servers',
        body: (
          <>
            <p>
              Almost everything on the internet is a conversation between a <strong>client</strong> and a <strong>server</strong>.
            </p>
            <ul>
              <li>
                The <strong>client</strong> asks for something. Your browser, the Instagram app, or <code>curl</code> on a
                terminal.
              </li>
              <li>
                The <strong>server</strong> is a computer that is always switched on, waiting for requests, and sending
                answers back.
              </li>
            </ul>
            <p>
              The question is called a <strong>request</strong> and the answer is a <strong>response</strong>. A server is not
              special hardware: it is a normal computer running a program that listens for requests. In DevOps, keeping
              those servers running is your job.
            </p>
          </>
        ),
      },
      {
        title: 'Data travels in packets',
        body: (
          <>
            <p>
              A webpage may be 2 MB. It is not sent as one big blob. It is chopped into many small pieces called{' '}
              <strong>packets</strong> (usually up to about 1,500 bytes each).
            </p>
            <p>Each packet carries a small label (the header) with who sent it, who it is for, and its number in the sequence.</p>
            <p>Why bother? If one packet gets lost or damaged, only that small piece needs to be sent again, not the whole page. Many users can also share the same cables fairly, because packets from everyone take turns.</p>
          </>
        ),
      },
      {
        title: 'IP address: the device’s address',
        body: (
          <>
            <p>
              To deliver a packet, the network needs an address. Every device on a network gets an <strong>IP address</strong>{' '}
              (IP = Internet Protocol).
            </p>
            <p>
              The common format, <strong>IPv4</strong>, is four numbers from 0 to 255 separated by dots, like{' '}
              <code>192.168.1.5</code>. That gives about 4.3 billion addresses, which is not enough for every device on Earth,
              so a newer, longer format called <strong>IPv6</strong> also exists (<code>2001:db8::1</code>).
            </p>
            <Tip>A house address. The postman doesn't care what's inside the letter, only where it goes.</Tip>
            <p>You will learn exactly how these numbers work in the next lesson.</p>
          </>
        ),
      },
      {
        title: 'Your router and your ISP',
        body: (
          <>
            <p>Here is the real trip a packet takes when you open a website from home:</p>
            <ol>
              <li>
                Your laptop sends it to your <strong>Wi-Fi router</strong>. Inside your home, devices have{' '}
                <strong>private IPs</strong> like <code>192.168.1.5</code> that only make sense inside your house.
              </li>
              <li>
                The router swaps your private IP for the house's one <strong>public IP</strong> (e.g. <code>49.36.12.8</code>).
                This trick is called <strong>NAT</strong> (Network Address Translation). Everyone at home shares that one
                public IP.
              </li>
              <li>
                The router forwards it to your <strong>ISP</strong> (Internet Service Provider, like Jio or Airtel), which connects
                you to the rest of the internet.
              </li>
            </ol>
            <Tip kind="note">AWS uses the exact same ideas. A VPC is your "house", and a NAT gateway is the "router" that lets private servers reach out.</Tip>
          </>
        ),
      },
      {
        title: 'Routers pass packets hop by hop',
        body: (
          <>
            <p>
              The internet is a mesh of <strong>routers</strong>. A router is a device whose only job is to look at the
              destination IP of each packet and pass it one step closer. Each step is called a <strong>hop</strong>.
            </p>
            <p>
              No single router knows the full path. Each one only knows "for addresses like this, the next router is that
              one", stored in its <strong>routing table</strong>. If a link breaks, routers find another way, so packets from the
              same page may even take different roads.
            </p>
            <Shell>{`$ traceroute google.com      # Windows: tracert google.com
 1  192.168.1.1     2 ms    # your router
 2  10.71.0.1       8 ms    # ISP
 3  142.250.160.1  14 ms    # Google's network
 ...`}</Shell>
          </>
        ),
      },
      {
        title: 'Put back together',
        body: (
          <>
            <p>
              Because packets can travel different paths, they can arrive <strong>out of order</strong>. The receiving computer
              uses the packet numbers to put them back in the correct order.
            </p>
            <p>
              If a number is missing, it asks the sender to send that one packet again. This reliability job is done by{' '}
              <strong>TCP</strong>, which you will meet in lesson 3. Once all pieces are in place, your browser can show the page.
            </p>
            <Tip kind="pro">"Packet loss" means some packets never arrive. A little causes slow, laggy connections because of all the resends.</Tip>
          </>
        ),
      },
      {
        title: 'Layers: envelopes inside envelopes',
        body: (
          <>
            <p>
              Networking is split into <strong>layers</strong>. Each layer does one job and wraps the data from the layer above,
              like putting a letter in an envelope, then in a parcel, then in a delivery truck. This is the{' '}
              <strong>TCP/IP model</strong>:
            </p>
            <table className="data-table">
              <tbody>
                <tr>
                  <td>Application</td>
                  <td>What the app says: HTTP, DNS, SSH</td>
                </tr>
                <tr>
                  <td>Transport</td>
                  <td>Which program, reliability: TCP or UDP, ports</td>
                </tr>
                <tr>
                  <td>Internet</td>
                  <td>Which computer: IP addresses, routing</td>
                </tr>
                <tr>
                  <td>Link</td>
                  <td>The physical hop: Wi-Fi, Ethernet, MAC addresses</td>
                </tr>
              </tbody>
            </table>
            <p>
              You may also hear of the <strong>OSI model</strong>, which has 7 layers. It splits the same ideas into finer
              pieces. When people say "a layer 7 load balancer" they mean it understands HTTP (application); "layer 4" means it
              only sees IPs and ports.
            </p>
          </>
        ),
      },
      {
        title: 'Bandwidth vs latency',
        body: (
          <>
            <p>Two different things make the internet feel "fast":</p>
            <ul>
              <li>
                <strong>Bandwidth</strong>: how much data can flow per second (Mbps). A wider pipe. Matters for big downloads
                and video.
              </li>
              <li>
                <strong>Latency</strong>: how long one trip takes (milliseconds). Mostly decided by physical distance. Matters
                for gaming, video calls, and every request a webpage makes.
              </li>
            </ul>
            <p>
              Light in fibre needs time to cross oceans. That is why companies put servers close to users (an AWS region in
              Mumbai for Indian users, or a CDN), no matter how fast your plan is.
            </p>
            <Shell>{`$ ping -c 3 google.com
64 bytes from 142.250.183.14: time=12.4 ms
64 bytes from 142.250.183.14: time=11.9 ms`}</Shell>
          </>
        ),
      },
    ],
  },
  Playground: PacketPlayground,
  playgroundIntro: 'Type a message and send it. It is split into 4-letter packets that each pick a random route. Turn on packet loss to see a resend.',
  terms: [
    { term: 'Network', def: 'Two or more devices connected so they can exchange data.' },
    { term: 'Client', def: 'The program or device that sends a request, e.g. your browser.' },
    { term: 'Server', def: 'An always-on computer running a program that answers requests.' },
    { term: 'Packet', def: 'A small chunk of data with a header saying where it came from and where it is going.' },
    { term: 'IP address', def: 'A device’s address on a network, like 192.168.1.5.' },
    { term: 'Router', def: 'A device that forwards packets one hop closer to their destination.' },
    { term: 'ISP', def: 'Internet Service Provider, the company connecting you to the internet (Jio, Airtel, BSNL).' },
    { term: 'NAT', def: 'Network Address Translation: swapping private IPs for a shared public IP at the router.' },
    { term: 'Protocol', def: 'An agreed set of rules for communicating, e.g. HTTP, TCP, IP.' },
    { term: 'Latency', def: 'Time for data to travel from one point to another, in milliseconds.' },
    { term: 'Bandwidth', def: 'How much data can be sent per second, e.g. 100 Mbps.' },
  ],
  quiz: [
    {
      q: 'Why is data split into packets?',
      options: ['To make it look smaller', 'So lost pieces can be resent alone and links can be shared', 'Because servers can only store small files', 'To encrypt it'],
      answer: 1,
      why: 'If one small packet is lost, only it is resent. Packets from many users also share cables fairly.',
    },
    {
      q: 'What does a router do?',
      options: ['Stores websites', 'Reads the destination IP and forwards the packet one hop closer', 'Turns names into IP addresses', 'Encrypts traffic'],
      answer: 1,
      why: 'Routers only forward packets. Storing websites is a server’s job, and turning names into IPs is DNS (lesson 4).',
    },
    {
      q: 'Your laptop at home has IP 192.168.1.5. What does a website see?',
      options: ['192.168.1.5', 'Your router’s public IP, thanks to NAT', 'Your MAC address', 'Nothing'],
      answer: 1,
      why: '192.168.x.x is private. The router translates it to the household’s public IP before sending it out.',
    },
    {
      q: 'Users in India complain your US-hosted site is slow even on fast fibre. What is the main cause?',
      options: ['Low bandwidth', 'High latency from distance', 'Too many layers', 'IPv4'],
      answer: 1,
      why: 'Each request crosses the world and back. Host closer (an AWS region in Mumbai) or use a CDN.',
    },
  ],
  interview: [
    {
      q: 'What happens when you type a URL and press Enter? (short version)',
      a: 'The browser resolves the name to an IP with DNS, opens a TCP connection to that IP on port 443, performs a TLS handshake, sends an HTTP request, the server responds, and the browser renders the page, fetching more resources the same way.',
    },
    {
      q: 'Explain the TCP/IP model.',
      a: 'Four layers: Application (HTTP, DNS, SSH), Transport (TCP/UDP with ports), Internet (IP addressing and routing), Link (Ethernet/Wi-Fi frames, MAC addresses). Each layer wraps the one above.',
    },
    {
      q: 'What is the difference between bandwidth and latency?',
      a: 'Bandwidth is capacity, how much data per second. Latency is delay, how long a single trip takes. A big download needs bandwidth; a chatty web app or game needs low latency.',
    },
  ],
  commands: [
    { cmd: 'ping -c 4 google.com', note: 'Is it reachable, and how long does a round trip take?' },
    { cmd: 'traceroute google.com', note: 'Every router hop on the way (Windows: tracert)' },
    { cmd: 'ip addr', note: 'Your device’s IP addresses (Windows: ipconfig)' },
    { cmd: 'curl ifconfig.me', note: 'Your public IP, as the internet sees you' },
  ],
}

export default lesson
