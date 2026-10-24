import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Binary } from 'lucide-react'
import type { Lesson } from '../types'
import { Shell, Tip } from '../../components/Story'
import { At, Box, Cloud, Laptop, Link, Router, Scene, Tag, Txt } from '../../components/Illustrations'
import { bouncy } from '../../lib/motion'
import type { Tone } from '../../components/Diagram'
import { useLoop } from '../../lib/useLoop'

/* ------------------------------------------------------------------ helpers */

export function ipToInt(ip: string): number | null {
  const parts = ip.trim().split('.')
  if (parts.length !== 4) return null
  let n = 0
  for (const p of parts) {
    if (!/^\d{1,3}$/.test(p)) return null
    const v = Number(p)
    if (v > 255) return null
    n = n * 256 + v
  }
  return n
}

export function intToIp(n: number) {
  return [24, 16, 8, 0].map((s) => (n >>> s) & 255).join('.')
}

function maskOf(prefix: number) {
  return prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0
}

const fmt = (n: number) => n.toLocaleString('en-IN')

/* ------------------------------------------------------------------ scenes */

function Headline({ children }: { children: string }) {
  return (
    <Txt x={280} y={46} cls="ill-label" anchor="middle" size={17}>
      {children}
    </Txt>
  )
}

const OCTETS = ['192', '168', '1', '10']

function S0Anatomy() {
  return (
    <>
      <Headline>An IPv4 address is 4 numbers</Headline>
      {OCTETS.map((o, i) => (
        <At key={i} x={110 + i * 112} y={200} delay={i * 0.12} t={bouncy}>
          <Box w={84} h={70} tone="sky" strong />
          <text className="ill-label" y={10} style={{ fontSize: 26, fontFamily: 'var(--mono)' }}>
            {o}
          </text>
          <text className="ill-sub" y={62}>
            octet {i + 1}
          </text>
        </At>
      ))}
      {[0, 1, 2].map((i) => (
        <Txt key={i} x={166 + i * 112} y={214} anchor="middle" cls="ill-label" size={30} delay={0.5}>
          .
        </Txt>
      ))}
      <Txt x={280} y={330} anchor="middle" cls="ill-text" delay={0.6}>
        each number (an "octet") can be 0 to 255
      </Txt>
      <Txt x={280} y={356} anchor="middle" cls="ill-mono" delay={0.8}>
        4 octets × 8 bits = 32 bits in total
      </Txt>
    </>
  )
}

const PLACES = [128, 64, 32, 16, 8, 4, 2, 1]
const SAMPLES = [192, 168, 10, 255, 0]

function S1Binary() {
  const i = useLoop(SAMPLES.length, 2200)
  const v = SAMPLES[i]
  const on = PLACES.map((p) => (v & p) !== 0)
  return (
    <>
      <Headline>Inside each octet: 8 on/off bits</Headline>
      {PLACES.map((p, k) => (
        <g key={p} transform={`translate(${70 + k * 60} 190)`}>
          <text className="ill-sub" y={-44}>
            {p}
          </text>
          <motion.rect
            className="ill-outline"
            x={-24}
            y={-28}
            width={48}
            height={56}
            rx={10}
            animate={{ fill: on[k] ? 'var(--amber)' : 'var(--paper)', scale: on[k] ? 1.06 : 1 }}
            transition={bouncy}
          />
          <text className="ill-label" y={9} style={{ fontSize: 22, fontFamily: 'var(--mono)' }}>
            {on[k] ? 1 : 0}
          </text>
        </g>
      ))}
      <AnimatePresence mode="wait">
        <motion.g key={v} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
          <text className="ill-mono" x={280} y={290} textAnchor="middle" style={{ fontSize: 15 }}>
            {PLACES.filter((p) => v & p).join(' + ') || '0'} = {v}
          </text>
          <text className="ill-label" x={280} y={340} textAnchor="middle" style={{ fontSize: 22 }}>
            {v.toString(2).padStart(8, '0')} → {v}
          </text>
        </motion.g>
      </AnimatePresence>
      <Txt x={280} y={400} anchor="middle" cls="ill-sub">
        all 8 bits on: 128+64+32+16+8+4+2+1 = 255, the maximum
      </Txt>
    </>
  )
}

