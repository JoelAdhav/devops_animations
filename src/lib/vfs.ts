/**
 * A small in-memory Linux-like shell for the terminal playgrounds and simulations.
 * Supports quoting, globs (*, ?), pipes (|), redirects (>, >>, 2>), && and ;,
 * sudo, simple permissions, and the everyday file, text and disk commands.
 */

/** `size` (bytes) overrides the content length, so a short sample can stand in for a huge log. */
export type Node = { type: 'dir' | 'file'; content?: string; size?: number }
export type Fs = Record<string, Node>

export const HOME = '/home/joel'

export function initialFs(): Fs {
  const dirs = ['/', '/bin', '/etc', '/etc/nginx', '/home', HOME, `${HOME}/projects`, '/tmp', '/var', '/var/log', '/root', '/opt']
  const fs: Fs = {}
  for (const d of dirs) fs[d] = { type: 'dir' }
  fs['/etc/hosts'] = { type: 'file', content: '127.0.0.1   localhost\n10.0.2.15   db.internal' }
  fs['/etc/nginx/nginx.conf'] = { type: 'file', content: 'server {\n  listen 80;\n  root /var/www/html;\n}' }
  fs[`${HOME}/notes.txt`] = { type: 'file', content: 'Learn Linux, then AWS.' }
  fs[`${HOME}/.bashrc`] = { type: 'file', content: "alias ll='ls -la'" }
  fs[`${HOME}/projects/app.py`] = { type: 'file', content: 'print("hello from app.py")' }
  fs['/var/log/syslog'] = { type: 'file', content: 'Oct 24 10:01 server systemd[1]: Started nginx.\nOct 24 10:05 server kernel: error: disk almost full' }
  return fs
}

/** Builds a filesystem from a flat path list. Parent directories are created automatically. */
export function makeFs(entries: Record<string, string | Node | null>): Fs {
  const fs: Fs = { '/': { type: 'dir' } }
  const ensureDir = (p: string) => {
    while (p !== '/' && !fs[p]) {
      fs[p] = { type: 'dir' }
      p = parent(p)
    }
  }
  for (const [path, v] of Object.entries(entries)) {
    ensureDir(parent(path))
    if (v === null) ensureDir(path)
    else fs[path] = typeof v === 'string' ? { type: 'file', content: v } : v
  }
  return fs
}

export function parent(p: string) {
  if (p === '/') return '/'
  const i = p.lastIndexOf('/')
  return i <= 0 ? '/' : p.slice(0, i)
}

export function base(p: string) {
  return p === '/' ? '/' : p.slice(p.lastIndexOf('/') + 1)
}

/** Resolves a user-typed path against the current directory. Handles ~, ., .. and absolute paths. */
export function resolve(cwd: string, input: string) {
  let p = input.trim()
  if (p === '' || p === '~') return HOME
  if (p.startsWith('~/')) p = HOME + p.slice(1)
  const start = p.startsWith('/') ? [] : cwd.split('/').filter(Boolean)
  for (const part of p.split('/')) {
    if (!part || part === '.') continue
    if (part === '..') start.pop()
    else start.push(part)
  }
  return '/' + start.join('/')
}

export function children(fs: Fs, dir: string) {
  const prefix = dir === '/' ? '/' : dir + '/'
  return Object.keys(fs)
    .filter((k) => k !== dir && k.startsWith(prefix) && !k.slice(prefix.length).includes('/'))
    .sort()
}

export function pretty(cwd: string) {
  return cwd === HOME ? '~' : cwd.startsWith(HOME + '/') ? '~' + cwd.slice(HOME.length) : cwd
}

function under(path: string, dir: string) {
  return path === dir || path.startsWith(dir === '/' ? '/' : dir + '/')
}

function descendants(fs: Fs, dir: string) {
  return Object.keys(fs)
    .filter((k) => k !== dir && under(k, dir))
    .sort()
}

/* ------------------------------------------------------------------ sizes and disk */

const KB = 1024
const GB = KB * KB * KB
const DISK_SIZE = 20 * GB
/** Space the operating system itself uses, so a nearly empty sandbox still looks like a real server. */
const OS_USED = 6 * GB

function fileSize(n: Node) {
  return n.size ?? (n.content ?? '').length
}

/** Bytes used by a file, or by a directory and everything inside it. */
export function sizeOf(fs: Fs, path: string): number {
  const n = fs[path]
  if (!n) return 0
  if (n.type === 'file') return fileSize(n)
  return descendants(fs, path).reduce((sum, k) => sum + (fs[k].type === 'file' ? fileSize(fs[k]) : 4 * KB), 4 * KB)
}

/** Fraction of the root disk in use, 0..1. */
export function diskUsage(fs: Fs) {
  const files = Object.values(fs).reduce((sum, n) => sum + (n.type === 'file' ? fileSize(n) : 0), 0)
  return Math.min(1, (OS_USED + files) / DISK_SIZE)
}

/** 1536 -> "1.5K", like the -h flag of ls, du and df. */
export function human(bytes: number) {
  if (bytes < KB) return String(bytes)
  const units = ['K', 'M', 'G', 'T']
  let v = bytes / KB
  let u = 0
  while (v >= KB && u < units.length - 1) {
    v /= KB
    u++
  }
  return (v < 10 ? v.toFixed(1) : String(Math.round(v))) + units[u]
}

function parseHuman(s: string) {
  const m = s.trim().match(/^([\d.]+)([KMGT]?)/i)
  if (!m) return 0
  return parseFloat(m[1]) * KB ** ' KMGT'.indexOf((m[2] || ' ').toUpperCase())
}

/* ------------------------------------------------------------------ permissions */

type Ctx = { fs: Fs; cwd: string; root: boolean; history: string[]; host: string; commands: Record<string, CustomCommand> }

