import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { GitBranch, GitCommitHorizontal, GitMerge, RotateCcw } from 'lucide-react'
import type { Lesson } from '../types'
import { Shell, Tip } from '../../components/Story'
import { At, Box, Card, Cloud, FileIcon, Laptop, Link, Mover, Person, Scene, Tag, Txt } from '../../components/Illustrations'
import { bouncy } from '../../lib/motion'
import type { Tone } from '../../components/Diagram'
import { useLoop } from '../../lib/useLoop'

function Headline({ children }: { children: string }) {
  return (
    <Txt x={280} y={46} cls="ill-label" anchor="middle" size={17}>
      {children}
    </Txt>
  )
}

/* ------------------------------------------------------------- graph kit */

type GNode = { id: string; x: number; y: number; parents?: string[]; tone?: Tone; label?: string; ghost?: boolean; delay?: number }
type Pointer = { name: string; at: string; tone: Tone; above?: boolean; head?: boolean }

function Graph({ nodes, pointers = [] }: { nodes: GNode[]; pointers?: Pointer[] }) {
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]))
  return (
    <>
      {nodes.flatMap((n) =>
        (n.parents ?? []).map((p) => {
          const a = byId[p]
          if (!a) return null
          const d = a.y === n.y ? `M${a.x} ${a.y} H${n.x}` : `M${a.x} ${a.y} C${(a.x + n.x) / 2} ${a.y} ${(a.x + n.x) / 2} ${n.y} ${n.x} ${n.y}`
          return <Link key={`${p}-${n.id}`} d={d} color="var(--ink)" width={3} delay={n.delay ?? 0} />
        }),
      )}
      {nodes.map((n) => (
        <motion.g key={n.id} initial={{ x: n.x, y: n.y, scale: 0 }} animate={{ x: n.x, y: n.y, scale: 1, opacity: n.ghost ? 0.3 : 1 }} transition={{ ...bouncy, delay: n.delay ?? 0 }}>
          <circle r={14} fill={`var(--${n.tone ?? 'sky'})`} stroke="var(--ink)" strokeWidth={2.5} strokeDasharray={n.ghost ? '4 3' : undefined} />
          {n.label && (
            <text className="ill-mono" y={34} textAnchor="middle" style={{ fontSize: 11 }}>
              {n.label}
            </text>
          )}
        </motion.g>
      ))}
      {pointers.map((p) => {
        const n = byId[p.at]
        if (!n) return null
        const dy = p.above ? -40 : 58
        return (
          <motion.g key={p.name} initial={false} animate={{ x: n.x, y: n.y + dy }} transition={bouncy}>
            <Tag text={p.head ? `HEAD → ${p.name}` : p.name} tone={p.tone} filled w={p.head ? 130 : Math.max(60, p.name.length * 8 + 22)} h={26} size={12} />
          </motion.g>
        )
      })}
    </>
  )
}

/* ------------------------------------------------------------------ scenes */

function S0Why() {
  const t = useLoop(5, 1100)
  const versions = ['first draft', 'add login', 'fix typo', 'add cart']
  const cursor = t < 4 ? t : 1
  return (
    <>
      <Headline>Save points for your whole project</Headline>
      <line x1={70} y1={200} x2={490} y2={200} stroke="var(--border-strong)" strokeWidth={4} strokeLinecap="round" />
      {versions.map((v, i) => (
        <At key={v} x={90 + i * 125} y={200} delay={i * 0.12} t={bouncy}>
          <circle r={16} fill={i <= cursor ? 'var(--green)' : 'var(--panel-3)'} stroke="var(--ink)" strokeWidth={2.5} />
          <text className="ill-mono" y={44} textAnchor="middle" style={{ fontSize: 11.5 }}>
            {v}
          </text>
        </At>
      ))}
      <Mover x={90 + cursor * 125} y={130}>
        <Laptop title={t === 4 ? 'travel back in time' : 'your project'} />
      </Mover>
      <At x={150} y={340} delay={0.4}>
        <Person title="You" />
      </At>
      <At x={410} y={340} delay={0.5}>
        <Person title="Teammate" tone="sky" />
      </At>
      <Txt x={280} y={350} anchor="middle" cls="ill-sub" delay={0.6}>
        work on the same code
      </Txt>
      <Txt x={280} y={368} anchor="middle" cls="ill-sub" delay={0.6}>
        without overwriting each other
      </Txt>
    </>
  )
}

