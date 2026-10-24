import { motion } from 'motion/react'
import type { Scenario } from '../components/SimLab'
import { saw, type SimState } from '../lib/sim'
import { HOME, makeFs, type CustomCommand, type Fs } from '../lib/vfs'
import { spring } from '../lib/motion'

/* ------------------------------------------------------------------ fake AWS state, kept in hidden files */

const STATE = '/var/lib/aws-sim'
const ALB = 'shop-alb-1234.ap-south-1.elb.amazonaws.com'
const TG = 'arn:aws:elasticloadbalancing:ap-south-1:111122223333:targetgroup/tg-web/6d0ecf831eec9f09'

const healthPath = (fs: Fs) => fs[`${STATE}/health-path`]?.content ?? '/health'
const deregistered = (fs: Fs) => (fs[`${STATE}/deregistered`]?.content ?? '').split(' ').filter(Boolean)
const setState = (fs: Fs, name: string, content: string): Fs => ({ ...fs, [`${STATE}/${name}`]: { type: 'file', content } })

/** Value after a flag like --health-check-path, or the "--flag=value" form. */
function flag(args: string[], name: string) {
  const i = args.indexOf(name)
  if (i >= 0) return args[i + 1]
  return args.find((a) => a.startsWith(name + '='))?.split('=')[1]
}

type Http = { status: number; headers: string[]; body: string }

const REASON: Record<number, string> = { 200: 'OK', 404: 'Not Found', 502: 'Bad Gateway', 503: 'Service Temporarily Unavailable' }

