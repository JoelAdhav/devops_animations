import { useMemo, useState } from 'react'
import { Caption, type Callout } from '../components/Caption'
import { Controls } from '../components/Controls'
import { Node, Packet, Wire, Zone, type Pt } from '../components/Diagram'
import { useStepper } from '../lib/useStepper'

type Toggle = 'igw' | 'sg' | 'nat' | 'route'
type Toggles = Record<Toggle, boolean>

const TOGGLE_INFO: Record<Toggle, string> = {
  igw: 'Internet gateway attached',
  sg: 'Web SG allows 443 inbound',
  nat: 'NAT gateway running',
  route: 'Private route 0.0.0.0/0 → NAT',
}

type Hop = {
  path: Pt[]
  failPath: Pt[]
  /** Returns an error message when this hop is blocked, otherwise null. */
  check: (t: Toggles) => string | null
  title: string
  body: string
}

const INTERNET: Pt = [380, 66]
const IGW: Pt = [380, 102]
const BUS_Y = 145

type ScenarioId = 'inbound' | 'outbound' | 'direct'
const SCENARIOS: Record<ScenarioId, { label: string; start: Pt; intro: string; success: string; hops: Hop[] }> = {
  inbound: {
    label: 'User → public web server',
    start: INTERNET,
    intro: 'A user on the internet opens https://your-site. The web server is in the public subnet with a public IP.',
    success: 'Inbound traffic works because the subnet routes to an internet gateway, the server has a public IP, and the security group allows 443.',
    hops: [
      {
        path: [IGW],
        failPath: [[380, 74]],
        check: (t) => (t.igw ? null : 'No internet gateway is attached to the VPC. Nothing from the internet can enter. Connection times out.'),
        title: '1. Enter through the internet gateway',
        body: 'The IGW is the VPC’s door to the internet. It also translates the public IP to the server’s private IP (10.0.1.10).',
      },
      {
        path: [[380, BUS_Y], [160, BUS_Y], [160, 228]],
        failPath: [[380, BUS_Y], [160, BUS_Y], [160, 196]],
        check: (t) => (t.sg ? null : 'The security group has no inbound rule for port 443, so the packet is silently dropped. Browser shows ERR_CONNECTION_TIMED_OUT.'),
        title: '2. Security group check',
        body: 'The public route table sends traffic for 10.0.0.0/16 locally. The web server’s security group allows TCP 443 from 0.0.0.0/0, so the packet is delivered.',
      },
    ],
  },
  outbound: {
    label: 'Private server → internet',
    start: [555, 276],
    intro: 'The app server in the private subnet runs "sudo dnf update". It must reach the internet, but the internet must never reach it.',
    success: 'The private server reached the internet through NAT. Replies come back the same way, but nobody outside can start a connection to it.',
    hops: [
      {
        path: [[555, 348], [350, 348]],
        failPath: [[555, 320]],
        check: (t) => {
          if (!t.route) return 'The private route table has no 0.0.0.0/0 route. The packet has nowhere to go. dnf update hangs and times out.'
          if (!t.nat) return 'The route points to a NAT gateway that no longer exists (route status: blackhole). Packets are dropped.'
          return null
        },
        title: '1. Private route table → NAT gateway',
        body: 'The private route table has 0.0.0.0/0 → nat-0c3d. The packet goes to the NAT gateway in the public subnet.',
      },
      {
        path: [[290, 348], [290, BUS_Y], [380, BUS_Y], IGW],
        failPath: [[290, 348], [290, BUS_Y], [380, BUS_Y], [380, 128]],
        check: (t) => (t.igw ? null : 'NAT itself needs the internet gateway. Without it, even NAT has no way out.'),
        title: '2. NAT swaps the source IP',
        body: 'NAT replaces the private source IP 10.0.2.15 with its own Elastic IP, then sends the packet out through the internet gateway.',
      },
      {
        path: [INTERNET],
        failPath: [INTERNET],
        check: () => null,
        title: '3. Out to the internet',
        body: 'The package mirror sees the NAT’s Elastic IP, not the server. Replies return to NAT, which forwards them back to 10.0.2.15.',
      },
    ],
  },
  direct: {
    label: 'Internet → private server',
    start: INTERNET,
    intro: 'An attacker scans the internet and tries to connect straight to your private app server. What happens?',
    success: '',
    hops: [
      {
        path: [IGW],
        failPath: [[380, 74]],
        check: (t) => (t.igw ? null : 'No internet gateway: the packet cannot even enter the VPC.'),
        title: '1. Reaches the internet gateway',
        body: 'The packet arrives at the VPC’s door...',
      },
      {
        path: [[555, 248]],
        failPath: [[380, BUS_Y], [555, BUS_Y], [555, 196]],
        check: () =>
          'Blocked by design. The app server only has a private IP (10.0.2.15), and its subnet has no route to the internet gateway. There is no address on the internet that leads to it. To administer it, use SSM Session Manager or a bastion host.',
        title: '2. Try to reach 10.0.2.15',
        body: '',
      },
    ],
  },
}