/** A command a simulation adds to the shell, e.g. a fake curl or aws CLI for one scenario. */
export type CustomCommand = (
  args: string[],
  env: { fs: Fs; cwd: string; root: boolean; stdin: string[] | null },
) => { out?: string[]; err?: string[]; code?: number; fs?: Fs }

function canRead(ctx: Ctx, path: string) {
  return ctx.root || !(under(path, '/root') || path === '/etc/shadow')
}

/** A normal user may only change things inside their home folder and /tmp. */
function canWrite(ctx: Ctx, path: string) {
  return ctx.root || under(path, HOME) || under(path, '/tmp')
}

const NEEDS_SUDO = '(hint: this path belongs to root, so the command needs sudo in front)'

/* ------------------------------------------------------------------ lexer and parser */

type Tok = { v: string; quoted: boolean } | { op: '|' | '>' | '>>' | '2>' | '&&' | ';' }

function lex(line: string): Tok[] | string {
  const toks: Tok[] = []
  let cur = ''
  let quoted = false
  let has = false
  const push = () => {
    if (has) toks.push({ v: cur, quoted })
    cur = ''
    quoted = false
    has = false
  }
  for (let i = 0; i < line.length; ) {
    const c = line[i]
    if (c === '"' || c === "'") {
      const j = line.indexOf(c, i + 1)
      if (j < 0) return `unexpected EOF while looking for matching \`${c}'`
      cur += line.slice(i + 1, j)
      quoted = has = true
      i = j + 1
    } else if (/\s/.test(c)) {
      push()
      i++
    } else if (c === '|') {
      push()
      toks.push({ op: '|' })
      i++
    } else if (c === '&' && line[i + 1] === '&') {
      push()
      toks.push({ op: '&&' })
      i += 2
    } else if (c === ';') {
      push()
      toks.push({ op: ';' })
      i++
    } else if (c === '>') {
      push()
      toks.push({ op: line[i + 1] === '>' ? '>>' : '>' })
      i += line[i + 1] === '>' ? 2 : 1
    } else if (c === '2' && line[i + 1] === '>' && !has) {
      toks.push({ op: '2>' })
      i += 2
    } else {
      cur += c
      has = true
      i++
    }
  }
  push()
  return toks
}

type Word = { v: string; quoted: boolean }
type Stage = { words: Word[]; out?: { file: string; append: boolean }; errFile?: string }
type Chain = { stages: Stage[]; op: '&&' | ';' }

function parse(toks: Tok[]): Chain[] | string {
  const chains: Chain[] = []
  let stages: Stage[] = []
  let stage: Stage = { words: [] }
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i]
    if ('v' in t) {
      stage.words.push(t)
      continue
    }
    if (t.op === '>' || t.op === '>>' || t.op === '2>') {
      const next = toks[i + 1]
      if (!next || !('v' in next)) return "syntax error near unexpected token `newline'"
      if (t.op === '2>') stage.errFile = next.v
      else stage.out = { file: next.v, append: t.op === '>>' }
      i++
      continue
    }
    if (!stage.words.length) return `syntax error near unexpected token \`${t.op}'`
    stages.push(stage)
    stage = { words: [] }
    if (t.op !== '|') {
      chains.push({ stages, op: t.op })
      stages = []
    }
  }
  if (stage.words.length) stages.push(stage)
  else if (stages.length) return "syntax error near unexpected token `|'"
  if (stages.length) chains.push({ stages, op: ';' })
  return chains
}

function globToRegex(glob: string) {
  return new RegExp('^' + glob.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$')
}

/** Expands an unquoted word containing * or ? against the filesystem, like bash does. */
function expand(fs: Fs, cwd: string, w: Word): string[] {
  if (w.quoted || !/[*?]/.test(w.v)) return [w.v]
  const i = w.v.lastIndexOf('/')
  const dirPart = i < 0 ? '' : w.v.slice(0, i + 1)
  const pat = w.v.slice(i + 1)
  const dir = resolve(cwd, dirPart || '.')
  if (fs[dir]?.type !== 'dir') return [w.v]
  const re = globToRegex(pat)
  const hits = children(fs, dir)
    .map(base)
    .filter((n) => re.test(n) && (pat.startsWith('.') || !n.startsWith('.')))
    .map((n) => dirPart + n)
  return hits.length ? hits : [w.v]
}

/* ------------------------------------------------------------------ commands */

type Exec = { out: string[]; err: string[]; info?: string[]; code: number; fs?: Fs; cwd?: string; clear?: boolean }

const ok = (out: string[] = [], extra: Partial<Exec> = {}): Exec => ({ out, err: [], code: 0, ...extra })
const fail = (err: string | string[], extra: Partial<Exec> = {}): Exec => ({ out: [], err: Array.isArray(err) ? err : [err], code: 1, ...extra })

/** Splits "-la" style flags from positional arguments. A lone "-" or anything after "--" is positional. */
function split(args: string[]) {
  const flags = new Set<string>()
  const pos: string[] = []
  let only = false
  for (const a of args) {
    if (only || a === '-' || !a.startsWith('-')) pos.push(a)
    else if (a === '--') only = true
    else if (a.startsWith('--')) flags.add(a)
    else for (const ch of a.slice(1)) flags.add(ch)
  }
  return { flags, pos }
}

/** Reads "-n 5", "-n5" or "-5" for head and tail. */
function lineCount(args: string[]) {
  let n = 10
  const rest: string[] = []
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if (a === '-n') n = parseInt(args[++i] ?? '10', 10)
    else if (/^-n\d+$/.test(a)) n = parseInt(a.slice(2), 10)
    else if (/^-\d+$/.test(a)) n = parseInt(a.slice(1), 10)
    else rest.push(a)
  }
  return { n: Number.isFinite(n) ? n : 10, rest }
}