/** Builds a curl command from a function that answers one request (or returns null for an unknown host). */
function curl(answer: (host: string, path: string, fs: Fs) => { res: Http; fs?: Fs } | null): CustomCommand {
  return (args, { fs }) => {
    const opts = args.filter((a) => a.startsWith('-')).join('')
    const target = args.find((a) => !a.startsWith('-') && !['GET', 'HEAD'].includes(a))
    if (!target) return { err: ['curl: try \'curl --help\' for more information'], code: 2 }
    const m = target.replace(/^https?:\/\//, '').match(/^([^/:]+)(?::\d+)?(\/.*)?$/)
    if (!m) return { err: [`curl: (3) URL rejected: Bad hostname`], code: 3 }
    const r = answer(m[1], m[2] ?? '/', fs)
    if (!r) return { err: [`curl: (6) Could not resolve host: ${m[1]}`], code: 6 }
    const head = [`HTTP/1.1 ${r.res.status} ${REASON[r.res.status] ?? ''}`, ...r.res.headers, `Content-Length: ${r.res.body.length}`]
    const out = opts.includes('I') ? head : opts.includes('i') ? [...head, '', ...r.res.body.split('\n')] : r.res.body.split('\n')
    return { out, fs: r.fs }
  }
}

function json(v: unknown) {
  return JSON.stringify(v, null, 4).split('\n')
}

/** A tiny pretend `aws elbv2` CLI over the hidden state files. `health` says how each target is doing. */
function aws(targets: string[], health: (fs: Fs, id: string) => { ok: boolean; code?: number }): CustomCommand {
  return (args, { fs }) => {
    if (args[0] === '--version') return { out: ['aws-cli/2.17.0 Python/3.11 Linux/6.8 (sandbox)'] }
    if (args[0] !== 'elbv2') return { err: [`aws: this sandbox only simulates "aws elbv2". Try: aws elbv2 describe-target-health --target-group-arn ${TG}`], code: 252 }
    const op = args[1]
    const active = targets.filter((t) => !deregistered(fs).includes(t))
    switch (op) {
      case 'describe-target-health':
        return {
          out: json({
            TargetHealthDescriptions: active.map((id) => {
              const h = health(fs, id)
              return {
                Target: { Id: id, Port: 80 },
                HealthCheckPort: '80',
                TargetHealth: h.ok
                  ? { State: 'healthy' }
                  : { State: 'unhealthy', Reason: 'Target.ResponseCodeMismatch', Description: `Health checks failed with these codes: [${h.code}]` },
              }
            }),
          }),
        }
      case 'describe-target-groups':
        return {
          out: json({
            TargetGroups: [
              {
                TargetGroupName: 'tg-web',
                TargetGroupArn: TG,
                Protocol: 'HTTP',
                Port: 80,
                HealthCheckProtocol: 'HTTP',
                HealthCheckPath: healthPath(fs),
                HealthCheckIntervalSeconds: 10,
                HealthCheckTimeoutSeconds: 5,
                HealthyThresholdCount: 3,
                UnhealthyThresholdCount: 2,
                Matcher: { HttpCode: '200' },
              },
            ],
          }),
        }
      case 'modify-target-group': {
        const path = flag(args, '--health-check-path')
        if (!path) return { err: ['aws: error: nothing to change. Example: --health-check-path /healthz'], code: 252 }
        return { out: json({ TargetGroups: [{ TargetGroupName: 'tg-web', HealthCheckPath: path }] }), fs: setState(fs, 'health-path', path) }
      }
      case 'deregister-targets':
      case 'register-targets': {
        const ids = args.filter((a) => a.startsWith('Id=')).map((a) => a.slice(3))
        if (!ids.length) return { err: ['aws: error: the following arguments are required: --targets (e.g. --targets Id=web-c)'], code: 252 }
        const unknown = ids.find((id) => !targets.includes(id))
        if (unknown) return { err: [`An error occurred (InvalidTarget): The target ${unknown} is not in this target group`], code: 254 }
        const now = deregistered(fs)
        const next = op === 'deregister-targets' ? [...new Set([...now, ...ids])] : now.filter((t) => !ids.includes(t))
        return { fs: setState(fs, 'deregistered', next.join(' ')) }
      }
      default:
        return {
          err: [
            `aws: error: argument operation: Invalid choice: '${op ?? ''}'`,
            'Simulated here: describe-target-health, describe-target-groups, modify-target-group, register-targets, deregister-targets',
          ],
          code: 252,
        }
    }
  }
}

/** Live status of each target, read from the same state the aws command uses. */
function TargetPanel({ rows }: { rows: { id: string; state: 'healthy' | 'unhealthy' | 'removed'; note?: string }[] }) {
  return (
    <div className="mini-table">
      <header>Target group tg-web (live)</header>
      {rows.map((r) => (
        <div className="row" key={r.id}>
          <span>{r.id}</span>
          <motion.b
            key={r.state}
            initial={{ scale: 1.4 }}
            animate={{ scale: 1 }}
            transition={spring}
            style={{ color: r.state === 'healthy' ? 'var(--green)' : r.state === 'removed' ? 'var(--muted)' : 'var(--rose)' }}
          >
            {r.state}
            {r.note ? ` · ${r.note}` : ''}
          </motion.b>
        </div>
      ))}
    </div>
  )
}

const BASE = {
  '/tmp': null,
  '/root/.bashrc': '# root only',
  [`${HOME}/.bashrc`]: "alias ll='ls -la'",
  [`${STATE}/rr`]: '0',
}

/* ------------------------------------------------------------------ 1. health check path mismatch */

const LOCAL = ['localhost', '127.0.0.1', 'web-b', '10.0.1.12']

/** web-b passes when the file at the configured health path exists in its web root. */
const webBHealth = (fs: Fs) => {
  const p = healthPath(fs)
  return fs[`/var/www/app${p}`]?.type === 'file' ? { ok: true } : { ok: false, code: 404 }
}

function serveLocal(fs: Fs, path: string): Http {
  const file = fs[`/var/www/app${path === '/' ? '/index.html' : path}`]
  return file?.type === 'file'
    ? { status: 200, headers: ['Server: nginx/1.24.0', 'Content-Type: text/html'], body: file.content ?? '' }
    : { status: 404, headers: ['Server: nginx/1.24.0', 'Content-Type: text/html'], body: '<html><body><h1>404 Not Found</h1></body></html>' }
}

const healthMismatch: Scenario = {
  id: 'lb/health-path',
  title: 'The ALB keeps kicking out web-b',
  level: 'Medium',
  host: 'web-b',
  brief: (
    <>
      <p>
        <strong>CloudWatch alarm:</strong> <code>tg-web UnHealthyHostCount = 1</code> since last night's deploy. web-b gets no traffic and web-a is
        carrying everything alone.
      </p>
      <p>You are logged in to web-b. Find out why the health check fails and make it pass again.</p>
    </>
  ),
  setup: () => ({
    fs: makeFs({
      ...BASE,
      '/etc/nginx/nginx.conf': 'user www-data;\ninclude /etc/nginx/sites-enabled/*;',
      '/etc/nginx/sites-enabled/app.conf': 'server {\n    listen 80;\n    root /var/www/app;\n    index index.html;\n}',
      '/var/www/app/index.html': '<h1>Shop</h1>',
      '/var/www/app/app.js': 'console.log("v3.2")',
      '/var/www/app/healthz': '{"status":"ok"}',
      '/var/log/nginx/access.log': Array.from({ length: 6 }, (_, i) => `10.0.0.${i % 2 ? 37 : 85} - - [24/Oct/2026:03:1${i}:0${i} +0000] "GET /health HTTP/1.1" 404 153 "-" "ELB-HealthChecker/2.0"`).join('\n'),
      [`${HOME}/deploy-notes.txt`]: 'v3.2 (Oct 23)\n- renamed the health endpoint /health -> /healthz (same as our Kubernetes apps)\n- TODO: tell the ALB?',
    }),
  }),
  commands: {
    curl: curl((host, path, fs) => (LOCAL.includes(host) ? { res: serveLocal(fs, path) } : host === ALB ? { res: { status: 200, headers: ['X-Served-By: web-a'], body: '<h1>Shop</h1>' } } : null)),
    aws: aws(['web-a', 'web-b'], (fs, id) => (id === 'web-a' ? { ok: true } : webBHealth(fs))),
  },
  goals: [
    { text: 'Ask AWS why web-b is unhealthy', check: (s) => s.log.some((e) => /describe-target-health/.test(e.line) && e.out.includes('[404]')) },
    { text: 'Find the path the health check calls', check: (s) => saw(s, '"HealthCheckPath"') },
    { text: 'Reproduce it: curl that path on this server and see the 404', check: (s) => s.log.some((e) => /\bcurl\b/.test(e.line) && /\/health\b/.test(e.line) && e.out.includes('404')) },
    { text: 'Fix it, on the server or on the target group', check: (s) => webBHealth(s.fs).ok },
    {
      text: 'Confirm AWS now reports web-b healthy',
      check: (s) => webBHealth(s.fs).ok && s.log.some((e) => /describe-target-health/.test(e.line) && e.out.includes('"web-b"') && !e.out.includes('unhealthy')),
    },
  ],
  hints: [
    'aws elbv2 describe-target-health --target-group-arn tg-web shows each target and why it fails.',
    'aws elbv2 describe-target-groups shows the health check settings. Look for HealthCheckPath.',
    'Test it the way the ALB does: curl -i http://localhost/health. Then look at the files in the web root and read ~/deploy-notes.txt.',
    'Two good fixes. Server side: sudo cp /var/www/app/healthz /var/www/app/health. ALB side: aws elbv2 modify-target-group --target-group-arn tg-web --health-check-path /healthz',
  ],
  solution: [
    'aws elbv2 describe-target-health --target-group-arn tg-web',
    'aws elbv2 describe-target-groups',
    'curl -i http://localhost/health',
    'ls /var/www/app',
    'cat ~/deploy-notes.txt',
    'aws elbv2 modify-target-group --target-group-arn tg-web --health-check-path /healthz',
    'aws elbv2 describe-target-health --target-group-arn tg-web',
  ],
  debrief: (
    <>
      <p>
        The deploy renamed <code>/health</code> to <code>/healthz</code>, but nobody told the target group. The ALB got 404s, marked web-b unhealthy
        after 2 checks, and stopped sending it traffic. If web-a had been deployed too, both would fail and every user would get a <strong>503</strong>.
      </p>
      <p>
        At work, change the health check in Terraform (not by hand in the console), and make a health check part of the deploy pipeline so a bad
        release fails before it takes traffic.
      </p>
    </>
  ),
  Visual: ({ state }: { state: SimState }) => {
    const b = webBHealth(state.fs)
    return (
      <TargetPanel
        rows={[
          { id: 'web-a', state: 'healthy' },
          { id: 'web-b', state: b.ok ? 'healthy' : 'unhealthy', note: b.ok ? undefined : `${healthPath(state.fs)} → ${b.code}` },
        ]}
      />
    )
  },
}

/* ------------------------------------------------------------------ 2. one stale server */

const FLEET: Record<string, { version: string; price: string }> = {
  'web-a': { version: '1.9.0', price: '₹499' },
  'web-b': { version: '1.9.0', price: '₹499' },
  'web-c': { version: '1.8.0', price: '₹599' },
}

const staleServer: Scenario = {
  id: 'lb/stale-server',
  title: 'One in three users sees old prices',
  level: 'Easy',
  host: 'bastion',
  brief: (
    <>
      <p>
        <strong>Support ticket:</strong> "The sale price is ₹499, but sometimes the page shows ₹599. Refreshing fixes it."
      </p>
      <p>
        Three servers sit behind <code>{ALB}</code>. Find the one serving the old version and take it out of the load balancer until it is fixed.
      </p>
    </>
  ),
  setup: () => ({
    fs: makeFs({
      ...BASE,
      [`${HOME}/alb.txt`]: `ALB:          http://${ALB}\nTarget group: tg-web (web-a, web-b, web-c)`,
    }),
  }),
  commands: {
    curl: curl((host, path, fs) => {
      if (host !== ALB) return null
      const active = Object.keys(FLEET).filter((t) => !deregistered(fs).includes(t))
      if (!active.length) return { res: { status: 503, headers: ['Server: awselb/2.0'], body: '<html><body><h1>503 Service Temporarily Unavailable</h1></body></html>' } }
      const n = parseInt(fs[`${STATE}/rr`]?.content ?? '0', 10)
      const id = active[n % active.length]
      const f = FLEET[id]
      const body = path === '/' ? `<h1>Big Sale</h1>\n<p>Headphones: ${f.price}</p>` : '<h1>404 Not Found</h1>'
      return {
        res: { status: path === '/' ? 200 : 404, headers: ['Server: awselb/2.0', 'Content-Type: text/html', `X-Served-By: ${id}`, `X-App-Version: ${f.version}`], body },
        fs: setState(fs, 'rr', String(n + 1)),
      }
    }),
    aws: aws(Object.keys(FLEET), () => ({ ok: true })),
  },
  goals: [
    { text: 'Call the ALB until you have seen all three servers answer', check: (s) => Object.keys(FLEET).every((id) => saw(s, `X-Served-By: ${id}`)) },
    { text: 'Write the bad server’s name into ~/bad-server.txt', check: (s) => s.fs[`${HOME}/bad-server.txt`]?.content?.trim() === 'web-c' },
    { text: 'Take only that server out of the target group', check: (s) => deregistered(s.fs).join(' ') === 'web-c' },
    {
      text: 'Confirm the next few responses are all v1.9.0',
      check: (s) => {
        const at = s.log.findIndex((e) => /deregister-targets/.test(e.line) && /web-c/.test(e.line))
        return at >= 0 && deregistered(s.fs).join(' ') === 'web-c' && s.log.slice(at + 1).filter((e) => /\bcurl\b/.test(e.line) && e.out.includes('X-App-Version: 1.9.0')).length >= 2
      },
    },
  ],
  hints: [
    `curl -i shows the response headers too: curl -i http://${ALB}  Run it a few times (↑ then Enter).`,
    'Look at X-Served-By and X-App-Version. Only grep what matters: curl -si URL | grep X-',
    'echo web-c > ~/bad-server.txt',
    'aws elbv2 deregister-targets --target-group-arn tg-web --targets Id=web-c   Then curl again.',
  ],
  solution: [
    `curl -i http://${ALB}`,
    `curl -i http://${ALB}`,
    `curl -i http://${ALB}`,
    'echo web-c > ~/bad-server.txt',
    'aws elbv2 deregister-targets --target-group-arn tg-web --targets Id=web-c',
    `curl -si http://${ALB} | grep X-`,
    `curl -si http://${ALB} | grep X-`,
  ],
  debrief: (
    <>
      <p>
        The load balancer was doing its job: round robin across three healthy servers. One of them just missed the deploy, so every third request got
        old code. Health checks cannot catch this, because the old version is perfectly "healthy".
      </p>
      <p>
        On AWS, deregistering waits for in-flight requests to finish (<strong>deregistration delay</strong>, 300 s by default), so nobody is cut off.
        The real fix is <strong>immutable deploys</strong>: build one image, replace every server from it (Auto Scaling instance refresh), and never
        patch servers by hand.
      </p>
    </>
  ),
  Visual: ({ state }: { state: SimState }) => (
    <TargetPanel
      rows={Object.entries(FLEET).map(([id, f]) => ({
        id,
        state: deregistered(state.fs).includes(id) ? 'removed' : 'healthy',
        note: saw(state, `X-Served-By: ${id}`) ? `v${f.version}` : undefined,
      }))}
    />
  ),
}

export const scenarios: Scenario[] = [staleServer, healthMismatch]
