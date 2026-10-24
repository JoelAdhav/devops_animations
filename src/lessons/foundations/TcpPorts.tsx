import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Plug, PlugZap } from 'lucide-react'
import type { Lesson } from '../types'
import { Shell, Tip } from '../../components/Story'
import { At, Box, Envelope, Laptop, Link, Mover, Scene, Server, Tag, Txt } from '../../components/Illustrations'
import { bouncy } from '../../lib/motion'
import type { Tone } from '../../components/Diagram'
import { useLoop } from '../../lib/useLoop'
import { Sequence, type Msg } from '../../components/Sequence'

function Headline({ children }: { children: string }) {
  return (
    <Txt x={280} y={46} cls="ill-label" anchor="middle" size={17}>
      {children}
    </Txt>
  )
}

/* ------------------------------------------------------------------ scenes */

const DOORS = [
  { port: 22, app: 'SSH', tone: 'slate' as Tone },
  { port: 80, app: 'HTTP', tone: 'sky' as Tone },
  { port: 443, app: 'HTTPS', tone: 'green' as Tone },
  { port: 5432, app: 'Postgres', tone: 'amber' as Tone },
]

function Door({ port, app, tone, open, x, y }: { port: number; app: string; tone: Tone; open?: boolean; x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect className="ill-outline" x={-30} y={-46} width={60} height={86} rx={10} style={{ fill: 'var(--panel-3)' }} />
      <motion.rect
        className="ill-outline"
        x={-30}
        y={-46}
        width={60}
        height={86}
        rx={10}
        style={{ fill: `color-mix(in srgb, var(--${tone}) 45%, var(--paper))`, originX: 0 }}
        animate={{ scaleX: open ? 0.25 : 1 }}
        transition={bouncy}
      />
      <text className="ill-label" y={-12} style={{ fontSize: 15, fontFamily: 'var(--mono)' }}>
        {port}
      </text>
      <text className="ill-sub" y={60}>
        {app}
      </text>
    </g>
  )
}

function S0Ports() {
  const i = useLoop(DOORS.length * 2, 900)
  const target = Math.floor(i / 2) % DOORS.length
  const arrived = i % 2 === 1
  return (
    <>
      <Headline>IP finds the computer. The port finds the program.</Headline>
      <At x={330} y={250}>
        <Box w={380} h={240} tone="violet" />
      </At>
      <Txt x={150} y={152} cls="ill-label" size={14}>
        Server 93.184.216.34
      </Txt>
      {DOORS.map((d, k) => (
        <Door key={d.port} {...d} x={200 + k * 88} y={250} open={arrived && k === target} />
      ))}
      <Mover x={arrived ? 200 + target * 88 : 70} y={arrived ? 240 : 250}>
        <Envelope n={DOORS[target].port} tone={DOORS[target].tone} />
      </Mover>
      <Txt x={70} y={300} anchor="middle" cls="ill-sub">
        to: …34:{DOORS[target].port}
      </Txt>
      <Txt x={280} y={410} anchor="middle" cls="ill-sub">
        like a building address (IP) + a flat number (port)
      </Txt>
    </>
  )
}

function S1Ranges() {
  const segs = [
    { from: 0, to: 1023, label: '0 – 1023', name: 'well-known', tone: 'violet' as Tone, w: 120 },
    { from: 1024, to: 49151, label: '1024 – 49151', name: 'registered', tone: 'sky' as Tone, w: 230 },
    { from: 49152, to: 65535, label: '49152 – 65535', name: 'temporary', tone: 'amber' as Tone, w: 130 },
  ]
  let x = 40
  const common = [
    ['22', 'SSH'],
    ['53', 'DNS'],
    ['80', 'HTTP'],
    ['443', 'HTTPS'],
    ['3306', 'MySQL'],
    ['5432', 'Postgres'],
    ['6379', 'Redis'],
    ['8080', 'dev apps'],
  ]
  return (
    <>
      <Headline>65,536 ports on every machine</Headline>
      {segs.map((s, i) => {
        const sx = x
        x += s.w
        return (
          <At key={s.name} x={sx + s.w / 2} y={120} delay={i * 0.15}>
            <Box w={s.w - 6} h={48} tone={s.tone} strong title={s.name} />
            <text className="ill-sub" y={44}>
              {s.label}
            </text>
          </At>
        )
      })}
      {common.map(([p, n], i) => (
        <At key={p} x={100 + (i % 4) * 120} y={250 + Math.floor(i / 4) * 70} delay={0.4 + i * 0.06} t={bouncy}>
          <Tag text={`${p}  ${n}`} mono tone={i < 4 ? 'violet' : 'sky'} w={108} h={38} />
        </At>
      ))}
      <Txt x={280} y={410} anchor="middle" cls="ill-sub">
        memorise these: they come up in every DevOps interview
      </Txt>
    </>
  )
}