function S1Areas() {
  const t = useLoop(4, 1300)
  const fileX = t === 0 ? 100 : t === 1 ? 100 : t === 2 ? 280 : 460
  return (
    <>
      <Headline>Three places your changes live</Headline>
      {[
        { x: 100, name: 'Working folder', sub: 'files you edit', tone: 'amber' as Tone },
        { x: 280, name: 'Staging area', sub: 'ready to save', tone: 'sky' as Tone },
        { x: 460, name: 'Repository', sub: 'saved history (.git)', tone: 'green' as Tone },
      ].map((a, i) => (
        <At key={a.name} x={a.x} y={240} delay={i * 0.1}>
          <Box w={160} h={250} tone={a.tone} />
          <text className="ill-label" y={-100} style={{ fontSize: 14 }}>
            {a.name}
          </text>
          <text className="ill-sub" y={-82}>
            {a.sub}
          </text>
        </At>
      ))}
      <Mover x={fileX} y={t === 3 ? 250 : 230} show={t < 3}>
        <FileIcon tone={t === 0 ? 'slate' : t === 1 ? 'rose' : 'sky'} title={t === 1 ? 'app.py (modified)' : 'app.py'} />
      </Mover>
      <At x={460} y={250} show={t === 3}>
        <g>
          <circle r={16} fill="var(--green)" stroke="var(--ink)" strokeWidth={2.5} />
          <text className="ill-mono" y={40} textAnchor="middle" style={{ fontSize: 11.5 }}>
            commit a1b2c3d
          </text>
        </g>
      </At>
      <Txt x={190} y={395} anchor="middle" cls="ill-mono" size={12.5} show={t >= 2}>
        git add app.py
      </Txt>
      <Txt x={370} y={395} anchor="middle" cls="ill-mono" size={12.5} show={t >= 3}>
        git commit -m "..."
      </Txt>
    </>
  )
}

function S2Commit() {
  const nodes: GNode[] = [
    { id: 'a', x: 90, y: 330, label: '9f8e7d6', delay: 0 },
    { id: 'b', x: 220, y: 330, parents: ['a'], label: '4c5d6e7', delay: 0.2 },
    { id: 'c', x: 350, y: 330, parents: ['b'], label: 'a1b2c3d', tone: 'green', delay: 0.4 },
  ]
  return (
    <>
      <Headline>A commit is a snapshot with an ID</Headline>
      <At x={150} y={80}>
        <Card w={300} title="commit a1b2c3d" tone="green" lines={['Author:  Joel <joel@mail.com>', 'Date:    Oct 24 2026 10:42', 'Parent:  4c5d6e7', '', '    Add shopping cart page']} />
      </At>
      <Graph nodes={nodes} pointers={[{ name: 'main', at: 'c', tone: 'violet' }]} />
      <Txt x={150} y={300} anchor="middle" cls="ill-sub" delay={0.6}>
        each commit points to its parent
      </Txt>
    </>
  )
}

const MAIN3: GNode[] = [
  { id: 'm1', x: 70, y: 300, label: 'm1' },
  { id: 'm2', x: 170, y: 300, parents: ['m1'], label: 'm2' },
  { id: 'm3', x: 270, y: 300, parents: ['m2'], label: 'm3' },
]

function S3Branch() {
  const t = useLoop(2, 1800)
  return (
    <>
      <Headline>A branch is just a movable label</Headline>
      <Graph
        nodes={MAIN3}
        pointers={[
          { name: 'main', at: 'm3', tone: 'violet', head: t === 0 },
          ...(t === 1 ? [{ name: 'feature/login', at: 'm3', tone: 'amber' as Tone, above: true, head: true }] : []),
        ]}
      />
      <At x={280} y={120}>
        <Tag text={t === 0 ? '$ git branch → * main' : '$ git switch -c feature/login'} mono tone="slate" w={300} />
      </At>
      <Txt x={280} y={420} anchor="middle" cls="ill-sub">
        HEAD = "the branch you are on right now"
      </Txt>
    </>
  )
}

function S4Diverge() {
  const t = useLoop(4, 1100)
  const nodes: GNode[] = [
    ...MAIN3,
    ...(t >= 1 ? [{ id: 'f1', x: 370, y: 180, parents: ['m3'], label: 'f1', tone: 'amber' as Tone }] : []),
    ...(t >= 2 ? [{ id: 'f2', x: 470, y: 180, parents: ['f1'], label: 'f2', tone: 'amber' as Tone }] : []),
    ...(t >= 3 ? [{ id: 'm4', x: 370, y: 300, parents: ['m3'], label: 'm4' }] : []),
  ]
  return (
    <>
      <Headline>Work on a branch without touching main</Headline>
      <Graph
        nodes={nodes}
        pointers={[
          { name: 'main', at: t >= 3 ? 'm4' : 'm3', tone: 'violet' },
          { name: 'feature/login', at: t >= 2 ? 'f2' : t >= 1 ? 'f1' : 'm3', tone: 'amber', above: true },
        ]}
      />
      <Txt x={280} y={420} anchor="middle" cls="ill-sub">
        your teammate's commit m4 lands on main meanwhile
      </Txt>
    </>
  )
}

