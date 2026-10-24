/**
 * Friendly flat illustrations for the story scenes.
 * Every piece is drawn around (0, 0) so it can be placed and animated with <At>.
 */
import { AnimatePresence, motion, type Transition } from 'motion/react'
import type { ReactNode } from 'react'
import type { Tone } from './Diagram'
import { bouncy, spring, travel } from '../lib/motion'


const soft = (tone: Tone, pct = 30) => `color-mix(in srgb, var(--${tone}) ${pct}%, var(--paper))`
const solid = (tone: Tone) => `var(--${tone})`

/* ---------------------------------------------------------------- layout */

/** Scene canvas: a paper card with a dot grid. */
export function Scene({ children, h = 440, label }: { children: ReactNode; h?: number; label: string }) {
  return (
    <svg viewBox={`0 0 560 ${h}`} role="img" aria-label={label}>
      <defs>
        <pattern id="dots" width="22" height="22" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.3" fill="var(--border-strong)" />
        </pattern>
        <marker id="head" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M1 1L8 5L1 9" fill="none" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </marker>
      </defs>
      <rect width="560" height={h} rx="16" className="scene-bg" />
      <rect width="560" height={h} rx="16" fill="url(#dots)" opacity="0.6" />
      {children}
    </svg>
  )
}

/** Place a child at (x, y). Pops in with a spring when `show` turns on, and glides when x/y change. */
export function At({
  x,
  y,
  show = true,
  delay = 0,
  scale = 1,
  children,
  t = spring,
}: {
  x: number
  y: number
  show?: boolean
  delay?: number
  scale?: number
  children: ReactNode
  t?: Transition
}) {
  return (
    <AnimatePresence>
      {show && (
        <motion.g
          initial={{ x, y, scale: 0, opacity: 0 }}
          animate={{ x, y, scale, opacity: 1 }}
          exit={{ scale: 0, opacity: 0, transition: { duration: 0.2 } }}
          transition={{ ...t, delay }}
        >
          {children}
        </motion.g>
      )}
    </AnimatePresence>
  )
}

/** Something that travels: glides to (x, y) with a springy overshoot. */
export function Mover({ x, y, children, show = true, t = travel }: { x: number; y: number; children: ReactNode; show?: boolean; t?: Transition }) {
  return (
    <motion.g initial={false} animate={{ x, y, opacity: show ? 1 : 0, scale: show ? 1 : 0.4 }} transition={t}>
      {children}
    </motion.g>
  )
}

/** Fade-in text block. */
export function Txt({
  x,
  y,
  children,
  cls = 'ill-text',
  anchor = 'start',
  show = true,
  delay = 0,
  fill,
  size,
  weight,
}: {
  x: number
  y: number
  children: ReactNode
  cls?: string
  anchor?: 'start' | 'middle' | 'end'
  show?: boolean
  delay?: number
  fill?: string
  size?: number
  weight?: number
}) {
  return (
    <AnimatePresence>
      {show && (
        <motion.text
          className={cls}
          x={x}
          y={y}
          textAnchor={anchor}
          // Inline so it wins over the text-anchor set by the CSS class.
          style={{ fill, fontSize: size, fontWeight: weight, textAnchor: anchor }}
          // motion's y is a transform offset added to the y attribute, so animate 6 → 0.
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, delay }}
        >
          {children}
        </motion.text>
      )}
    </AnimatePresence>
  )
}

/** A line that draws itself. */
export function Link({
  d,
  show = true,
  dashed,
  arrow,
  color = 'var(--ink)',
  width = 2.5,
  delay = 0,
  flow,
}: {
  d: string
  show?: boolean
  dashed?: boolean
  arrow?: boolean
  color?: string
  width?: number
  delay?: number
  flow?: boolean
}) {
  return (
    <AnimatePresence>
      {show && (
        <motion.path
          d={d}
          fill="none"
          stroke={color}
          strokeWidth={width}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={dashed || flow ? '3 9' : undefined}
          markerEnd={arrow ? 'url(#head)' : undefined}
          className={flow ? 'wire flow' : undefined}
          style={flow ? { stroke: color } : undefined}
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, delay, ease: 'easeOut' }}
        />
      )}
    </AnimatePresence>
  )
}

