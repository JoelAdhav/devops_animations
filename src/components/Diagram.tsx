import { motion } from 'motion/react'
import type { ReactNode } from 'react'

export type Tone = 'sky' | 'violet' | 'teal' | 'amber' | 'rose' | 'green' | 'pink' | 'slate'
export type Pt = readonly [number, number]

type NodeProps = {
  x: number
  y: number
  w: number
  h?: number
  title: string
  sub?: string
  tone?: Tone
  dim?: boolean
  active?: boolean
  down?: boolean
  children?: ReactNode
}

/** A labelled box in an SVG diagram. */
export function Node({ x, y, w, h = 56, title, sub, tone = 'slate', dim, active, down, children }: NodeProps) {
  const cls = ['node', `tone-${tone}`, dim && 'is-dim', active && 'is-active', down && 'is-down'].filter(Boolean).join(' ')
  return (
    <g className={cls}>
      <rect x={x} y={y} width={w} height={h} rx={10} />
      <text className="node-title" x={x + w / 2} y={sub ? y + h / 2 - 9 : y + h / 2}>
        {title}
      </text>
      {sub && (
        <text className="node-sub" x={x + w / 2} y={y + h / 2 + 11}>
          {sub}
        </text>
      )}
      {children}
    </g>
  )
}

/** A dashed container such as a VPC or subnet. */
export function Zone({ x, y, w, h, label, tone = 'slate', labelBottom }: { x: number; y: number; w: number; h: number; label: string; tone?: Tone; labelBottom?: boolean }) {
  return (
    <g className={`tone-${tone}`}>
      <rect className="zone" x={x} y={y} width={w} height={h} rx={14} />
      <text className="zone-label" x={x + 12} y={labelBottom ? y + h - 10 : y + 20}>
        {label}
      </text>
    </g>
  )
}

/** A connector line. `flow` animates it, `broken` marks it as failing. */
export function Wire({ d, flow, broken }: { d: string; flow?: boolean; broken?: boolean }) {
  return <path className={`wire${flow ? ' flow' : ''}${broken ? ' broken' : ''}`} d={d} />
}

/**
 * The glowing dot that represents a request. It travels through `path` (waypoints) and settles on the last one.
 */
export function Packet({ path, bad, hidden }: { path: readonly Pt[]; bad?: boolean; hidden?: boolean }) {
  const xs = path.map((p) => p[0])
  const ys = path.map((p) => p[1])
  const duration = Math.min(0.45 * path.length + 0.25, 1.6)
  return (
    <motion.g
      className={bad ? 'packet-bad' : 'packet-ok'}
      initial={false}
      animate={{ x: [null, ...xs], y: [null, ...ys], opacity: hidden ? 0 : 1 }}
      transition={{ duration, ease: 'easeInOut' }}
    >
      <circle className="packet-ring" r={9} />
      <circle className="packet-core" r={8} />
    </motion.g>
  )
}
