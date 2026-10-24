import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Search, Signpost } from 'lucide-react'
import type { Lesson } from '../types'
import { Shell, Tip } from '../../components/Story'
import { At, Box, Bubble, Card, Envelope, Laptop, Link, Mover, Person, Scene, Server, Tag, Txt } from '../../components/Illustrations'
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

/* ------------------------------------------------------------------ scenes */

function S0Names() {
  const t = useLoop(3, 1500)
  return (
    <>
      <Headline>People remember names. Computers need numbers.</Headline>
      <At x={90} y={300}>
        <Person title="You" active={t === 0} />
      </At>
      <At x={90} y={215} show={t === 0}>
        <Bubble text="open google.com" tone="pink" />
      </At>
      <At x={250} y={110} delay={0.2}>
        <Card
          w={250}
          title="DNS: the phonebook"
          tone="amber"
          highlight={t >= 1 ? 0 : -1}
          lines={['google.com     → 142.250.183.14', 'amazon.in      → 52.95.120.38', 'example.com    → 93.184.216.34']}
        />
      </At>
      <At x={460} y={310} delay={0.3}>
        <Laptop title="Computer" active={t === 2} />
      </At>
      <At x={460} y={225} show={t === 2}>
        <Bubble text="connect to 142.250.183.14" tone="sky" />
      </At>
      <Link d="M150 310 Q300 360 400 320" dashed arrow delay={0.4} />
    </>
  )
}

function S1Cache() {
  const t = useLoop(4, 1100)
  const layers = [
    { name: 'Browser cache', note: 'recent sites' },
    { name: 'OS cache', note: 'whole computer' },
    { name: '/etc/hosts file', note: 'manual overrides' },
  ]
  return (
    <>
      <Headline>First, check what we already know</Headline>
      <At x={90} y={250}>
        <Laptop title="Your laptop" />
      </At>
      {layers.map((l, i) => (
        <At key={l.name} x={300} y={140 + i * 80} delay={i * 0.1}>
          <motion.g animate={{ scale: t === i ? 1.06 : 1 }} transition={bouncy}>
            <Box w={210} h={58} tone={t === i ? 'amber' : 'slate'} strong={t === i} title={l.name} sub={l.note} />
          </motion.g>
        </At>
      ))}
      <Mover x={t < 3 ? 180 : 470} y={t < 3 ? 140 + t * 80 : 380}>
        <Envelope tone="sky" />
      </Mover>
      <Txt x={420} y={146 + Math.min(t, 2) * 80} cls="ill-mono" fill="var(--rose)" show={t < 3}>
        miss ✕
      </Txt>
      <Txt x={360} y={410} anchor="middle" cls="ill-text" show={t === 3}>
        not found anywhere → ask the resolver
      </Txt>
    </>
  )
}

const POS = {
  laptop: [70, 330] as const,
  resolver: [230, 300] as const,
  root: [460, 105] as const,
  tld: [460, 230] as const,
  auth: [460, 355] as const,
}

const STAGES: { to: keyof typeof POS; ask: string; reply: string; tone: Tone }[] = [
  { to: 'laptop', ask: 'Where is www.example.com?', reply: "I'll find out for you!", tone: 'teal' },
  { to: 'root', ask: 'www.example.com?', reply: 'Ask the .com servers', tone: 'slate' },
  { to: 'tld', ask: 'www.example.com?', reply: 'Ask ns-1.awsdns-01.com', tone: 'violet' },
  { to: 'auth', ask: 'www.example.com?', reply: '93.184.216.34 (TTL 300)', tone: 'green' },
  { to: 'laptop', ask: '', reply: 'It is 93.184.216.34', tone: 'green' },
]