function S2Socket() {
  return (
    <>
      <Headline>A connection = IP:port on both ends</Headline>
      <At x={100} y={250}>
        <Laptop title="Browser" />
      </At>
      <At x={470} y={240}>
        <Server title="Web server" />
      </At>
      {[0, 1, 2].map((k) => (
        <g key={k}>
          <Link d={`M160 ${180 + k * 50} H410`} color={['var(--sky)', 'var(--pink)', 'var(--teal)'][k]} width={3} delay={0.2 + k * 0.2} />
          <Txt x={170} y={172 + k * 50} cls="ill-mono" size={11.5} delay={0.3 + k * 0.2}>
            {`192.168.1.5:${51514 + k}`}
          </Txt>
          <Txt x={400} y={172 + k * 50} anchor="end" cls="ill-mono" size={11.5} delay={0.3 + k * 0.2}>
            93.184.216.34:443
          </Txt>
        </g>
      ))}
      <Txt x={280} y={360} anchor="middle" cls="ill-text" delay={0.9}>
        3 browser tabs = 3 connections
      </Txt>
      <Txt x={280} y={385} anchor="middle" cls="ill-sub" delay={1}>
        your side gets a random temporary port; the server side stays 443
      </Txt>
    </>
  )
}

const HANDSHAKE: Msg[] = [
  { from: 'c', label: 'SYN', note: '"can we talk?"' },
  { from: 's', label: 'SYN-ACK', tone: 'violet', note: '"yes, can you hear me?"' },
  { from: 'c', label: 'ACK', note: '"yes!" → connected' },
  { from: 'c', label: 'data: GET /', tone: 'sky' },
  { from: 's', label: 'data: 200 OK', tone: 'green' },
]

function S3Handshake() {
  const t = useLoop(HANDSHAKE.length + 2, 1000)
  return (
    <>
      <Headline>TCP's three-way handshake</Headline>
      <Sequence msgs={HANDSHAKE} t={t} />
    </>
  )
}

const RELIABLE: Msg[] = [
  { from: 'c', label: 'packet #1' },
  { from: 's', label: 'ACK 1', tone: 'green' },
  { from: 'c', label: 'packet #2', lost: true, tone: 'rose' },
  { from: 'c', label: 'packet #3' },
  { from: 's', label: 'still waiting for #2', tone: 'amber' },
  { from: 'c', label: 'packet #2 (resent)' },
  { from: 's', label: 'ACK 3 ✓ all here', tone: 'green' },
]

function S4Reliable() {
  const t = useLoop(RELIABLE.length + 2, 950)
  return (
    <>
      <Headline>TCP checks every delivery</Headline>
      <Sequence msgs={RELIABLE} t={t} gap={40} />
    </>
  )
}

