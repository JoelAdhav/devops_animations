/**
 * A pretend systemd + process table for terminal simulations: systemctl, journalctl, ps, top,
 * kill, pkill, ss, netstat, lsof, free, uptime and curl to local ports.
 * The state lives in a root-only JSON file on the simulated filesystem, so it is saved and
 * restored with the rest of the scenario.
 */
import type { CustomCommand, Fs } from './vfs'

export type Proc = {
  pid: number
  user: string
  cpu: number
  /** % of RAM. */
  mem: number
  cmd: string
  port?: number
  /** Ignores SIGTERM (a script that traps it), so only kill -9 stops it. */
  stubborn?: boolean
}

export type Unit = {
  name: string
  description: string
  user: string
  exec: string
  enabled: boolean
  state: 'active' | 'inactive' | 'failed'
  pid?: number
  /** e.g. "exit-code" or "signal" when failed. */
  result?: string
}

export type World = {
  procs: Proc[]
  units: Record<string, Unit>
  journal: { unit: string; line: string }[]
  nextPid: number
  /** Increases on every simulated command; drives the clock and anything a scenario does over time. */
  tick: number
  /** 5 and 15 minute load averages. The 1 minute one is worked out from the running processes. */
  load: [number, number]
}

export type StartResult = { ok: true; proc: Omit<Proc, 'pid'>; logs?: string[] } | { ok: false; logs: string[] }

export type ServiceOptions = {
  host: string
  /** Decides whether a unit starts, given the files and the current processes. */
  start: (fs: Fs, w: World, unit: Unit) => StartResult
  /** Answers curl to a local port that something listens on. */
  http?: (w: World, proc: Proc, path: string) => { status: number; headers?: string[]; body: string }
  /** Runs before every command, e.g. cron starting another copy of a job. */
  tick?: (fs: Fs, w: World) => World
}

const STATE = '/run/sim/world.json'
const CPUS = 2
const MEM_MIB = 3828

/** Processes every simulated server has. */
export const BASE_PROCS: Proc[] = [
  { pid: 1, user: 'root', cpu: 0, mem: 0.3, cmd: '/sbin/init' },
  { pid: 412, user: 'root', cpu: 0, mem: 0.4, cmd: '/lib/systemd/systemd-journald' },
  { pid: 690, user: 'root', cpu: 0, mem: 0.1, cmd: '/usr/sbin/cron -f' },
  { pid: 702, user: 'root', cpu: 0, mem: 0.2, cmd: 'sshd: /usr/sbin/sshd -D', port: 22 },
  { pid: 1350, user: 'joel', cpu: 0, mem: 0.1, cmd: '-bash' },
]

export function newWorld(parts: Partial<World> & { units: Record<string, Unit> }): World {
  return { procs: BASE_PROCS, journal: [], nextPid: 5000, tick: 0, load: [0.21, 0.18], ...parts }
}

/** Writes the world into the filesystem. Use it in a scenario's setup. */
export function withWorld(fs: Fs, w: World): Fs {
  return { ...fs, '/run/sim': { type: 'dir', mode: 0o700 }, [STATE]: { type: 'file', mode: 0o600, content: JSON.stringify(w) } }
}

export function readWorld(fs: Fs): World {
  try {
    return JSON.parse(fs[STATE]?.content ?? '') as World
  } catch {
    return newWorld({ units: {} })
  }
}

/** Fake clock: starts at 03:14 and moves a few seconds with every command. */
function clock(w: World) {
  const secs = 3 * 3600 + 14 * 60 + w.tick * 7
  const two = (n: number) => String(n).padStart(2, '0')
  return `${two(Math.floor(secs / 3600))}:${two(Math.floor(secs / 60) % 60)}:${two(secs % 60)}`
}

/** Adds journal lines, formatted like `journalctl` prints them. */
export function log(w: World, host: string, unit: string, ident: string, pid: number, msgs: string[]): World {
  return { ...w, journal: [...w.journal, ...msgs.map((m) => ({ unit, line: `Oct 24 ${clock(w)} ${host} ${ident}[${pid}]: ${m}` }))] }
}

