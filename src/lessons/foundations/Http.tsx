import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeftRight, Send } from 'lucide-react'
import type { Lesson } from '../types'
import { Shell, Tip } from '../../components/Story'
import { At, Box, Bubble, Card, Envelope, Laptop, Lock, Mover, Scene, Server, Spy, Tag, Txt } from '../../components/Illustrations'
import { bouncy } from '../../lib/motion'
import { Sequence, type Msg } from '../../components/Sequence'
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

function S0Conversation() {
  const t = useLoop(4, 1300)
  return (
    <>
      <Headline>HTTP: the language of the web</Headline>
      <At x={90} y={320}>
        <Laptop title="Browser" active={t < 2} />
      </At>
      <At x={470} y={310}>
        <Server title="Web server" active={t >= 2} />
      </At>
      <Mover x={t === 0 ? 150 : t === 3 ? 150 : 410} y={t < 2 ? 250 : 290}>
        <Envelope tone={t < 2 ? 'amber' : 'green'} />
      </Mover>
      <At x={40} y={90} show={t >= 0}>
        <Card w={230} title="request" tone="amber" lines={['GET /index.html HTTP/1.1', 'Host: example.com']} />
      </At>
      <At x={290} y={130} show={t >= 2}>
        <Card w={230} title="response" tone="green" lines={['HTTP/1.1 200 OK', 'Content-Type: text/html', '<html>…</html>']} />
      </At>
    </>
  )
}

const REQ_LINES: { text: string; label: string }[] = [
  { text: 'GET /products?page=2 HTTP/1.1', label: 'method · path · version' },
  { text: 'Host: shop.in', label: 'which website' },
  { text: 'User-Agent: Chrome/130', label: 'who is asking' },
  { text: 'Accept: application/json', label: 'format I want back' },
  { text: 'Cookie: session=a8f3…', label: 'who I am (logged in)' },
  { text: '', label: 'blank line = end of headers' },
  { text: '(body: empty for GET)', label: 'body: data you send' },
]

function S1Request() {
  const t = useLoop(REQ_LINES.length, 1100)
  return (
    <>
      <Headline>Anatomy of a request</Headline>
      <At x={30} y={90}>
        <Card w={300} title="HTTP request" tone="amber" lineH={34} highlight={t} lines={REQ_LINES.map((l) => l.text || ' ')} />
      </At>
      <AnimatePresence mode="wait">
        <motion.g key={t} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, transition: { duration: 0.12 } }} transition={bouncy}>
          <path d={`M334 ${142 + t * 34} H350`} stroke="var(--ink)" strokeWidth={2.5} strokeLinecap="round" />
          <g transform={`translate(${445} ${142 + t * 34})`}>
            <Tag text={REQ_LINES[t].label} tone="amber" w={190} size={12} />
          </g>
        </motion.g>
      </AnimatePresence>
    </>
  )
}

const METHODS: { m: string; tone: Tone; does: string; crud: string }[] = [
  { m: 'GET', tone: 'sky', does: 'read data', crud: 'Read' },
  { m: 'POST', tone: 'green', does: 'create something new', crud: 'Create' },
  { m: 'PUT', tone: 'amber', does: 'replace it fully', crud: 'Update' },
  { m: 'PATCH', tone: 'amber', does: 'change part of it', crud: 'Update' },
  { m: 'DELETE', tone: 'rose', does: 'remove it', crud: 'Delete' },
]

function S2Methods() {
  return (
    <>
      <Headline>Methods: what you want to do</Headline>
      {METHODS.map((m, i) => (
        <g key={m.m}>
          <At x={100} y={110 + i * 62} delay={i * 0.1} t={bouncy}>
            <Tag text={m.m} tone={m.tone} filled w={100} h={40} size={15} />
          </At>
          <Txt x={170} y={106 + i * 62} cls="ill-text" delay={0.1 + i * 0.1}>
            {m.does}
          </Txt>
          <Txt x={170} y={124 + i * 62} cls="ill-sub" delay={0.15 + i * 0.1}>
            {`${m.m} /api/products${m.m === 'GET' || m.m === 'POST' ? '' : '/42'}  →  ${m.crud}`}
          </Txt>
        </g>
      ))}
    </>
  )
}