function S5Merge() {
  const t = useLoop(2, 2000)
  const nodes: GNode[] = [
    ...MAIN3,
    { id: 'f1', x: 370, y: 180, parents: ['m3'], label: 'f1', tone: 'amber' },
    { id: 'f2', x: 470, y: 180, parents: ['f1'], label: 'f2', tone: 'amber' },
    { id: 'm4', x: 370, y: 300, parents: ['m3'], label: 'm4' },
    ...(t >= 1 ? [{ id: 'mm', x: 500, y: 300, parents: ['m4', 'f2'], label: 'merge', tone: 'green' as Tone }] : []),
  ]
  return (
    <>
      <Headline>Merge: join the branch back into main</Headline>
      <At x={280} y={100}>
        <Tag text="$ git switch main && git merge feature/login" mono tone="slate" w={400} />
      </At>
      <Graph nodes={nodes} pointers={[{ name: 'main', at: t >= 1 ? 'mm' : 'm4', tone: 'violet' }]} />
      <Txt x={280} y={420} anchor="middle" cls="ill-sub" show={t >= 1}>
        a merge commit has two parents
      </Txt>
    </>
  )
}

function S6Rebase() {
  const t = useLoop(2, 2000)
  const nodes: GNode[] = [
    ...MAIN3,
    { id: 'm4', x: 370, y: 300, parents: ['m3'], label: 'm4' },
    { id: 'f1', x: 370, y: 180, parents: ['m3'], label: 'f1', tone: 'amber', ghost: t >= 1 },
    { id: 'f2', x: 470, y: 180, parents: ['f1'], label: 'f2', tone: 'amber', ghost: t >= 1 },
    ...(t >= 1
      ? [
          { id: 'f1b', x: 450, y: 300, parents: ['m4'], label: "f1'", tone: 'amber' as Tone, delay: 0.2 },
          { id: 'f2b', x: 530, y: 300, parents: ['f1b'], label: "f2'", tone: 'amber' as Tone, delay: 0.4 },
        ]
      : []),
  ]
  return (
    <>
      <Headline>Rebase: replay your commits on top</Headline>
      <At x={280} y={100}>
        <Tag text="$ git rebase main   (while on feature/login)" mono tone="slate" w={380} />
      </At>
      <Graph nodes={nodes} pointers={[{ name: 'main', at: 'm4', tone: 'violet' }, { name: 'feature', at: t >= 1 ? 'f2b' : 'f2', tone: 'amber', above: t < 1 }]} />
      <Txt x={280} y={420} anchor="middle" cls="ill-sub" show={t >= 1}>
        straight line, new commit IDs (f1', f2'). Never rebase shared branches.
      </Txt>
    </>
  )
}

function S7Conflict() {
  const t = useLoop(3, 1800)
  return (
    <>
      <Headline>Merge conflict: both changed the same line</Headline>
      <At x={40} y={80}>
        <Card w={220} title="main says" tone="violet" lines={['price = 100']} />
      </At>
      <At x={300} y={80}>
        <Card w={220} title="feature says" tone="amber" lines={['price = 120']} />
      </At>
      <At x={110} y={190} show={t >= 1}>
        <Card
          w={340}
          title="cart.py (conflict!)"
          tone="rose"
          lineH={24}
          lines={[
            { text: '<<<<<<< HEAD', tone: 'violet' },
            'price = 100',
            { text: '=======', dim: true },
            'price = 120',
            { text: '>>>>>>> feature/login', tone: 'amber' },
          ]}
        />
      </At>
      <At x={280} y={400} show={t >= 2}>
        <Tag text="you choose → edit file → git add → git commit ✓" tone="green" filled w={380} />
      </At>
    </>
  )
}