function Label({ y, title, sub }: { y: number; title?: string; sub?: string }) {
  return (
    <>
      {title && (
        <text className="ill-label" y={y}>
          {title}
        </text>
      )}
      {sub && (
        <text className="ill-sub" y={y + (title ? 17 : 0)}>
          {sub}
        </text>
      )}
    </>
  )
}

type Base = { tone?: Tone; title?: string; sub?: string; active?: boolean }

/** Wobble wrapper used when something is "active". */
function Alive({ active, children }: { active?: boolean; children: ReactNode }) {
  return (
    <motion.g animate={active ? { y: [0, -5, 0] } : { y: 0 }} transition={active ? { duration: 0.9, repeat: Infinity, ease: 'easeInOut' } : spring}>
      {children}
    </motion.g>
  )
}

/* ---------------------------------------------------------------- devices */

export function Laptop({ tone = 'sky', title, sub, active, screen }: Base & { screen?: ReactNode }) {
  return (
    <g>
      <Alive active={active}>
        <rect className="ill-outline" x={-44} y={-40} width={88} height={58} rx={9} style={{ fill: soft(tone, 45) }} />
        <rect className="ill-outline" x={-36} y={-32} width={72} height={42} rx={5} style={{ fill: 'var(--paper)', strokeWidth: 2 }} />
        {screen ?? (
          <>
            <rect x={-28} y={-24} width={30} height={5} rx={2.5} fill={solid(tone)} />
            <rect x={-28} y={-15} width={48} height={4} rx={2} fill="var(--border-strong)" />
            <rect x={-28} y={-7} width={40} height={4} rx={2} fill="var(--border-strong)" />
          </>
        )}
        <path className="ill-outline" d="M-56 18 H56 L50 30 H-50 Z" style={{ fill: soft(tone, 70) }} />
      </Alive>
      <Label y={52} title={title} sub={sub} />
    </g>
  )
}

export function Phone({ tone = 'pink', title, sub, active }: Base) {
  return (
    <g>
      <Alive active={active}>
        <rect className="ill-outline" x={-20} y={-36} width={40} height={68} rx={9} style={{ fill: soft(tone, 50) }} />
        <rect x={-13} y={-27} width={26} height={44} rx={4} fill="var(--paper)" stroke="var(--ink)" strokeWidth={1.5} />
        <circle cx={0} cy={24} r={2.5} fill="var(--ink)" />
      </Alive>
      <Label y={52} title={title} sub={sub} />
    </g>
  )
}

export function Server({ tone = 'violet', title, sub, active, down }: Base & { down?: boolean }) {
  return (
    <g>
      <Alive active={active}>
        <rect className="ill-outline" x={-36} y={-50} width={72} height={98} rx={12} style={{ fill: down ? soft('rose', 30) : soft(tone, 45) }} />
        {[-40, -12, 16].map((sy, i) => (
          <g key={sy}>
            <rect x={-27} y={sy} width={54} height={22} rx={6} fill="var(--paper)" stroke="var(--ink)" strokeWidth={2} />
            <rect x={-20} y={sy + 9} width={22} height={4} rx={2} fill="var(--border-strong)" />
            <circle
              cx={17}
              cy={sy + 11}
              r={3.5}
              fill={down ? 'var(--rose)' : 'var(--green)'}
              className={down ? undefined : 'blink'}
              style={{ animationDelay: `${i * 0.4}s` }}
            />
          </g>
        ))}
      </Alive>
      <Label y={68} title={title} sub={sub} />
    </g>
  )
}