function textOf(n: Node) {
  return n.content ?? ''
}

function lines(text: string) {
  return text === '' ? [] : text.replace(/\n$/, '').split('\n')
}

const DATE = 'Oct 24 03:12'

function owner(path: string) {
  return under(path, HOME) ? 'joel joel' : 'root root'
}

function longLine(fs: Fs, path: string, name: string, h: boolean) {
  const n = fs[path]
  const isDir = n.type === 'dir'
  const perm = isDir ? 'drwxr-xr-x' : name.endsWith('.sh') ? '-rwxr-xr-x' : path === '/etc/shadow' ? '-rw-r-----' : '-rw-r--r--'
  const bytes = isDir ? 4096 : fileSize(n)
  return `${perm} 1 ${owner(path)} ${(h ? human(bytes) : String(bytes)).padStart(h ? 5 : 8)} ${DATE} ${name}`
}

const MANUAL: Record<string, string> = {
  pwd: 'print the current working directory',
  cd: 'change directory: cd DIR, cd .., cd ~, cd -',
  ls: 'list files: -l long, -a hidden, -h human sizes, -S sort by size, -1 one per line',
  cat: 'print files: cat FILE...',
  head: 'first lines of a file: head -n 20 FILE',
  tail: 'last lines of a file: tail -n 50 FILE, tail -f FILE to follow',
  grep: 'search text: grep [-i -v -n -c -r -l -A N -B N] PATTERN [FILE...]',
  find: 'find files: find PATH -name "*.log" -type f -size +100M',
  du: 'disk usage of files/folders: du -sh PATH, du -h --max-depth=1',
  df: 'free space per disk: df -h',
  wc: 'count lines, words, bytes: wc -l FILE',
  sort: 'sort lines: -r reverse, -n numbers, -h human sizes (1K < 1M)',
  uniq: 'drop repeated lines: -c to count them',
  mkdir: 'make directories: mkdir -p a/b/c',
  touch: 'create an empty file',
  cp: 'copy: cp SRC DST, cp -r DIR DST',
  mv: 'move or rename: mv SRC DST',
  rm: 'remove: rm FILE, rm -r DIR. There is no recycle bin.',
  echo: 'print text: echo hi, echo hi > file, echo hi >> file',
  sudo: 'run one command as root: sudo COMMAND',
  tee: 'copy input to a file and the screen: echo hi | sudo tee FILE (-a appends)',
  tree: 'draw a directory tree',
  history: 'commands you typed',
}

const ELSEWHERE: Record<string, string> = {
  chmod: 'Linux file permissions',
  chown: 'Linux file permissions',
  ps: 'Processes and services',
  top: 'Processes and services',
  kill: 'Processes and services',
  systemctl: 'Processes and services',
  journalctl: 'Processes and services',
  git: 'Git version control',
  ssh: 'How the internet works',
  curl: 'HTTP and HTTPS',
  dig: 'DNS',
}

export const COMMANDS = [...Object.keys(MANUAL), 'clear', 'whoami', 'hostname', 'date', 'help', 'man', 'less', 'more', 'which', 'nano', 'vim', 'truncate'].sort()