const RES_LINES: { text: string; label: string; tone?: Tone }[] = [
  { text: 'HTTP/1.1 200 OK', label: 'status code + reason', tone: 'green' },
  { text: 'Content-Type: application/json', label: 'what the body is' },
  { text: 'Content-Length: 512', label: 'body size in bytes' },
  { text: 'Cache-Control: max-age=60', label: 'may be cached 60 s' },
  { text: 'Set-Cookie: session=a8f3…', label: 'remember me' },
  { text: '', label: 'blank line' },
  { text: '[{"id":42,"name":"Mug"}…]', label: 'body: the actual data' },
]

function S3Response() {
  const t = useLoop(RES_LINES.length, 1100)
  return (
    <>
      <Headline>Anatomy of a response</Headline>
      <At x={30} y={90}>
        <Card w={300} title="HTTP response" tone="green" lineH={34} highlight={t} lines={RES_LINES.map((l) => ({ text: l.text || ' ', tone: l.tone }))} />
      </At>
      <AnimatePresence mode="wait">
        <motion.g key={t} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, transition: { duration: 0.12 } }} transition={bouncy}>
          <path d={`M334 ${142 + t * 34} H350`} stroke="var(--ink)" strokeWidth={2.5} strokeLinecap="round" />
          <g transform={`translate(${445} ${142 + t * 34})`}>
            <Tag text={RES_LINES[t].label} tone="green" w={190} size={12} />
          </g>
        </motion.g>
      </AnimatePresence>
    </>
  )
}

const CODES: { c: string; m: string; fam: number }[] = [
  { c: '200', m: 'OK', fam: 2 },
  { c: '201', m: 'Created', fam: 2 },
  { c: '204', m: 'No Content', fam: 2 },
  { c: '301', m: 'Moved Permanently', fam: 3 },
  { c: '302', m: 'Found (temp redirect)', fam: 3 },
  { c: '304', m: 'Not Modified', fam: 3 },
  { c: '400', m: 'Bad Request', fam: 4 },
  { c: '401', m: 'Unauthorized (log in)', fam: 4 },
  { c: '403', m: 'Forbidden (not allowed)', fam: 4 },
  { c: '404', m: 'Not Found', fam: 4 },
  { c: '429', m: 'Too Many Requests', fam: 4 },
  { c: '500', m: 'Internal Server Error', fam: 5 },
  { c: '502', m: 'Bad Gateway', fam: 5 },
  { c: '503', m: 'Service Unavailable', fam: 5 },
  { c: '504', m: 'Gateway Timeout', fam: 5 },
]
const FAMS: { n: number; tone: Tone; name: string }[] = [
  { n: 2, tone: 'green', name: '2xx success' },
  { n: 3, tone: 'sky', name: '3xx go elsewhere' },
  { n: 4, tone: 'amber', name: '4xx you (client) erred' },
  { n: 5, tone: 'rose', name: '5xx server broke' },
]

function S4Codes() {
  return (
    <>
      <Headline>Status codes: the first digit tells the story</Headline>
      {FAMS.map((f, col) => {
        const items = CODES.filter((c) => c.fam === f.n)
        return (
          <g key={f.n}>
            <At x={78 + col * 135} y={96} delay={col * 0.1}>
              <Tag text={f.name} tone={f.tone} filled w={126} size={11.5} />
            </At>
            {items.map((c, k) => (
              <At key={c.c} x={78 + col * 135} y={150 + k * 62} delay={0.2 + col * 0.1 + k * 0.06} t={bouncy}>
                <Box w={124} h={52} tone={f.tone} />
                <text className="ill-label" y={-2} style={{ fontSize: 17, fontFamily: 'var(--mono)' }}>
                  {c.c}
                </text>
                <text className="ill-sub" y={15} style={{ fontSize: 9.5 }}>
                  {c.m}
                </text>
              </At>
            ))}
          </g>
        )
      })}
    </>
  )
}