function S8Remote() {
  const t = useLoop(4, 1200)
  const up = t === 1
  const down = t === 3
  return (
    <>
      <Headline>Remotes: sharing through GitHub</Headline>
      <At x={280} y={130}>
        <Cloud title="GitHub (origin)" w={1.3} tone="violet" />
      </At>
      <At x={130} y={330}>
        <Laptop title="Your laptop" />
      </At>
      <At x={430} y={330}>
        <Laptop title="Teammate" tone="pink" />
      </At>
      <Link d="M160 270 Q200 180 230 165" dashed color="var(--border-strong)" />
      <Link d="M400 270 Q360 180 330 165" dashed color="var(--border-strong)" />
      {[0, 1].map((k) => (
        <Mover key={k} x={up ? 240 + k * 22 : 130 + k * 22} y={up ? 140 : 250}>
          <circle r={9} fill="var(--green)" stroke="var(--ink)" strokeWidth={2} />
        </Mover>
      ))}
      {[0, 1].map((k) => (
        <Mover key={`d${k}`} x={down ? 420 + k * 22 : 300 + k * 22} y={down ? 250 : 140} show={t >= 2}>
          <circle r={9} fill="var(--green)" stroke="var(--ink)" strokeWidth={2} />
        </Mover>
      ))}
      <Txt x={150} y={210} anchor="end" cls="ill-mono" size={12.5} show={up}>
        git push ↑
      </Txt>
      <Txt x={410} y={210} cls="ill-mono" size={12.5} show={down}>
        ↓ git pull
      </Txt>
      <Txt x={280} y={420} anchor="middle" cls="ill-sub">
        git clone = download the whole repo the first time
      </Txt>
    </>
  )
}

const FLOW = [
  { name: 'branch', tone: 'amber' as Tone },
  { name: 'commit + push', tone: 'amber' as Tone },
  { name: 'Pull Request', tone: 'sky' as Tone },
  { name: 'review ✓  CI ✓', tone: 'green' as Tone },
  { name: 'merge to main', tone: 'violet' as Tone },
  { name: 'deploy 🚀', tone: 'green' as Tone },
]

function S9Workflow() {
  const t = useLoop(FLOW.length + 1, 900)
  return (
    <>
      <Headline>How teams work: the pull request flow</Headline>
      {FLOW.map((f, i) => (
        <g key={f.name}>
          <At x={140 + (i % 2) * 280} y={110 + Math.floor(i / 2) * 110} show={t > i} t={bouncy}>
            <Box w={200} h={58} tone={f.tone} strong title={`${i + 1}. ${f.name}`} />
          </At>
        </g>
      ))}
      <Link d="M240 110 H320" arrow show={t > 1} />
      <Link d="M420 140 Q420 180 240 200 L240 210" arrow show={t > 2} />
      <Link d="M240 220 H320" arrow show={t > 3} />
      <Link d="M420 250 Q420 290 240 310 L240 320" arrow show={t > 4} />
      <Link d="M240 330 H320" arrow show={t > 5} />
      <Txt x={280} y={420} anchor="middle" cls="ill-sub">
        main stays always deployable
      </Txt>
    </>
  )
}

const STEPS = [S0Why, S1Areas, S2Commit, S3Branch, S4Diverge, S5Merge, S6Rebase, S7Conflict, S8Remote, S9Workflow]

function GitScene({ step }: { step: number }) {
  const Part = STEPS[step] ?? S0Why
  return (
    <Scene label="Git version control" h={440}>
      <AnimatePresence mode="wait">
        <motion.g key={step} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
          <Part />
        </motion.g>
      </AnimatePresence>
    </Scene>
  )
}

/* ------------------------------------------------------------- playground */

type Commit = { id: string; parents: string[]; lane: number; seq: number; msg: string }
type Repo = { commits: Commit[]; branches: Record<string, string>; lanes: Record<string, number>; head: string; log: string[] }

const LANE_TONES: Tone[] = ['violet', 'amber', 'teal', 'pink', 'sky']
const hex = () => Math.random().toString(16).slice(2, 9).padEnd(7, '0')

function initialRepo(): Repo {
  const id = hex()
  return { commits: [{ id, parents: [], lane: 0, seq: 0, msg: 'Initial commit' }], branches: { main: id }, lanes: { main: 0 }, head: 'main', log: [`[main (root-commit) ${id}] Initial commit`] }
}

function isAncestor(commits: Commit[], anc: string, of: string): boolean {
  const byId = Object.fromEntries(commits.map((c) => [c.id, c]))
  const stack = [of]
  const seen = new Set<string>()
  while (stack.length) {
    const cur = stack.pop()!
    if (cur === anc) return true
    if (seen.has(cur)) continue
    seen.add(cur)
    stack.push(...(byId[cur]?.parents ?? []))
  }
  return false
}