function House({ label, tone = 'amber' as Tone }: { label: string; tone?: Tone }) {
  return (
    <g>
      <path className="ill-outline" d="M-24 -6 L0 -28 L24 -6 Z" style={{ fill: `color-mix(in srgb, var(--rose) 55%, var(--paper))` }} />
      <rect className="ill-outline" x={-20} y={-6} width={40} height={34} rx={4} style={{ fill: `color-mix(in srgb, var(--${tone}) 35%, var(--paper))` }} />
      <rect x={-6} y={10} width={12} height={18} rx={2} fill="var(--ink)" />
      <text className="ill-mono" y={50} textAnchor="middle" style={{ fontWeight: 700 }}>
        {label}
      </text>
    </g>
  )
}

function S2NetHost() {
  return (
    <>
      <Headline>Network part + host part</Headline>
      <At x={280} y={110}>
        <g>
          <rect className="ill-outline" x={-160} y={-24} width={210} height={48} rx={12} style={{ fill: 'color-mix(in srgb, var(--violet) 35%, var(--paper))' }} />
          <text className="ill-label" x={-55} y={8} style={{ fontSize: 22, fontFamily: 'var(--mono)' }}>
            192.168.1
          </text>
          <rect className="ill-outline" x={58} y={-24} width={90} height={48} rx={12} style={{ fill: 'color-mix(in srgb, var(--amber) 45%, var(--paper))' }} />
          <text className="ill-label" x={103} y={8} style={{ fontSize: 22, fontFamily: 'var(--mono)' }}>
            .10
          </text>
        </g>
      </At>
      <Txt x={225} y={160} anchor="middle" cls="ill-sub" delay={0.3}>
        network = the street
      </Txt>
      <Txt x={383} y={160} anchor="middle" cls="ill-sub" delay={0.3}>
        host = house no.
      </Txt>
      <rect x={40} y={316} width={480} height={22} rx={6} style={{ fill: 'var(--border-strong)' }} />
      <At x={110} y={208} delay={0.35}>
        <Tag text="192.168.1 street" tone="violet" />
      </At>
      {['.1', '.2', '.10', '.25'].map((h, i) => (
        <At key={h} x={130 + i * 100} y={280} delay={0.45 + i * 0.1} t={bouncy}>
          <House label={h} tone={h === '.10' ? 'amber' : 'sky'} />
        </At>
      ))}
      <Txt x={280} y={400} anchor="middle" cls="ill-sub" delay={0.8}>
        same street = same network → they can talk directly
      </Txt>
    </>
  )
}

function BitBar({ prefix, y, showLabels = true }: { prefix: number; y: number; showLabels?: boolean }) {
  const cell = 14
  const x0 = 280 - (32 * cell + 3 * 6) / 2
  return (
    <g>
      {Array.from({ length: 32 }, (_, k) => {
        const x = x0 + k * cell + Math.floor(k / 8) * 6
        const net = k < prefix
        return (
          <motion.rect
            key={k}
            x={x}
            y={y}
            width={cell - 3}
            height={34}
            rx={3}
            stroke="var(--ink)"
            strokeWidth={1.5}
            animate={{ fill: net ? 'var(--violet)' : 'var(--amber)' }}
            transition={{ ...bouncy, delay: Math.abs(k - prefix) * 0.015 }}
          />
        )
      })}
      {showLabels && (
        <>
          <text className="ill-sub" x={x0} y={y + 54} style={{ textAnchor: 'start' }}>
            network bits: fixed ({prefix})
          </text>
          <text className="ill-sub" x={x0 + 32 * cell + 18} y={y + 54} style={{ textAnchor: 'end' }}>
            host bits: free ({32 - prefix})
          </text>
        </>
      )}
    </g>
  )
}

