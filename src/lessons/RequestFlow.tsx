import { useMemo, useState } from 'react'
import { Caption, type Callout } from '../components/Caption'
import { Controls } from '../components/Controls'
import { Node, Packet, Wire, Zone, type Pt } from '../components/Diagram'
import { useStepper } from '../lib/useStepper'

type Key = 'b' | 'd' | 'a' | 'e' | 'r'

const P: Record<Key, Pt> = { b: [80, 200], d: [250, 62], a: [275, 200], e: [460, 200], r: [650, 200] }
const CORNER: Pt = [80, 62]

const STEPS: { from: Key; to: Key; via?: Pt; title: string; body: string }[] = [
  { from: 'b', to: 'd', via: CORNER, title: '1. DNS lookup', body: 'The browser asks Route 53: what is the IP address of shop.example.com? (UDP port 53)' },
  { from: 'd', to: 'b', via: CORNER, title: '2. DNS answer', body: 'An alias record returns the IP addresses of the Application Load Balancer. The browser caches it for the record’s TTL.' },
  { from: 'b', to: 'a', title: '3. HTTPS request', body: 'The browser opens a TLS connection on port 443. The ALB security group allows 443 from 0.0.0.0/0, and the certificate comes from ACM.' },
  { from: 'a', to: 'e', title: '4. Forward to a target', body: 'The ALB picks a healthy instance from its target group and forwards the request to port 8080. The instance has no public IP: it lives in a private subnet.' },
  { from: 'e', to: 'r', title: '5. Database query', body: 'The app queries RDS on port 3306. The RDS security group only allows traffic from the app’s security group, nothing else.' },
  { from: 'r', to: 'e', title: '6. Rows returned', body: 'RDS sends the rows back. The app renders the response.' },
  { from: 'e', to: 'a', title: '7. HTTP 200 OK', body: 'The app returns 200 OK to the load balancer.' },
  { from: 'a', to: 'b', title: '8. Page loads', body: 'The ALB sends the response back over the same TLS connection. Total trip: usually 100–300 ms.' },
]

type FailId = 'none' | 'dns' | 'unhealthy' | 'crash' | 'db'
const FAILS: Record<Exclude<FailId, 'none'>, { label: string; at: number; error: string; debug: string }> = {
  dns: {
    label: 'Delete DNS record',
    at: 0,
    error: 'Browser: DNS_PROBE_FINISHED_NXDOMAIN',
    debug: 'dig shop.example.com returns nothing. Check the Route 53 hosted zone has a record and the domain uses the right name servers.',
  },
  unhealthy: {
    label: 'All targets unhealthy',
    at: 3,
    error: 'Browser: 503 Service Unavailable',
    debug: 'The ALB has no healthy targets. Check target group health checks: right path and port? Does the app return 200 on /health?',
  },
  crash: {
    label: 'App crashed',
    at: 3,
    error: 'Browser: 502 Bad Gateway',
    debug: 'Target is registered but refuses the connection. SSH/SSM in: systemctl status myapp, journalctl -u myapp, ss -tulnp | grep 8080, df -h (disk full?).',
  },
  db: {
    label: 'DB port blocked',
    at: 4,
    error: 'App hangs → 504 Gateway Timeout or 500',
    debug: 'App logs show "connection timed out". Test with nc -zv db-host 3306. Fix the RDS security group: inbound 3306 from the app security group.',
  },
}

export default function RequestFlow() {
  const [fail, setFail] = useState<FailId>('none')
  const f = fail === 'none' ? null : FAILS[fail]
  const s = useStepper(STEPS.length, { stopAt: f ? f.at + 1 : undefined })
  const cur = s.step > 0 ? STEPS[s.step - 1] : null
  const failedNow = !!f && s.step === f.at + 1

  const path = useMemo<Pt[]>(() => {
    if (!cur) return [P.b]
    const from = P[cur.from]
    const to = P[cur.to]
    if (failedNow) {
      // Stop the packet partway to show where the request dies.
      if (cur.via) return [cur.via]
      return [[from[0] + (to[0] - from[0]) * 0.55, from[1] + (to[1] - from[1]) * 0.55]]
    }
    return cur.via ? [cur.via, to] : [to]
  }, [cur, failedNow])

  const involved = cur ? [cur.from, cur.to] : null
  const dim = (k: Key) => !!involved && !involved.includes(k)
  const active = (k: Key) => !!involved && involved.includes(k)
  const wireState = (a: Key, b: Key) => {
    if (!cur) return {}
    const on = (cur.from === a && cur.to === b) || (cur.from === b && cur.to === a)
    return on ? (failedNow ? { broken: true } : { flow: true }) : {}
  }

  let callout: Callout | undefined
  if (failedNow && f) callout = { tone: 'rose', title: f.error, body: f.debug }
  else if (s.done && !f) callout = { tone: 'green', title: 'Request served', body: 'Now pick a failure above and replay to see how each one looks.' }

  return (
    <div className="card stage">
      <div className="toolbar">
        <span className="label">Simulate</span>
        <div className="seg" role="group" aria-label="Failure to simulate">
          <button aria-pressed={fail === 'none'} onClick={() => { setFail('none'); s.reset() }}>
            Everything healthy
          </button>
          {(Object.keys(FAILS) as Exclude<FailId, 'none'>[]).map((k) => (
            <button key={k} className="bad" aria-pressed={fail === k} onClick={() => { setFail(k); s.reset() }}>
              {FAILS[k].label}
            </button>
          ))}
        </div>
      </div>

      <svg viewBox="0 0 740 320" role="img" aria-label="Browser, DNS, load balancer, app server and database">
        <Zone x={170} y={110} w={560} h={195} label="VPC 10.0.0.0/16" tone="violet" />
        <Zone x={188} y={138} w={174} h={152} label="Public subnet" tone="sky" />
        <Zone x={378} y={138} w={340} h={152} label="Private subnet" tone="teal" />

        <Wire d="M80 172 V62 H180" {...wireState('b', 'd')} />
        <Wire d="M140 200 H205" {...wireState('b', 'a')} />
        <Wire d="M345 200 H395" {...wireState('a', 'e')} />
        <Wire d="M525 200 H585" {...wireState('e', 'r')} />

        <Node x={20} y={172} w={120} title="Browser" sub="you" dim={dim('b')} active={active('b')} />
        <Node x={180} y={34} w={140} title="DNS" sub="Route 53" tone="violet" dim={dim('d')} active={active('d')} down={fail === 'dns'} />
        <Node x={205} y={172} w={140} title="Load balancer" sub="ALB :443" tone="sky" dim={dim('a')} active={active('a')} />
        <Node x={395} y={172} w={130} title="App server" sub="EC2 :8080" tone="teal" dim={dim('e')} active={active('e')} down={fail === 'crash' || fail === 'unhealthy'} />
        <Node x={585} y={172} w={130} title="Database" sub="RDS :3306" tone="amber" dim={dim('r')} active={active('r')} down={fail === 'db'} />

        <Packet path={path} bad={failedNow} />
      </svg>

      <Controls s={s} failed={!!f} />
      <Caption
        id={`${fail}-${s.step}`}
        title={cur ? cur.title : 'You type shop.example.com and press Enter'}
        body={cur ? cur.body : 'Press Play (or Space) to follow the request. Use → to go one step at a time.'}
        callout={callout}
      />
    </div>
  )
}
