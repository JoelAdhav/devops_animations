import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CheckCircle2, Circle, FileText, Folder, FolderTree } from 'lucide-react'
import type { Lesson } from '../types'
import { Shell, Tip } from '../../components/Story'
import { Scene, Txt } from '../../components/Illustrations'
import { bouncy, spring } from '../../lib/motion'
import { useLoop } from '../../lib/useLoop'
import { HOME, base, children, initialFs, pretty, run, type Fs } from '../../lib/vfs'

/* ------------------------------------------------------------------ scene */

type Row = { id: string; depth: number; dir: boolean; hidden?: boolean; extra?: boolean }

const ROWS: Row[] = [
  { id: '/', depth: 0, dir: true },
  { id: '/bin', depth: 1, dir: true },
  { id: '/etc', depth: 1, dir: true },
  { id: '/etc/hosts', depth: 2, dir: false },
  { id: '/etc/nginx', depth: 2, dir: true },
  { id: '/etc/nginx/nginx.conf', depth: 3, dir: false },
  { id: '/home', depth: 1, dir: true },
  { id: '/home/joel', depth: 2, dir: true },
  { id: '/home/joel/.bashrc', depth: 3, dir: false, hidden: true },
  { id: '/home/joel/backups', depth: 3, dir: true, extra: true },
  { id: '/home/joel/backups/notes.txt', depth: 4, dir: false, extra: true },
  { id: '/home/joel/notes.txt', depth: 3, dir: false },
  { id: '/home/joel/projects', depth: 3, dir: true },
  { id: '/home/joel/projects/app.py', depth: 4, dir: false },
  { id: '/home/joel/todo.txt', depth: 3, dir: false, extra: true },
  { id: '/opt', depth: 1, dir: true },
  { id: '/proc', depth: 1, dir: true },
  { id: '/root', depth: 1, dir: true },
  { id: '/tmp', depth: 1, dir: true },
  { id: '/var', depth: 1, dir: true },
  { id: '/var/log', depth: 2, dir: true },
  { id: '/var/log/syslog', depth: 3, dir: false },
]

type Frame = { cwd: string; cmd?: string; out: string[]; hl?: string[]; extra?: string[]; gone?: string[]; hidden?: boolean; warn?: boolean }

const J = '/home/joel'