function S5Udp() {
  const t = useLoop(6, 700)
  return (
    <>
      <Headline>TCP vs UDP</Headline>
      <At x={280} y={160}>
        <Box w={500} h={150} tone="sky" />
      </At>
      <Txt x={46} y={108} cls="ill-label" size={15}>
        TCP: reliable, ordered, a bit slower
      </Txt>
      <Txt x={46} y={128} cls="ill-sub">
        handshake, numbers, ACKs, resends
      </Txt>
      {[0, 1, 2].map((k) => (
        <Mover key={k} x={t > k ? 470 : 90} y={175}>
          <g transform={`translate(${k * 26} 0)`}>
            <Envelope n={k + 1} scale={0.7} />
          </g>
        </Mover>
      ))}
      <Txt x={510} y={215} anchor="end" cls="ill-mono" size={12} show={t >= 3}>
        ✓ ACK
      </Txt>
      <At x={280} y={340}>
        <Box w={500} h={150} tone="pink" />
      </At>
      <Txt x={46} y={288} cls="ill-label" size={15}>
        UDP: fire and forget, very fast
      </Txt>
      <Txt x={46} y={308} cls="ill-sub">
        no handshake, no ACKs, lost = gone
      </Txt>
      {[0, 1, 2, 3].map((k) => (
        <Mover key={k} x={k === 2 && t > 2 ? 280 : t > k ? 470 : 90} y={k === 2 && t > 2 ? 395 : 355} show={!(k === 2 && t > 3)}>
          <g transform={`translate(${k * 22} 0)`}>
            <Envelope tone="pink" scale={0.65} />
          </g>
        </Mover>
      ))}
      <Txt x={510} y={400} anchor="end" cls="ill-sub" size={11}>
        used by: video calls, games, DNS
      </Txt>
    </>
  )
}

function S6Listen() {
  const t = useLoop(4, 1300)
  const tryBad = t >= 2
  const arrived = t % 2 === 1
  return (
    <>
      <Headline>A program must be listening on the port</Headline>
      <At x={360} y={240}>
        <Box w={300} h={220} tone="violet" />
      </At>
      <Door port={80} app="nginx: LISTEN" tone="green" x={290} y={240} open={!tryBad && arrived} />
      <g transform="translate(420 240)">
        <rect className="ill-outline" x={-30} y={-46} width={60} height={86} rx={10} style={{ fill: 'var(--panel-3)', strokeDasharray: '6 5' }} />
        <text className="ill-label" y={-12} style={{ fontSize: 15, fontFamily: 'var(--mono)' }}>
          8080
        </text>
        <text className="ill-sub" y={60}>
          nothing here
        </text>
      </g>
      <Mover x={arrived ? (tryBad ? 160 : 290) : 70} y={arrived && tryBad ? 330 : 230}>
        <Envelope tone={tryBad && arrived ? 'rose' : 'amber'} n={tryBad ? 8080 : 80} />
      </Mover>
      <At x={130} y={130} show={arrived}>
        <Tag text={tryBad ? 'Connection refused' : 'Connected ✓'} tone={tryBad ? 'rose' : 'green'} filled />
      </At>
      <Txt x={280} y={410} anchor="middle" cls="ill-sub">
        refused = the machine answered: "nobody is listening on that port"
      </Txt>
    </>
  )
}

function S7Firewall() {
  const t = useLoop(4, 1300)
  const blocked = t >= 2
  const arrived = t % 2 === 1
  return (
    <>
      <Headline>A firewall drops packets silently</Headline>
      <At x={440} y={240}>
        <Server title="App server" sub="10.0.2.15" />
      </At>
      <At x={300} y={240}>
        <g>
          {[0, 1, 2, 3, 4, 5].map((r) => (
            <rect key={r} className="ill-outline" x={-18 + (r % 2) * 6} y={-120 + r * 40} width={30} height={36} rx={4} style={{ fill: 'color-mix(in srgb, var(--rose) 45%, var(--paper))', strokeWidth: 2 }} />
          ))}
        </g>
      </At>
      <Txt x={300} y={392} anchor="middle" cls="ill-label" size={13}>
        Security group
      </Txt>
      <Txt x={300} y={410} anchor="middle" cls="ill-sub" size={11}>
        allow 443 · deny everything else
      </Txt>
      <Mover x={arrived ? (blocked ? 270 : 420) : 70} y={blocked ? 300 : 200}>
        <Envelope tone={blocked && arrived ? 'rose' : 'amber'} n={blocked ? 22 : 443} />
      </Mover>
      <At x={120} y={130} show={arrived}>
        <Tag text={blocked ? '… waiting … timed out' : 'Connected ✓'} tone={blocked ? 'amber' : 'green'} filled />
      </At>
    </>
  )
}

