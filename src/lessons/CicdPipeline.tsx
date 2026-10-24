import { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { Check, GitCommit, Loader2, Lock, X } from 'lucide-react'
import { Caption, type Callout } from '../components/Caption'
import { Controls } from '../components/Controls'
import { useStepper } from '../lib/useStepper'

type Stage = {
  id: string
  name: string
  sub: string
  explain: string
  logs: string[]
  fail?: { label: string; logs: string[]; fix: string }
}

const SHA = '3f2a9c1'
const PREV_SHA = '9d81b02'
const REPO = '123456789012.dkr.ecr.ap-south-1.amazonaws.com/shop'

const STAGES: Stage[] = [
  {
    id: 'commit',
    name: 'Commit',
    sub: 'git push',
    explain: 'A developer pushes to main. GitHub fires a webhook and a runner starts the workflow in a clean VM.',
    logs: [`$ git push origin main`, `   ${PREV_SHA}..${SHA}  main -> main`, 'Workflow "deploy" triggered on push'],
  },
  {
    id: 'test',
    name: 'Lint & test',
    sub: 'npm test',
    explain: 'Install dependencies, run the linter and unit tests. Cheap, fast checks run first so bad code fails early.',
    logs: ['$ npm ci', '$ npm run lint', '  0 problems', '$ npm test', '  ✓ 42 tests passed (3.1 s)'],
    fail: {
      label: 'Failing test',
      logs: ['$ npm test', '  ✕ cart.test.js › total includes 18% GST', '    Expected: 118  Received: 100', 'Error: Process completed with exit code 1.'],
      fix: 'Run the failing test locally (npm test -- cart), fix the bug, push again. Nothing was built or deployed.',
    },
  },
  {
    id: 'build',
    name: 'Build image',
    sub: 'docker build',
    explain: `Build a Docker image tagged with the commit SHA (${SHA}). The tag is immutable, so you always know which code runs where.`,
    logs: [`$ docker build -t shop:${SHA} .`, ' => CACHED [3/5] RUN npm ci', ' => [4/5] COPY . .', ` => naming to shop:${SHA}`],
    fail: {
      label: 'Broken Dockerfile',
      logs: [`$ docker build -t shop:${SHA} .`, ' => ERROR [4/5] COPY dist/ ./', 'ERROR: failed to compute cache key: "/dist" not found'],
      fix: 'The build expects a dist/ folder that was never created. Add the build step (npm run build) or a multi-stage build.',
    },
  },
  {
    id: 'push',
    name: 'Push to ECR',
    sub: 'registry',
    explain: 'Push the image to Amazon ECR. The pipeline authenticates with OIDC: a short-lived AWS role, no stored access keys.',
    logs: ['$ aws ecr get-login-password | docker login ...', 'Login Succeeded', `$ docker push ${REPO}:${SHA}`, `${SHA}: digest: sha256:9b1e4c… size: 1573`],
    fail: {
      label: 'Missing IAM permission',
      logs: [`$ docker push ${REPO}:${SHA}`, 'denied: User: arn:aws:sts::123456789012:assumed-role/gha-deploy is not authorized', 'to perform: ecr:InitiateLayerUpload'],
      fix: 'Add the ECR push actions (ecr:InitiateLayerUpload, UploadLayerPart, CompleteLayerUpload, PutImage) to the CI role for this repository only.',
    },
  },
  {
    id: 'staging',
    name: 'Deploy staging',
    sub: 'kubectl',
    explain: 'Roll the new image out to the staging cluster with a rolling update.',
    logs: [`$ kubectl set image deploy/shop shop=${REPO}:${SHA} -n staging`, '$ kubectl rollout status deploy/shop -n staging', 'deployment "shop" successfully rolled out'],
  },
  {
    id: 'smoke',
    name: 'Smoke test',
    sub: 'curl /health',
    explain: 'Hit a few real endpoints on staging. Unit tests passed, but does the deployed app actually work with real config?',
    logs: ['$ curl -fsS https://staging.shop.in/health', '{"status":"ok","db":"ok"}', '$ curl -fsS https://staging.shop.in/api/products | jq length', '24'],
    fail: {
      label: 'Smoke test fails',
      logs: ['$ curl -fsS https://staging.shop.in/health', 'curl: (22) The requested URL returned error: 503', `Rolling back staging to shop:${PREV_SHA}`, '$ kubectl rollout undo deploy/shop -n staging'],
      fix: 'Check kubectl logs deploy/shop -n staging. Common cause: a new env var (e.g. DB_URL) added in code but not in the config. Production was never touched.',
    },
  },
  {
    id: 'prod',
    name: 'Production',
    sub: 'approval',
    explain: 'A required reviewer approves, and the exact same image that passed staging is promoted to production. Rebuilding would risk shipping something different.',
    logs: ['Waiting for review: production ... approved by @lead', `$ kubectl set image deploy/shop shop=${REPO}:${SHA} -n prod`, 'deployment "shop" successfully rolled out', `✓ shop:${SHA} is live`],
  },
]

export default function CicdPipeline() {
  const [failId, setFailId] = useState<string>('none')
  const failIdx = STAGES.findIndex((st) => st.id === failId)
  const s = useStepper(STAGES.length, { stopAt: failIdx >= 0 ? failIdx + 1 : undefined, interval: 1400 })
  const logRef = useRef<HTMLDivElement>(null)

  const status = (i: number): 'pending' | 'running' | 'passed' | 'failed' => {
    if (i < s.step) return i === failIdx ? 'failed' : 'passed'
    if (i === s.step && s.playing) return 'running'
    return 'pending'
  }

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' })
  }, [s.step])

  const cur = s.step > 0 ? STAGES[s.step - 1] : null
  const failed = failIdx >= 0 && s.step === failIdx + 1

  let callout: Callout | undefined
  if (failed && cur?.fail) callout = { tone: 'rose', title: `Pipeline stopped at "${cur.name}"`, body: cur.fail.fix }
  else if (s.done && failIdx < 0) callout = { tone: 'green', title: 'Shipped', body: `Rollback is one command: kubectl rollout undo deploy/shop (back to ${PREV_SHA}).` }

  return (
    <div className="card stage">
      <div className="toolbar">
        <span className="label">Simulate</span>
        <div className="seg" role="group" aria-label="Failure to simulate">
          <button aria-pressed={failId === 'none'} onClick={() => { setFailId('none'); s.reset() }}>All green</button>
          {STAGES.filter((st) => st.fail).map((st) => (
            <button key={st.id} className="bad" aria-pressed={failId === st.id} onClick={() => { setFailId(st.id); s.reset() }}>
              {st.fail!.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'stretch', overflowX: 'auto', padding: '6px 2px 10px' }}>
        {STAGES.map((st, i) => {
          const stt = status(i)
          const tone = stt === 'passed' ? 'green' : stt === 'failed' ? 'rose' : stt === 'running' ? 'sky' : 'slate'
          const blocked = failIdx >= 0 && s.step > failIdx && i > failIdx
          return (
            <div key={st.id} style={{ display: 'flex', alignItems: 'center', flex: 'none' }}>
              <motion.div
                className={`tone-${tone}`}
                animate={{ scale: stt === 'running' ? 1.04 : 1, opacity: blocked ? 0.4 : 1 }}
                style={{
                  width: 118,
                  padding: '12px 10px',
                  borderRadius: 12,
                  border: `1.5px solid ${stt === 'pending' ? 'var(--border-strong)' : 'var(--tone)'}`,
                  background: stt === 'pending' ? 'var(--panel-2)' : 'color-mix(in srgb, var(--tone) 12%, var(--panel-2))',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 6,
                  textAlign: 'center',
                }}
              >
                <span
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    display: 'grid',
                    placeItems: 'center',
                    background: stt === 'pending' ? 'var(--panel-3)' : 'var(--tone)',
                    color: stt === 'pending' ? 'var(--muted)' : '#1e2742',
                  }}
                >
                  {stt === 'passed' && <Check size={16} />}
                  {stt === 'failed' && <X size={16} />}
                  {stt === 'running' && <Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} />}
                  {stt === 'pending' && (blocked ? <Lock size={14} /> : i === 0 ? <GitCommit size={15} /> : <span style={{ fontSize: 12 }}>{i + 1}</span>)}
                </span>
                <span style={{ fontWeight: 600, fontSize: 13, lineHeight: 1.2 }}>{st.name}</span>
                <span className="mono muted" style={{ fontSize: 11 }}>{st.sub}</span>
              </motion.div>
              {i < STAGES.length - 1 && (
                <div style={{ width: 26, height: 2, background: 'var(--border-strong)', position: 'relative', overflow: 'hidden' }}>
                  <motion.div
                    initial={false}
                    animate={{ width: i < s.step && status(i) === 'passed' ? '100%' : '0%' }}
                    transition={{ duration: 0.4 }}
                    style={{ position: 'absolute', inset: 0, background: 'var(--green)' }}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 13 }} className="muted">
        Artifact:
        <motion.span
          className={`chip mono tone-${s.step >= 3 && !(failIdx >= 0 && failIdx < 3) ? 'teal' : 'slate'}`}
          animate={{ opacity: s.step >= 3 ? 1 : 0.4 }}
        >
          shop:{SHA}
        </motion.span>
        <span>
          {s.step >= 4 && !(failIdx >= 0 && failIdx < 4) ? 'in ECR' : s.step >= 3 && !(failIdx >= 0 && failIdx < 3) ? 'built locally on the runner' : 'not built yet'}
        </span>
        <span style={{ marginLeft: 'auto' }}>
          Production runs:{' '}
          <span className="chip mono tone-green">shop:{s.done && failIdx < 0 ? SHA : PREV_SHA}</span>
        </span>
      </div>

      <div className="terminal">
        <header><i /><i /><i /><span style={{ marginLeft: 6 }}>GitHub Actions · deploy.yml · run #214</span></header>
        <div className="body" ref={logRef}>
          {s.step === 0 && <span className="dim">Waiting for a push...</span>}
          {STAGES.slice(0, s.step).map((st, i) => {
            const isFail = i === failIdx
            const logs = isFail && st.fail ? st.fail.logs : st.logs
            return (
              <motion.div key={st.id + failId} initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ marginBottom: 8 }}>
                <div className={isFail ? 'err' : 'ok'}>{isFail ? '✕' : '✓'} {st.name}</div>
                {logs.map((line, k) => (
                  <div key={k} className={line.startsWith('$') ? 'cmdline' : isFail && k >= logs.length - 2 ? 'err' : ''}>
                    {line}
                  </div>
                ))}
              </motion.div>
            )
          })}
        </div>
      </div>

      <Controls s={s} failed={failIdx >= 0} />
      <Caption
        id={`${failId}-${s.step}`}
        title={cur ? cur.name : 'Push code, get a safe deploy'}
        body={cur ? cur.explain : 'Each stage must pass before the next starts. Press Play, then try each failure to see what the pipeline protects you from.'}
        callout={callout}
      />
    </div>
  )
}