function S3Cidr() {
  return (
    <>
      <Headline>CIDR: the /24 says how many bits are fixed</Headline>
      <At x={280} y={110}>
        <Tag text="192.168.1.0/24" mono tone="sky" size={20} h={44} />
      </At>
      <BitBar prefix={24} y={170} />
      <Txt x={280} y={290} anchor="middle" cls="ill-text" delay={0.3}>
        8 free bits → 2⁸ = 256 addresses
      </Txt>
      <At x={180} y={340} delay={0.5}>
        <Tag text="192.168.1.0" mono tone="green" />
      </At>
      <Txt x={280} y={345} anchor="middle" cls="ill-label">
        to
      </Txt>
      <At x={380} y={340} delay={0.6}>
        <Tag text="192.168.1.255" mono tone="green" />
      </At>
    </>
  )
}

const SIZES = [
  { p: 16, n: 65536, ex: '10.0.0.0/16', note: 'a whole VPC' },
  { p: 24, n: 256, ex: '10.0.1.0/24', note: 'a typical subnet' },
  { p: 28, n: 16, ex: '10.0.1.0/28', note: 'a tiny subnet' },
  { p: 32, n: 1, ex: '203.0.113.7/32', note: 'exactly one IP' },
]

function S4Sizes() {
  const i = useLoop(SIZES.length, 2200)
  const s = SIZES[i]
  return (
    <>
      <Headline>Smaller number after the slash = bigger network</Headline>
      <BitBar prefix={s.p} y={90} />
      {SIZES.map((z, k) => (
        <g key={z.p} transform={`translate(${70 + k * 140} 250)`}>
          <motion.g animate={{ scale: k === i ? 1.12 : 1, opacity: k === i ? 1 : 0.55 }} transition={bouncy}>
            <Box w={120} h={92} tone={k === i ? 'amber' : 'slate'} strong={k === i} />
            <text className="ill-label" y={-14} style={{ fontSize: 22, fontFamily: 'var(--mono)' }}>
              /{z.p}
            </text>
            <text className="ill-mono" y={10} textAnchor="middle" style={{ fontWeight: 700 }}>
              {fmt(z.n)}
            </text>
            <text className="ill-sub" y={30}>
              {z.n === 1 ? 'address' : 'addresses'}
            </text>
          </motion.g>
        </g>
      ))}
      <AnimatePresence mode="wait">
        <motion.text key={s.p} className="ill-text" x={280} y={360} textAnchor="middle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          {s.ex}: {s.note}
        </motion.text>
      </AnimatePresence>
      <Txt x={280} y={395} anchor="middle" cls="ill-mono">
        addresses = 2 ^ (32 − prefix)
      </Txt>
    </>
  )
}

const RESERVED: Record<number, string> = { 0: 'network', 1: 'VPC router', 2: 'DNS', 3: 'future', 15: 'broadcast' }

function S5Reserved() {
  return (
    <>
      <Headline>Not every address is usable (AWS keeps 5)</Headline>
      <At x={280} y={90}>
        <Tag text="10.0.1.0/28 → 16 addresses" mono tone="sky" />
      </At>
      {Array.from({ length: 16 }, (_, k) => {
        const col = k % 4
        const row = Math.floor(k / 4)
        const r = RESERVED[k]
        return (
          <At key={k} x={130 + col * 100} y={150 + row * 62} delay={k * 0.04} t={bouncy}>
            <Box w={88} h={48} tone={r ? 'rose' : 'green'} strong />
            <text className="ill-mono" y={r ? -2 : 5} textAnchor="middle" style={{ fontWeight: 700 }}>
              .{k}
            </text>
            {r && (
              <text className="ill-sub" y={14} style={{ fontSize: 10 }}>
                {r}
              </text>
            )}
          </At>
        )
      })}
      <Txt x={280} y={418} anchor="middle" cls="ill-text" delay={0.8}>
        16 − 5 reserved = 11 usable for servers
      </Txt>
    </>
  )
}