const FRAMES: Frame[][] = [
  [{ cwd: J, out: ['Everything lives under one tree.', 'The top is "/", called root.', 'No C: or D: drives.'], hl: ['/'] }],
  (
    [
      ['/etc', 'config files (nginx, ssh, hosts)'],
      ['/var/log', 'log files: check here first'],
      ['/home', "each user's personal folder"],
      ['/root', 'home of the admin user "root"'],
      ['/bin', 'programs: ls, cp, cat…'],
      ['/tmp', 'temporary, cleared on reboot'],
      ['/opt', 'extra installed software'],
      ['/proc', 'live info about running processes'],
    ] as const
  ).map(([d, why]) => ({ cwd: J, out: [d, `→ ${why}`], hl: [d] })),
  [
    { cwd: J, cmd: 'pwd', out: ['/home/joel'], hl: [J] },
    { cwd: J, cmd: 'echo ~', out: ['/home/joel', '(~ is a shortcut for your home)'], hl: [J] },
  ],
  [
    { cwd: J, cmd: 'cd projects', out: ['(relative: from where I am)'], hl: [`${J}/projects`] },
    { cwd: `${J}/projects`, cmd: 'cd ..', out: ['(.. = one level up)'], hl: [J] },
    { cwd: J, cmd: 'cd /var/log', out: ['(absolute: starts with /)'], hl: ['/var/log'] },
    { cwd: '/var/log', cmd: 'cd ~', out: ['(back home)'], hl: [J] },
  ],
  [
    { cwd: J, cmd: 'ls', out: ['notes.txt  projects/'], hl: [`${J}/notes.txt`, `${J}/projects`] },
    {
      cwd: J,
      cmd: 'ls -la',
      out: ['drwxr-xr-x joel .', 'drwxr-xr-x root ..', '-rw-r--r-- joel .bashrc', '-rw-r--r-- joel notes.txt', 'drwxr-xr-x joel projects'],
      hl: [`${J}/.bashrc`],
      hidden: true,
    },
  ],
  [
    { cwd: J, cmd: 'mkdir backups', out: [], extra: [`${J}/backups`], hl: [`${J}/backups`] },
    { cwd: J, cmd: 'touch todo.txt', out: ['(creates an empty file)'], extra: [`${J}/backups`, `${J}/todo.txt`], hl: [`${J}/todo.txt`] },
  ],
  [
    { cwd: J, cmd: 'cp notes.txt backups/', out: ['(copy: original stays)'], extra: [`${J}/backups`, `${J}/todo.txt`, `${J}/backups/notes.txt`], hl: [`${J}/backups/notes.txt`] },
    { cwd: J, cmd: 'rm todo.txt', out: ['(gone. No recycle bin!)'], extra: [`${J}/backups`, `${J}/backups/notes.txt`], warn: true },
    { cwd: J, cmd: 'rm -r backups', out: ['(-r deletes a folder and', ' everything inside it)'], warn: true },
  ],
  [
    { cwd: J, cmd: 'cat /etc/hosts', out: ['127.0.0.1  localhost', '10.0.2.15  db.internal'], hl: ['/etc/hosts'] },
    { cwd: J, cmd: 'tail -n 3 /var/log/syslog', out: ['10:01 Started nginx.', '10:04 sshd: Accepted key', '10:05 error: disk almost full'], hl: ['/var/log/syslog'] },
    { cwd: J, cmd: 'tail -f /var/log/syslog', out: ['…waiting for new lines…', '10:06 nginx: GET / 200', '(Ctrl+C to stop)'], hl: ['/var/log/syslog'] },
  ],
  [
    { cwd: J, cmd: 'find / -name nginx.conf', out: ['/etc/nginx/nginx.conf'], hl: ['/etc/nginx/nginx.conf'] },
    { cwd: J, cmd: 'grep -r "error" /var/log', out: ['/var/log/syslog: error: disk', '  almost full'], hl: ['/var/log/syslog'] },
    { cwd: J, cmd: 'df -h /', out: ['Size  Used Avail Use%', ' 20G   18G  2.0G  90%'], warn: true },
    { cwd: J, cmd: 'du -sh /var/log', out: ['1.2G    /var/log'], hl: ['/var/log'] },
  ],
]

const ROW_H = 16.5

function FolderGlyph({ open }: { open?: boolean }) {
  return <path d="M0 -5 H5 L7 -3 H14 V6 H0 Z" fill={open ? 'var(--amber)' : 'color-mix(in srgb, var(--amber) 55%, var(--paper))'} stroke="var(--ink)" strokeWidth={1.5} strokeLinejoin="round" />
}

function FileGlyph({ hidden }: { hidden?: boolean }) {
  return <path d="M2 -6 H8 L11 -3 V7 H2 Z" fill={hidden ? 'var(--panel-3)' : 'color-mix(in srgb, var(--sky) 35%, var(--paper))'} stroke="var(--ink)" strokeWidth={1.5} strokeLinejoin="round" />
}