function exec(ctx: Ctx, argv: string[], stdin: string[] | null, piped: boolean): Exec {
  const [cmd, ...args] = argv
  const { fs, cwd } = ctx

  /** Reads one file argument, with the right error message for each failure. */
  const readFile = (name: string, who = cmd): { lines: string[] } | { error: string } => {
    const p = resolve(cwd, name)
    if (!canRead(ctx, p)) return { error: `${who}: ${name}: Permission denied` }
    if (!fs[p]) return { error: `${who}: ${name}: No such file or directory` }
    if (fs[p].type === 'dir') return { error: `${who}: ${name}: Is a directory` }
    return { lines: lines(textOf(fs[p])) }
  }

  /** Lines from the named files, or from the pipe when no file is given. */
  const input = (files: string[]) => {
    if (!files.length) return { lines: stdin ?? [], err: [] as string[] }
    const out: string[] = []
    const err: string[] = []
    for (const f of files) {
      const r = readFile(f)
      if ('error' in r) err.push(r.error)
      else out.push(...r.lines)
    }
    return { lines: out, err }
  }

  switch (cmd) {
    case 'help':
      return ok([
        'Files:    pwd  ls -la  cd DIR  tree  mkdir -p  touch  cp -r  mv  rm -r',
        'Read:     cat  head -n  tail -n  less  wc -l',
        'Search:   grep -i -r -n -c  find PATH -name "*.log"',
        'Disk:     df -h  du -sh PATH  du -h --max-depth=1',
        'Combine:  cmd | grep x   cmd > file   cmd >> file   2>/dev/null   a && b   cmd | sudo tee FILE',
        'Also:     sudo CMD  echo  sort  uniq -c  history  man CMD  clear  (Tab completes, ↑ recalls)',
        ...(Object.keys(ctx.commands).length ? [`Ticket:   ${Object.keys(ctx.commands).join('  ')}   (extra tools on this server)`] : []),
      ])
    case 'clear':
      return ok([], { clear: true })
    case 'pwd':
      return ok([cwd])
    case 'whoami':
      return ok([ctx.root ? 'root' : 'joel'])
    case 'hostname':
      return ok([ctx.host])
    case 'date':
      return ok(['Sat Oct 24 03:14:07 UTC 2026'])
    case 'echo':
      return ok([args.filter((a) => a !== '-e' && a !== '-n').join(' ')])
    case 'history':
      return ok(ctx.history.map((h, i) => `${String(i + 1).padStart(5)}  ${h}`))
    case 'man': {
      if (!args[0]) return fail('What manual page do you want?')
      const m = MANUAL[args[0]]
      return m ? ok([`${args[0]}: ${m}`]) : fail(`No manual entry for ${args[0]}`)
    }
    case 'which':
      return args[0] && COMMANDS.includes(args[0]) ? ok([`/usr/bin/${args[0]}`]) : fail([], { code: 1 })
    case 'nano':
    case 'vim':
    case 'vi':
      return ok([], { info: [`${cmd}: full-screen editors are not available here. Write files with: echo "text" > FILE`] })
    case 'exit':
    case 'logout':
      return ok([], { info: ['This sandbox has nowhere to log out to. Use Reset to start over.'] })
    case 'su':
      return fail('su: use sudo COMMAND for one command as root')

    case 'cd': {
      const target = args[0] === '-' ? parent(cwd) : resolve(cwd, args[0] ?? '~')
      if (!canRead(ctx, target)) return fail(`bash: cd: ${args[0]}: Permission denied`)
      if (!fs[target]) return fail(`bash: cd: ${args[0]}: No such file or directory`)
      if (fs[target].type !== 'dir') return fail(`bash: cd: ${args[0]}: Not a directory`)
      return ok([], { cwd: target })
    }

    case 'ls': {
      const { flags, pos } = split(args)
      const all = flags.has('a') || flags.has('A')
      const long = flags.has('l')
      const h = flags.has('h')
      const one = flags.has('1') || piped
      const targets = pos.length ? pos : ['.']
      const out: string[] = []
      const err: string[] = []
      const fileArgs = targets.filter((t) => fs[resolve(cwd, t)]?.type === 'file')
      const dirArgs = targets.filter((t) => fs[resolve(cwd, t)]?.type === 'dir')
      for (const t of targets.filter((t) => !fs[resolve(cwd, t)])) err.push(`ls: cannot access '${t}': No such file or directory`)
      for (const f of fileArgs) out.push(long ? longLine(fs, resolve(cwd, f), f, h) : f)
      dirArgs.forEach((d, i) => {
        const dir = resolve(cwd, d)
        if (!canRead(ctx, dir)) return err.push(`ls: cannot open directory '${d}': Permission denied`)
        if (targets.length > 1) out.push(`${i || fileArgs.length ? '\n' : ''}${d}:`)
        let kids = children(fs, dir).filter((k) => all || !base(k).startsWith('.'))
        if (flags.has('S')) kids = [...kids].sort((a, b) => sizeOf(fs, b) - sizeOf(fs, a))
        // -a (but not -A) also shows the "." and ".." entries every directory has.
        const dots = flags.has('a') ? [{ path: dir, name: '.' }, { path: parent(dir), name: '..' }] : []
        const entries = [...dots, ...kids.map((k) => ({ path: k, name: base(k) }))]
        if (long) {
          const blocks = entries.reduce((s, e) => s + Math.ceil((fs[e.path].type === 'dir' ? 4096 : fileSize(fs[e.path])) / 4096) * 4, 0)
          out.push(`total ${h ? human(blocks * KB) : blocks}`)
          entries.forEach((e) => out.push(longLine(fs, e.path, e.name, h)))
        } else if (one) entries.forEach((e) => out.push(e.name))
        else if (entries.length) out.push(entries.map((e) => e.name + (fs[e.path].type === 'dir' && !dots.includes(e) ? '/' : '')).join('  '))
      })
      return { out, err, code: err.length ? 2 : 0 }
    }

    case 'tree': {
      const { pos } = split(args)
      const target = resolve(cwd, pos[0] ?? '.')
      if (!fs[target] || fs[target].type !== 'dir') return fail(`${pos[0] ?? '.'} [error opening dir]`)
      const out: string[] = [pos[0] ?? '.']
      let dirs = 0
      let files = 0
      const walk = (d: string, pad: string) => {
        const kids = children(fs, d).filter((k) => !base(k).startsWith('.'))
        kids.forEach((k, i) => {
          const last = i === kids.length - 1
          const isDir = fs[k].type === 'dir'
          if (isDir) dirs++
          else files++
          out.push(`${pad}${last ? '└── ' : '├── '}${base(k)}`)
          if (isDir && canRead(ctx, k)) walk(k, pad + (last ? '    ' : '│   '))
        })
      }
      walk(target, '')
      out.push('', `${dirs} director${dirs === 1 ? 'y' : 'ies'}, ${files} file${files === 1 ? '' : 's'}`)
      return ok(out)
    }

    case 'mkdir': {
      const { flags, pos } = split(args)
      if (!pos.length) return fail('mkdir: missing operand')
      const next = { ...fs }
      for (const a of pos) {
        const path = resolve(cwd, a)
        if (next[path]) {
          if (flags.has('p')) continue
          return fail(`mkdir: cannot create directory '${a}': File exists`)
        }
        if (!canWrite(ctx, path)) return fail(`mkdir: cannot create directory '${a}': Permission denied`, { info: [NEEDS_SUDO] })
        if (!next[parent(path)]) {
          if (!flags.has('p')) return fail(`mkdir: cannot create directory '${a}': No such file or directory`, { info: ['(hint: add -p to create the missing parent folders too)'] })
          let p = path
          while (!next[p]) {
            next[p] = { type: 'dir' }
            p = parent(p)
          }
        } else next[path] = { type: 'dir' }
      }
      return ok([], { fs: next })
    }

    case 'touch': {
      const { pos } = split(args)
      if (!pos.length) return fail('touch: missing file operand')
      const next = { ...fs }
      for (const a of pos) {
        const path = resolve(cwd, a)
        if (!next[parent(path)]) return fail(`touch: cannot touch '${a}': No such file or directory`)
        if (!canWrite(ctx, path)) return fail(`touch: cannot touch '${a}': Permission denied`, { info: [NEEDS_SUDO] })
        if (!next[path]) next[path] = { type: 'file', content: '' }
      }
      return ok([], { fs: next })
    }

    case 'truncate': {
      // Only the common "truncate -s 0 FILE" form: empty a log without deleting it.
      const files = args.filter((a, i) => !a.startsWith('-') && args[i - 1] !== '-s')
      if (!args.includes('-s') || !files.length) return fail("truncate: you must specify '-s 0' and a file")
      const next = { ...fs }
      for (const a of files) {
        const path = resolve(cwd, a)
        if (!canWrite(ctx, path)) return fail(`truncate: cannot open '${a}' for writing: Permission denied`, { info: [NEEDS_SUDO] })
        if (next[path]?.type === 'dir') return fail(`truncate: cannot open '${a}' for writing: Is a directory`)
        next[path] = { type: 'file', content: '' }
      }
      return ok([], { fs: next })
    }

    case 'cat':
    case 'less':
    case 'more': {
      const { flags, pos } = split(args)
      const r = input(pos)
      const out = flags.has('n') ? r.lines.map((l, i) => `${String(i + 1).padStart(6)}\t${l}`) : r.lines
      return { out, err: r.err, code: r.err.length ? 1 : 0 }
    }

    case 'head':
    case 'tail': {
      const follow = args.includes('-f') || args.includes('-F')
      const { n, rest } = lineCount(args.filter((a) => a !== '-f' && a !== '-F'))
      const r = input(rest)
      const out = cmd === 'head' ? r.lines.slice(0, n) : r.lines.slice(Math.max(0, r.lines.length - n))
      const info = follow ? ['(tail -f keeps watching for new lines in real life; press Ctrl+C to stop. Here you see a snapshot.)'] : undefined
      return { out, err: r.err, info, code: r.err.length ? 1 : 0 }
    }

    case 'wc': {
      const { flags, pos } = split(args)
      const pick = ['l', 'w', 'c'].filter((f) => flags.has(f))
      const show = pick.length ? pick : ['l', 'w', 'c']
      const count = (ls: string[]) => {
        const text = ls.join('\n') + (ls.length ? '\n' : '')
        const v: Record<string, number> = { l: ls.length, w: text.split(/\s+/).filter(Boolean).length, c: text.length }
        return show.map((f) => v[f])
      }
      if (!pos.length) {
        const v = count(stdin ?? [])
        return ok([show.length === 1 ? String(v[0]) : v.map((x) => String(x).padStart(7)).join(' ')])
      }
      const out: string[] = []
      const err: string[] = []
      for (const f of pos) {
        const r = readFile(f)
        if ('error' in r) err.push(r.error)
        else out.push(`${count(r.lines).join(' ')} ${f}`)
      }
      return { out, err, code: err.length ? 1 : 0 }
    }

    case 'sort': {
      const { flags, pos } = split(args)
      const r = input(pos)
      let out = [...r.lines]
      if (flags.has('h')) out.sort((a, b) => parseHuman(a) - parseHuman(b))
      else if (flags.has('n')) out.sort((a, b) => parseFloat(a) - parseFloat(b))
      else out.sort()
      if (flags.has('r')) out.reverse()
      if (flags.has('u')) out = out.filter((l, i) => out.indexOf(l) === i)
      return { out, err: r.err, code: r.err.length ? 1 : 0 }
    }

    case 'uniq': {
      const { flags, pos } = split(args)
      const r = input(pos)
      const groups: { line: string; n: number }[] = []
      for (const l of r.lines) {
        const last = groups[groups.length - 1]
        if (last && last.line === l) last.n++
        else groups.push({ line: l, n: 1 })
      }
      return ok(groups.map((g) => (flags.has('c') ? `${String(g.n).padStart(7)} ${g.line}` : g.line)))
    }

    case 'grep': {
      const opts = new Set<string>()
      const pos: string[] = []
      // Context lines: -A N (after), -B N (before), -C N (both).
      let after = 0
      let before = 0
      for (let i = 0; i < args.length; i++) {
        const a = args[i]
        const ctxFlag = !pos.length && a.match(/^-([ABC])(\d*)$/)
        if (ctxFlag) {
          const n = parseInt(ctxFlag[2] || args[++i] || '0', 10) || 0
          if (ctxFlag[1] !== 'B') after = n
          if (ctxFlag[1] !== 'A') before = n
        } else if (a.startsWith('-') && a.length > 1 && !pos.length) for (const ch of a.slice(1)) opts.add(ch)
        else pos.push(a)
      }
      const [pattern, ...files] = pos
      if (pattern === undefined) return fail('Usage: grep [OPTION]... PATTERNS [FILE]...')
      const src = opts.has('w') ? `\\b(?:${pattern})\\b` : pattern
      let re: RegExp
      try {
        re = new RegExp(opts.has('F') ? pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : src, opts.has('i') ? 'i' : '')
      } catch {
        re = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), opts.has('i') ? 'i' : '')
      }
      const hit = (l: string) => re.test(l) !== opts.has('v')
      const recursive = opts.has('r') || opts.has('R')

      // Collect (label, lines) sources.
      const sources: { label: string; lines: string[] }[] = []
      const err: string[] = []
      if (!files.length && !recursive) sources.push({ label: '(standard input)', lines: stdin ?? [] })
      for (const f of files.length ? files : recursive ? ['.'] : []) {
        const p = resolve(cwd, f)
        if (!fs[p]) {
          err.push(`grep: ${f}: No such file or directory`)
          continue
        }
        if (fs[p].type === 'dir') {
          if (!recursive) {
            err.push(`grep: ${f}: Is a directory`)
            continue
          }
          for (const k of descendants(fs, p)) {
            if (fs[k].type !== 'file') continue
            if (!canRead(ctx, k)) {
              err.push(`grep: ${f === '.' ? '.' + k.slice(p.length) : f.replace(/\/$/, '') + k.slice(p.length)}: Permission denied`)
              continue
            }
            const label = f === '.' ? k.slice(p.length + 1) : f.replace(/\/$/, '') + k.slice(p.length)
            sources.push({ label, lines: lines(textOf(fs[k])) })
          }
        } else if (!canRead(ctx, p)) err.push(`grep: ${f}: Permission denied`)
        else sources.push({ label: f, lines: lines(textOf(fs[p])) })
      }
      const prefix = sources.length > 1 && !opts.has('h')
      const out: string[] = []
      let matched = 0
      for (const s of sources) {
        const hits = s.lines.map((l, i) => ({ l, i })).filter(({ l }) => hit(l))
        matched += hits.length
        if (opts.has('l')) {
          if (hits.length) out.push(s.label)
        } else if (opts.has('c')) out.push(prefix ? `${s.label}:${hits.length}` : String(hits.length))
        else if (after || before) {
          // Print each match with its neighbours; "--" separates groups that do not touch.
          const keep = new Set<number>()
          hits.forEach(({ i }) => {
            for (let k = Math.max(0, i - before); k <= Math.min(s.lines.length - 1, i + after); k++) keep.add(k)
          })
          let last = -2
          for (const k of [...keep].sort((x, y) => x - y)) {
            if (last >= 0 && k > last + 1) out.push('--')
            const sep = hits.some((h) => h.i === k) ? ':' : '-'
            out.push(`${prefix ? s.label + sep : ''}${opts.has('n') ? k + 1 + sep : ''}${s.lines[k]}`)
            last = k
          }
        } else for (const { l, i } of hits) out.push(`${prefix ? s.label + ':' : ''}${opts.has('n') ? i + 1 + ':' : ''}${l}`)
      }
      return { out, err, code: err.length ? 2 : matched ? 0 : 1 }
    }

    case 'find': {
      const starts: string[] = []
      let i = 0
      while (i < args.length && !args[i].startsWith('-')) starts.push(args[i++])
      const tests: ((p: string) => boolean)[] = []
      let maxDepth = Infinity
      for (; i < args.length; i++) {
        const a = args[i]
        const v = args[i + 1]
        if (a === '-name' || a === '-iname') {
          if (v === undefined) return fail(`find: missing argument to \`${a}'`)
          const re = globToRegex(v)
          const ci = new RegExp(re.source, 'i')
          tests.push((p) => (a === '-iname' ? ci : re).test(base(p)))
          i++
        } else if (a === '-type') {
          if (v !== 'f' && v !== 'd') return fail(`find: Unknown argument to -type: ${v ?? ''}`)
          tests.push((p) => fs[p].type === (v === 'f' ? 'file' : 'dir'))
          i++
        } else if (a === '-size') {
          const m = v?.match(/^([+-]?)(\d+)([ckMG]?)$/)
          if (!m) return fail(`find: invalid argument \`${v ?? ''}' to \`-size'`)
          const unit = { c: 1, k: KB, M: KB * KB, G: GB, '': 512 }[m[3] as 'c' | 'k' | 'M' | 'G' | '']
          const limit = parseInt(m[2], 10) * unit
          tests.push((p) => fs[p].type === 'file' && (m[1] === '+' ? fileSize(fs[p]) > limit : m[1] === '-' ? fileSize(fs[p]) < limit : Math.ceil(fileSize(fs[p]) / unit) === parseInt(m[2], 10)))
          i++
        } else if (a === '-maxdepth') {
          maxDepth = parseInt(v ?? '', 10)
          i++
        } else return fail(`find: unknown predicate \`${a}'`)
      }
      const out: string[] = []
      const err: string[] = []
      for (const s of starts.length ? starts : ['.']) {
        const start = resolve(cwd, s)
        if (!fs[start]) {
          err.push(`find: '${s}': No such file or directory`)
          continue
        }
        const show = (p: string) => (p === start ? s : (s === '/' ? '' : s.replace(/\/$/, '')) + p.slice(start === '/' ? 0 : start.length))
        const walk = (p: string, depth: number) => {
          if (tests.every((t) => t(p))) out.push(show(p))
          if (fs[p].type !== 'dir' || depth >= maxDepth) return
          if (!canRead(ctx, p)) {
            err.push(`find: '${show(p)}': Permission denied`)
            return
          }
          children(fs, p).forEach((k) => walk(k, depth + 1))
        }
        walk(start, 0)
      }
      return { out, err, code: err.length ? 1 : 0 }
    }

    case 'du': {
      const flags = new Set<string>()
      const targets: string[] = []
      let maxDepth = Infinity
      for (let i = 0; i < args.length; i++) {
        const a = args[i]
        if (a === '-d') maxDepth = parseInt(args[++i] ?? '', 10)
        else if (a.startsWith('--max-depth=')) maxDepth = parseInt(a.split('=')[1], 10)
        else if (a.startsWith('-')) for (const ch of a.slice(1)) flags.add(ch)
        else targets.push(a)
      }
      if (flags.has('s')) maxDepth = 0
      const h = flags.has('h')
      const fmt = (bytes: number) => (h ? human(Math.max(bytes, 4 * KB)) : String(Math.ceil(bytes / KB)))
      const out: string[] = []
      const err: string[] = []
      for (const t of targets.length ? targets : ['.']) {
        const start = resolve(cwd, t)
        if (!fs[start]) {
          err.push(`du: cannot access '${t}': No such file or directory`)
          continue
        }
        const label = (p: string) => (p === start ? t : t.replace(/\/$/, '') + p.slice(start.length))
        const walk = (p: string, depth: number) => {
          if (fs[p].type !== 'dir') return
          if (!canRead(ctx, p)) {
            err.push(`du: cannot read directory '${label(p)}': Permission denied`)
            return
          }
          children(fs, p).forEach((k) => walk(k, depth + 1))
          if (depth <= maxDepth) out.push(`${fmt(sizeOf(fs, p))}\t${label(p)}`)
        }
        if (fs[start].type === 'file') out.push(`${fmt(sizeOf(fs, start))}\t${t}`)
        else walk(start, 0)
      }
      return { out, err, code: err.length ? 1 : 0 }
    }

    case 'df': {
      const { flags } = split(args)
      const used = Math.round(diskUsage(fs) * DISK_SIZE)
      const fmt = (b: number) => (flags.has('h') ? human(b) : String(Math.round(b / KB)))
      const pct = `${Math.ceil(diskUsage(fs) * 100)}%`
      const row = (a: string[]) => a[0].padEnd(15) + a.slice(1, 5).map((x) => x.padStart(flags.has('h') ? 6 : 11)).join('') + ' ' + a[5]
      return ok([
        row(['Filesystem', flags.has('h') ? 'Size' : '1K-blocks', 'Used', 'Avail', 'Use%', 'Mounted on']),
        row(['/dev/root', fmt(DISK_SIZE), fmt(used), fmt(DISK_SIZE - used), pct, '/']),
        row(['tmpfs', fmt(GB), '0', fmt(GB), '0%', '/dev/shm']),
      ])
    }

    case 'rm': {
      const { flags, pos } = split(args)
      if (!pos.length) return fail('rm: missing operand')
      const next = { ...fs }
      const err: string[] = []
      let info: string[] | undefined
      for (const a of pos) {
        const path = resolve(cwd, a)
        if (!next[path]) {
          if (!flags.has('f')) err.push(`rm: cannot remove '${a}': No such file or directory`)
          continue
        }
        if (path === '/' || path === HOME || path === '/home') {
          err.push(`rm: refusing to remove '${a}' (this sandbox protects it; on a real server this would destroy the machine)`)
          continue
        }
        if (!canWrite(ctx, path)) {
          err.push(`rm: cannot remove '${a}': Permission denied`)
          info = [NEEDS_SUDO]
          continue
        }
        if (next[path].type === 'dir') {
          if (!flags.has('r') && !flags.has('R')) {
            err.push(`rm: cannot remove '${a}': Is a directory`)
            info = ['(hint: use rm -r to delete a folder and everything in it)']
            continue
          }
          Object.keys(next).forEach((k) => under(k, path) && delete next[k])
        } else delete next[path]
      }
      return { out: [], err, info, code: err.length ? 1 : 0, fs: next, cwd: next[cwd] ? cwd : HOME }
    }

    case 'cp':
    case 'mv': {
      const { flags, pos } = split(args)
      if (pos.length < 2) return fail(`${cmd}: missing destination file operand after '${pos[0] ?? ''}'`)
      const dstArg = pos[pos.length - 1]
      const dstBase = resolve(cwd, dstArg)
      const srcs = pos.slice(0, -1)
      if (srcs.length > 1 && fs[dstBase]?.type !== 'dir') return fail(`${cmd}: target '${dstArg}' is not a directory`)
      let next = { ...fs }
      const err: string[] = []
      let info: string[] | undefined
      for (const s of srcs) {
        const src = resolve(cwd, s)
        if (!fs[src]) {
          err.push(`${cmd}: cannot stat '${s}': No such file or directory`)
          continue
        }
        if (!canRead(ctx, src)) {
          err.push(`${cmd}: cannot open '${s}' for reading: Permission denied`)
          continue
        }
        const dst = next[dstBase]?.type === 'dir' ? (dstBase === '/' ? '' : dstBase) + '/' + base(src) : dstBase
        if (!next[parent(dst)]) {
          err.push(`${cmd}: cannot create '${dstArg}': No such file or directory`)
          continue
        }
        if (!canWrite(ctx, dst) || (cmd === 'mv' && !canWrite(ctx, src))) {
          err.push(`${cmd}: cannot ${cmd === 'mv' ? 'move' : 'create'} '${s}': Permission denied`)
          info = [NEEDS_SUDO]
          continue
        }
        if (fs[src].type === 'dir' && cmd === 'cp' && !flags.has('r') && !flags.has('R') && !flags.has('a')) {
          err.push(`cp: -r not specified; omitting directory '${s}'`)
          continue
        }
        if (under(dst, src) && dst !== src) {
          err.push(`${cmd}: cannot ${cmd === 'mv' ? 'move' : 'copy'} a directory, '${s}', into itself`)
          continue
        }
        const moved: Fs = {}
        Object.keys(fs)
          .filter((k) => under(k, src))
          .forEach((k) => (moved[dst + k.slice(src.length)] = { ...fs[k] }))
        if (cmd === 'mv') Object.keys(next).forEach((k) => under(k, src) && delete next[k])
        next = { ...next, ...moved }
      }
      return { out: [], err, info, code: err.length ? 1 : 0, fs: next, cwd: next[cwd] ? cwd : HOME }
    }

    case 'tee': {
      const { flags, pos } = split(args)
      const text = stdin ?? []
      let next = fs
      for (const f of pos) {
        const p = resolve(cwd, f)
        if (!next[parent(p)]) return fail(`tee: ${f}: No such file or directory`, { out: text })
        if (next[p]?.type === 'dir') return fail(`tee: ${f}: Is a directory`, { out: text })
        if (!canWrite(ctx, p)) return fail(`tee: ${f}: Permission denied`, { out: text, info: [NEEDS_SUDO] })
        const old = flags.has('a') && next[p]?.content ? next[p].content + '\n' : ''
        next = { ...next, [p]: { type: 'file', content: old + text.join('\n') } }
      }
      return ok(text, { fs: next })
    }

    case 'sudo': {
      if (!args.length || args[0] === '-i' || args[0] === '-s') return fail('sudo: interactive root shells are disabled here. Use: sudo COMMAND')
      return exec({ ...ctx, root: true }, args, stdin, piped)
    }

    default: {
      const custom = ctx.commands[cmd]
      if (custom) {
        const r = custom(args, { fs, cwd, root: ctx.root, stdin })
        return { out: r.out ?? [], err: r.err ?? [], code: r.code ?? (r.err?.length ? 1 : 0), fs: r.fs }
      }
      if (ELSEWHERE[cmd]) return fail(`${cmd}: not part of this sandbox. It is covered in the "${ELSEWHERE[cmd]}" lesson.`)
      return fail(`${cmd}: command not found`, { info: ['(type "help" to see what works here)'] })
    }
  }
}