const MSGS = ['Add login page', 'Fix typo', 'Add cart API', 'Update README', 'Add tests', 'Refactor db code', 'Bump version', 'Fix price bug']

function GitSim() {
  const [repo, setRepo] = useState<Repo>(initialRepo)
  const [target, setTarget] = useState('')

  const others = Object.keys(repo.branches).filter((b) => b !== repo.head)
  const mergeFrom = others.includes(target) ? target : others[0] ?? ''

  function commit() {
    setRepo((r) => {
      if (r.commits.length >= 18) return { ...r, log: [...r.log, 'Sandbox full: press Reset.'] }
      const id = hex()
      const msg = MSGS[r.commits.length % MSGS.length]
      const c: Commit = { id, parents: [r.branches[r.head]], lane: r.lanes[r.head], seq: r.commits.length, msg }
      return { ...r, commits: [...r.commits, c], branches: { ...r.branches, [r.head]: id }, log: [...r.log, `$ git commit -m "${msg}"`, `[${r.head} ${id}] ${msg}`] }
    })
  }

  function branch() {
    setRepo((r) => {
      const n = Object.keys(r.branches).length
      if (n >= LANE_TONES.length) return { ...r, log: [...r.log, 'Max branches reached in this sandbox.'] }
      const name = ['main', 'feature/login', 'feature/cart', 'fix/price', 'feature/ui'][n]
      return {
        ...r,
        branches: { ...r.branches, [name]: r.branches[r.head] },
        lanes: { ...r.lanes, [name]: n },
        head: name,
        log: [...r.log, `$ git switch -c ${name}`, `Switched to a new branch '${name}'`],
      }
    })
  }

  function switchTo(name: string) {
    setRepo((r) => ({ ...r, head: name, log: [...r.log, `$ git switch ${name}`, `Switched to branch '${name}'`] }))
  }

  function merge() {
    const src = mergeFrom
    if (!src) return
    setRepo((r) => {
      const ours = r.branches[r.head]
      const theirs = r.branches[src]
      const log = [...r.log, `$ git merge ${src}`]
      if (isAncestor(r.commits, theirs, ours)) return { ...r, log: [...log, 'Already up to date.'] }
      if (isAncestor(r.commits, ours, theirs)) return { ...r, branches: { ...r.branches, [r.head]: theirs }, log: [...log, `Updating ${ours}..${theirs}`, 'Fast-forward (no merge commit needed)'] }
      const id = hex()
      const c: Commit = { id, parents: [ours, theirs], lane: r.lanes[r.head], seq: r.commits.length, msg: `Merge branch '${src}'` }
      return { ...r, commits: [...r.commits, c], branches: { ...r.branches, [r.head]: id }, log: [...log, `Merge made by the 'ort' strategy. [${id}]`] }
    })
  }

  const X = (c: Commit) => 50 + c.seq * 58
  const Y = (lane: number) => 50 + lane * 62
  const width = Math.max(560, 50 + repo.commits.length * 58 + 120)
  const height = 50 + Object.keys(repo.lanes).length * 62 + 20
  const byId = Object.fromEntries(repo.commits.map((c) => [c.id, c]))

  return (
    <div className="card stage">
      <div className="toolbar">
        <button className="btn primary" onClick={commit}>
          <GitCommitHorizontal size={16} /> commit
        </button>
        <button className="btn" onClick={branch}>
          <GitBranch size={16} /> new branch
        </button>
        <span className="label">switch to</span>
        <div className="seg" role="group" aria-label="Switch branch">
          {Object.keys(repo.branches).map((b) => (
            <button key={b} aria-pressed={repo.head === b} onClick={() => switchTo(b)}>
              {b}
            </button>
          ))}
        </div>
        {others.length > 0 && (
          <>
            <select className="text-input" value={mergeFrom} onChange={(e) => setTarget(e.target.value)} aria-label="Branch to merge" style={{ height: 40 }}>
              {others.map((b) => (
                <option key={b}>{b}</option>
              ))}
            </select>
            <button className="btn" onClick={merge}>
              <GitMerge size={16} /> merge into {repo.head}
            </button>
          </>
        )}
        <button className="btn" onClick={() => setRepo(initialRepo())} style={{ marginLeft: 'auto' }}>
          <RotateCcw size={16} /> Reset
        </button>
      </div>
      <div style={{ overflowX: 'auto', borderRadius: 16, border: '1.5px solid var(--border)', background: 'var(--panel-2)' }}>
        <svg width={width} height={height} role="img" aria-label="Commit graph" style={{ display: 'block' }}>
          {repo.commits.flatMap((c) =>
            c.parents.map((p) => {
              const a = byId[p]
              const x1 = X(a)
              const y1 = Y(a.lane)
              const x2 = X(c)
              const y2 = Y(c.lane)
              const d = y1 === y2 ? `M${x1} ${y1} H${x2}` : `M${x1} ${y1} C${x1 + 30} ${y1} ${x2 - 30} ${y2} ${x2} ${y2}`
              return <motion.path key={p + c.id} d={d} fill="none" stroke="var(--ink)" strokeWidth={3} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.4 }} />
            }),
          )}
          {repo.commits.map((c) => (
            <motion.g key={c.id} initial={{ scale: 0, x: X(c), y: Y(c.lane) }} animate={{ scale: 1, x: X(c), y: Y(c.lane) }} transition={bouncy}>
              <title>{`${c.id} ${c.msg}`}</title>
              <circle r={c.parents.length > 1 ? 13 : 11} fill={`var(--${LANE_TONES[c.lane]})`} stroke="var(--ink)" strokeWidth={2.5} />
              {c.parents.length > 1 && <circle r={5} fill="var(--paper)" stroke="var(--ink)" strokeWidth={1.5} />}
            </motion.g>
          ))}
          {Object.entries(repo.branches).map(([name, at]) => {
            const c = byId[at]
            const stacked = Object.entries(repo.branches).filter(([, a]) => a === at).map(([n]) => n)
            const idx = stacked.indexOf(name)
            return (
              <motion.g key={name} initial={false} animate={{ x: X(c) + 22, y: Y(c.lane) - 12 - 26 * idx }} transition={bouncy}>
                <rect x={0} y={-12} width={name.length * 7.4 + (repo.head === name ? 70 : 18)} height={24} rx={10} fill={`color-mix(in srgb, var(--${LANE_TONES[repo.lanes[name]]}) ${repo.head === name ? 70 : 30}%, var(--paper))`} stroke="var(--ink)" strokeWidth={2} />
                <text x={9} y={4} style={{ fontFamily: 'var(--mono)', fontSize: 11.5, fontWeight: 700, fill: '#1e2742' }}>
                  {repo.head === name ? `HEAD → ${name}` : name}
                </text>
              </motion.g>
            )
          })}
        </svg>
      </div>
      <div className="terminal">
        <header>
          <i />
          <i />
          <i />
          <span style={{ marginLeft: 6 }}>terminal output</span>
        </header>
        <div className="body" style={{ height: 150, display: 'flex', flexDirection: 'column-reverse' }}>
          <div>
            {repo.log.slice(-12).map((l, i) => (
              <div key={i} className={l.startsWith('$') ? 'cmdline' : l.includes('Fast-forward') || l.includes('Merge made') ? 'ok' : ''}>
                {l}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="callout tone-sky">
        <strong>Try this</strong>
        Commit twice on main. Make a new branch and commit twice. Switch to main, commit once, then merge the feature branch: you
        get a merge commit with two parents. Now try merging when main has no new commits: that's a fast-forward.
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ lesson */

const lesson: Lesson = {
  id: 'git',
  title: 'Git version control',
  track: '',
  tone: 'pink',
  icon: GitBranch,
  summary: 'Track every change and work as a team: commits, staging, branches, merge vs rebase, conflicts, GitHub remotes, and the pull request workflow.',
  minutes: 15,
  story: {
    Scene: GitScene,
    sections: [
      {
        title: 'Why version control?',
        body: (
          <>
            <p>
              <strong>Git</strong> records the history of your project as a series of save points. You can see who changed what and
              why, go back to any earlier version, and many people can work on the same code without overwriting each other.
            </p>
            <p>
              Every company uses it. In DevOps, Git is also the <strong>starting point of every pipeline</strong>: a push to Git
              triggers build, test and deploy. Even infrastructure (Terraform, Kubernetes files) lives in Git.
            </p>
            <Tip>Google Docs version history, but for a whole folder of code, and much more powerful.</Tip>
          </>
        ),
      },
      {
        title: 'Working folder, staging, repository',
        body: (
          <>
            <p>Your changes move through three places:</p>
            <ol>
              <li>
                <strong>Working directory</strong>: the files you edit. Git sees them as "modified".
              </li>
              <li>
                <strong>Staging area</strong>: changes you've chosen for the next save, with <code>git add</code>.
              </li>
              <li>
                <strong>Repository</strong> (the hidden <code>.git</code> folder): permanent history, with{' '}
                <code>git commit</code>.
              </li>
            </ol>
            <Shell>{`$ git status                 # what changed?
$ git diff                   # show the exact lines
$ git add app.py             # stage it
$ git commit -m "Add cart page"`}</Shell>
          </>
        ),
      },
      {
        title: 'What a commit is',
        body: (
          <>
            <p>
              A <strong>commit</strong> is a snapshot of the whole project at one moment, plus: the author, the date, a message
              explaining <em>why</em>, and a pointer to its <strong>parent</strong> commit. Following parents backwards gives you the
              full history.
            </p>
            <p>
              Each commit has a unique ID (a <strong>hash</strong>) like <code>a1b2c3d</code>, calculated from its contents. Change
              anything and the ID changes.
            </p>
            <Shell>{`$ git log --oneline
a1b2c3d Add shopping cart page
4c5d6e7 Fix login redirect
9f8e7d6 Initial commit`}</Shell>
          </>
        ),
      },
      {
        title: 'Branches',
        body: (
          <>
            <p>
              A <strong>branch</strong> is just a movable label pointing at a commit. The default branch is usually{' '}
              <code>main</code>. When you commit, the current branch's label moves forward to the new commit.
            </p>
            <p>
              <strong>HEAD</strong> means "where you are now", usually the branch you have checked out. Create and switch to a new
              branch with:
            </p>
            <Shell>{`$ git switch -c feature/login     # older: git checkout -b
$ git branch                      # list branches, * = current`}</Shell>
          </>
        ),
      },
      {
        title: 'Working on a branch',
        body: (
          <>
            <p>
              Commits you make now only move <code>feature/login</code>. <code>main</code> stays untouched, so it keeps working
              while your feature is half-built.
            </p>
            <p>
              Meanwhile teammates keep adding commits to main. The history <strong>diverges</strong> into two lines. This is normal;
              the next step brings them together.
            </p>
          </>
        ),
      },
      {
        title: 'Merge',
        body: (
          <>
            <p>
              <code>git merge</code> combines another branch into the current one. If both sides have new commits, Git creates a{' '}
              <strong>merge commit</strong> with two parents.
            </p>
            <p>
              If main had no new commits, Git just moves the main label forward. That's called a <strong>fast-forward</strong>, and no
              merge commit is needed.
            </p>
          </>
        ),
      },
      {
        title: 'Rebase',
        body: (
          <>
            <p>
              <code>git rebase main</code> takes your branch's commits and <strong>replays them on top of</strong> the latest main,
              as if you'd started from there. The history becomes one straight line, which is easier to read.
            </p>
            <p>
              Because the commits are recreated, they get <strong>new IDs</strong>. That rewrites history, so the golden rule is:{' '}
              <strong>never rebase a branch others are using</strong>. Rebase your own local branches only.
            </p>
            <Tip kind="pro">"Merge vs rebase?" Merge keeps true history with merge commits and is safe on shared branches. Rebase makes linear history but rewrites commits.</Tip>
          </>
        ),
      },
      {
        title: 'Merge conflicts',
        body: (
          <>
            <p>
              If both branches changed the <strong>same lines</strong> of the same file, Git can't know which version is right. It
              stops and marks the file:
            </p>
            <Shell>{`<<<<<<< HEAD
price = 100
=======
price = 120
>>>>>>> feature/login`}</Shell>
            <p>
              You edit the file to the correct result, delete the markers, then <code>git add</code> it and{' '}
              <code>git commit</code>. Conflicts are normal and not scary; small, frequent merges keep them small.
            </p>
          </>
        ),
      },
      {
        title: 'Remotes: GitHub and friends',
        body: (
          <>
            <p>
              A <strong>remote</strong> is a copy of the repository on a server, like GitHub, GitLab or Bitbucket. The default
              remote is called <code>origin</code>.
            </p>
            <Shell>{`$ git clone https://github.com/you/shop.git   # download it
$ git push origin feature/login               # upload your commits
$ git pull                                    # download + merge others' commits
$ git fetch                                   # download only, don't merge`}</Shell>
            <Tip kind="warn">Never commit passwords, API keys or <code>.env</code> files. List them in <code>.gitignore</code>. Bots scan GitHub for leaked AWS keys within minutes.</Tip>
          </>
        ),
      },
      {
        title: 'The pull request workflow',
        body: (
          <>
            <p>This is how almost every team works:</p>
            <ol>
              <li>Create a branch for your change.</li>
              <li>Commit and push it.</li>
              <li>
                Open a <strong>Pull Request</strong> (PR, called Merge Request on GitLab) asking to merge into main.
              </li>
              <li>
                Teammates <strong>review</strong> the code, and the <strong>CI pipeline</strong> automatically runs tests.
              </li>
              <li>When both pass, it's merged into main.</li>
              <li>Merging to main triggers the deploy (CD).</li>
            </ol>
            <p>
              Main is <strong>protected</strong>: nobody pushes to it directly. You'll see this whole flow animated in the CI/CD
              lesson later.
            </p>
          </>
        ),
      },
    ],
  },
  Playground: GitSim,
  playgroundIntro: 'A live commit graph. Commit, branch, switch and merge, and watch the branch labels move.',
  terms: [
    { term: 'Repository (repo)', def: 'A project tracked by Git, including its full history (.git folder).' },
    { term: 'Commit', def: 'A saved snapshot with an ID, author, message and parent.' },
    { term: 'Staging area', def: 'Changes selected with git add for the next commit.' },
    { term: 'Branch', def: 'A movable label pointing to a commit; a separate line of work.' },
    { term: 'HEAD', def: 'Where you currently are, usually the checked-out branch.' },
    { term: 'Merge', def: 'Combine another branch into the current one (may create a merge commit).' },
    { term: 'Fast-forward', def: 'A merge where the label simply moves forward; no merge commit.' },
    { term: 'Rebase', def: 'Replay commits on top of another branch, rewriting their IDs.' },
    { term: 'Conflict', def: 'Both sides changed the same lines; a human must choose.' },
    { term: 'Remote / origin', def: 'A copy of the repo on a server like GitHub.' },
    { term: 'Pull request', def: 'A request to merge a branch, with review and CI checks.' },
    { term: '.gitignore', def: 'File listing paths Git should never track (secrets, build output).' },
  ],
  quiz: [
    {
      q: 'What does `git add` do?',
      options: ['Saves a commit', 'Stages changes for the next commit', 'Uploads to GitHub', 'Creates a branch'],
      answer: 1,
      why: 'add moves changes to the staging area. commit saves them; push uploads them.',
    },
    {
      q: 'What is a branch, really?',
      options: ['A full copy of the project folder', 'A movable pointer to a commit', 'A GitHub feature only', 'A backup'],
      answer: 1,
      why: 'Branches are cheap labels. That is why creating one is instant.',
    },
    {
      q: 'Why should you not rebase a branch your teammates are using?',
      options: ['It is slow', 'It rewrites commit IDs, breaking their copies', 'It deletes the branch', 'It is not allowed by Git'],
      answer: 1,
      why: 'Rebased commits are new commits. Others still have the old ones, which causes painful duplicates and conflicts.',
    },
    {
      q: 'You accidentally committed an AWS key and pushed it. What first?',
      options: ['Delete the file and commit again', 'Revoke/rotate the key in AWS immediately', 'Rename the repo', 'Nothing'],
      answer: 1,
      why: 'The key is in history and may already be scraped. Rotate it first, then clean history and add the file to .gitignore.',
    },
  ],
  interview: [
    {
      q: 'git merge vs git rebase?',
      a: 'Merge combines branches and keeps the real history, adding a merge commit when both diverged; safe for shared branches. Rebase replays your commits onto another base for a linear history, but rewrites commit IDs, so use it only on private branches.',
    },
    {
      q: 'git pull vs git fetch?',
      a: 'fetch downloads new commits from the remote without changing your branch. pull = fetch + merge (or rebase with --rebase) into your current branch.',
    },
    {
      q: 'How do you undo a bad commit that is already pushed to main?',
      a: 'git revert <sha> creates a new commit that undoes it, which is safe for shared history. Avoid git reset --hard + force push on shared branches because it rewrites history for everyone.',
    },
    {
      q: 'Describe your branching workflow.',
      a: 'Feature branches off main, small commits, push and open a PR, code review plus CI checks required, squash or merge into a protected main, and main deploys automatically. Hotfixes follow the same flow with high priority.',
    },
  ],
  commands: [
    { cmd: 'git status / git diff', note: 'What changed?' },
    { cmd: 'git add -A && git commit -m "msg"', note: 'Stage everything and commit' },
    { cmd: 'git switch -c feature/x', note: 'Create and switch to a branch' },
    { cmd: 'git log --oneline --graph --all', note: 'See the commit graph in the terminal' },
    { cmd: 'git pull --rebase', note: 'Update your branch with a linear history' },
    { cmd: 'git revert <sha>', note: 'Safely undo a pushed commit' },
  ],
}

export default lesson