function FsView({ frames }: { frames: Frame[] }) {
  const i = useLoop(frames.length, 2300)
  const f = frames[Math.min(i, frames.length - 1)]
  const rows = ROWS.filter((r) => (!r.hidden || f.hidden) && (!r.extra || f.extra?.includes(r.id)) && !f.gone?.includes(r.id))
  const prompt = `joel@server:${pretty(f.cwd)}$`
  return (
    <>
      <Txt x={24} y={34} cls="ill-label" size={14}>
        Filesystem
      </Txt>
      <AnimatePresence initial={false}>
        {rows.map((r, idx) => {
          const y = 56 + idx * ROW_H
          const isHl = f.hl?.includes(r.id)
          const isCwd = r.id === f.cwd
          return (
            <motion.g
              key={r.id}
              initial={{ opacity: 0, x: 30, y }}
              animate={{ opacity: 1, x: 0, y }}
              exit={{ opacity: 0, x: -20, scale: 0.6, transition: { duration: 0.35 } }}
              transition={spring}
            >
              {isHl && <motion.rect x={22 + r.depth * 14} y={-8} width={188 - r.depth * 14} height={ROW_H - 1} rx={5} fill="color-mix(in srgb, var(--amber) 45%, transparent)" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} style={{ originX: 0 }} transition={bouncy} />}
              <g transform={`translate(${28 + r.depth * 14} 0)`}>{r.dir ? <FolderGlyph open={isCwd} /> : <FileGlyph hidden={r.hidden} />}</g>
              <text className="ill-mono" x={46 + r.depth * 14} y={4.5} style={{ fontSize: 11.5, fontWeight: isHl || isCwd ? 700 : 400, opacity: r.hidden ? 0.7 : 1 }}>
                {r.id === '/' ? '/' : base(r.id) + (r.dir ? '/' : '')}
              </text>
            </motion.g>
          )
        })}
      </AnimatePresence>
      {/* "You are here" pin */}
      <motion.g animate={{ y: 56 + Math.max(0, rows.findIndex((r) => r.id === f.cwd)) * ROW_H }} transition={bouncy} initial={false}>
        <path d="M6 0 L16 -6 V6 Z" fill="var(--rose)" stroke="var(--ink)" strokeWidth={1.5} strokeLinejoin="round" />
      </motion.g>

      {/* Terminal */}
      <g transform="translate(250 20)">
        <rect x={0} y={0} width={292} height={400} rx={16} fill="#1e2742" stroke="var(--ink)" strokeWidth={2.5} />
        <rect x={0} y={0} width={292} height={28} rx={14} fill="#283255" />
        <rect x={0} y={14} width={292} height={14} fill="#283255" />
        {['#ff5a4e', '#ffbe3d', '#4ade80'].map((c, k) => (
          <circle key={c} cx={16 + k * 16} cy={14} r={5} fill={c} />
        ))}
        <text x={74} y={18} style={{ fill: '#9fb0d6', fontFamily: 'var(--mono)', fontSize: 11 }}>
          bash
        </text>
        <AnimatePresence mode="wait">
          <motion.g key={`${i}-${f.cmd}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            {f.cmd && (
              <text x={14} y={56} style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>
                <tspan fill="#ffbe3d">{prompt.length > 36 ? '…' + prompt.slice(-35) : prompt} </tspan>
              </text>
            )}
            {f.cmd && (
              <motion.text
                x={14}
                y={76}
                style={{ fontFamily: 'var(--mono)', fontSize: 13, fill: '#7cc4ff', fontWeight: 700 }}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.35 }}
              >
                {f.cmd}
              </motion.text>
            )}
            {f.out.map((l, k) => (
              <motion.text
                key={k}
                x={14}
                y={(f.cmd ? 104 : 56) + k * 20}
                style={{ fontFamily: 'var(--mono)', fontSize: 12, fill: f.warn ? '#ffd27a' : '#dfe6f5' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: (f.cmd ? 0.55 : 0) + k * 0.08 }}
              >
                {l}
              </motion.text>
            ))}
          </motion.g>
        </AnimatePresence>
      </g>
    </>
  )
}

function LinuxFsScene({ step }: { step: number }) {
  return (
    <Scene label="Linux filesystem tree with a terminal" h={440}>
      <FsView key={step} frames={FRAMES[step] ?? FRAMES[0]} />
    </Scene>
  )
}

/* ------------------------------------------------------------- playground */

const CHALLENGES: { text: string; check: (fs: Fs, cwd: string) => boolean }[] = [
  { text: 'Go into the projects folder', check: (_fs, cwd) => cwd === `${HOME}/projects` },
  { text: 'Create a folder called deploy inside projects', check: (fs) => fs[`${HOME}/projects/deploy`]?.type === 'dir' },
  { text: 'Create an empty file README.md inside deploy', check: (fs) => fs[`${HOME}/projects/deploy/README.md`]?.type === 'file' },
  { text: 'Copy notes.txt into deploy', check: (fs) => fs[`${HOME}/projects/deploy/notes.txt`]?.type === 'file' },
  { text: 'Delete the original ~/notes.txt', check: (fs) => !fs[`${HOME}/notes.txt`] },
  { text: 'Write "v1" into ~/version.txt using echo and >', check: (fs) => fs[`${HOME}/version.txt`]?.content?.trim() === 'v1' },
]

type Line = { prompt?: string; text: string; err?: boolean }

function TreeView({ fs, cwd }: { fs: Fs; cwd: string }) {
  const rows: { path: string; depth: number }[] = []
  const walk = (d: string, depth: number) => {
    rows.push({ path: d, depth })
    children(fs, d)
      .filter((k) => k.startsWith('/home') || d === '/' || k.startsWith('/var') || k.startsWith('/etc'))
      .forEach((k) => (fs[k].type === 'dir' ? walk(k, depth + 1) : rows.push({ path: k, depth: depth + 1 })))
  }
  walk('/', 0)
  return (
    <div className="mono" style={{ fontSize: 12.5, lineHeight: 1.7 }}>
      <AnimatePresence initial={false}>
        {rows.map((r) => {
          const isDir = fs[r.path].type === 'dir'
          const here = r.path === cwd
          return (
            <motion.div
              key={r.path}
              layout
              initial={{ opacity: 0, x: 12, backgroundColor: 'color-mix(in srgb, var(--green) 40%, transparent)' }}
              animate={{ opacity: 1, x: 0, backgroundColor: here ? 'color-mix(in srgb, var(--amber) 35%, transparent)' : 'rgba(0,0,0,0)' }}
              exit={{ opacity: 0, x: -12, backgroundColor: 'color-mix(in srgb, var(--rose) 40%, transparent)' }}
              transition={spring}
              style={{ paddingLeft: 6 + r.depth * 14, borderRadius: 6, whiteSpace: 'nowrap', fontWeight: here ? 700 : 400 }}
            >
              {isDir ? <Folder size={13} style={{ verticalAlign: -2, color: 'var(--amber)' }} /> : <FileText size={13} style={{ verticalAlign: -2, color: 'var(--sky)' }} />}{' '}
              {r.path === '/' ? '/' : base(r.path)}
              {here && <span style={{ color: 'var(--rose)' }}> ◀ you are here</span>}
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}

function TerminalPlayground() {
  const [fs, setFs] = useState<Fs>(initialFs)
  const [cwd, setCwd] = useState(HOME)
  const [lines, setLines] = useState<Line[]>([{ text: 'Welcome! Type "help" to see commands. Try the challenges on the right.' }])
  const [input, setInput] = useState('')
  const [history, setHistory] = useState<string[]>([])
  const [hIdx, setHIdx] = useState(-1)
  const bodyRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight })
  }, [lines])

  const done = useMemo(() => CHALLENGES.map((c) => c.check(fs, cwd)), [fs, cwd])

  function submit() {
    const line = input.trim()
    const prompt = `joel@server:${pretty(cwd)}$`
    setInput('')
    setHIdx(-1)
    if (!line) {
      setLines((l) => [...l, { prompt, text: '' }])
      return
    }
    setHistory((h) => [line, ...h].slice(0, 50))
    const r = run(fs, cwd, line)
    setFs(r.fs)
    setCwd(r.cwd)
    if (r.clear) setLines([])
    else setLines((l) => [...l, { prompt, text: line }, ...r.out.filter((o, k) => o !== '' || k > 0).map((o) => ({ text: o, err: r.err }))])
  }

  function reset() {
    setFs(initialFs())
    setCwd(HOME)
    setLines([{ text: 'Sandbox reset.' }])
  }

  return (
    <div className="card stage">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
        <div className="terminal" onClick={() => inputRef.current?.focus()} style={{ cursor: 'text' }}>
          <header>
            <i />
            <i />
            <i />
            <span style={{ marginLeft: 6 }}>joel@server (sandbox: nothing here is real)</span>
          </header>
          <div className="body" ref={bodyRef} style={{ height: 300 }}>
            {lines.map((l, i) => (
              <div key={i} className={l.err ? 'err' : ''}>
                {l.prompt && <span className="warn">{l.prompt} </span>}
                {l.text}
              </div>
            ))}
            <div style={{ display: 'flex', gap: 6 }}>
              <span className="warn">joel@server:{pretty(cwd)}$</span>
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submit()
                  else if (e.key === 'ArrowUp') {
                    e.preventDefault()
                    const n = Math.min(hIdx + 1, history.length - 1)
                    if (n >= 0) {
                      setHIdx(n)
                      setInput(history[n])
                    }
                  } else if (e.key === 'ArrowDown') {
                    e.preventDefault()
                    const n = hIdx - 1
                    setHIdx(Math.max(n, -1))
                    setInput(n >= 0 ? history[n] : '')
                  }
                }}
                aria-label="Terminal input"
                spellCheck={false}
                autoCapitalize="off"
                autoComplete="off"
                style={{ flex: 1, background: 'transparent', border: 0, outline: 'none', color: '#7cc4ff', fontFamily: 'var(--mono)', fontSize: 12.5, padding: 0 }}
              />
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="mini-table">
            <header>
              Challenges · {done.filter(Boolean).length}/{CHALLENGES.length}
            </header>
            {CHALLENGES.map((c, i) => (
              <div className="row" key={c.text} style={{ fontFamily: 'var(--font)', justifyContent: 'flex-start', alignItems: 'center' }}>
                <motion.span animate={{ scale: done[i] ? [1, 1.4, 1] : 1 }} transition={bouncy} style={{ display: 'flex' }}>
                  {done[i] ? <CheckCircle2 size={16} color="var(--green)" /> : <Circle size={16} color="var(--faint)" />}
                </motion.span>
                <span style={{ textDecoration: done[i] ? 'line-through' : undefined, color: done[i] ? 'var(--muted)' : undefined }}>{c.text}</span>
              </div>
            ))}
          </div>
          <div className="mini-table" style={{ padding: '8px 4px', maxHeight: 260, overflowY: 'auto' }}>
            <TreeView fs={fs} cwd={cwd} />
          </div>
          <button className="btn" onClick={reset} style={{ alignSelf: 'flex-start' }}>
            Reset sandbox
          </button>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ lesson */

const lesson: Lesson = {
  id: 'linux-fs',
  title: 'Linux files and folders',
  track: '',
  tone: 'amber',
  icon: FolderTree,
  summary: 'The Linux directory tree, where things live, and the everyday commands to move around, create, copy, delete, read and find files.',
  minutes: 14,
  story: {
    Scene: LinuxFsScene,
    sections: [
      {
        title: 'One big tree, starting at /',
        body: (
          <>
            <p>
              Almost every server in the cloud runs <strong>Linux</strong>, and you will control it by typing commands in a{' '}
              <strong>terminal</strong>, usually over SSH. There is no mouse and no desktop.
            </p>
            <p>
              On Windows you have drives like <code>C:\</code> and <code>D:\</code>. Linux has <strong>one single tree</strong>. The top
              is called <strong>root</strong> and is written as a single slash: <code>/</code>. Every file and folder is somewhere
              below it. Folders are usually called <strong>directories</strong>.
            </p>
            <Tip>A family tree. "/" is the great-grandparent; every folder is a child of another folder.</Tip>
          </>
        ),
      },
      {
        title: 'Where things live',
        body: (
          <>
            <p>Every Linux server uses the same standard layout. Knowing it means you can find things on any machine:</p>
            <table className="data-table">
              <tbody>
                <tr><td>/etc</td><td>configuration files (nginx, SSH, users)</td></tr>
                <tr><td>/var/log</td><td>log files. When something breaks, look here.</td></tr>
                <tr><td>/home</td><td>one folder per user: /home/joel</td></tr>
                <tr><td>/root</td><td>home folder of the admin user, "root"</td></tr>
                <tr><td>/bin, /usr/bin</td><td>programs and commands</td></tr>
                <tr><td>/tmp</td><td>temporary files, cleared on reboot</td></tr>
                <tr><td>/opt</td><td>extra software you install</td></tr>
                <tr><td>/proc, /dev</td><td>not real files: live process info and devices</td></tr>
              </tbody>
            </table>
            <Tip kind="note">Linux is case sensitive. <code>Notes.txt</code> and <code>notes.txt</code> are two different files.</Tip>
          </>
        ),
      },
      {
        title: 'Where am I?',
        body: (
          <>
            <p>
              A terminal is always "standing" in one directory, called the <strong>current working directory</strong>. Print it
              with <code>pwd</code>:
            </p>
            <Shell>{`$ pwd
/home/joel`}</Shell>
            <p>
              The prompt also shows it: <code>joel@server:~$</code> means user <em>joel</em>, on machine <em>server</em>, in{' '}
              <code>~</code>. The tilde <code>~</code> is short for <strong>your home directory</strong>. The <code>$</code> means
              a normal user; <code>#</code> means you are root.
            </p>
          </>
        ),
      },
      {
        title: 'Moving around with cd',
        body: (
          <>
            <p>
              <code>cd</code> (change directory) moves you. There are two ways to write a path:
            </p>
            <ul>
              <li>
                <strong>Absolute</strong> paths start with <code>/</code> and work from anywhere: <code>cd /var/log</code>.
              </li>
              <li>
                <strong>Relative</strong> paths start from where you are: <code>cd projects</code>.
              </li>
            </ul>
            <p>Special shortcuts:</p>
            <table className="data-table">
              <tbody>
                <tr><td>.</td><td>this directory</td></tr>
                <tr><td>..</td><td>one level up (the parent)</td></tr>
                <tr><td>~ or just cd</td><td>your home</td></tr>
                <tr><td>cd -</td><td>back to where you just were</td></tr>
              </tbody>
            </table>
            <Tip kind="pro">Press <b>Tab</b> to auto-complete names. It saves time and prevents typos.</Tip>
          </>
        ),
      },
      {
        title: 'Looking inside with ls',
        body: (
          <>
            <p>
              <code>ls</code> lists what is in a directory. Add <strong>options</strong> (also called flags) to change its
              behaviour:
            </p>
            <ul>
              <li>
                <code>ls -l</code>: long format, with permissions, owner, size and date.
              </li>
              <li>
                <code>ls -a</code>: also show <strong>hidden files</strong>. Any name starting with a dot, like{' '}
                <code>.bashrc</code> or <code>.ssh</code>, is hidden.
              </li>
              <li>
                <code>ls -la</code>: both together. You'll type this one constantly.
              </li>
            </ul>
            <p>
              Not sure what a command does? <code>man ls</code> opens the manual, and <code>ls --help</code> gives a quick summary.
            </p>
          </>
        ),
      },
      {
        title: 'Creating folders and files',
        body: (
          <>
            <Shell>{`$ mkdir backups            # make a directory
$ mkdir -p app/logs/old     # -p creates the parents too
$ touch todo.txt            # create an empty file
$ echo "hello" > note.txt   # write text into a file (overwrites)
$ echo "more" >> note.txt   # append to the end`}</Shell>
            <p>
              The <code>&gt;</code> and <code>&gt;&gt;</code> symbols are <strong>redirection</strong>: they send a command's output
              into a file instead of the screen. You will use this a lot in scripts (lesson 9).
            </p>
          </>
        ),
      },
      {
        title: 'Copy, move, delete',
        body: (
          <>
            <Shell>{`$ cp notes.txt backups/       # copy a file
$ cp -r project/ project-bak/  # copy a whole folder (-r)
$ mv draft.txt final.txt       # rename
$ mv final.txt docs/           # move
$ rm todo.txt                  # delete a file
$ rm -r backups/               # delete a folder and its contents`}</Shell>
            <Tip kind="warn">There is <b>no recycle bin</b>. <code>rm</code> is permanent. Never run <code>rm -rf /</code> or <code>rm -rf *</code> unless you're absolutely sure where you are. Run <code>pwd</code> first.</Tip>
          </>
        ),
      },
      {
        title: 'Reading files and logs',
        body: (
          <>
            <table className="data-table">
              <tbody>
                <tr><td>cat file</td><td>print the whole file</td></tr>
                <tr><td>less file</td><td>scroll through a big file (q to quit, / to search)</td></tr>
                <tr><td>head -n 20 file</td><td>first 20 lines</td></tr>
                <tr><td>tail -n 50 file</td><td>last 50 lines, where the newest log entries are</td></tr>
                <tr><td>tail -f file</td><td>keep following as new lines arrive (Ctrl+C to stop)</td></tr>
              </tbody>
            </table>
            <p>
              <code>tail -f /var/log/nginx/error.log</code> while you reproduce a bug is one of the most useful debugging habits.
              To edit files, use <code>nano</code> (easy) or <code>vim</code> (powerful: press <code>i</code> to type,{' '}
              <code>Esc</code> then <code>:wq</code> to save and quit).
            </p>
          </>
        ),
      },
      {
        title: 'Finding things and checking disk space',
        body: (
          <>
            <Shell>{`$ find / -name nginx.conf 2>/dev/null   # find files by name
$ grep -r "error" /var/log              # find text inside files
$ grep -i "timeout" app.log             # -i: ignore upper/lower case
$ df -h                                 # free space on each disk
$ du -sh /var/log/*                     # size of each item`}</Shell>
            <p>
              A <strong>full disk</strong> is one of the most common reasons servers break: apps can't write logs or files and
              start failing. <code>df -h</code> shows it; <code>du -sh</code> finds what is using the space (old logs are the usual
              culprit).
            </p>
          </>
        ),
      },
    ],
  },
  Playground: TerminalPlayground,
  playgroundIntro: 'A safe pretend Linux terminal. Type real commands (↑ for history). The tree updates live. Complete the challenges.',
  terms: [
    { term: 'Root ( / )', def: 'The top of the Linux directory tree.' },
    { term: 'Home directory ( ~ )', def: 'Your personal folder, e.g. /home/joel.' },
    { term: 'Working directory', def: 'The directory your terminal is currently in. Shown by pwd.' },
    { term: 'Absolute path', def: 'A path from root, starting with /, e.g. /var/log/syslog.' },
    { term: 'Relative path', def: 'A path from where you are, e.g. projects/app.py or ../notes.txt.' },
    { term: 'Hidden file', def: 'A file whose name starts with a dot. Shown with ls -a.' },
    { term: 'Flag / option', def: 'Extra switch that changes a command, e.g. -l, -a, -r.' },
    { term: 'Redirection', def: '> writes output to a file (overwrite), >> appends.' },
    { term: '/var/log', def: 'Where system and application logs live.' },
    { term: '/etc', def: 'Where configuration files live.' },
  ],
  quiz: [
    {
      q: 'You are in /home/joel/projects. Where does `cd ..` take you?',
      options: ['/', '/home', '/home/joel', '/home/joel/projects/..'],
      answer: 2,
      why: '.. means the parent directory, one level up.',
    },
    {
      q: 'Which command shows hidden files like .bashrc?',
      options: ['ls', 'ls -a', 'pwd', 'cat'],
      answer: 1,
      why: '-a (all) includes names that start with a dot.',
    },
    {
      q: 'Your app is failing. Where would you most likely find its logs?',
      options: ['/etc', '/bin', '/var/log', '/tmp'],
      answer: 2,
      why: '/var/log holds logs. /etc is configuration, /bin is programs, /tmp is temporary files.',
    },
    {
      q: 'What does `echo "x" > file.txt` do if file.txt already has content?',
      options: ['Adds x to the end', 'Replaces everything with x', 'Fails with an error', 'Nothing'],
      answer: 1,
      why: '> overwrites the file. Use >> to append instead.',
    },
    {
      q: 'Which command shows how full the disks are?',
      options: ['du -sh', 'df -h', 'ls -l', 'free -m'],
      answer: 1,
      why: 'df -h shows free space per filesystem. du -sh shows how big specific folders are. free -m is memory.',
    },
  ],
  interview: [
    {
      q: 'Explain the Linux directory structure.',
      a: 'A single tree from /. /etc holds config, /var/log logs, /home user folders, /root the admin’s home, /bin and /usr/bin programs, /tmp temporary files, /opt extra software, /proc and /sys virtual files with kernel and process info, /dev devices.',
    },
    {
      q: 'A server says "No space left on device". What do you do?',
      a: 'df -h to find the full filesystem, then du -sh /* (and deeper, e.g. du -sh /var/log/*) to find what uses the space. Usually old logs: compress or delete rotated logs, set up logrotate, clean package caches, or grow the disk (EBS volume).',
    },
    {
      q: 'Absolute vs relative path?',
      a: 'Absolute starts at / and works from anywhere (/etc/nginx/nginx.conf). Relative is resolved from the current directory (nginx/nginx.conf when you are in /etc). In scripts prefer absolute paths.',
    },
  ],
  commands: [
    { cmd: 'pwd', note: 'Where am I?' },
    { cmd: 'ls -la', note: 'Everything here, with details and hidden files' },
    { cmd: 'cd /var/log && tail -f syslog', note: 'Go to logs and follow new lines' },
    { cmd: 'mkdir -p a/b/c', note: 'Create nested folders' },
    { cmd: 'find / -name "*.conf" 2>/dev/null', note: 'Find files by name' },
    { cmd: 'df -h ; du -sh *', note: 'Disk free, and what is using it' },
  ],
}

export default lesson