function Lookup({ stage }: { stage: number }) {
  const phase = useLoop(2, 1500)
  const s = STAGES[stage]
  const other = POS[s.to]
  const [rx, ry] = POS.resolver
  const atResolver = stage === 0 ? phase === 1 : stage === 4 ? phase === 0 : phase === 1
  const env = atResolver ? [rx, ry - 70] : [other[0], other[1] - 70]
  const bubbleAt = stage === 0 ? (phase === 0 ? 'laptop' : 'resolver') : stage === 4 ? (phase === 1 ? 'laptop' : 'resolver') : phase === 1 ? s.to : 'resolver'
  const bubbleText =
    stage === 0 ? (phase === 0 ? s.ask : s.reply) : stage === 4 ? (phase === 1 ? 'Thanks! Connecting…' : s.reply) : phase === 1 ? s.reply : s.ask
  const bp = POS[bubbleAt as keyof typeof POS]
  return (
    <>
      <Headline>
        {['Ask the resolver', '1. Ask a root server', '2. Ask the .com server', '3. Ask the authoritative server', 'Answer + cache'][stage]}
      </Headline>
      <Link d={`M120 340 H170`} dashed color="var(--border-strong)" />
      <Link d={`M290 270 Q360 120 410 110 M290 290 Q360 235 410 235 M290 310 Q360 360 410 360`} dashed color="var(--border-strong)" />
      <At x={POS.laptop[0]} y={POS.laptop[1]}>
        <Laptop title="You" active={s.to === 'laptop'} />
      </At>
      <At x={rx} y={ry}>
        <Server title="Resolver" sub="ISP or 8.8.8.8" tone="teal" active />
      </At>
      <At x={POS.root[0]} y={POS.root[1]}>
        <g transform="scale(0.7)">
          <Server title="Root  ." tone="slate" active={s.to === 'root'} />
        </g>
      </At>
      <At x={POS.tld[0]} y={POS.tld[1]}>
        <g transform="scale(0.7)">
          <Server title=".com TLD" tone="violet" active={s.to === 'tld'} />
        </g>
      </At>
      <At x={POS.auth[0]} y={POS.auth[1]}>
        <g transform="scale(0.7)">
          <Server title="example.com NS" tone="green" active={s.to === 'auth'} />
        </g>
      </At>
      <Mover x={env[0]} y={env[1]}>
        <Envelope tone={(stage === 4 && phase === 0) || (stage === 3 && phase === 1) ? 'green' : 'amber'} />
      </Mover>
      <AnimatePresence mode="wait">
        <motion.g key={`${stage}-${phase}`} initial={{ scale: 0, opacity: 0, x: bp[0], y: bp[1] - 72 }} animate={{ scale: 1, opacity: 1, x: bp[0], y: bp[1] - 72 }} exit={{ scale: 0, opacity: 0 }} transition={bouncy}>
          <Bubble text={bubbleText} tone={phase === 1 ? s.tone : 'amber'} />
        </motion.g>
      </AnimatePresence>
      {stage === 4 && (
        <At x={230} y={420}>
          <Tag text="resolver caches it for 300 s" tone="amber" />
        </At>
      )}
    </>
  )
}

const RECORDS: { type: string; tone: Tone; ex: string; what: string }[] = [
  { type: 'A', tone: 'sky', ex: 'example.com → 93.184.216.34', what: 'name → IPv4' },
  { type: 'AAAA', tone: 'sky', ex: 'example.com → 2606:2800::1', what: 'name → IPv6' },
  { type: 'CNAME', tone: 'violet', ex: 'www → example.com', what: 'nickname for another name' },
  { type: 'MX', tone: 'pink', ex: 'example.com → mail.google.com', what: 'where email goes' },
  { type: 'TXT', tone: 'amber', ex: '"v=spf1 include:…"', what: 'text: verification, email rules' },
  { type: 'NS', tone: 'green', ex: 'example.com → ns-1.awsdns…', what: 'who is authoritative' },
]

function S7Records() {
  return (
    <>
      <Headline>Record types</Headline>
      {RECORDS.map((r, i) => (
        <g key={r.type}>
          <At x={86} y={100 + i * 54} delay={i * 0.08} t={bouncy}>
            <Tag text={r.type} tone={r.tone} filled w={76} h={34} size={14} />
          </At>
          <Txt x={140} y={96 + i * 54} cls="ill-mono" size={12.5} delay={0.1 + i * 0.08}>
            {r.ex}
          </Txt>
          <Txt x={140} y={114 + i * 54} cls="ill-sub" delay={0.15 + i * 0.08}>
            {r.what}
          </Txt>
        </g>
      ))}
      <Txt x={280} y={426} anchor="middle" cls="ill-sub">
        AWS adds "Alias" records: like CNAME, but allowed on the root domain
      </Txt>
    </>
  )
}