export function Router({ tone = 'teal', title, sub, active }: Base) {
  return (
    <g>
      <Alive active={active}>
        <path className="ill-outline" d="M-26 -12 L-36 -42 M26 -12 L36 -42" fill="none" />
        <circle className="ill-outline" cx={-36} cy={-44} r={4} style={{ fill: solid(tone) }} />
        <circle className="ill-outline" cx={36} cy={-44} r={4} style={{ fill: solid(tone) }} />
        <rect className="ill-outline" x={-46} y={-14} width={92} height={34} rx={12} style={{ fill: soft(tone, 45) }} />
        {[-24, -10, 4].map((cx, i) => (
          <circle key={cx} cx={cx} cy={3} r={3.5} fill="var(--green)" className="blink" style={{ animationDelay: `${i * 0.3}s` }} />
        ))}
        <rect x={16} y={-1} width={20} height={8} rx={3} fill="var(--paper)" stroke="var(--ink)" strokeWidth={1.5} />
      </Alive>
      <Label y={42} title={title} sub={sub} />
    </g>
  )
}

export function Cloud({ tone = 'sky', title, sub, w = 1 }: Base & { w?: number }) {
  return (
    <g>
      <g transform={`scale(${w} 1)`}>
        <path
          className="ill-outline"
          d="M-58 26 C-86 26 -86 -10 -58 -12 C-56 -40 -20 -50 -4 -28 C8 -52 50 -46 52 -14 C80 -14 84 26 56 26 Z"
          style={{ fill: soft(tone, 25), strokeWidth: 2.5 / w }}
        />
      </g>
      <Label y={4} title={title} sub={sub} />
    </g>
  )
}

export function Database({ tone = 'amber', title, sub, active }: Base) {
  return (
    <g>
      <Alive active={active}>
        <path className="ill-outline" d="M-34 -28 V28 A34 11 0 0 0 34 28 V-28" style={{ fill: soft(tone, 45) }} />
        <path className="ill-outline" d="M-34 0 A34 11 0 0 0 34 0" fill="none" />
        <ellipse className="ill-outline" cx={0} cy={-28} rx={34} ry={11} style={{ fill: soft(tone, 75) }} />
      </Alive>
      <Label y={60} title={title} sub={sub} />
    </g>
  )
}

export function Person({ tone = 'pink', title, sub, active }: Base) {
  return (
    <g>
      <Alive active={active}>
        <path className="ill-outline" d="M-26 34 C-26 8 26 8 26 34 Z" style={{ fill: soft(tone, 55) }} />
        <circle className="ill-outline" cx={0} cy={-8} r={16} style={{ fill: 'var(--paper)' }} />
        <circle cx={-5} cy={-9} r={2} fill="var(--ink)" />
        <circle cx={5} cy={-9} r={2} fill="var(--ink)" />
        <path d="M-5 -2 Q0 3 5 -2" fill="none" stroke="var(--ink)" strokeWidth={2} strokeLinecap="round" />
      </Alive>
      <Label y={54} title={title} sub={sub} />
    </g>
  )
}

/* ---------------------------------------------------------------- objects */

/** A packet: a little envelope, optionally numbered. */
export function Envelope({ tone = 'amber', n, label, scale = 1 }: { tone?: Tone; n?: number | string; label?: string; scale?: number }) {
  return (
    <g transform={`scale(${scale})`}>
      <rect className="ill-outline" x={-18} y={-12} width={36} height={24} rx={5} style={{ fill: solid(tone), strokeWidth: 2.2 }} />
      <path d="M-16 -9 L0 3 L16 -9" fill="none" stroke="var(--ink)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {n !== undefined && (
        <g transform="translate(16 -12)">
          <circle r={9} fill="var(--paper)" stroke="var(--ink)" strokeWidth={2} />
          <text y={4} textAnchor="middle" style={{ fontFamily: 'var(--display)', fontWeight: 900, fontSize: 11, fill: '#1e2742' }}>
            {n}
          </text>
        </g>
      )}
      {label && (
        <text className="ill-sub" y={28}>
          {label}
        </text>
      )}
    </g>
  )
}