const progName = (cmd: string) => {
  const first = cmd.replace(/^sshd: /, '').split(' ')[0]
  return first.split('/').pop() ?? first
}

export function load1(w: World) {
  return w.procs.filter((p) => p.cpu >= 20).length + w.procs.reduce((s, p) => s + p.cpu, 0) / 400
}

const svc = (n: string) => n.replace(/\.service$/, '')

const AUTH = (sub: string, n: string) => [
  `Failed to ${sub} ${n}.service: Interactive authentication required.`,
  `See system logs and 'systemctl status ${n}.service' for details.`,
  '(hint: managing services needs root: sudo systemctl ...)',
]

type Res = { out?: string[]; err?: string[]; code?: number; w?: World; fs?: Fs }

/** Builds the commands. Every call reads the world, lets the scenario tick, runs, and writes it back. */
export function serviceCommands(opts: ServiceOptions): Record<string, CustomCommand> {
  const wrap =
    (fn: (args: string[], env: Parameters<CustomCommand>[1], w: World) => Res): CustomCommand =>
    (args, env) => {
      let w = readWorld(env.fs)
      w = { ...w, tick: w.tick + 1 }
      if (opts.tick) w = opts.tick(env.fs, w)
      const r = fn(args, env, w)
      return { out: r.out, err: r.err, code: r.code, fs: withWorld(r.fs ?? env.fs, r.w ?? w) }
    }

  const startUnit = (fs: Fs, w: World, u: Unit): { w: World; ok: boolean } => {
    if (u.state === 'active') return { w, ok: true }
    const pid = w.nextPid
    let next: World = { ...w, nextPid: pid + 7 }
    next = log(next, opts.host, u.name, 'systemd', 1, [`Starting ${u.name}.service - ${u.description}...`])
    const r = opts.start(fs, next, u)
    if (r.ok) {
      next = log(next, opts.host, u.name, progName(r.proc.cmd), pid, r.logs ?? [])
      next = log(next, opts.host, u.name, 'systemd', 1, [`Started ${u.name}.service - ${u.description}.`])
      return { ok: true, w: { ...next, procs: [...next.procs, { ...r.proc, pid }], units: { ...next.units, [u.name]: { ...u, state: 'active', pid, result: undefined } } } }
    }
    next = log(next, opts.host, u.name, progName(u.exec), pid, r.logs)
    next = log(next, opts.host, u.name, 'systemd', 1, [
      `${u.name}.service: Main process exited, code=exited, status=1/FAILURE`,
      `${u.name}.service: Failed with result 'exit-code'.`,
      `Failed to start ${u.name}.service - ${u.description}.`,
    ])
    return { ok: false, w: { ...next, units: { ...next.units, [u.name]: { ...u, state: 'failed', pid, result: 'exit-code' } } } }
  }

  const stopUnit = (w: World, u: Unit): World => {
    let next = log(w, opts.host, u.name, 'systemd', 1, [`Stopping ${u.name}.service - ${u.description}...`, `Stopped ${u.name}.service - ${u.description}.`])
    next = { ...next, procs: next.procs.filter((p) => p.pid !== u.pid) }
    return { ...next, units: { ...next.units, [u.name]: { ...u, state: 'inactive', pid: undefined, result: undefined } } }
  }

  /** What happens to a service when its main process is killed. */
  const killed = (w: World, pid: number, sig: 'TERM' | 'KILL'): World => {
    const u = Object.values(w.units).find((x) => x.pid === pid && x.state === 'active')
    if (!u) return w
    const next =
      sig === 'KILL'
        ? log(w, opts.host, u.name, 'systemd', 1, [`${u.name}.service: Main process exited, code=killed, status=9/KILL`, `${u.name}.service: Failed with result 'signal'.`])
        : log(w, opts.host, u.name, 'systemd', 1, [`${u.name}.service: Deactivated successfully.`])
    return { ...next, units: { ...next.units, [u.name]: { ...u, state: sig === 'KILL' ? 'failed' : 'inactive', result: sig === 'KILL' ? 'signal' : undefined, pid: undefined } } }
  }

  const status = (w: World, u: Unit) => {
    const since = 'Sat 2026-10-24 ' + clock({ ...w, tick: Math.max(0, w.tick - 3) }) + ' UTC'
    const active =
      u.state === 'active'
        ? `active (running) since ${since}; 21s ago`
        : u.state === 'failed'
          ? `failed (Result: ${u.result ?? 'exit-code'}) since ${since}; 1min 4s ago`
          : 'inactive (dead)'
    const proc = w.procs.find((p) => p.pid === u.pid)
    return [
      `${u.state === 'failed' ? '×' : '●'} ${u.name}.service - ${u.description}`,
      `     Loaded: loaded (/etc/systemd/system/${u.name}.service; ${u.enabled ? 'enabled' : 'disabled'}; preset: enabled)`,
      `     Active: ${active}`,
      ...(u.state === 'active' && proc
        ? [`   Main PID: ${proc.pid} (${progName(proc.cmd)})`, `     Memory: ${((proc.mem / 100) * MEM_MIB).toFixed(1)}M`, `     CGroup: /system.slice/${u.name}.service`, `             └─${proc.pid} ${proc.cmd}`]
        : u.state === 'failed'
          ? [`    Process: ${u.pid ?? 0} ExecStart=${u.exec} (code=${u.result === 'signal' ? 'killed, signal=KILL' : 'exited, status=1/FAILURE'})`, `   Main PID: ${u.pid ?? 0} (code=${u.result === 'signal' ? 'killed' : 'exited'})`]
          : []),
      '',
      ...w.journal.filter((j) => j.unit === u.name).slice(-5).map((j) => j.line),
    ]
  }

  const systemctl = wrap((args, env, w) => {
    const words = args.filter((a) => !a.startsWith('-'))
    const sub = words[0] ?? 'list-units'
    const names = words.slice(1).map(svc)
    const unit = (n: string) => w.units[n]
    const missing = (n: string): Res => ({ err: [`Unit ${n}.service could not be found.`], code: 4 })
    const changes = ['start', 'stop', 'restart', 'reload', 'enable', 'disable', 'daemon-reload', 'kill']
    if (changes.includes(sub) && !env.root) return { err: AUTH(sub, names[0] ?? 'unit'), code: 1 }

    switch (sub) {
      case 'status': {
        if (!names.length) return { out: [`● ${opts.host}`, '    State: ' + (Object.values(w.units).some((u) => u.state === 'failed') ? 'degraded' : 'running')] }
        const u = unit(names[0])
        if (!u) return missing(names[0])
        return { out: status(w, u), code: u.state === 'active' ? 0 : 3 }
      }
      case 'is-active': {
        const u = unit(names[0] ?? '')
        return { out: [u?.state ?? 'inactive'], code: u?.state === 'active' ? 0 : 3 }
      }
      case 'is-enabled': {
        const u = unit(names[0] ?? '')
        if (!u) return missing(names[0] ?? '')
        return { out: [u.enabled ? 'enabled' : 'disabled'], code: u.enabled ? 0 : 1 }
      }
      case 'start':
      case 'restart':
      case 'reload': {
        let next = w
        for (const n of names) {
          const u = next.units[n]
          if (!u) return missing(n)
          if (sub !== 'start' && u.state === 'active') next = stopUnit(next, u)
          const r = startUnit(env.fs, next, next.units[n])
          next = r.w
          if (!r.ok) {
            return {
              w: next,
              err: [`Job for ${n}.service failed because the control process exited with error code.`, `See "systemctl status ${n}.service" and "journalctl -xeu ${n}.service" for details.`],
              code: 1,
            }
          }
        }
        return { w: next }
      }
      case 'stop': {
        let next = w
        for (const n of names) {
          const u = next.units[n]
          if (!u) return missing(n)
          if (u.state === 'active') next = stopUnit(next, u)
          else next = { ...next, units: { ...next.units, [n]: { ...u, state: 'inactive', result: undefined } } }
        }
        return { w: next }
      }
      case 'enable':
      case 'disable': {
        let next = w
        const out: string[] = []
        for (const n of names) {
          const u = next.units[n]
          if (!u) return missing(n)
          if (sub === 'enable' && !u.enabled) out.push(`Created symlink /etc/systemd/system/multi-user.target.wants/${n}.service → /etc/systemd/system/${n}.service.`)
          if (sub === 'disable' && u.enabled) out.push(`Removed "/etc/systemd/system/multi-user.target.wants/${n}.service".`)
          next = { ...next, units: { ...next.units, [n]: { ...next.units[n], enabled: sub === 'enable' } } }
          if (args.includes('--now')) {
            if (sub === 'enable') {
              const r = startUnit(env.fs, next, next.units[n])
              next = r.w
              if (!r.ok) return { w: next, out, err: [`Job for ${n}.service failed because the control process exited with error code.`, `See "systemctl status ${n}.service" and "journalctl -xeu ${n}.service" for details.`], code: 1 }
            } else if (next.units[n].state === 'active') next = stopUnit(next, next.units[n])
          }
        }
        return { w: next, out }
      }
      case 'daemon-reload':
        return {}
      case 'list-units':
      case 'list-unit-files':
      case '--failed': {
        const failedOnly = args.includes('--failed') || args.includes('--state=failed')
        const rows = Object.values(w.units).filter((u) => !failedOnly || u.state === 'failed')
        if (sub === 'list-unit-files') return { out: ['UNIT FILE                STATE', ...rows.map((u) => `${(u.name + '.service').padEnd(24)} ${u.enabled ? 'enabled' : 'disabled'}`)] }
        return {
          out: [
            '  UNIT                  LOAD   ACTIVE   SUB     DESCRIPTION',
            ...rows.map((u) => `${u.state === 'failed' ? '●' : ' '} ${(u.name + '.service').padEnd(21)} loaded ${u.state.padEnd(8)} ${(u.state === 'active' ? 'running' : u.state === 'failed' ? 'failed' : 'dead').padEnd(7)} ${u.description}`),
            '',
            `${rows.length} loaded units listed.`,
          ],
        }
      }
      default:
        return { err: [`Unknown command verb '${sub}'.`], code: 1 }
    }
  })

  const journalctl = wrap((args, _env, w) => {
    const ui = args.indexOf('-u')
    const unitArg = ui >= 0 ? args[ui + 1] : args.find((a) => a.startsWith('--unit='))?.slice(7)
    let n = Infinity
    const ni = args.indexOf('-n')
    if (ni >= 0) n = parseInt(args[ni + 1] ?? '10', 10)
    const glued = args.find((a) => /^-n\d+$/.test(a))
    if (glued) n = parseInt(glued.slice(2), 10)
    let rows = w.journal.filter((j) => !unitArg || j.unit === svc(unitArg)).map((j) => j.line)
    if (Number.isFinite(n)) rows = rows.slice(-n)
    return { out: rows.length ? rows : ['-- No entries --'] }
  })

  const psRow = (p: Proc) => {
    const vsz = Math.round(p.mem * 380 + 9000)
    const rss = Math.round(p.mem * 38 + 1200)
    return `${p.user.padEnd(10)}${String(p.pid).padStart(6)} ${p.cpu.toFixed(1).padStart(4)} ${p.mem.toFixed(1).padStart(4)} ${String(vsz).padStart(7)} ${String(rss).padStart(6)} ?        ${p.cpu > 20 ? 'R' : 'S'}    03:01   ${p.cpu > 20 ? '41:07' : '0:00'} ${p.cmd}`
  }

  const ps = wrap((args, _env, w) => {
    let procs = [...w.procs]
    const sort = args.find((a) => a.startsWith('--sort='))?.slice(7)
    if (sort) {
      const desc = sort.startsWith('-')
      const key = sort.replace(/^[-+]/, '')
      const val = (p: Proc) => (key === '%cpu' || key === 'pcpu' ? p.cpu : key === '%mem' || key === 'pmem' ? p.mem : p.pid)
      procs.sort((a, b) => (desc ? val(b) - val(a) : val(a) - val(b)))
    }
    const pi = args.indexOf('-p')
    if (pi >= 0) {
      const ids = (args[pi + 1] ?? '').split(',').map(Number)
      procs = procs.filter((p) => ids.includes(p.pid))
      if (!procs.length) return { out: ['    PID TTY          TIME CMD'], code: 1 }
      return { out: ['    PID TTY          TIME CMD', ...procs.map((p) => `${String(p.pid).padStart(7)} ?        00:41:07 ${progName(p.cmd)}`)] }
    }
    const bsd = args.some((a) => /^-?a?u?x$|^aux$|^-?aux$/.test(a))
    if (args.includes('-ef') || args.includes('-e')) {
      return { out: ['UID          PID    PPID  C STIME TTY          TIME CMD', ...procs.map((p) => `${p.user.padEnd(9)}${String(p.pid).padStart(7)} ${String(p.pid === 1 ? 0 : 1).padStart(7)} ${String(Math.round(p.cpu)).padStart(2)} 03:01 ?        00:00:00 ${p.cmd}`)] }
    }
    if (bsd) return { out: ['USER         PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND', ...procs.map(psRow)] }
    return { out: ['    PID TTY          TIME CMD', '   1350 pts/0    00:00:00 bash', `${String(w.nextPid + 1).padStart(7)} pts/0    00:00:00 ps`] }
  })

  const top = wrap((_args, _env, w) => {
    const total = w.procs.reduce((s, p) => s + p.cpu, 0)
    const us = Math.min(99.7, total / CPUS)
    const usedMem = 610 + w.procs.reduce((s, p) => s + (p.mem / 100) * MEM_MIB, 0)
    const running = w.procs.filter((p) => p.cpu > 20).length
    const l1 = load1(w)
    return {
      out: [
        `top - ${clock(w)} up 12 days,  4:02,  1 user,  load average: ${l1.toFixed(2)}, ${w.load[0].toFixed(2)}, ${w.load[1].toFixed(2)}`,
        `Tasks: ${w.procs.length + 104} total,   ${running + 1} running, ${w.procs.length + 103 - running} sleeping,   0 stopped,   0 zombie`,
        `%Cpu(s): ${us.toFixed(1).padStart(4)} us,  1.0 sy,  0.0 ni, ${(100 - us - 1).toFixed(1).padStart(4)} id,  0.0 wa,  0.0 hi,  0.0 si,  0.0 st`,
        `MiB Mem :   ${MEM_MIB.toFixed(1)} total,  ${(MEM_MIB - usedMem - 454).toFixed(1)} free,  ${usedMem.toFixed(1)} used,    454.3 buff/cache`,
        '',
        '    PID USER      PR  NI    VIRT    RES  S  %CPU  %MEM     TIME+ COMMAND',
        ...[...w.procs]
          .sort((a, b) => b.cpu - a.cpu || b.mem - a.mem)
          .slice(0, 10)
          .map((p) => `${String(p.pid).padStart(7)} ${p.user.padEnd(9)} 20   0 ${String(Math.round(p.mem * 380 + 9000)).padStart(7)} ${String(Math.round(p.mem * 38 + 1200)).padStart(6)}  ${p.cpu > 20 ? 'R' : 'S'} ${p.cpu.toFixed(1).padStart(5)} ${p.mem.toFixed(1).padStart(5)}  ${p.cpu > 20 ? '41:07.13' : ' 0:00.42'} ${progName(p.cmd)}`),
        '',
        '(top refreshes every few seconds in real life; press q to quit. This is one snapshot.)',
      ],
    }
  })

  /** Signal from "-9", "-KILL", "-SIGKILL", "-s KILL" and friends. TERM is the default. */
  const signal = (args: string[]): { sig: 'TERM' | 'KILL' | null; rest: string[] } => {
    let sig: 'TERM' | 'KILL' = 'TERM'
    const rest: string[] = []
    for (let i = 0; i < args.length; i++) {
      const a = args[i]
      const name = a === '-s' ? args[++i] : a.startsWith('-') ? a.slice(1) : null
      if (name === null) rest.push(a)
      else if (/^(9|KILL|SIGKILL)$/i.test(name)) sig = 'KILL'
      else if (/^(15|TERM|SIGTERM)$/i.test(name)) sig = 'TERM'
      else if (name !== 'f') return { sig: null, rest }
      else rest.push(a)
    }
    return { sig, rest }
  }

  const kill = wrap((args, env, w) => {
    if (args[0] === '-l') return { out: [' 1) SIGHUP   2) SIGINT   3) SIGQUIT  9) SIGKILL  15) SIGTERM  19) SIGSTOP'] }
    const { sig, rest } = signal(args)
    if (!sig) return { err: [`bash: kill: ${args[0]}: invalid signal specification`], code: 1 }
    if (!rest.length) return { err: ['kill: usage: kill [-s sigspec | -n signum | -sigspec] pid | jobspec ... or kill -l [sigspec]'], code: 2 }
    let next = w
    const err: string[] = []
    for (const a of rest) {
      const pid = Number(a)
      const p = next.procs.find((x) => x.pid === pid)
      if (!p) err.push(`bash: kill: (${a}) - No such process`)
      else if (!env.root && p.user !== env.user) err.push(`bash: kill: (${a}) - Operation not permitted`)
      else if (sig === 'TERM' && p.stubborn) continue
      else next = killed({ ...next, procs: next.procs.filter((x) => x.pid !== pid) }, pid, sig)
    }
    return { w: next, err, code: err.length ? 1 : 0 }
  })

  const pkill = wrap((args, env, w) => {
    const { sig, rest } = signal(args)
    if (!sig) return { err: [`pkill: invalid signal`], code: 2 }
    const full = rest.includes('-f')
    const pattern = rest.filter((a) => a !== '-f')[0]
    if (!pattern) return { err: ['pkill: no matching criteria specified'], code: 2 }
    const hits = w.procs.filter((p) => (full ? p.cmd.includes(pattern) : progName(p.cmd).includes(pattern)))
    if (!hits.length) return { code: 1 }
    let next = w
    const err: string[] = []
    for (const p of hits) {
      if (!env.root && p.user !== env.user) err.push(`pkill: killing pid ${p.pid} failed: Operation not permitted`)
      else if (!(sig === 'TERM' && p.stubborn)) next = killed({ ...next, procs: next.procs.filter((x) => x.pid !== p.pid) }, p.pid, sig)
    }
    return { w: next, err, code: err.length ? 1 : 0 }
  })

  const listening = (w: World) => w.procs.filter((p) => p.port !== undefined).sort((a, b) => a.port! - b.port!)
  const visible = (p: Proc, env: { root: boolean; user: string }) => env.root || p.user === env.user

  const ss = wrap((args, env, w) => {
    const showProc = args.some((a) => a.startsWith('-') && a.includes('p'))
    const rows = listening(w).map((p) => {
      const local = `0.0.0.0:${p.port}`
      const procCol = showProc && visible(p, env) ? `users:(("${progName(p.cmd)}",pid=${p.pid},fd=3))` : ''
      return `tcp   LISTEN 0      511    ${local.padStart(16)}      0.0.0.0:*    ${procCol}`.trimEnd()
    })
    return { out: ['Netid State  Recv-Q Send-Q    Local Address:Port  Peer Address:Port Process', ...rows] }
  })

  const netstat = wrap((args, env, w) => {
    const showProc = args.some((a) => a.startsWith('-') && a.includes('p'))
    return {
      out: [
        'Active Internet connections (only servers)',
        'Proto Recv-Q Send-Q Local Address           Foreign Address         State       PID/Program name',
        ...listening(w).map((p) => `tcp        0      0 ${`0.0.0.0:${p.port}`.padEnd(23)} 0.0.0.0:*               LISTEN      ${showProc && visible(p, env) ? `${p.pid}/${progName(p.cmd)}` : '-'}`),
      ],
    }
  })

  const lsof = wrap((args, env, w) => {
    const spec = args[args.indexOf('-i') + 1]
    const port = spec?.match(/:(\d+)/)?.[1]
    if (!args.includes('-i') || !port) return { err: ['lsof: this sandbox supports: lsof -i :PORT'], code: 1 }
    const rows = listening(w).filter((p) => String(p.port) === port && visible(p, env))
    if (!rows.length) return { code: 1 }
    return { out: ['COMMAND   PID  USER   FD   TYPE DEVICE SIZE/OFF NODE NAME', ...rows.map((p) => `${progName(p.cmd).padEnd(8)}${String(p.pid).padStart(6)} ${p.user.padEnd(6)}  3u  IPv4  31337      0t0  TCP *:${p.port} (LISTEN)`)] }
  })

  const free = wrap((args, _env, w) => {
    const used = 610 + w.procs.reduce((s, p) => s + (p.mem / 100) * MEM_MIB, 0)
    const h = args.some((a) => a.includes('h'))
    const f = (mib: number) => (h ? (mib >= 1024 ? `${(mib / 1024).toFixed(1)}Gi` : `${Math.round(mib)}Mi`) : String(Math.round(mib * 1024)))
    return {
      out: [
        '               total        used        free      shared  buff/cache   available',
        `Mem:    ${f(MEM_MIB).padStart(12)}${f(used).padStart(12)}${f(MEM_MIB - used - 454).padStart(12)}${f(1).padStart(12)}${f(454).padStart(12)}${f(MEM_MIB - used).padStart(12)}`,
        `Swap:   ${'0B'.padStart(12)}${'0B'.padStart(12)}${'0B'.padStart(12)}`,
      ],
    }
  })

  const uptime = wrap((_args, _env, w) => ({
    out: [` ${clock(w)} up 12 days,  4:02,  1 user,  load average: ${load1(w).toFixed(2)}, ${w.load[0].toFixed(2)}, ${w.load[1].toFixed(2)}`],
  }))

  const curl = wrap((args, _env, w) => {
    const url = args.find((a) => !a.startsWith('-'))
    if (!url) return { err: ["curl: try 'curl --help' for more information"], code: 2 }
    const m = url.replace(/^https?:\/\//, '').match(/^([^/:]+)(?::(\d+))?(\/.*)?$/)
    if (!m || !['localhost', '127.0.0.1', opts.host].includes(m[1])) return { err: [`curl: (6) Could not resolve host: ${m?.[1] ?? url}`], code: 6 }
    const port = Number(m[2] ?? 80)
    const p = w.procs.find((x) => x.port === port)
    if (!p) return { err: [`curl: (7) Failed to connect to ${m[1]} port ${port} after 0 ms: Couldn't connect to server`], code: 7 }
    const r = opts.http?.(w, p, m[3] ?? '/') ?? { status: 200, body: 'OK' }
    const flags = args.filter((a) => a.startsWith('-')).join('')
    const head = [`HTTP/1.1 ${r.status} ${r.status === 200 ? 'OK' : r.status === 404 ? 'Not Found' : 'Error'}`, ...(r.headers ?? []), `Content-Length: ${r.body.length}`]
    return { out: flags.includes('I') ? head : flags.includes('i') ? [...head, '', ...r.body.split('\n')] : r.body.split('\n') }
  })

  return { systemctl, journalctl, ps, top, kill, pkill, killall: pkill, ss, netstat, lsof, free, uptime, curl }
}