function S8Ttl() {
  const t = useLoop(8, 700)
  const resolvers = [{ name: 'Mumbai resolver' }, { name: 'London resolver' }, { name: 'Virginia resolver' }]
  const progress = Math.min(1, t / 6)
  return (
    <>
      <Headline>TTL: how long answers are cached</Headline>
      <At x={280} y={100}>
        <Tag text="You change example.com: 93.184.216.34 → 52.1.2.3" mono tone="amber" />
      </At>
      {resolvers.map((r, i) => {
        const left = Math.max(0, 1 - progress - i * 0.15)
        const updated = left === 0
        return (
          <g key={r.name}>
            <Txt x={50} y={176 + i * 80} cls="ill-label" size={14}>
              {r.name}
            </Txt>
            <rect x={50} y={188 + i * 80} width={300} height={20} rx={10} fill="var(--panel-3)" stroke="var(--ink)" strokeWidth={2} />
            <motion.rect
              x={50}
              y={188 + i * 80}
              height={20}
              rx={10}
              fill="var(--amber)"
              stroke="var(--ink)"
              strokeWidth={2}
              animate={{ width: Math.max(0.01, left * 300) }}
              transition={{ duration: 0.6 }}
            />
            <Txt x={370} y={204 + i * 80} cls="ill-mono" size={12.5} fill={updated ? 'var(--green)' : undefined}>
              {updated ? '52.1.2.3 ✓ new' : `93.184.216.34 (old)`}
            </Txt>
          </g>
        )
      })}
      <Txt x={280} y={420} anchor="middle" cls="ill-sub">
        each cache keeps the old answer until its TTL runs out
      </Txt>
    </>
  )
}

function DnsScene({ step }: { step: number }) {
  const lookup = step >= 2 && step <= 6
  const Part = [S0Names, S1Cache][step] ?? (step === 7 ? S7Records : S8Ttl)
  return (
    <Scene label="How DNS works" h={440}>
      <AnimatePresence mode="wait">
        <motion.g key={lookup ? 'lookup' : step} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
          {lookup ? <Lookup stage={step - 2} /> : <Part />}
        </motion.g>
      </AnimatePresence>
    </Scene>
  )
}

/* ------------------------------------------------------------- playground */

type Zone = Record<string, { type: string; value: string }[]>

const ZONE: Zone = {
  'example.com': [
    { type: 'A', value: '93.184.216.34' },
    { type: 'MX', value: '10 mail.example.com.' },
    { type: 'TXT', value: '"v=spf1 include:_spf.google.com ~all"' },
    { type: 'NS', value: 'ns-1.awsdns-01.com.' },
  ],
  'www.example.com': [{ type: 'CNAME', value: 'example.com.' }],
  'shop.example.com': [{ type: 'A', value: '13.235.10.21' }],
  'mail.example.com': [{ type: 'A', value: '13.235.10.40' }],
}