function S6Private() {
  return (
    <>
      <Headline>Private vs public addresses</Headline>
      <At x={150} y={240}>
        <Box w={240} h={290} tone="teal" dashed />
      </At>
      <Txt x={50} y={115} cls="zone-label">
        private network (your home / VPC)
      </Txt>
      <At x={100} y={190} delay={0.1}>
        <g transform="scale(0.7)">
          <Laptop title="192.168.1.5" />
        </g>
      </At>
      <At x={205} y={190} delay={0.2}>
        <g transform="scale(0.7)">
          <Laptop title="192.168.1.6" tone="pink" />
        </g>
      </At>
      <At x={150} y={320} delay={0.3}>
        <Router title="Router (NAT)" sub="public: 49.36.12.8" />
      </At>
      <Link d="M205 330 Q300 330 360 250" dashed arrow delay={0.5} />
      <At x={440} y={210} delay={0.4}>
        <Cloud title="Internet" sub="public IPs only" />
      </At>
      <Txt x={320} y={330} cls="ill-mono" delay={0.6} size={12}>
        10.0.0.0/8
      </Txt>
      <Txt x={320} y={350} cls="ill-mono" delay={0.7} size={12}>
        172.16.0.0/12
      </Txt>
      <Txt x={320} y={370} cls="ill-mono" delay={0.8} size={12}>
        192.168.0.0/16
      </Txt>
      <Txt x={320} y={395} cls="ill-sub" delay={0.9}>
        ↑ private: never on the internet
      </Txt>
    </>
  )
}

function S7Vpc() {
  return (
    <>
      <Headline>Carving a VPC into subnets</Headline>
      <At x={280} y={240}>
        <Box w={480} h={320} tone="violet" />
      </At>
      <Txt x={56} y={106} cls="ill-label" size={15}>
        VPC 10.0.0.0/16 (65,536 addresses)
      </Txt>
      <At x={170} y={200} delay={0.3} t={bouncy}>
        <Box w={200} h={90} tone="sky" strong title="Public subnet" sub="10.0.1.0/24 · 256" />
      </At>
      <At x={390} y={200} delay={0.45} t={bouncy}>
        <Box w={200} h={90} tone="teal" strong title="Private subnet" sub="10.0.2.0/24 · 256" />
      </At>
      <At x={280} y={320} delay={0.6}>
        <Box w={420} h={70} tone="slate" dashed title="Room for 254 more /24 subnets" sub="10.0.3.0/24 … 10.0.255.0/24" />
      </At>
    </>
  )
}

function S8Special() {
  const rows = [
    { tag: '127.0.0.1', tone: 'pink' as Tone, text: 'localhost: "this same machine"' },
    { tag: '0.0.0.0/0', tone: 'amber' as Tone, text: 'every address (routes, firewall rules)' },
    { tag: '0.0.0.0:80', tone: 'sky' as Tone, text: 'server listens on all network cards' },
    { tag: '2001:db8::1', tone: 'violet' as Tone, text: 'IPv6: 128 bits, written in hex' },
  ]
  return (
    <>
      <Headline>Special addresses you will see daily</Headline>
      {rows.map((r, i) => (
        <g key={r.tag}>
          <At x={140} y={120 + i * 80} delay={i * 0.12} t={bouncy}>
            <Tag text={r.tag} mono tone={r.tone} w={170} h={40} size={15} />
          </At>
          <Txt x={240} y={125 + i * 80} cls="ill-text" delay={0.1 + i * 0.12}>
            {r.text}
          </Txt>
        </g>
      ))}
    </>
  )
}

const STEPS = [S0Anatomy, S1Binary, S2NetHost, S3Cidr, S4Sizes, S5Reserved, S6Private, S7Vpc, S8Special]

function IpScene({ step }: { step: number }) {
  const Part = STEPS[step] ?? S0Anatomy
  return (
    <Scene label="IP addresses and CIDR" h={440}>
      <AnimatePresence mode="wait">
        <motion.g key={step} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
          <Part />
        </motion.g>
      </AnimatePresence>
    </Scene>
  )
}

/* ------------------------------------------------------------- playground */