/** Speech bubble whose tail points at (0, 0). */
export function Bubble({ text, tone = 'amber', side = 'up', w }: { text: string; tone?: Tone; side?: 'up' | 'down'; w?: number }) {
  const width = w ?? Math.max(60, text.length * 7.4 + 26)
  const h = 32
  const y = side === 'up' ? -h - 12 : 12
  const tail = side === 'up' ? `M-8 ${-13} L0 -2 L8 ${-13}` : `M-8 13 L0 2 L8 13`
  return (
    <g>
      <rect className="ill-outline" x={-width / 2} y={y} width={width} height={h} rx={14} style={{ fill: soft(tone, 40), strokeWidth: 2 }} />
      <path d={tail} style={{ fill: soft(tone, 40) }} stroke="var(--ink)" strokeWidth={2} strokeLinejoin="round" />
      <rect x={-9} y={side === 'up' ? -15 : 11} width={18} height={4} style={{ fill: soft(tone, 40) }} />
      <text className="bubble-text" x={0} y={y + 21} textAnchor="middle">
        {text}
      </text>
    </g>
  )
}

/** A rounded tag / pill with text. Centered on (0, 0). */
export function Tag({ text, tone = 'slate', mono, w, h = 30, filled, size }: { text: string; tone?: Tone; mono?: boolean; w?: number; h?: number; filled?: boolean; size?: number }) {
  const width = w ?? Math.max(44, text.length * (mono ? 8.2 : 7.6) + 24)
  return (
    <g>
      <rect className="ill-outline" x={-width / 2} y={-h / 2} width={width} height={h} rx={h / 2.4} style={{ fill: filled ? solid(tone) : soft(tone, 30), strokeWidth: 2 }} />
      <text
        x={0}
        y={(size ?? 13) * 0.36}
        textAnchor="middle"
        style={{
          fontFamily: mono ? 'var(--mono)' : 'var(--display)',
          fontWeight: mono ? 500 : 800,
          fontSize: size ?? 13,
          fill: '#1e2742',
        }}
      >
        {text}
      </text>
    </g>
  )
}

/** A card with a title row and monospace lines. Top-left anchored at (0, 0). */
export function Card({
  w,
  lines,
  title,
  tone = 'slate',
  highlight = -1,
  lineH = 22,
}: {
  w: number
  lines: (string | { text: string; tone?: Tone; dim?: boolean })[]
  title?: string
  tone?: Tone
  highlight?: number
  lineH?: number
}) {
  const top = title ? 34 : 12
  const h = top + lines.length * lineH + 10
  return (
    <g>
      <rect className="ill-outline" x={0} y={0} width={w} height={h} rx={14} style={{ fill: 'var(--paper)', strokeWidth: 2 }} />
      {title && (
        <>
          <path d={`M2 24 V14 A12 12 0 0 1 14 2 H${w - 14} A12 12 0 0 1 ${w - 2} 14 V24 Z`} style={{ fill: soft(tone, 45) }} />
          <line x1={0} y1={24} x2={w} y2={24} stroke="var(--ink)" strokeWidth={2} />
          <text x={12} y={17} style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 12.5, fill: '#1e2742' }}>
            {title}
          </text>
        </>
      )}
      {lines.map((l, i) => {
        const line = typeof l === 'string' ? { text: l } : l
        const y = top + i * lineH
        return (
          <g key={i}>
            {i === highlight && <rect x={6} y={y - 1} width={w - 12} height={lineH - 2} rx={6} style={{ fill: soft('amber', 45) }} />}
            <text
              x={12}
              y={y + lineH / 2 + 3}
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 12.5,
                fill: line.tone ? `color-mix(in srgb, var(--${line.tone}) 75%, #1e2742)` : '#1e2742',
                opacity: line.dim ? 0.45 : 1,
              }}
            >
              {line.text}
            </text>
          </g>
        )
      })}
    </g>
  )
}