const COOKIES: Msg[] = [
  { from: 'c', label: 'POST /login (user + password)' },
  { from: 's', label: '200 · Set-Cookie: session=a8f3', tone: 'green', note: 'server remembers a8f3 = Joel' },
  { from: 'c', label: 'GET /cart · Cookie: session=a8f3', tone: 'sky' },
  { from: 's', label: "200 · Joel's cart", tone: 'green' },
  { from: 'c', label: 'GET /cart (no cookie)', tone: 'rose' },
  { from: 's', label: '401 Unauthorized', tone: 'rose', note: '"who are you?"' },
]

function S5Cookies() {
  const t = useLoop(COOKIES.length + 2, 1050)
  return (
    <>
      <Headline>HTTP forgets you: cookies remind it</Headline>
      <Sequence msgs={COOKIES} t={t} gap={52} left="Browser" />
    </>
  )
}

function S6Plain() {
  const t = useLoop(3, 1400)
  return (
    <>
      <Headline>Plain HTTP can be read by anyone on the way</Headline>
      <At x={80} y={300}>
        <Laptop title="You" sub="café Wi-Fi" />
      </At>
      <At x={480} y={290}>
        <Server title="shop.in" />
      </At>
      <At x={280} y={330}>
        <Spy title="Someone on the same Wi-Fi" />
      </At>
      <Mover x={t === 0 ? 140 : t === 1 ? 280 : 420} y={210}>
        <Envelope tone="amber" />
      </Mover>
      <At x={280} y={170} show={t >= 1}>
        <Bubble text="password=hunter2 … I can read this!" tone="rose" side="down" />
      </At>
      <At x={280} y={120}>
        <Tag text="http://shop.in/login" mono tone="rose" />
      </At>
    </>
  )
}

const TLS: Msg[] = [
  { from: 'c', label: 'ClientHello: TLS 1.3, my key share', note: '"let\'s talk securely"' },
  { from: 's', label: 'ServerHello + certificate', tone: 'violet', note: '"I am shop.in, here\'s proof"' },
  { from: 'c', label: '✓ certificate checked', tone: 'green', note: 'trusted CA? right name? not expired?' },
  { from: 'c', label: '🔒 encrypted: GET /login', tone: 'green' },
  { from: 's', label: '🔒 encrypted: 200 OK', tone: 'green' },
]

function S7Tls() {
  const t = useLoop(TLS.length + 2, 1200)
  return (
    <>
      <Headline>HTTPS = HTTP inside an encrypted TLS tunnel</Headline>
      <Sequence msgs={TLS} t={t} gap={52} left="Browser" right="shop.in" />
      <At x={280} y={420} show={t >= 3}>
        <Tag text='spy sees: "x8#Kq!2@…" gibberish' mono tone="green" />
      </At>
    </>
  )
}