const STEPS = [S0Ports, S1Ranges, S2Socket, S3Handshake, S4Reliable, S5Udp, S6Listen, S7Firewall]

function TcpScene({ step }: { step: number }) {
  const Part = STEPS[step] ?? S0Ports
  return (
    <Scene label="TCP, UDP and ports" h={440}>
      <AnimatePresence mode="wait">
        <motion.g key={step} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
          <Part />
        </motion.g>
      </AnimatePresence>
    </Scene>
  )
}

/* ------------------------------------------------------------- playground */

type Outcome = 'connected' | 'refused' | 'timeout'
const PORT_NAMES: Record<number, string> = { 22: 'ssh', 80: 'http', 443: 'https', 3306: 'mysql', 8080: 'http-alt' }

function ConnectionTester() {
  const [port, setPort] = useState(443)
  const [listening, setListening] = useState(true)
  const [allowed, setAllowed] = useState(true)
  const [phase, setPhase] = useState<'idle' | 'flying' | 'done'>('idle')
  const [result, setResult] = useState<Outcome | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const timers = useRef<number[]>([])

  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  function connect() {
    timers.current.forEach(clearTimeout)
    const outcome: Outcome = !allowed ? 'timeout' : listening ? 'connected' : 'refused'
    setResult(null)
    setElapsed(0)
    setPhase('flying')
    const wait = outcome === 'timeout' ? 3200 : 1100
    if (outcome === 'timeout') {
      for (let s = 1; s <= 3; s++) timers.current.push(window.setTimeout(() => setElapsed(s * 10), s * 1000))
    }
    timers.current.push(
      window.setTimeout(() => {
        setPhase('done')
        setResult(outcome)
      }, wait),
    )
  }

  const out = {
    connected: `Connection to 10.0.2.15 ${port} port [tcp/${PORT_NAMES[port]}] succeeded!`,
    refused: `nc: connect to 10.0.2.15 port ${port} (tcp) failed: Connection refused`,
    timeout: `nc: connect to 10.0.2.15 port ${port} (tcp) timed out: Operation now in progress`,
  }
  const explain = {
    connected: 'Firewall allowed it and a program was listening, so the handshake (SYN, SYN-ACK, ACK) completed.',
    refused: 'The packet reached the server, but nothing listens on that port. The OS instantly replies with a reset (RST). Fix: start the app, or check it listens on the right port and on 0.0.0.0.',
    timeout: 'The firewall dropped the packet without replying, so the client waited and gave up. Fix: open the port in the security group / firewall, from the right source.',
  }

  const envX = phase === 'idle' ? 60 : result === 'refused' ? 60 : result === 'connected' ? 470 : 250

  return (
    <div className="card stage">
      <div className="toolbar">
        <span className="label">Port</span>
        <div className="seg" role="group" aria-label="Port">
          {Object.keys(PORT_NAMES).map((p) => (
            <button key={p} aria-pressed={port === Number(p)} onClick={() => setPort(Number(p))}>
              {p}
            </button>
          ))}
        </div>
        <label className="switch">
          <input type="checkbox" checked={listening} onChange={(e) => setListening(e.target.checked)} />
          App listening on {port}
        </label>
        <label className="switch">
          <input type="checkbox" checked={allowed} onChange={(e) => setAllowed(e.target.checked)} />
          Firewall allows {port}
        </label>
        <button className="btn primary" onClick={connect} disabled={phase === 'flying'}>
          <PlugZap size={16} /> Connect
        </button>
      </div>
      <svg viewBox="0 0 560 200" role="img" aria-label="Connection test animation">
        <rect width="560" height="200" rx="16" className="scene-bg" />
        <g transform="translate(60 120) scale(0.75)">
          <Laptop title="You" />
        </g>
        <g transform="translate(300 100)">
          {[0, 1, 2].map((r) => (
            <rect key={r} className="ill-outline" x={-14} y={-60 + r * 40} width={28} height={36} rx={4} style={{ fill: allowed ? 'color-mix(in srgb, var(--green) 30%, var(--paper))' : 'color-mix(in srgb, var(--rose) 45%, var(--paper))', strokeWidth: 2, opacity: allowed ? 0.5 : 1 }} />
          ))}
          <text className="ill-sub" y={80}>
            firewall
          </text>
        </g>
        <g transform="translate(480 110) scale(0.75)">
          <Server title={listening ? `listening :${port}` : 'nothing listening'} down={!listening} />
        </g>
        <motion.g
          initial={false}
          animate={{ x: phase === 'flying' ? (allowed ? 470 : 260) : envX, y: 60 }}
          transition={{ duration: phase === 'flying' ? 0.9 : 0.6, ease: 'easeInOut' }}
        >
          <Envelope tone={result === 'refused' || result === 'timeout' ? 'rose' : result === 'connected' ? 'green' : 'amber'} n={port} scale={0.8} />
        </motion.g>
        {phase === 'flying' && !allowed && (
          <text className="ill-mono" x={260} y={30} textAnchor="middle">
            waiting… {elapsed}s
          </text>
        )}
      </svg>
      <div className="terminal">
        <header>
          <i />
          <i />
          <i />
          <span style={{ marginLeft: 6 }}>bash</span>
        </header>
        <div className="body" style={{ height: 'auto', minHeight: 70 }}>
          <div className="cmdline">$ nc -zv 10.0.2.15 {port}</div>
          {phase === 'flying' && <div className="dim">…</div>}
          {result && <div className={result === 'connected' ? 'ok' : 'err'}>{out[result]}</div>}
        </div>
      </div>
      <AnimatePresence mode="wait">
        {result && (
          <motion.div key={result} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={`callout tone-${result === 'connected' ? 'green' : result === 'refused' ? 'rose' : 'amber'}`}>
            <strong>{result === 'connected' ? 'Connected' : result === 'refused' ? 'Connection refused (fast)' : 'Timed out (slow)'}</strong>
            {explain[result]}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ------------------------------------------------------------------ lesson */

const lesson: Lesson = {
  id: 'tcp-ports',
  title: 'TCP, UDP and ports',
  track: '',
  tone: 'teal',
  icon: Plug,
  summary: 'How data reaches the right program: ports, sockets, the TCP handshake, reliability, UDP, and why "connection refused" and "timed out" mean different problems.',
  minutes: 12,
  story: {
    Scene: TcpScene,
    sections: [
      {
        title: 'Ports: which program?',
        body: (
          <>
            <p>
              An IP address gets a packet to the right <strong>computer</strong>. But one server runs many programs at once: a
              web server, SSH, a database. Which one should get the packet?
            </p>
            <p>
              That is decided by the <strong>port</strong>: a number from 0 to 65535. Each program that wants to receive data{' '}
              <strong>listens</strong> on a port. A web server listens on 443, SSH on 22, PostgreSQL on 5432.
            </p>
            <Tip>An apartment building. The IP is the building address; the port is the flat number. The postman needs both.</Tip>
          </>
        ),
      },
      {
        title: 'Port numbers to know',
        body: (
          <>
            <p>Ports are grouped into ranges:</p>
            <ul>
              <li>
                <strong>0–1023, well-known ports</strong> for standard services. On Linux, only root can listen on them.
              </li>
              <li>
                <strong>1024–49151, registered ports</strong> used by common software (3306 MySQL, 8080 dev servers).
              </li>
              <li>
                <strong>49152–65535, temporary ports</strong> your computer picks for its side of a connection.
              </li>
            </ul>
            <table className="data-table">
              <tbody>
                <tr><td>22</td><td>SSH: remote login to servers</td></tr>
                <tr><td>53</td><td>DNS: name lookups</td></tr>
                <tr><td>80 / 443</td><td>HTTP / HTTPS: websites</td></tr>
                <tr><td>3306 / 5432</td><td>MySQL / PostgreSQL databases</td></tr>
                <tr><td>6379</td><td>Redis cache</td></tr>
              </tbody>
            </table>
          </>
        ),
      },
      {
        title: 'Sockets: both ends of a connection',
        body: (
          <>
            <p>
              A connection is identified by four things: <strong>your IP and port</strong>, and <strong>the server's IP and port</strong>.
              An IP plus a port, like <code>93.184.216.34:443</code>, is called a <strong>socket</strong>.
            </p>
            <p>
              The server's port is fixed (443), but your side gets a random temporary port, like <code>51514</code>. That is how
              three browser tabs to the same site are kept apart: same server socket, different client ports.
            </p>
          </>
        ),
      },
      {
        title: 'TCP: the three-way handshake',
        body: (
          <>
            <p>
              Most traffic (websites, SSH, databases) uses <strong>TCP</strong>, the Transmission Control Protocol. Before any data
              is sent, TCP sets up a connection with three messages:
            </p>
            <ol>
              <li>
                <strong>SYN</strong>: client: "I'd like to connect."
              </li>
              <li>
                <strong>SYN-ACK</strong>: server: "OK, I acknowledge. Do you hear me?"
              </li>
              <li>
                <strong>ACK</strong>: client: "Yes." Connected.
              </li>
            </ol>
            <p>
              Only then does real data (like an HTTP request) flow. This costs one round trip, which is part of why far-away
              servers feel slow.
            </p>
            <Tip kind="pro">"Explain the TCP handshake" is one of the most common networking interview questions. SYN, SYN-ACK, ACK.</Tip>
          </>
        ),
      },
      {
        title: 'TCP never loses data',
        body: (
          <>
            <p>TCP numbers every packet, and the receiver sends back an <strong>ACK</strong> (acknowledgement) for what it got.</p>
            <p>
              If the sender doesn't get an ACK in time, it <strong>resends</strong>. The receiver also uses the numbers to put
              packets back in order. Result: the data arrives <strong>complete and in order</strong>, or the connection reports an
              error. Your app never sees half a file.
            </p>
            <p>
              When finished, either side closes the connection politely with <strong>FIN</strong> messages. An abrupt close uses{' '}
              <strong>RST</strong> (reset).
            </p>
          </>
        ),
      },
      {
        title: 'UDP: fast, no guarantees',
        body: (
          <>
            <p>
              <strong>UDP</strong> (User Datagram Protocol) skips all of that: no handshake, no ACKs, no resends. It just sends.
              Some packets may be lost or arrive out of order, and UDP won't notice.
            </p>
            <p>Why would anyone want that? Speed. For live things, a late packet is useless anyway:</p>
            <ul>
              <li>Video and voice calls (a lost frame is better than a frozen call)</li>
              <li>Online games</li>
              <li>
                <strong>DNS</strong> lookups (tiny, quick question and answer, port 53)
              </li>
            </ul>
            <Tip>TCP is a registered courier with signatures. UDP is throwing flyers over a wall.</Tip>
          </>
        ),
      },
      {
        title: 'Listening and "connection refused"',
        body: (
          <>
            <p>
              A port only works if a program is <strong>listening</strong> on it. If you connect to a port where nothing listens,
              the server's operating system replies instantly with a reset, and you see:
            </p>
            <Shell>{`$ curl localhost:8080
curl: (7) Failed to connect to localhost port 8080: Connection refused`}</Shell>
            <p>
              <strong>Refused means the machine is reachable, but the app isn't there.</strong> It crashed, it isn't started, or it
              listens on a different port. Check what is listening with:
            </p>
            <Shell>{`$ sudo ss -tulnp
tcp  LISTEN  0.0.0.0:80   users:(("nginx",pid=812))
tcp  LISTEN  0.0.0.0:22   users:(("sshd",pid=640))`}</Shell>
          </>
        ),
      },
      {
        title: 'Firewalls and "timed out"',
        body: (
          <>
            <p>
              A <strong>firewall</strong> decides which ports may be reached, and from where. In AWS this is the{' '}
              <strong>security group</strong>. Most firewalls <strong>drop</strong> blocked packets silently: no reply at all.
            </p>
            <p>
              So the client keeps waiting, retries, and finally gives up with <strong>"Connection timed out"</strong>. That usually
              takes 20 to 75 seconds.
            </p>
            <table className="data-table">
              <tbody>
                <tr>
                  <td>refused</td>
                  <td>fast. Reached the machine, nothing listening → check the app.</td>
                </tr>
                <tr>
                  <td>timed out</td>
                  <td>slow. Blocked on the way → check security groups, firewalls, routes.</td>
                </tr>
              </tbody>
            </table>
            <Tip kind="pro">Knowing this difference lets you jump straight to the right fix during an outage. Interviewers love it.</Tip>
          </>
        ),
      },
    ],
  },
  Playground: ConnectionTester,
  playgroundIntro: 'Pick a port, turn the app and the firewall on or off, and connect. Compare the three possible results.',
  terms: [
    { term: 'Port', def: 'A number 0–65535 that identifies which program on a machine gets the data.' },
    { term: 'Socket', def: 'An IP address plus a port, e.g. 10.0.1.5:443. A connection has one at each end.' },
    { term: 'Listening', def: 'A program waiting for connections on a port.' },
    { term: 'TCP', def: 'Reliable, ordered, connection-based transport. Used by HTTP, SSH, databases.' },
    { term: 'UDP', def: 'Connectionless, unreliable but fast transport. Used by DNS, video calls, games.' },
    { term: 'Handshake', def: 'SYN → SYN-ACK → ACK, the three messages that open a TCP connection.' },
    { term: 'ACK', def: 'Acknowledgement: "I received your data up to here".' },
    { term: 'RST', def: 'Reset: abruptly rejects or ends a connection. Causes "connection refused".' },
    { term: 'Firewall / security group', def: 'Rules that allow or block traffic by port and source.' },
  ],
  quiz: [
    {
      q: 'Which port does HTTPS use by default?',
      options: ['22', '80', '443', '3306'],
      answer: 2,
      why: 'HTTPS is 443. HTTP is 80, SSH is 22, MySQL is 3306.',
    },
    {
      q: 'What is the correct order of the TCP handshake?',
      options: ['ACK, SYN, SYN-ACK', 'SYN, SYN-ACK, ACK', 'SYN, ACK, FIN', 'HELLO, OK, GO'],
      answer: 1,
      why: 'Client sends SYN, server answers SYN-ACK, client confirms with ACK.',
    },
    {
      q: '`curl app:8080` instantly says "Connection refused". Most likely cause?',
      options: ['Security group blocks 8080', 'No program is listening on 8080', 'DNS is broken', 'The internet is down'],
      answer: 1,
      why: 'Refused is fast: the machine answered with a reset. Nothing listens there. A firewall block would time out instead.',
    },
    {
      q: 'Which protocol would a video call prefer?',
      options: ['TCP', 'UDP'],
      answer: 1,
      why: 'For live media, a late resend is useless. UDP keeps latency low.',
    },
  ],
  interview: [
    {
      q: 'What is the difference between TCP and UDP?',
      a: 'TCP is connection-based (handshake), reliable (ACKs and retransmits) and ordered, with more overhead. UDP has no connection or delivery guarantees but is faster and lighter. Web, SSH and databases use TCP; DNS, streaming, VoIP and games use UDP.',
    },
    {
      q: 'Connection refused vs connection timed out?',
      a: 'Refused: the host replied with RST because nothing listens on that port; check the service and its listen address. Timed out: no reply at all, usually a firewall or security group dropping packets or a routing problem.',
    },
    {
      q: 'How do you check which ports a server is listening on?',
      a: 'sudo ss -tulnp (or netstat -tulnp). It shows protocol, local address:port and the owning process. Then test from outside with nc -zv host port or curl.',
    },
  ],
  commands: [
    { cmd: 'sudo ss -tulnp', note: 'What is listening on which port, and which process' },
    { cmd: 'nc -zv 10.0.2.15 443', note: 'Can I open a TCP connection to that port?' },
    { cmd: 'curl -v telnet://host:5432', note: 'Port test when nc is not installed' },
    { cmd: 'sudo lsof -i :8080', note: 'Which process is using port 8080?' },
  ],
}

export default lesson