function DigPlayground() {
  const [name, setName] = useState('www.example.com')
  const [type, setType] = useState('A')
  const [cache, setCache] = useState<Record<string, boolean>>({})
  const [out, setOut] = useState<{ lines: { text: string; cls?: string }[]; ms: number } | null>(null)
  const [error, setError] = useState('')

  function run() {
    const q = name.trim().toLowerCase().replace(/\.$/, '')
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(q)) {
      setError('Enter a domain like www.example.com')
      return
    }
    setError('')
    const key = `${q}/${type}`
    const cached = !!cache[key]
    const lines: { text: string; cls?: string }[] = []
    const answer: string[] = []
    let current = q
    for (let hop = 0; hop < 3; hop++) {
      const recs = ZONE[current]
      if (!recs) break
      const cname = recs.find((r) => r.type === 'CNAME')
      if (cname && type !== 'CNAME') {
        answer.push(`${current}.\t300\tIN\tCNAME\t${cname.value}`)
        current = cname.value.replace(/\.$/, '')
        continue
      }
      recs.filter((r) => r.type === type).forEach((r) => answer.push(`${current}.\t300\tIN\t${r.type}\t${r.value}`))
      break
    }
    lines.push({ text: `; <<>> DiG 9.18 <<>> ${q} ${type}`, cls: 'dim' })
    if (!ZONE[q]) {
      lines.push({ text: ';; ->>HEADER<<- status: NXDOMAIN', cls: 'err' }, { text: ';; The name does not exist in this zone.', cls: 'err' })
    } else {
      lines.push({ text: ';; ->>HEADER<<- status: NOERROR', cls: 'ok' }, { text: '' }, { text: ';; ANSWER SECTION:', cls: 'dim' })
      if (answer.length) answer.forEach((a) => lines.push({ text: a }))
      else lines.push({ text: `(no ${type} record for ${q})`, cls: 'warn' })
    }
    const ms = cached ? 0 : 38 + Math.floor(Math.random() * 40)
    lines.push({ text: '' }, { text: `;; Query time: ${ms} msec${cached ? '   (answered from cache)' : '   (full lookup: root → .com → authoritative)'}`, cls: cached ? 'ok' : 'warn' })
    setOut({ lines, ms })
    setCache((c) => ({ ...c, [key]: true }))
  }

  return (
    <div className="card stage">
      <div className="toolbar">
        <span className="mono" style={{ fontWeight: 700 }}>$ dig</span>
        <input
          className="text-input"
          value={name}
          aria-label="Domain"
          aria-invalid={!!error}
          onChange={(e) => {
            setName(e.target.value)
            setError('')
          }}
          onKeyDown={(e) => e.key === 'Enter' && run()}
          style={{ flex: '1 1 200px' }}
        />
        <div className="seg" role="group" aria-label="Record type">
          {['A', 'CNAME', 'MX', 'TXT', 'NS'].map((t) => (
            <button key={t} aria-pressed={type === t} onClick={() => setType(t)}>
              {t}
            </button>
          ))}
        </div>
        <button className="btn primary" onClick={run}>
          <Search size={16} /> Look up
        </button>
        <button className="btn" onClick={() => setCache({})}>
          Clear cache
        </button>
      </div>
      {error && <span className="field-error">{error}</span>}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 13 }}>
        <span className="muted">Try:</span>
        {['www.example.com', 'example.com', 'shop.example.com', 'blog.example.com'].map((d) => (
          <button key={d} className="chip tone-sky" style={{ cursor: 'pointer' }} onClick={() => setName(d)}>
            {d}
          </button>
        ))}
      </div>
      <div className="terminal">
        <header>
          <i />
          <i />
          <i />
          <span style={{ marginLeft: 6 }}>bash</span>
        </header>
        <div className="body" style={{ height: 'auto', minHeight: 160 }}>
          {!out && <span className="dim">Press "Look up". Run the same query twice to see the cache in action.</span>}
          <AnimatePresence initial={false}>
            {out?.lines.map((l, i) => (
              <motion.div key={`${i}-${l.text}-${out.ms}`} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }} className={l.cls}>
                {l.text || '\u00a0'}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ lesson */

const lesson: Lesson = {
  id: 'dns',
  title: 'DNS: the internet’s phonebook',
  track: '',
  tone: 'amber',
  icon: Signpost,
  summary: 'How a name like example.com becomes an IP address: caches, the resolver, root, TLD and authoritative servers, record types, and TTL.',
  minutes: 12,
  story: {
    Scene: DnsScene,
    sections: [
      {
        title: 'Names for humans, numbers for machines',
        body: (
          <>
            <p>
              Computers connect using IP addresses, but nobody wants to type <code>142.250.183.14</code>. We type{' '}
              <code>google.com</code>.
            </p>
            <p>
              <strong>DNS</strong> (Domain Name System) is the system that turns names into IP addresses. It is a huge,
              distributed phonebook spread across thousands of servers worldwide.
            </p>
            <Tip>The contacts app on your phone. You tap "Mom", and the phone dials the number for you.</Tip>
          </>
        ),
      },
      {
        title: 'Step 0: check the caches',
        body: (
          <>
            <p>Before asking anyone, your computer checks what it already knows:</p>
            <ol>
              <li>
                The <strong>browser cache</strong> (sites you visited recently).
              </li>
              <li>
                The <strong>operating system cache</strong>.
              </li>
              <li>
                The <strong>hosts file</strong> (<code>/etc/hosts</code> on Linux and Mac, <code>C:\Windows\System32\drivers\etc\hosts</code>{' '}
                on Windows), where you can hard-code a name to an IP.
              </li>
            </ol>
            <Shell>{`$ cat /etc/hosts
127.0.0.1   localhost
10.0.2.15   db.internal     # handy for testing`}</Shell>
          </>
        ),
      },
      {
        title: 'Ask the resolver',
        body: (
          <>
            <p>
              On a cache miss, your computer asks a <strong>recursive resolver</strong>: a DNS server whose job is to find the
              answer for you. Usually it's your ISP's, or a public one like Google (<code>8.8.8.8</code>) or Cloudflare (
              <code>1.1.1.1</code>). In AWS, every VPC has one at the <code>.2</code> address.
            </p>
            <p>The resolver does the legwork in the next three steps, then hands you the final answer.</p>
          </>
        ),
      },
      {
        title: '1. The root servers',
        body: (
          <>
            <p>
              Domain names are read <strong>right to left</strong>: <code>www.example.com.</code> really ends with an invisible
              dot, the <strong>root</strong>.
            </p>
            <p>
              The resolver asks a <strong>root server</strong>. There are 13 root server names (a to m.root-servers.net), run as
              hundreds of copies worldwide. The root doesn't know example.com, but it knows who runs <code>.com</code>.
            </p>
          </>
        ),
      },
      {
        title: '2. The TLD servers',
        body: (
          <>
            <p>
              Next, the resolver asks the <strong>TLD</strong> (Top-Level Domain) servers for <code>.com</code>. Other TLDs include{' '}
              <code>.in</code>, <code>.org</code> and <code>.io</code>.
            </p>
            <p>
              The .com server doesn't know the IP either, but it knows which <strong>name servers</strong> are responsible for{' '}
              <code>example.com</code>. Those were set when the domain was registered, for example AWS Route 53's servers.
            </p>
          </>
        ),
      },
      {
        title: '3. The authoritative server',
        body: (
          <>
            <p>
              Finally the resolver asks the <strong>authoritative name server</strong> for example.com: the server holding the
              real records. If you host your domain on <strong>AWS Route 53</strong>, this is Route 53.
            </p>
            <p>
              It answers: <code>www.example.com = 93.184.216.34</code>, with a <strong>TTL</strong> (time to live), e.g. 300
              seconds.
            </p>
          </>
        ),
      },
      {
        title: 'The answer comes back (and is cached)',
        body: (
          <>
            <p>
              The resolver returns the IP to your computer, which can now open a TCP connection to it. Everyone along the way
              stores the answer for the TTL, so the next lookup is <strong>instant</strong>.
            </p>
            <p>The whole first lookup usually takes 20–100 ms. Cached lookups take about 0 ms.</p>
            <Shell>{`$ dig +short www.example.com
93.184.216.34

$ dig +trace www.example.com   # shows every step above`}</Shell>
          </>
        ),
      },
      {
        title: 'DNS record types',
        body: (
          <>
            <p>A domain can have different kinds of records:</p>
            <table className="data-table">
              <tbody>
                <tr><td>A</td><td>name → IPv4 address</td></tr>
                <tr><td>AAAA</td><td>name → IPv6 address</td></tr>
                <tr><td>CNAME</td><td>name → another name (an alias). Not allowed on the bare domain.</td></tr>
                <tr><td>MX</td><td>where to deliver email for this domain</td></tr>
                <tr><td>TXT</td><td>free text: domain ownership proof, email security (SPF)</td></tr>
                <tr><td>NS</td><td>which servers are authoritative for the domain</td></tr>
              </tbody>
            </table>
            <Tip kind="note">In AWS you point your domain at a load balancer with an <b>Alias</b> record: Route 53's special CNAME-like record that also works on the bare domain.</Tip>
          </>
        ),
      },
      {
        title: 'TTL and "DNS propagation"',
        body: (
          <>
            <p>
              Because answers are cached, a change does not take effect everywhere at once. Each resolver keeps the{' '}
              <strong>old answer until its TTL expires</strong>. People call this waiting time "DNS propagation".
            </p>
            <ul>
              <li>Long TTL (e.g. 86400 = 1 day): fewer lookups, but changes are slow to reach everyone.</li>
              <li>Short TTL (e.g. 60 s): changes spread fast, but more lookups.</li>
            </ul>
            <Tip kind="pro">Before migrating a server, lower the TTL a day early. Then the switch takes minutes instead of a day.</Tip>
            <p>
              And the famous saying when something mysterious breaks: <strong>"It's always DNS."</strong> Check it first.
            </p>
          </>
        ),
      },
    ],
  },
  Playground: DigPlayground,
  playgroundIntro: 'A safe pretend version of the real dig command, with a small example zone. Look up names and record types; repeat a query to hit the cache.',
  terms: [
    { term: 'DNS', def: 'Domain Name System: translates names like example.com into IP addresses.' },
    { term: 'Recursive resolver', def: 'The DNS server that does the full lookup for you and caches the answer (ISP, 8.8.8.8, VPC .2).' },
    { term: 'Root server', def: 'Top of the DNS tree. Points to the TLD servers.' },
    { term: 'TLD', def: 'Top-level domain: .com, .in, .org. Its servers point to a domain’s name servers.' },
    { term: 'Authoritative name server', def: 'Holds the real records for a domain, e.g. Route 53.' },
    { term: 'Record', def: 'One entry in DNS: A, AAAA, CNAME, MX, TXT, NS.' },
    { term: 'TTL', def: 'Time to live: how many seconds an answer may be cached.' },
    { term: 'Hosts file', def: '/etc/hosts: local name → IP overrides checked before DNS.' },
    { term: 'NXDOMAIN', def: 'DNS response meaning "this name does not exist".' },
  ],
  quiz: [
    {
      q: 'In what order does the resolver ask servers on a full lookup?',
      options: ['Authoritative → TLD → root', 'Root → TLD → authoritative', 'TLD → root → authoritative', 'It asks all at once'],
      answer: 1,
      why: 'Root points to the TLD servers, the TLD points to the domain’s authoritative servers, which give the answer.',
    },
    {
      q: 'Which record maps a name to an IPv4 address?',
      options: ['MX', 'CNAME', 'A', 'TXT'],
      answer: 2,
      why: 'A = address (IPv4). AAAA is IPv6, CNAME is an alias, MX is mail.',
    },
    {
      q: 'You changed a record, but some users still reach the old server an hour later. Why?',
      options: ['DNS is broken', 'Their resolvers cached the old answer and its TTL hasn’t expired', 'The server is down', 'CNAME is wrong'],
      answer: 1,
      why: 'Caches keep answers for the TTL. Lower the TTL before planned changes.',
    },
    {
      q: 'What does NXDOMAIN mean?',
      options: ['Timeout', 'The name does not exist', 'Wrong IP', 'Port closed'],
      answer: 1,
      why: 'NXDOMAIN = non-existent domain. Check spelling, the hosted zone, and the name servers.',
    },
  ],
  interview: [
    {
      q: 'Explain how DNS resolution works.',
      a: 'Check browser/OS cache and hosts file. Then ask the recursive resolver. On a miss it queries a root server (→ TLD servers), the TLD server (→ the domain’s authoritative name servers), and the authoritative server (→ the record). The resolver caches the answer for its TTL and returns it.',
    },
    {
      q: 'CNAME vs A record vs Alias?',
      a: 'An A record maps a name to an IP. A CNAME maps a name to another name and cannot be used at the zone apex. Route 53 Alias works like a CNAME to AWS resources (ALB, CloudFront, S3) but is allowed on the apex and is free to query.',
    },
    {
      q: 'Users report the site is unreachable. How do you check DNS?',
      a: 'dig example.com (status, answer, TTL), dig @8.8.8.8 example.com to compare resolvers, dig +trace to see where it breaks, check the hosted zone records and that the domain’s NS records match the hosted zone.',
    },
  ],
  commands: [
    { cmd: 'dig example.com', note: 'Full DNS answer with TTL and status' },
    { cmd: 'dig +short www.example.com', note: 'Just the answer' },
    { cmd: 'dig +trace example.com', note: 'Every step: root → TLD → authoritative' },
    { cmd: 'dig @1.1.1.1 example.com MX', note: 'Ask a specific resolver for a specific record type' },
    { cmd: 'nslookup example.com', note: 'Simpler lookup tool (works on Windows too)' },
  ],
}

export default lesson