export function Folder({ tone = 'amber', title, active, open }: Base & { open?: boolean }) {
  return (
    <g>
      <Alive active={active}>
        <path className="ill-outline" d="M-22 -14 H-6 L-1 -9 H22 V14 H-22 Z" style={{ fill: soft(tone, open ? 90 : 60), strokeWidth: 2 }} />
        <path className="ill-outline" d="M-22 -4 H22" style={{ strokeWidth: 1.6 }} />
      </Alive>
      {title && (
        <text className="ill-mono" y={32} textAnchor="middle" style={{ fontSize: 12, fontWeight: active ? 700 : 400 }}>
          {title}
        </text>
      )}
    </g>
  )
}

export function FileIcon({ tone = 'sky', title }: Base) {
  return (
    <g>
      <path className="ill-outline" d="M-12 -16 H5 L12 -9 V16 H-12 Z" style={{ fill: soft(tone, 35), strokeWidth: 2 }} />
      <path d="M5 -16 V-9 H12" fill="none" stroke="var(--ink)" strokeWidth={2} strokeLinejoin="round" />
      {title && (
        <text className="ill-mono" y={32} textAnchor="middle" style={{ fontSize: 12 }}>
          {title}
        </text>
      )}
    </g>
  )
}

export function Lock({ tone = 'green', open, scale = 1 }: { tone?: Tone; open?: boolean; scale?: number }) {
  return (
    <g transform={`scale(${scale})`}>
      <motion.path
        className="ill-outline"
        fill="none"
        animate={{ d: open ? 'M-9 -4 V-14 A9 9 0 0 1 9 -14 V-18' : 'M-9 -4 V-14 A9 9 0 0 1 9 -14 V-4' }}
        transition={bouncy}
      />
      <rect className="ill-outline" x={-15} y={-5} width={30} height={24} rx={6} style={{ fill: solid(tone) }} />
      <circle cx={0} cy={6} r={3} fill="var(--ink)" />
    </g>
  )
}

export function Spy({ title }: { title?: string }) {
  return (
    <g>
      <path className="ill-outline" d="M-26 34 C-26 8 26 8 26 34 Z" style={{ fill: '#3b3f55' }} />
      <circle className="ill-outline" cx={0} cy={-8} r={16} style={{ fill: 'var(--paper)' }} />
      <path className="ill-outline" d="M-24 -14 H24 M-14 -14 L-12 -30 H12 L14 -14" style={{ fill: '#3b3f55' }} />
      <rect x={-13} y={-11} width={10} height={6} rx={3} fill="var(--ink)" />
      <rect x={3} y={-11} width={10} height={6} rx={3} fill="var(--ink)" />
      {title && <Label y={54} title={title} />}
    </g>
  )
}

/** Generic rounded box with a label in the middle. Centered on (0, 0). */
export function Box({ w, h, tone = 'slate', title, sub, dashed, strong }: { w: number; h: number; tone?: Tone; title?: string; sub?: string; dashed?: boolean; strong?: boolean }) {
  return (
    <g>
      <rect
        className="ill-outline"
        x={-w / 2}
        y={-h / 2}
        width={w}
        height={h}
        rx={Math.min(16, h / 3)}
        style={{ fill: soft(tone, strong ? 55 : 28), strokeWidth: 2, strokeDasharray: dashed ? '7 6' : undefined }}
      />
      {title && (
        <text className="ill-label" y={sub ? -3 : 5} style={{ fontSize: 14 }}>
          {title}
        </text>
      )}
      {sub && (
        <text className="ill-sub" y={title ? 14 : 4}>
          {sub}
        </text>
      )}
    </g>
  )
}