function S8Cert() {
  return (
    <>
      <Headline>Certificates prove who the server is</Headline>
      <At x={100} y={130}>
        <Box w={150} h={56} tone="violet" strong title="Root CA" sub="built into your OS" />
      </At>
      <At x={100} y={240} delay={0.2}>
        <Box w={150} h={56} tone="violet" title="Intermediate CA" sub="e.g. Amazon RSA" />
      </At>
      <At x={100} y={350} delay={0.4}>
        <Box w={150} h={56} tone="green" strong title="shop.in" sub="your certificate" />
      </At>
      <path d="M100 160 V210 M100 270 V320" stroke="var(--ink)" strokeWidth={2.5} markerEnd="url(#head)" />
      <Txt x={110} y={192} cls="ill-sub" anchor="start">
        signs
      </Txt>
      <Txt x={110} y={302} cls="ill-sub" anchor="start">
        signs
      </Txt>
      <At x={250} y={110} delay={0.5}>
        <Card w={270} title="certificate" tone="green" lines={['Issued to:  shop.in, *.shop.in', 'Issued by:  Amazon RSA 2048', 'Valid:      Jan 2026 → Jan 2027', 'Public key: 04:a3:9f:…']} />
      </At>
      <At x={385} y={330} delay={0.7} t={bouncy}>
        <Lock scale={2.2} />
      </At>
      <Txt x={385} y={400} anchor="middle" cls="ill-sub" delay={0.8}>
        expired or wrong name → browser warning
      </Txt>
    </>
  )
}

const STEPS = [S0Conversation, S1Request, S2Methods, S3Response, S4Codes, S5Cookies, S6Plain, S7Tls, S8Cert]

function HttpScene({ step }: { step: number }) {
  const Part = STEPS[step] ?? S0Conversation
  return (
    <Scene label="HTTP and HTTPS" h={440}>
      <AnimatePresence mode="wait">
        <motion.g key={step} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
          <Part />
        </motion.g>
      </AnimatePresence>
    </Scene>
  )
}

/* ------------------------------------------------------------- playground */

type Method = 'GET' | 'POST' | 'DELETE'
const PATHS = ['/api/products', '/api/products/42', '/api/products/999', '/api/orders', '/admin']

function respond(method: Method, path: string, loggedIn: boolean, backendUp: boolean): { code: number; reason: string; body: string; why: string } {
  if (!backendUp) return { code: 502, reason: 'Bad Gateway', body: '<html>502 Bad Gateway</html>', why: 'The load balancer could not get a valid answer from the app server. Check that the app is running.' }
  if (path === '/admin') {
    if (!loggedIn) return { code: 401, reason: 'Unauthorized', body: '{"error":"login required"}', why: 'No session cookie, so the server does not know who you are. Log in first.' }
    return { code: 403, reason: 'Forbidden', body: '{"error":"admins only"}', why: 'The server knows who you are, but you are not allowed here. 401 = who are you? 403 = I know you, but no.' }
  }
  if (path === '/api/orders') {
    if (method === 'GET') return loggedIn ? { code: 200, reason: 'OK', body: '[{"id":7,"total":499}]', why: 'Your orders, found using your session cookie.' } : { code: 401, reason: 'Unauthorized', body: '{"error":"login required"}', why: 'Orders are private. Without the cookie the server refuses.' }
    if (method === 'POST') return loggedIn ? { code: 201, reason: 'Created', body: '{"id":8,"status":"placed"}', why: '201 means a new thing was created.' } : { code: 401, reason: 'Unauthorized', body: '{"error":"login required"}', why: 'You must be logged in to place an order.' }
    return { code: 405, reason: 'Method Not Allowed', body: '{"error":"cannot DELETE orders"}', why: 'The path exists, but it does not support that method.' }
  }
  if (path === '/api/products/999') return { code: 404, reason: 'Not Found', body: '{"error":"no product 999"}', why: 'Nothing exists at that path. Typo, or deleted.' }
  if (path === '/api/products/42') {
    if (method === 'GET') return { code: 200, reason: 'OK', body: '{"id":42,"name":"Coffee mug","price":249}', why: 'Read one product.' }
    if (method === 'DELETE') return loggedIn ? { code: 403, reason: 'Forbidden', body: '{"error":"admins only"}', why: 'Logged in, but only admins may delete products.' } : { code: 401, reason: 'Unauthorized', body: '{"error":"login required"}', why: 'Who are you? Log in first.' }
    return { code: 405, reason: 'Method Not Allowed', body: '{"error":"use PUT or PATCH"}', why: 'You cannot POST to a single product.' }
  }
  if (method === 'GET') return { code: 200, reason: 'OK', body: '[{"id":42,"name":"Coffee mug"},{"id":43,"name":"T-shirt"}]', why: 'Read the list of products.' }
  if (method === 'POST') return loggedIn ? { code: 403, reason: 'Forbidden', body: '{"error":"admins only"}', why: 'Only admins can add products.' } : { code: 401, reason: 'Unauthorized', body: '{"error":"login required"}', why: 'Log in first.' }
  return { code: 405, reason: 'Method Not Allowed', body: '{"error":"cannot DELETE the whole list"}', why: 'That method is not supported on this path.' }
}