function CidrCalculator() {
  const [ip, setIp] = useState('10.0.1.37')
  const [prefix, setPrefix] = useState(24)
  const [aws, setAws] = useState(true)
  const [probe, setProbe] = useState('10.0.1.200')

  const n = ipToInt(ip)
  const valid = n !== null
  const mask = maskOf(prefix)
  const net = valid ? (n & mask) >>> 0 : 0
  const bcast = valid ? (net | (~mask >>> 0)) >>> 0 : 0
  const total = 2 ** (32 - prefix)
  const reserved = aws ? 5 : 2
  const usable = prefix >= 31 ? (prefix === 32 ? 1 : 2) : Math.max(0, total - reserved)
  const firstUsable = prefix >= 31 ? net : net + (aws ? 4 : 1)
  const lastUsable = prefix >= 31 ? bcast : bcast - 1
  const probeN = ipToInt(probe)
  const inside = probeN !== null && valid ? ((probeN & mask) >>> 0) === net : null
  const bits = valid ? n.toString(2).padStart(32, '0') : ''.padStart(32, '0')

  const rows = [
    ['Network address', `${intToIp(net)}/${prefix}`],
    ['Subnet mask', intToIp(mask)],
    ['Total addresses', fmt(total)],
    [`Usable (${aws ? 'AWS, minus 5' : 'normal, minus 2'})`, fmt(usable)],
    ['First usable', intToIp(firstUsable)],
    ['Last usable', intToIp(lastUsable)],
    ['Broadcast', intToIp(bcast)],
  ]

  return (
    <div className="card stage">
      <div className="toolbar" style={{ alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label className="label" htmlFor="cidr-ip">
            IP address
          </label>
          <input id="cidr-ip" className="text-input" value={ip} onChange={(e) => setIp(e.target.value)} aria-invalid={!valid} style={{ width: 180 }} />
          {!valid && <span className="field-error">Use four numbers 0–255, like 10.0.1.37</span>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: '1 1 240px' }}>
          <label className="label" htmlFor="cidr-prefix">
            Prefix: /{prefix}
          </label>
          <input id="cidr-prefix" type="range" min={8} max={32} step={1} value={prefix} onChange={(e) => setPrefix(Number(e.target.value))} style={{ marginTop: 10 }} />
        </div>
        <label className="switch" style={{ marginTop: 22 }}>
          <input type="checkbox" checked={aws} onChange={(e) => setAws(e.target.checked)} />
          AWS subnet rules
        </label>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <div style={{ display: 'flex', gap: 10, minWidth: 560 }} className="mono">
          {[0, 1, 2, 3].map((o) => (
            <div key={o} style={{ display: 'flex', gap: 2, flex: 1 }}>
              {bits
                .slice(o * 8, o * 8 + 8)
                .split('')
                .map((b, k) => {
                  const idx = o * 8 + k
                  const isNet = idx < prefix
                  return (
                    <motion.span
                      key={k}
                      layout
                      animate={{ backgroundColor: isNet ? 'color-mix(in srgb, var(--violet) 70%, white)' : 'color-mix(in srgb, var(--amber) 70%, white)' }}
                      style={{ flex: 1, textAlign: 'center', borderRadius: 5, border: '1.5px solid var(--ink)', fontSize: 13, fontWeight: 700, color: '#1e2742', padding: '4px 0' }}
                    >
                      {b}
                    </motion.span>
                  )
                })}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 6, minWidth: 560 }} className="muted">
          <span>■ violet: network part ({prefix} bits)</span>
          <span>■ amber: host part ({32 - prefix} bits)</span>
        </div>
      </div>

      <div className="mini-tables">
        <div className="mini-table">
          <header>Result</header>
          {rows.map(([k, v]) => (
            <div className="row" key={k}>
              <span style={{ fontFamily: 'var(--font)' }}>{k}</span>
              <span style={{ fontWeight: 700 }}>{valid ? v : '–'}</span>
            </div>
          ))}
        </div>
        <div className="mini-table" style={{ alignSelf: 'start' }}>
          <header>Is this IP inside the subnet?</header>
          <div className="row" style={{ alignItems: 'center' }}>
            <input className="text-input" value={probe} onChange={(e) => setProbe(e.target.value)} aria-label="IP to test" aria-invalid={probeN === null} style={{ width: 160, height: 34 }} />
            <span style={{ fontWeight: 700, color: inside === null ? 'var(--muted)' : inside ? 'var(--green)' : 'var(--rose)' }}>
              {inside === null ? 'enter a valid IP' : inside ? 'yes, inside' : 'no, outside'}
            </span>
          </div>
          <div className="row" style={{ fontFamily: 'var(--font)', whiteSpace: 'normal' }}>
            <span className="muted">Same network part = same subnet. Try changing the prefix.</span>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ lesson */

const lesson: Lesson = {
  id: 'ip-cidr',
  title: 'IP addresses and CIDR',
  track: '',
  tone: 'violet',
  icon: Binary,
  summary: 'How IPv4 addresses really work: octets, binary, network vs host, /24 notation, subnet sizes, private ranges and how a VPC is split into subnets.',
  minutes: 14,
  story: {
    Scene: IpScene,
    sections: [
      {
        title: 'Four numbers with dots',
        body: (
          <>
            <p>
              An IPv4 address like <code>192.168.1.10</code> is four numbers separated by dots. Each number is called an{' '}
              <strong>octet</strong> and can go from <strong>0 to 255</strong>. So <code>10.0.0.1</code> and{' '}
              <code>255.255.255.0</code> are valid, but <code>192.168.1.300</code> is not.
            </p>
            <p>Why 255? Because each octet is stored as 8 bits, and the next part shows what that means.</p>
          </>
        ),
      },
      {
        title: 'Binary in 2 minutes',
        body: (
          <>
            <p>
              Computers store everything as <strong>bits</strong>: switches that are either 0 (off) or 1 (on). An octet has 8
              bits. Each position has a fixed value, from left to right: <code>128 64 32 16 8 4 2 1</code>.
            </p>
            <p>
              To read a binary number, <strong>add the values of the switches that are on</strong>. <code>11000000</code> has
              128 and 64 on, so it is 192.
            </p>
            <p>
              All switches on is 255, all off is 0. So an IP address is really 4 × 8 = <strong>32 bits</strong>. You don't need
              to convert by hand at work, but this is the key to understanding everything that follows.
            </p>
          </>
        ),
      },
      {
        title: 'Network part and host part',
        body: (
          <>
            <p>Every IP address has two halves:</p>
            <ul>
              <li>
                The <strong>network part</strong> (the start) says which network the device is on. Like the street name.
              </li>
              <li>
                The <strong>host part</strong> (the end) identifies one device on that network. Like the house number.
              </li>
            </ul>
            <p>
              Devices with the same network part are on the <strong>same network</strong> and can talk directly. To reach a
              different network, packets must go through a router.
            </p>
            <Tip>All houses on "192.168.1 Street" can walk to each other. To visit another street, you go through the junction (the router).</Tip>
          </>
        ),
      },
      {
        title: 'CIDR: what /24 means',
        body: (
          <>
            <p>
              But where does the network part end? That is what the number after the slash says. This is called{' '}
              <strong>CIDR notation</strong> (Classless Inter-Domain Routing, pronounced "cider").
            </p>
            <p>
              <code>192.168.1.0/24</code> means: <strong>the first 24 bits are the network and are fixed</strong>. The last 8
              bits are free for hosts. 8 free bits can make 2⁸ = <strong>256</strong> combinations, so this network contains{' '}
              <code>192.168.1.0</code> to <code>192.168.1.255</code>.
            </p>
            <p>
              The same thing is sometimes written as a <strong>subnet mask</strong>: <code>255.255.255.0</code> (24 ones, then 8
              zeros).
            </p>
          </>
        ),
      },
      {
        title: 'Bigger and smaller networks',
        body: (
          <>
            <p>
              The formula is: <strong>addresses = 2 ^ (32 − prefix)</strong>. Fewer fixed bits means more free bits, so a{' '}
              <strong>smaller number after the slash is a bigger network</strong>.
            </p>
            <table className="data-table">
              <tbody>
                <tr>
                  <td>/16</td>
                  <td>65,536 addresses: a whole VPC</td>
                </tr>
                <tr>
                  <td>/24</td>
                  <td>256: a typical subnet</td>
                </tr>
                <tr>
                  <td>/28</td>
                  <td>16: a tiny subnet</td>
                </tr>
                <tr>
                  <td>/32</td>
                  <td>1: exactly one IP (used in firewall rules)</td>
                </tr>
              </tbody>
            </table>
            <Tip kind="pro">Every step of 1 in the prefix halves or doubles the size. /23 is 512, /25 is 128.</Tip>
          </>
        ),
      },
      {
        title: 'Reserved addresses',
        body: (
          <>
            <p>You can't give every address to a server. In any normal network, two are reserved:</p>
            <ul>
              <li>
                The <strong>first</strong> (<code>.0</code>) is the <strong>network address</strong>: the name of the network
                itself.
              </li>
              <li>
                The <strong>last</strong> (<code>.255</code> in a /24) is the <strong>broadcast address</strong>: send to it and
                everyone on the network receives it.
              </li>
            </ul>
            <p>
              <strong>AWS reserves 5 in every subnet</strong>: the first four (network, VPC router at .1, DNS at .2, one for the
              future at .3) and the last one. So a /24 subnet in AWS gives you 251 usable IPs, and a /28 gives just 11.
            </p>
          </>
        ),
      },
      {
        title: 'Private and public IPs',
        body: (
          <>
            <p>
              Three ranges are set aside as <strong>private</strong>. They are used inside homes, offices and VPCs, and are
              never routed on the public internet:
            </p>
            <Shell>{`10.0.0.0/8        # 10.x.x.x       (AWS VPCs usually use this)
172.16.0.0/12     # 172.16 – 172.31
192.168.0.0/16    # 192.168.x.x    (home Wi-Fi)`}</Shell>
            <p>
              Because they are private, millions of homes can all use <code>192.168.1.5</code> at the same time without conflict.
              Every other address is <strong>public</strong> and must be unique worldwide. Private devices reach the internet
              through <strong>NAT</strong>, which you met in lesson 1.
            </p>
          </>
        ),
      },
      {
        title: 'Splitting a VPC into subnets',
        body: (
          <>
            <p>
              In AWS you create a <strong>VPC</strong> (your private network in the cloud) with a big block, usually{' '}
              <code>10.0.0.0/16</code>. Then you cut it into smaller <strong>subnets</strong>, for example:
            </p>
            <ul>
              <li>
                <code>10.0.1.0/24</code> for public things like load balancers
              </li>
              <li>
                <code>10.0.2.0/24</code> for private app servers and databases
              </li>
            </ul>
            <p>
              Subnets inside one VPC must <strong>not overlap</strong>, and if you ever want to connect two VPCs, their ranges
              must not overlap either. Plan ranges before you build.
            </p>
            <Tip kind="pro">"How many usable IPs in a /26 in AWS?" → 2⁶ = 64, minus 5 = 59.</Tip>
          </>
        ),
      },
      {
        title: 'Special addresses',
        body: (
          <>
            <ul>
              <li>
                <code>127.0.0.1</code> (<strong>localhost</strong>): always means "this same machine". <code>curl localhost:8080</code>{' '}
                talks to an app on your own computer.
              </li>
              <li>
                <code>0.0.0.0/0</code>: <strong>all addresses</strong>. In a route table it means "everything else"; in a security
                group rule it means "anyone on the internet".
              </li>
              <li>
                A server listening on <code>0.0.0.0</code> accepts connections on all its network cards, while{' '}
                <code>127.0.0.1</code> accepts only local ones. A classic bug: an app inside Docker listening on 127.0.0.1 can't be
                reached from outside.
              </li>
              <li>
                <strong>IPv6</strong> addresses are 128 bits written in hex, like <code>2001:db8::1</code>. Same ideas, far more
                addresses.
              </li>
            </ul>
          </>
        ),
      },
    ],
  },
  Playground: CidrCalculator,
  playgroundIntro: 'A real subnet calculator. Type any IP, drag the prefix, and watch the network and host bits change.',
  terms: [
    { term: 'IPv4', def: 'A 32-bit address written as four octets, e.g. 10.0.1.25.' },
    { term: 'Octet', def: 'One of the four numbers in an IPv4 address. 8 bits, 0–255.' },
    { term: 'CIDR', def: 'Notation like /24 that says how many leading bits are the network part.' },
    { term: 'Subnet mask', def: 'The same information as a prefix, written like an IP: /24 = 255.255.255.0.' },
    { term: 'Subnet', def: 'A smaller network carved out of a bigger range.' },
    { term: 'Network address', def: 'The first address of a subnet. Names the network itself.' },
    { term: 'Broadcast address', def: 'The last address of a subnet. Sending to it reaches every host.' },
    { term: 'Private IP', def: 'An address from 10/8, 172.16/12 or 192.168/16. Not routed on the internet.' },
    { term: 'Public IP', def: 'A globally unique address reachable on the internet.' },
    { term: 'localhost', def: '127.0.0.1, the machine you are on.' },
    { term: '0.0.0.0/0', def: 'Every IPv4 address. Used for default routes and "allow from anywhere" rules.' },
  ],
  quiz: [
    {
      q: 'How many addresses are in a /24?',
      options: ['24', '128', '256', '65,536'],
      answer: 2,
      why: '32 − 24 = 8 free bits, and 2⁸ = 256.',
    },
    {
      q: 'Which network is bigger: 10.0.0.0/16 or 10.0.0.0/24?',
      options: ['/16', '/24', 'They are the same size', 'You can’t tell'],
      answer: 0,
      why: 'Fewer fixed bits means more free bits. /16 has 65,536 addresses, /24 has 256.',
    },
    {
      q: 'How many usable IPs does an AWS /28 subnet have?',
      options: ['16', '14', '11', '28'],
      answer: 2,
      why: 'A /28 has 16 addresses. AWS reserves 5, leaving 11.',
    },
    {
      q: 'Is 172.20.5.4 a private or public IP?',
      options: ['Private', 'Public'],
      answer: 0,
      why: '172.16.0.0/12 covers 172.16.0.0 to 172.31.255.255, so 172.20.x.x is private.',
    },
    {
      q: 'Are 10.0.1.20 and 10.0.2.20 in the same /24 subnet?',
      options: ['Yes', 'No'],
      answer: 1,
      why: 'In a /24 the first three octets are the network part: 10.0.1 vs 10.0.2. Different networks.',
    },
  ],
  interview: [
    {
      q: 'What is CIDR? How many hosts are in a /26?',
      a: 'CIDR notation gives the network prefix length. /26 leaves 6 host bits: 2⁶ = 64 addresses, 62 usable normally (minus network and broadcast), 59 in AWS (minus 5).',
    },
    {
      q: 'How would you design subnets for a VPC?',
      a: 'Pick a non-overlapping range like 10.0.0.0/16. Create public and private subnets in at least two availability zones (e.g. 10.0.1.0/24 and 10.0.2.0/24 public, 10.0.11.0/24 and 10.0.12.0/24 private), leaving room to grow and avoiding overlap with on-prem or other VPCs you may peer with.',
    },
    {
      q: 'What is the difference between a private and a public IP?',
      a: 'Private ranges (10/8, 172.16/12, 192.168/16) are reusable inside networks and not routed on the internet. Public IPs are globally unique. Private hosts reach the internet through NAT.',
    },
  ],
  commands: [
    { cmd: 'ip addr show', note: 'Your interfaces, IPs and prefixes (Windows: ipconfig)' },
    { cmd: 'ip route', note: 'Your routing table and default gateway' },
    { cmd: 'ipcalc 10.0.1.0/26', note: 'Subnet calculator in the terminal' },
    { cmd: 'hostname -I', note: 'Just the IP addresses' },
  ],
}

export default lesson