/* ------------------------------------------------------------------ runner */

export type OutLine = { text: string; kind?: 'err' | 'info' }
export type Result = { fs: Fs; cwd: string; out: OutLine[]; code: number; clear?: boolean }
export type RunOptions = { history?: string[]; host?: string; commands?: Record<string, CustomCommand> }

/** Runs one command line. Pure: returns the new filesystem, directory and output. */
export function run(fs: Fs, cwd: string, line: string, opts: RunOptions = {}): Result {
  const toks = lex(line)
  if (typeof toks === 'string') return { fs, cwd, out: [{ text: `bash: ${toks}`, kind: 'err' }], code: 2 }
  const chains = parse(toks)
  if (typeof chains === 'string') return { fs, cwd, out: [{ text: `bash: ${chains}`, kind: 'err' }], code: 2 }

  const ctx: Ctx = { fs, cwd, root: false, history: opts.history ?? [], host: opts.host ?? 'server', commands: opts.commands ?? {} }
  const out: OutLine[] = []
  let code = 0
  let clear = false

  for (let c = 0; c < chains.length; c++) {
    if (c > 0 && chains[c - 1].op === '&&' && code !== 0) break
    let stdin: string[] | null = null
    const stages = chains[c].stages
    for (let s = 0; s < stages.length; s++) {
      const st = stages[s]
      const argv = st.words.flatMap((w) => expand(ctx.fs, ctx.cwd, w))
      const piped = s < stages.length - 1 || !!st.out
      const r = exec(ctx, argv, stdin, piped)
      if (r.fs) ctx.fs = r.fs
      if (r.cwd) ctx.cwd = r.cwd
      if (r.clear) {
        clear = true
        out.length = 0
      }
      code = r.code

      if (st.errFile && st.errFile !== '/dev/null' && r.err.length) {
        const p = resolve(ctx.cwd, st.errFile)
        if (canWrite(ctx, p) && ctx.fs[parent(p)]) ctx.fs = { ...ctx.fs, [p]: { type: 'file', content: r.err.join('\n') } }
      } else if (!st.errFile) out.push(...r.err.map((t) => ({ text: t, kind: 'err' as const })))
      if (r.info) out.push(...r.info.map((t) => ({ text: t, kind: 'info' as const })))

      if (st.out) {
        const p = resolve(ctx.cwd, st.out.file)
        if (st.out.file === '/dev/null') {
          /* discarded */
        } else if (!ctx.fs[parent(p)]) {
          out.push({ text: `bash: ${st.out.file}: No such file or directory`, kind: 'err' })
          code = 1
        } else if (ctx.fs[p]?.type === 'dir') {
          out.push({ text: `bash: ${st.out.file}: Is a directory`, kind: 'err' })
          code = 1
        } else if (!canWrite(ctx, p)) {
          out.push({ text: `bash: ${st.out.file}: Permission denied`, kind: 'err' }, { text: '(hint: the > is handled by your own shell, so sudo cannot help it. Use: echo text | sudo tee FILE)', kind: 'info' })
          code = 1
        } else {
          const old = st.out.append && ctx.fs[p]?.content ? ctx.fs[p].content + '\n' : ''
          const body = r.out.join('\n')
          ctx.fs = { ...ctx.fs, [p]: { type: 'file', content: old + body } }
        }
        stdin = []
      } else if (s < stages.length - 1) stdin = r.out
      else out.push(...r.out.map((t) => ({ text: t })))
    }
  }
  return { fs: ctx.fs, cwd: ctx.cwd, out, code, clear }
}

