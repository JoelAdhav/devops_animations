import { motion } from 'motion/react'
import type { Tone } from './Diagram'
import { At, Envelope, Link, Tag, Txt } from './Illustrations'

export type Msg = { from: 'c' | 's'; label: string; tone?: Tone; lost?: boolean; note?: string }

const CX = 120
const SX = 440

/** Sequence diagram: messages appear one by one, with a packet flying along the newest arrow. */
export function Sequence({
  msgs,
  t,
  top = 120,
  gap = 52,
  left = 'Client',
  right = 'Server',
}: {
  msgs: Msg[]
  t: number
  top?: number
  gap?: number
  left?: string
  right?: string
}) {
  const shown = Math.min(t, msgs.length)
  const cur = msgs[Math.min(t, msgs.length - 1)]
  const curY = top + Math.min(t, msgs.length - 1) * gap
  const fromX = cur.from === 'c' ? CX : SX
  const toX = cur.from === 'c' ? SX : CX
  return (
    <>
      <At x={CX} y={92}>
        <Tag text={left} tone="sky" filled w={96} />
      </At>
      <At x={SX} y={92}>
        <Tag text={right} tone="violet" filled w={96} />
      </At>
      <line x1={CX} y1={108} x2={CX} y2={top + msgs.length * gap} stroke="var(--border-strong)" strokeWidth={3} strokeDasharray="2 6" strokeLinecap="round" />
      <line x1={SX} y1={108} x2={SX} y2={top + msgs.length * gap} stroke="var(--border-strong)" strokeWidth={3} strokeDasharray="2 6" strokeLinecap="round" />
      {msgs.slice(0, shown).map((m, k) => {
        const y = top + k * gap
        const a = m.from === 'c' ? CX : SX
        const b = m.from === 'c' ? SX : CX
        const end = m.lost ? (a + b) / 2 : b
        return (
          <g key={k}>
            <Link d={`M${a} ${y} L${end + (end > a ? -8 : 8)} ${y + 18}`} arrow={!m.lost} color={m.lost ? 'var(--rose)' : 'var(--ink)'} />
            {m.lost && (
              <Txt x={end} y={y + 24} anchor="middle" cls="ill-label" fill="var(--rose)" size={18}>
                ✕
              </Txt>
            )}
            <Txt x={(a + b) / 2} y={y - 6} anchor="middle" cls="ill-mono" size={12}>
              {m.label}
            </Txt>
            {m.note && (
              <Txt x={(a + b) / 2} y={y + 30} anchor="middle" cls="ill-sub" size={10.5}>
                {m.note}
              </Txt>
            )}
          </g>
        )
      })}
      {t < msgs.length && (
        <motion.g key={t} initial={{ x: fromX, y: curY + 4 }} animate={{ x: cur.lost ? (fromX + toX) / 2 : toX, y: curY + 18 }} transition={{ duration: 0.75, ease: 'easeInOut' }}>
          <Envelope tone={cur.tone ?? 'amber'} scale={0.7} />
        </motion.g>
      )}
    </>
  )
}