export default function VpcNetworking() {
  const [scenario, setScenario] = useState<ScenarioId>('inbound')
  const [t, setT] = useState<Toggles>({ igw: true, sg: true, nat: true, route: true })
  const sc = SCENARIOS[scenario]
  const failIdx = sc.hops.findIndex((h) => h.check(t) !== null)
  const s = useStepper(sc.hops.length, { stopAt: failIdx >= 0 ? failIdx + 1 : undefined, interval: 1800 })
  const hop = s.step > 0 ? sc.hops[s.step - 1] : null
  const error = hop ? hop.check(t) : null

  const path = useMemo<Pt[]>(() => (hop ? (error ? hop.failPath : hop.path) : [sc.start]), [hop, error, sc.start])

  function change(next: Partial<Toggles>) {
    setT((cur) => ({ ...cur, ...next }))
    s.reset()
  }

  let callout: Callout | undefined
  if (error) callout = { tone: scenario === 'direct' && t.igw ? 'green' : 'rose', title: scenario === 'direct' && t.igw ? 'Dropped (that is good)' : 'Packet dropped', body: error }
  else if (s.done && sc.success) callout = { tone: 'green', title: 'Delivered', body: sc.success }

  const flowing = s.playing || s.step > 0

  return (
    <div className="card stage">
      <div className="toolbar">
        <span className="label">Scenario</span>
        <div className="seg" role="group" aria-label="Scenario">
          {(Object.keys(SCENARIOS) as ScenarioId[]).map((k) => (
            <button key={k} aria-pressed={scenario === k} onClick={() => { setScenario(k); s.reset() }}>
              {SCENARIOS[k].label}
            </button>
          ))}
        </div>
      </div>
      <div className="toolbar" style={{ gap: 18 }}>
        <span className="label">Infrastructure</span>
        {(Object.keys(TOGGLE_INFO) as Toggle[]).map((k) => (
          <label className="switch" key={k}>
            <input type="checkbox" checked={t[k]} onChange={(e) => change({ [k]: e.target.checked })} />
            {TOGGLE_INFO[k]}
          </label>
        ))}
      </div>

      <svg viewBox="0 0 760 420" role="img" aria-label="VPC with public and private subnets">
        <Zone x={30} y={102} w={700} h={300} label="VPC 10.0.0.0/16 (ap-south-1)" tone="violet" />
        <Zone x={56} y={170} w={318} h={212} label="Public subnet 10.0.1.0/24" tone="sky" labelBottom />
        <Zone x={396} y={170} w={318} h={212} label="Private subnet 10.0.2.0/24" tone="teal" labelBottom />

        <Wire d={`M380 64 V82`} flow={flowing && scenario !== 'outbound'} broken={!t.igw} />
        <Wire d={`M380 122 V${BUS_Y} H160 V228`} flow={flowing && scenario === 'inbound'} broken={scenario === 'inbound' && !t.sg} />
        <Wire d={`M380 ${BUS_Y} H290 V320`} flow={flowing && scenario === 'outbound'} broken={!t.nat} />
        <Wire d={`M555 304 V348 H350`} flow={flowing && scenario === 'outbound'} broken={!t.route} />
        {scenario === 'direct' && <Wire d={`M380 ${BUS_Y} H555 V248`} broken />}

        <Node x={310} y={16} w={140} h={48} title="Internet" tone="slate" />
        <Node x={320} y={82} w={120} h={40} title="Internet GW" tone="violet" down={!t.igw} />
        <Node x={75} y={228} w={170} title="Web server" sub="10.0.1.10 + public IP" tone="sky" />
        <Node x={230} y={320} w={120} title="NAT gateway" sub="Elastic IP" tone="amber" down={!t.nat} />
        <Node x={480} y={248} w={150} title="App server" sub="10.0.2.15 only" tone="teal" />

        <Packet path={path} bad={!!error} />
      </svg>

      <div className="mini-tables">
        <div className="mini-table">
          <header>Public route table</header>
          <div className="row"><span>10.0.0.0/16</span><span>local</span></div>
          <div className="row"><span>0.0.0.0/0</span><span className={t.igw ? '' : 'missing'}>igw-0a1b</span></div>
        </div>
        <div className="mini-table">
          <header>Private route table</header>
          <div className="row"><span>10.0.0.0/16</span><span>local</span></div>
          <div className="row">
            <span className={t.route ? '' : 'missing'}>0.0.0.0/0</span>
            <span className={!t.route ? 'missing' : t.nat ? '' : 'warn'}>{t.nat ? 'nat-0c3d' : 'nat-0c3d (blackhole)'}</span>
          </div>
        </div>
        <div className="mini-table">
          <header>web-sg inbound rules</header>
          <div className="row"><span className={t.sg ? '' : 'missing'}>TCP 443</span><span className={t.sg ? '' : 'missing'}>0.0.0.0/0</span></div>
          <div className="row"><span>TCP 22</span><span className="muted">none (use SSM)</span></div>
        </div>
      </div>

      <Controls s={s} failed={!!error} />
      <Caption
        id={`${scenario}-${JSON.stringify(t)}-${s.step}`}
        title={hop ? hop.title : sc.label}
        body={hop ? hop.body || 'Watch where it ends up.' : sc.intro}
        callout={callout}
      />
    </div>
  )
}
