import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Box, Network, Power, RefreshCw, Skull, Waves } from 'lucide-react'
import { Caption, type Callout } from '../components/Caption'

type Status = 'pending' | 'running' | 'terminating'
type Pod = { id: string; node: number; status: Status; version: 1 | 2; since: number; hits: number }
type Ev = { at: number; warn?: boolean; reason: string; msg: string }
type Cluster = { now: number; pods: Pod[]; replicas: number; nodeUp: boolean[]; version: 1 | 2; events: Ev[]; served: number; failed: number }

const IMAGE = { 1: 'nginx:1.25', 2: 'nginx:1.27' } as const
const HASH = { 1: '7f9c', 2: 'b21d' } as const
const NODES = ['worker-1', 'worker-2']

const rand4 = () => Math.random().toString(36).slice(2, 6)
const podName = (v: 1 | 2) => `web-${HASH[v]}-${rand4()}`

function initial(now: number): Cluster {
  return {
    now,
    pods: [0, 1, 0].map((node) => ({ id: podName(1), node, status: 'running' as Status, version: 1 as const, since: now, hits: 0 })),
    replicas: 3,
    nodeUp: [true, true],
    version: 1,
    events: [],
    served: 0,
    failed: 0,
  }
}

/** One pass of the Deployment / ReplicaSet control loop: compare desired state with actual state and fix one thing. */
function reconcile(c: Cluster, now: number): Cluster {
  const events: Ev[] = []
  let pods = c.pods.filter((p) => !(p.status === 'terminating' && now - p.since > 900))

  pods = pods.map((p) => {
    if (!c.nodeUp[p.node] && p.status !== 'terminating') {
      events.push({ at: now, warn: true, reason: 'NodeNotReady', msg: `pod/${p.id} evicted from ${NODES[p.node]}` })
      return { ...p, status: 'terminating', since: now }
    }
    if (p.status === 'pending' && now - p.since > 1300) {
      events.push({ at: now, reason: 'Started', msg: `pod/${p.id} container started (${IMAGE[p.version]})` })
      return { ...p, status: 'running', since: now }
    }
    return p
  })

  const active = pods.filter((p) => p.status !== 'terminating')
  const hasPending = active.some((p) => p.status === 'pending')
  const old = active.filter((p) => p.version !== c.version)
  const upNodes = [0, 1].filter((n) => c.nodeUp[n])

  const create = () => {
    if (!upNodes.length) return
    const load = (n: number) => active.filter((p) => p.node === n).length
    const node = upNodes.reduce((a, b) => (load(b) < load(a) ? b : a))
    const pod: Pod = { id: podName(c.version), node, status: 'pending', version: c.version, since: now, hits: 0 }
    pods = [...pods, pod]
    events.push({ at: now, reason: 'Scheduled', msg: `pod/${pod.id} assigned to ${NODES[node]}` })
  }
  const terminate = (p: Pod, why: string) => {
    pods = pods.map((x) => (x.id === p.id ? { ...x, status: 'terminating', since: now } : x))
    events.push({ at: now, reason: 'Killing', msg: `pod/${p.id} ${why}` })
  }

  if (active.length < c.replicas) {
    create()
  } else if (old.length) {
    // Rolling update with maxSurge=1, maxUnavailable=0.
    if (!hasPending) {
      if (active.length > c.replicas) terminate(old[0], 'replaced by new version')
      else create()
    }
  } else if (active.length > c.replicas) {
    const victim = [...active].sort((a, b) => b.since - a.since)[0]
    terminate(victim, 'scaled down')
  }

  return { ...c, now, pods, events: events.length ? [...events, ...c.events].slice(0, 9) : c.events }
}