const codeTone = (c: number): Tone => (c < 300 ? 'green' : c < 400 ? 'sky' : c < 500 ? 'amber' : 'rose')

function RequestBuilder() {
  const [method, setMethod] = useState<Method>('GET')
  const [path, setPath] = useState(PATHS[0])
  const [loggedIn, setLoggedIn] = useState(false)
  const [https, setHttps] = useState(true)
  const [up, setUp] = useState(true)
  const [res, setRes] = useState<ReturnType<typeof respond> | null>(null)
  const [n, setN] = useState(0)

  const reqText = [`${method} ${path} HTTP/1.1`, 'Host: shop.in', 'Accept: application/json', ...(loggedIn ? ['Cookie: session=a8f3c1'] : []), ...(method === 'POST' ? ['Content-Type: application/json', '', '{"productId":42,"qty":1}'] : [])]
  const scramble = (s: string) => s.replace(/[^\s]/g, (ch) => '#%&@!x9Kq2$Z'[(ch.charCodeAt(0) * 7) % 12])

  return (
    <div className="card stage">
      <div className="toolbar">
        <div className="seg" role="group" aria-label="Method">
          {(['GET', 'POST', 'DELETE'] as Method[]).map((m) => (
            <button key={m} aria-pressed={method === m} onClick={() => setMethod(m)}>
              {m}
            </button>
          ))}
        </div>
        <select className="text-input" value={path} onChange={(e) => setPath(e.target.value)} aria-label="Path" style={{ flex: '1 1 180px' }}>
          {PATHS.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
        <button
          className="btn primary"
          onClick={() => {
            setRes(respond(method, path, loggedIn, up))
            setN((x) => x + 1)
          }}
        >
          <Send size={16} /> Send
        </button>
      </div>
      <div className="toolbar" style={{ gap: 18 }}>
        <label className="switch">
          <input type="checkbox" checked={loggedIn} onChange={(e) => setLoggedIn(e.target.checked)} />
          Logged in (send cookie)
        </label>
        <label className="switch">
          <input type="checkbox" checked={https} onChange={(e) => setHttps(e.target.checked)} />
          Use HTTPS
        </label>
        <label className="switch">
          <input type="checkbox" checked={up} onChange={(e) => setUp(e.target.checked)} />
          App server running
        </label>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
        <div className="terminal">
          <header>
            <i />
            <i />
            <i />
            <span style={{ marginLeft: 6 }}>Request you send</span>
          </header>
          <div className="body" style={{ height: 180 }}>
            {reqText.map((l, i) => (
              <div key={i} className={i === 0 ? 'cmdline' : ''}>
                {l || ' '}
              </div>
            ))}
          </div>
        </div>
        <div className="terminal">
          <header>
            <i />
            <i />
            <i />
            <span style={{ marginLeft: 6 }}>What a Wi-Fi snooper sees</span>
          </header>
          <div className="body" style={{ height: 180 }}>
            {reqText.map((l, i) => (
              <div key={i} className={https ? 'dim' : 'err'}>
                {(https ? scramble(l) : l) || ' '}
              </div>
            ))}
          </div>
        </div>
      </div>
      <AnimatePresence mode="wait">
        {res && (
          <motion.div key={n} initial={{ opacity: 0, y: 10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={bouncy} className={`callout tone-${codeTone(res.code)}`}>
            <strong>
              HTTP/1.1 {res.code} {res.reason}
            </strong>
            <code style={{ display: 'block', margin: '6px 0', whiteSpace: 'pre-wrap', border: 0, background: 'transparent', padding: 0 }}>{res.body}</code>
            {res.why}
          </motion.div>
        )}
      </AnimatePresence>
      {!https && (
        <div className="callout tone-rose">
          <strong>Your cookie is visible</strong>
          Without HTTPS anyone on the network can copy <code>session=a8f3c1</code> and log in as you.
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ lesson */

const lesson: Lesson = {
  id: 'http',
  title: 'HTTP and HTTPS',
  track: '',
  tone: 'green',
  icon: ArrowLeftRight,
  summary: 'What browsers and servers actually say to each other: requests, methods, headers, responses, status codes, cookies, and how HTTPS keeps it private.',
  minutes: 14,
  story: {
    Scene: HttpScene,
    sections: [
      {
        title: 'HTTP is a conversation',
        body: (
          <>
            <p>
              Once a TCP connection is open, the browser and server need a shared language. For the web, that language is{' '}
              <strong>HTTP</strong> (HyperText Transfer Protocol).
            </p>
            <p>
              It is surprisingly simple: the client sends a <strong>request</strong> (plain text lines), the server sends back a{' '}
              <strong>response</strong>. Every page, image, and API call works this way. Mobile apps talking to their backend use
              HTTP too.
            </p>
          </>
        ),
      },
      {
        title: 'Anatomy of a request',
        body: (
          <>
            <p>A request has up to four parts:</p>
            <ol>
              <li>
                <strong>Request line</strong>: the <strong>method</strong> (what to do), the <strong>path</strong> (which thing),
                and the HTTP version. Anything after <code>?</code> is a <strong>query string</strong> (<code>?page=2</code>).
              </li>
              <li>
                <strong>Headers</strong>: <code>Name: value</code> lines with extra information. <code>Host</code> is required,
                because one server can host many websites.
              </li>
              <li>An empty line.</li>
              <li>
                An optional <strong>body</strong>: data you send, like a form or JSON.
              </li>
            </ol>
          </>
        ),
      },
      {
        title: 'Methods: what do you want?',
        body: (
          <>
            <p>
              The method says what action you want. They map neatly to the four basic data operations, often called{' '}
              <strong>CRUD</strong>:
            </p>
            <table className="data-table">
              <tbody>
                <tr><td>GET</td><td>Read. Should never change anything.</td></tr>
                <tr><td>POST</td><td>Create something new (place an order, submit a form).</td></tr>
                <tr><td>PUT / PATCH</td><td>Update: replace fully / change part.</td></tr>
                <tr><td>DELETE</td><td>Remove.</td></tr>
              </tbody>
            </table>
            <p>
              An API designed around these methods and paths (<code>/api/products/42</code>) is called a{' '}
              <strong>REST API</strong>.
            </p>
          </>
        ),
      },
      {
        title: 'Anatomy of a response',
        body: (
          <>
            <p>The response mirrors the request:</p>
            <ol>
              <li>
                <strong>Status line</strong>: version, a 3-digit <strong>status code</strong>, and a short reason, e.g.{' '}
                <code>200 OK</code>.
              </li>
              <li>
                <strong>Headers</strong>: what the body is (<code>Content-Type</code>), how big, whether it may be cached,
                cookies to store.
              </li>
              <li>
                The <strong>body</strong>: the HTML page, image, or JSON data.
              </li>
            </ol>
            <Shell>{`$ curl -i https://example.com
HTTP/2 200
content-type: text/html; charset=UTF-8
...
<!doctype html>...`}</Shell>
          </>
        ),
      },
      {
        title: 'Status codes',
        body: (
          <>
            <p>
              The first digit tells you who is at fault, which is the most useful thing to know when debugging:
            </p>
            <ul>
              <li>
                <strong>2xx success</strong>: 200 OK, 201 Created.
              </li>
              <li>
                <strong>3xx redirect</strong>: go somewhere else (301 permanent, 302 temporary), or 304 "your cached copy is
                still fine".
              </li>
              <li>
                <strong>4xx client error</strong>: the request was wrong. 400 bad data, 401 not logged in, 403 not allowed, 404
                not found, 429 slow down.
              </li>
              <li>
                <strong>5xx server error</strong>: the server side failed. 500 app bug, 502 the proxy got a bad answer from the
                app, 503 no healthy servers or overloaded, 504 the app was too slow.
              </li>
            </ul>
            <Tip kind="pro">4xx: look at the request. 5xx: look at the servers and their logs. 502/503/504 usually involve a load balancer.</Tip>
          </>
        ),
      },
      {
        title: 'Headers, cookies and sessions',
        body: (
          <>
            <p>
              HTTP is <strong>stateless</strong>: every request is independent and the server does not remember you between
              requests. So how do logins work?
            </p>
            <p>
              After you log in, the server replies with a <code>Set-Cookie</code> header. The browser stores that{' '}
              <strong>cookie</strong> and automatically sends it back in a <code>Cookie</code> header on every later request.
              The server looks up the session ID and knows it's you. APIs often use a token in an <code>Authorization</code>{' '}
              header instead.
            </p>
            <p>
              Other headers you will meet: <code>Content-Type</code>, <code>Cache-Control</code>, <code>User-Agent</code>,{' '}
              <code>Location</code> (redirect target).
            </p>
          </>
        ),
      },
      {
        title: 'The problem with plain HTTP',
        body: (
          <>
            <p>
              Plain HTTP is <strong>plain text</strong>. Every router, the café Wi-Fi, or anyone on the same network can read
              (and even change) your requests: passwords, cookies, everything.
            </p>
            <p>
              Stealing someone's session cookie this way lets an attacker log in as them, no password needed. This is why every
              modern site uses HTTPS.
            </p>
          </>
        ),
      },
      {
        title: 'HTTPS and the TLS handshake',
        body: (
          <>
            <p>
              <strong>HTTPS</strong> is HTTP sent inside an encrypted <strong>TLS</strong> connection (older name: SSL), on port{' '}
              <strong>443</strong>. TLS gives you three things:
            </p>
            <ul>
              <li>
                <strong>Encryption</strong>: nobody in between can read it.
              </li>
              <li>
                <strong>Integrity</strong>: nobody can change it unnoticed.
              </li>
              <li>
                <strong>Authentication</strong>: you're really talking to shop.in, not an impostor.
              </li>
            </ul>
            <p>
              Right after the TCP handshake comes the <strong>TLS handshake</strong>: the browser says hello, the server sends its{' '}
              <strong>certificate</strong>, the browser checks it, both sides agree on secret keys, and from then on everything is
              encrypted.
            </p>
          </>
        ),
      },
      {
        title: 'Certificates and CAs',
        body: (
          <>
            <p>
              A <strong>certificate</strong> is a digital ID card for a domain: it states the domain name, an expiry date, and the
              server's public key. It is signed by a <strong>Certificate Authority</strong> (CA) like Let's Encrypt, DigiCert, or
              Amazon.
            </p>
            <p>
              Your operating system ships with a list of trusted root CAs. The browser follows the chain of signatures up to one of
              them. If the name doesn't match, the chain is untrusted, or it has <strong>expired</strong>, you get the big red
              warning page.
            </p>
            <Tip kind="note">In AWS, <b>ACM</b> (Certificate Manager) issues free certificates for load balancers and CloudFront and renews them automatically. Expired certificates are a classic outage cause elsewhere.</Tip>
            <Shell>{`$ openssl s_client -connect shop.in:443 -servername shop.in
# shows the certificate chain and expiry dates`}</Shell>
          </>
        ),
      },
    ],
  },
  Playground: RequestBuilder,
  playgroundIntro: 'Build a request against a pretend shop API. Change method, path, login and HTTPS, and read the status code you get back.',
  terms: [
    { term: 'HTTP', def: 'The request/response protocol of the web.' },
    { term: 'Method', def: 'The action: GET, POST, PUT, PATCH, DELETE.' },
    { term: 'Path', def: 'Which resource, e.g. /api/products/42.' },
    { term: 'Header', def: 'A Name: value line of extra information in a request or response.' },
    { term: 'Body', def: 'The data carried by a request or response (HTML, JSON, a file).' },
    { term: 'Status code', def: 'Three-digit result: 2xx ok, 3xx redirect, 4xx client error, 5xx server error.' },
    { term: 'Cookie', def: 'Small data the server asks the browser to store and send back, e.g. a session ID.' },
    { term: 'Stateless', def: 'Each request is independent; the server keeps no memory between them by default.' },
    { term: 'HTTPS / TLS', def: 'HTTP over an encrypted, authenticated TLS connection on port 443.' },
    { term: 'Certificate', def: 'A CA-signed document proving a server owns a domain, with an expiry date.' },
    { term: 'REST API', def: 'An HTTP API organised around resources (paths) and methods.' },
  ],
  quiz: [
    {
      q: 'Which method should only read data and never change anything?',
      options: ['POST', 'GET', 'DELETE', 'PATCH'],
      answer: 1,
      why: 'GET is for reading. Creating is POST, changing is PUT/PATCH, removing is DELETE.',
    },
    {
      q: 'An API returns 401. What does it mean?',
      options: ['Server crashed', 'You are not logged in / not authenticated', 'Page not found', 'Too many requests'],
      answer: 1,
      why: '401 = "who are you?" Send valid credentials or a token. 403 would mean "I know you, but you are not allowed".',
    },
    {
      q: 'Users see 502 Bad Gateway. Where do you look first?',
      options: ['The user’s browser', 'The app servers behind the load balancer', 'DNS', 'The CSS'],
      answer: 1,
      why: '5xx is server side. 502 means the proxy/load balancer got no valid answer from the app: crashed, wrong port, or restarting.',
    },
    {
      q: 'What does HTTPS add on top of HTTP?',
      options: ['Faster speed', 'Encryption, integrity and server identity via TLS', 'Compression only', 'A different set of methods'],
      answer: 1,
      why: 'TLS encrypts the traffic, detects tampering, and proves the server’s identity with a certificate.',
    },
  ],
  interview: [
    {
      q: 'Explain the difference between 401 and 403.',
      a: '401 Unauthorized means the request lacks valid authentication: log in or send a token. 403 Forbidden means the server knows who you are but you do not have permission.',
    },
    {
      q: 'What happens in a TLS handshake?',
      a: 'Client hello with supported versions and a key share, server hello with its certificate and key share, the client validates the certificate chain, name and expiry, both derive session keys, then all HTTP traffic is encrypted. TLS 1.3 does this in one round trip.',
    },
    {
      q: 'HTTP is stateless. How do logins work?',
      a: 'The server issues a session ID in a Set-Cookie header (or a token like a JWT). The client sends it with every request (Cookie or Authorization header), and the server looks it up to identify the user.',
    },
  ],
  commands: [
    { cmd: 'curl -i https://example.com', note: 'Show status line and headers with the body' },
    { cmd: 'curl -I https://example.com', note: 'Headers only (HEAD request)' },
    { cmd: 'curl -v https://example.com', note: 'Verbose: DNS, TCP, TLS handshake, request and response' },
    { cmd: 'curl -X POST -H "Content-Type: application/json" -d \'{"qty":1}\' https://api/x', note: 'Send JSON with POST' },
    { cmd: 'openssl s_client -connect host:443', note: 'Inspect a server’s TLS certificate' },
  ],
}

export default lesson