/** Tab completion for the last word: a command name first, a path after that. */
export function complete(fs: Fs, cwd: string, input: string, extra: string[] = []): { value: string; options: string[] } {
  const m = input.match(/^(.*?)(\S*)$/)
  const before = m?.[1] ?? ''
  const word = m?.[2] ?? ''
  const firstWord = before.trim() === '' || /(\||&&|;|sudo)\s*$/.test(before)
  let options: string[]
  let stem = ''
  let partial = word
  if (firstWord && !word.includes('/')) {
    options = [...new Set([...COMMANDS, ...extra])].sort().filter((c) => c.startsWith(word))
  } else {
    const i = word.lastIndexOf('/')
    stem = word.slice(0, i + 1)
    partial = word.slice(i + 1)
    const dir = resolve(cwd, stem || '.')
    options =
      fs[dir]?.type === 'dir'
        ? children(fs, dir)
            .filter((k) => base(k).startsWith(partial) && (partial.startsWith('.') || !base(k).startsWith('.')))
            .map((k) => base(k) + (fs[k].type === 'dir' ? '/' : ''))
        : []
  }
  if (options.length === 0) return { value: input, options: [] }
  if (options.length === 1) {
    const o = options[0]
    return { value: before + stem + o + (o.endsWith('/') ? '' : ' '), options: [] }
  }
  let common = options[0]
  for (const o of options) while (!o.startsWith(common)) common = common.slice(0, -1)
  return { value: before + stem + (common.length > partial.length ? common : partial), options }
}