export default function K8sCluster() {
  const [c, setC] = useState<Cluster>(() => initial(Date.now()))
  const [traffic, setTraffic] = useState(true)
  const [hit, setHit] = useState<{ id: string; n: number } | null>(null)
  const rr = useRef(0)

  useEffect(() => {
    const t = setInterval(() => {
      const now = Date.now()
      setC((cur) => reconcile(cur, now))
    }, 500)
    return () => clearInterval(t)
  }, [])

  const cRef = useRef(c)
  useEffect(() => {
    cRef.current = c
  }, [c])

  // The Service load-balances requests round-robin across running (ready) pods only.
  useEffect(() => {
    if (!traffic) return
    const t = setInterval(() => {
      const ready = cRef.current.pods.filter((p) => p.status === 'running')
      if (!ready.length) {
        setC((cur) => ({ ...cur, failed: cur.failed + 1 }))
        return
      }
      const target = ready[rr.current++ % ready.length]
      setHit((h) => ({ id: target.id, n: (h?.n ?? 0) + 1 }))
      setC((cur) => ({
        ...cur,
        served: cur.served + 1,
        pods: cur.pods.map((p) => (p.id === target.id ? { ...p, hits: p.hits + 1 } : p)),
      }))
    }, 650)
    return () => clearInterval(t)
  }, [traffic])

  const ready = c.pods.filter((p) => p.status === 'running').length
  const active = c.pods.filter((p) => p.status !== 'terminating').length
  const rolling = c.pods.some((p) => p.status !== 'terminating' && p.version !== c.version)

  function killPod() {
    const running = c.pods.filter((p) => p.status === 'running')
    if (!running.length) return
    const victim = running[Math.floor(Math.random() * running.length)]
    const now = Date.now()
    setC((cur) => ({
      ...cur,
      pods: cur.pods.map((p) => (p.id === victim.id ? { ...p, status: 'terminating', since: now } : p)),
      events: [{ at: now, warn: true, reason: 'Killing', msg: `pod/${victim.id} deleted (kubectl delete pod)` }, ...cur.events].slice(0, 9),
    }))
  }

  function toggleNode() {
    const now = Date.now()
    setC((cur) => {
      const up = !cur.nodeUp[1]
      const ev: Ev = up
        ? { at: now, reason: 'NodeReady', msg: 'node/worker-2 is Ready again' }
        : { at: now, warn: true, reason: 'NodeNotReady', msg: 'node/worker-2 stopped responding' }
      return { ...cur, nodeUp: [cur.nodeUp[0], up], events: [ev, ...cur.events].slice(0, 9) }
    })
  }

  function rollout() {
    const now = Date.now()
    setC((cur) => {
      const v = cur.version === 1 ? 2 : 1
      return {
        ...cur,
        version: v,
        events: [{ at: now, reason: 'ScalingReplicaSet', msg: `rolling update to ${IMAGE[v]}` }, ...cur.events].slice(0, 9),
      }
    })
  }

  let title = 'Desired state = actual state'
  let body = 'The Deployment wants 3 replicas and 3 are running. The control loop checks twice a second. Try breaking it.'
  let callout: Callout | undefined
  if (!c.nodeUp[1]) {
    title = 'worker-2 is down'
    body = 'Pods on the failed node are evicted and recreated on worker-1. (In a real cluster eviction takes about 5 minutes by default.)'
    callout = { tone: 'amber', title: 'Single point of failure', body: 'All pods now share one node. Bring worker-2 back and new pods will spread out again.' }
  } else if (rolling) {
    title = `Rolling update to ${IMAGE[c.version]}`
    body = 'maxSurge=1, maxUnavailable=0: start one new pod, wait until it is Running, then kill one old pod. Traffic keeps flowing the whole time.'
  } else if (active !== c.replicas || ready !== c.replicas) {
    title = 'Reconciling...'
    body = `Desired ${c.replicas}, ready ${ready}. The ReplicaSet controller creates or removes pods until they match. Pending (amber) pods get no traffic yet.`
  }
  if (c.failed > 0 && ready === 0) callout = { tone: 'rose', title: 'No ready endpoints', body: 'The Service has nothing to send traffic to. Users get 503s until a pod is Running.' }

  const elapsed = (at: number) => `${Math.max(0, Math.round((c.now - at) / 1000))}s`

  return (
    <div className="card stage">
      <div className="toolbar">
        <button className="btn danger" onClick={killPod}>
          <Skull size={16} /> Kill a pod
        </button>
        <button className="btn" aria-pressed={!c.nodeUp[1]} onClick={toggleNode}>
          <Power size={16} /> {c.nodeUp[1] ? 'Crash worker-2' : 'Restore worker-2'}
        </button>
        <button className="btn" onClick={rollout} disabled={rolling} title={rolling ? 'Rollout in progress' : undefined}>
          <RefreshCw size={16} /> Deploy {IMAGE[c.version === 1 ? 2 : 1]}
        </button>
        <label className="switch">
          <input type="checkbox" checked={traffic} onChange={(e) => setTraffic(e.target.checked)} />
          Send traffic
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, marginLeft: 'auto' }}>
          Replicas
          <input
            type="range"
            min={1}
            max={6}
            step={1}
            value={c.replicas}
            onChange={(e) => setC((cur) => ({ ...cur, replicas: Number(e.target.value) }))}
            style={{ width: 110, accentColor: 'var(--sky)' }}
          />
          <span className="mono" style={{ width: 12 }}>{c.replicas}</span>
        </label>
      </div>

      <div className="tone-violet" style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', padding: '10px 14px', borderRadius: 12, border: '1px solid color-mix(in srgb, var(--tone) 40%, transparent)', background: 'color-mix(in srgb, var(--tone) 8%, transparent)' }}>
        <Box size={16} color="var(--violet)" />
        <span style={{ fontWeight: 600 }}>Control plane</span>
        <span className="mono muted" style={{ fontSize: 13 }}>deployment/web</span>
        <span className="chip mono">desired {c.replicas}</span>
        <motion.span key={ready} initial={{ scale: 1.2 }} animate={{ scale: 1 }} className={`chip mono tone-${ready === c.replicas ? 'green' : 'amber'}`}>
          ready {ready}
        </motion.span>
        <span className="chip mono tone-sky">{IMAGE[c.version]}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(150px, 0.6fr) repeat(2, minmax(0, 1fr))', gap: 12 }} className="k8s-grid">
        <div className="tone-sky" style={{ borderRadius: 12, border: '1px solid color-mix(in srgb, var(--tone) 45%, transparent)', padding: 14, display: 'flex', flexDirection: 'column', gap: 8, background: 'color-mix(in srgb, var(--tone) 8%, transparent)' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontWeight: 600 }}>
            <Network size={16} color="var(--sky)" /> Service
          </div>
          <span className="mono muted" style={{ fontSize: 12 }}>web · ClusterIP 10.96.12.4</span>
          <span style={{ fontSize: 13 }}>Round-robin to ready pods</span>
          <div style={{ marginTop: 'auto', fontSize: 13 }}>
            <div>
              <Waves size={14} style={{ verticalAlign: -2 }} /> served <span className="mono">{c.served}</span>
            </div>
            <div style={{ color: c.failed ? 'var(--rose)' : 'var(--muted)' }}>
              failed <span className="mono">{c.failed}</span>
            </div>
          </div>
        </div>

        {NODES.map((name, n) => (
          <div
            key={name}
            style={{
              borderRadius: 12,
              border: `1px ${c.nodeUp[n] ? 'solid var(--border-strong)' : 'dashed var(--rose)'}`,
              padding: 14,
              minHeight: 190,
              background: c.nodeUp[n] ? 'var(--panel-2)' : 'color-mix(in srgb, var(--rose) 6%, var(--panel-2))',
              transition: 'all 0.3s',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, fontSize: 13 }}>
              <span style={{ fontWeight: 600 }}>{name}</span>
              <span className={`chip tone-${c.nodeUp[n] ? 'green' : 'rose'}`}>{c.nodeUp[n] ? 'Ready' : 'NotReady'}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(92px, 1fr))', gap: 8 }}>
              <AnimatePresence>
                {c.pods
                  .filter((p) => p.node === n)
                  .map((p) => {
                    const tone = p.status === 'terminating' ? 'rose' : p.status === 'pending' ? 'amber' : p.version === 1 ? 'teal' : 'violet'
                    return (
                      <motion.div
                        key={p.id}
                        layout
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: p.status === 'terminating' ? 0.45 : 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.4 }}
                        transition={{ type: 'spring', stiffness: 320, damping: 26 }}
                        className={`tone-${tone}`}
                        style={{
                          position: 'relative',
                          borderRadius: 10,
                          padding: '8px 6px',
                          textAlign: 'center',
                          border: `1.5px ${p.status === 'pending' ? 'dashed' : 'solid'} var(--tone)`,
                          background: 'color-mix(in srgb, var(--tone) 14%, transparent)',
                          fontSize: 11,
                        }}
                      >
                        {hit?.id === p.id && (
                          <motion.span
                            key={hit.n}
                            initial={{ opacity: 0.8, scale: 0.9 }}
                            animate={{ opacity: 0, scale: 1.35 }}
                            transition={{ duration: 0.6 }}
                            style={{ position: 'absolute', inset: -2, borderRadius: 10, border: '2px solid var(--amber)', pointerEvents: 'none' }}
                          />
                        )}
                        <div className="mono" style={{ fontWeight: 500 }}>{p.id.slice(4)}</div>
                        <div style={{ color: 'var(--tone)' }}>{p.status === 'running' ? `v${p.version} · Running` : p.status === 'pending' ? 'Pending' : 'Terminating'}</div>
                        <div className="muted mono">{p.hits} req</div>
                      </motion.div>
                    )
                  })}
              </AnimatePresence>
            </div>
          </div>
        ))}
      </div>

      <div className="terminal">
        <header><i /><i /><i /><span style={{ marginLeft: 6 }}>kubectl get events -w</span></header>
        <div className="body" style={{ height: 170 }}>
          {c.events.length === 0 && <span className="dim">No events yet. Kill a pod or crash a node.</span>}
          <AnimatePresence initial={false}>
            {c.events.map((e) => (
              <motion.div key={e.at + e.msg} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}>
                <span className="dim">{elapsed(e.at).padEnd(5)}</span>
                <span className={e.warn ? 'err' : 'ok'}>{(e.warn ? 'Warning' : 'Normal').padEnd(8)}</span>
                <span className="cmdline">{e.reason.padEnd(18)}</span>
                {e.msg}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      <Caption id={title} title={title} body={body} callout={callout} />
    </div>
  )
}
