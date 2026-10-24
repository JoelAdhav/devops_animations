/** A tiny in-memory Linux-like filesystem for the terminal playground. */

export type Node = { type: 'dir' | 'file'; content?: string }
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

type Result = { fs: Fs; cwd: string; out: string[]; err?: boolean; clear?: boolean }

/** Runs one command line. Pure: returns the new filesystem and output. */
export function run(fs: Fs, cwd: string, line: string): Result {
  // Support a single "echo text > file" / ">>" redirect.
  const redirect = line.match(/^echo\s+(.*?)\s*(>>?)\s*(\S+)$/)
  if (redirect) {
    const [, rawText, op, target] = redirect
    const text = rawText.replace(/^["']|["']$/g, '')
    const path = resolve(cwd, target)
    if (!fs[parent(path)] || fs[parent(path)].type !== 'dir') return { fs, cwd, out: [`bash: ${target}: No such file or directory`], err: true }
    if (fs[path]?.type === 'dir') return { fs, cwd, out: [`bash: ${target}: Is a directory`], err: true }
    const old = op === '>>' && fs[path]?.content ? fs[path].content + '\n' : ''
    return { fs: { ...fs, [path]: { type: 'file', content: old + text } }, cwd, out: [] }
  }

  const [cmd, ...rest] = line.trim().split(/\s+/)
  const flags = rest.filter((a) => a.startsWith('-')).join('')
  const args = rest.filter((a) => !a.startsWith('-'))
  const missing = (a: string) => ({ fs, cwd, out: [`${cmd}: cannot access '${a}': No such file or directory`], err: true })

  switch (cmd) {
    case undefined:
    case '':
      return { fs, cwd, out: [] }
    case 'help':
      return {
        fs,
        cwd,
        out: ['Try: pwd  ls  ls -a  cd DIR  cd ..  cd ~  mkdir DIR  mkdir -p a/b', '     touch FILE  cat FILE  echo hi > FILE  cp A B  mv A B  rm FILE  rm -r DIR  tree  clear'],
      }
    case 'clear':
      return { fs, cwd, out: [], clear: true }
    case 'pwd':
      return { fs, cwd, out: [cwd] }
    case 'whoami':
      return { fs, cwd, out: ['joel'] }
    case 'cd': {
      const target = args[0] === '-' ? parent(cwd) : resolve(cwd, args[0] ?? '~')
      if (!fs[target]) return { fs, cwd, out: [`bash: cd: ${args[0]}: No such file or directory`], err: true }
      if (fs[target].type !== 'dir') return { fs, cwd, out: [`bash: cd: ${args[0]}: Not a directory`], err: true }
      return { fs, cwd: target, out: [] }
    }
    case 'ls': {
      const target = resolve(cwd, args[0] ?? '.')
      if (!fs[target]) return missing(args[0])
      if (fs[target].type === 'file') return { fs, cwd, out: [base(target)] }
      const all = flags.includes('a')
      const names = children(fs, target)
        .map((k) => ({ name: base(k), dir: fs[k].type === 'dir' }))
        .filter((n) => all || !n.name.startsWith('.'))
      if (flags.includes('l')) {
        return {
          fs,
          cwd,
          out: names.map((n) => `${n.dir ? 'drwxr-xr-x' : '-rw-r--r--'}  joel joel  ${n.name}${n.dir ? '/' : ''}`),
        }
      }
      return { fs, cwd, out: [names.map((n) => n.name + (n.dir ? '/' : '')).join('  ') || ''] }
    }
    case 'mkdir': {
      if (!args.length) return { fs, cwd, out: ['mkdir: missing operand'], err: true }
      const next = { ...fs }
      for (const a of args) {
        const path = resolve(cwd, a)
        if (next[path]) return { fs, cwd, out: [`mkdir: cannot create directory '${a}': File exists`], err: true }
        if (!next[parent(path)]) {
          if (!flags.includes('p')) return { fs, cwd, out: [`mkdir: cannot create directory '${a}': No such file or directory (try -p)`], err: true }
          let p = path
          const chain: string[] = []
          while (!next[p]) {
            chain.unshift(p)
            p = parent(p)
          }
          chain.forEach((c) => (next[c] = { type: 'dir' }))
        } else next[path] = { type: 'dir' }
      }
      return { fs: next, cwd, out: [] }
    }
    case 'touch': {
      if (!args.length) return { fs, cwd, out: ['touch: missing file operand'], err: true }
      const next = { ...fs }
      for (const a of args) {
        const path = resolve(cwd, a)
        if (!next[parent(path)]) return missing(a)
        if (!next[path]) next[path] = { type: 'file', content: '' }
      }
      return { fs: next, cwd, out: [] }
    }
    case 'cat': {
      if (!args.length) return { fs, cwd, out: ['cat: missing file operand'], err: true }
      const path = resolve(cwd, args[0])
      if (!fs[path]) return { fs, cwd, out: [`cat: ${args[0]}: No such file or directory`], err: true }
      if (fs[path].type === 'dir') return { fs, cwd, out: [`cat: ${args[0]}: Is a directory`], err: true }
      return { fs, cwd, out: (fs[path].content ?? '').split('\n') }
    }
    case 'rm': {
      if (!args.length) return { fs, cwd, out: ['rm: missing operand'], err: true }
      const next = { ...fs }
      for (const a of args) {
        const path = resolve(cwd, a)
        if (!next[path]) return { fs, cwd, out: [`rm: cannot remove '${a}': No such file or directory`], err: true }
        if (path === '/' || path === HOME) return { fs, cwd, out: [`rm: refusing to remove '${a}' in this sandbox`], err: true }
        if (next[path].type === 'dir') {
          if (!flags.includes('r')) return { fs, cwd, out: [`rm: cannot remove '${a}': Is a directory (use rm -r)`], err: true }
          Object.keys(next).forEach((k) => (k === path || k.startsWith(path + '/')) && delete next[k])
        } else delete next[path]
      }
      const newCwd = next[cwd] ? cwd : HOME
      return { fs: next, cwd: newCwd, out: [] }
    }
    case 'cp':
    case 'mv': {
      if (args.length < 2) return { fs, cwd, out: [`${cmd}: missing destination file operand`], err: true }
      const src = resolve(cwd, args[0])
      let dst = resolve(cwd, args[1])
      if (!fs[src]) return { fs, cwd, out: [`${cmd}: cannot stat '${args[0]}': No such file or directory`], err: true }
      if (fs[dst]?.type === 'dir') dst = (dst === '/' ? '' : dst) + '/' + base(src)
      if (!fs[parent(dst)]) return { fs, cwd, out: [`${cmd}: cannot create '${args[1]}': No such file or directory`], err: true }
      if (fs[src].type === 'dir' && cmd === 'cp' && !flags.includes('r')) return { fs, cwd, out: [`cp: -r not specified; omitting directory '${args[0]}'`], err: true }
      const next = { ...fs }
      Object.keys(fs)
        .filter((k) => k === src || k.startsWith(src + '/'))
        .forEach((k) => {
          next[dst + k.slice(src.length)] = { ...fs[k] }
          if (cmd === 'mv') delete next[k]
        })
      return { fs: next, cwd: next[cwd] ? cwd : HOME, out: [] }
    }
    case 'tree': {
      const target = resolve(cwd, args[0] ?? '.')
      if (!fs[target] || fs[target].type !== 'dir') return missing(args[0] ?? '.')
      const out: string[] = [pretty(target)]
      const walk = (d: string, pad: string) => {
        const kids = children(fs, d).filter((k) => !base(k).startsWith('.'))
        kids.forEach((k, i) => {
          const last = i === kids.length - 1
          out.push(`${pad}${last ? '└── ' : '├── '}${base(k)}${fs[k].type === 'dir' ? '/' : ''}`)
          if (fs[k].type === 'dir') walk(k, pad + (last ? '    ' : '│   '))
        })
      }
      walk(target, '')
      return { fs, cwd, out }
    }
    case 'sudo':
      return { fs, cwd, out: ['sudo: not needed in this sandbox, you own everything here.'] }
    default:
      return { fs, cwd, out: [`${cmd}: command not found (type "help")`], err: true }
  }
}
