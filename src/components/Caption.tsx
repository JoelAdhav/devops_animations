import { AnimatePresence, motion } from 'motion/react'
import type { ReactNode } from 'react'

export type Callout = { tone: 'rose' | 'green' | 'amber' | 'sky'; title: string; body: ReactNode }

/** Explains the current step. Re-animates whenever `id` changes. */
export function Caption({ id, title, body, callout }: { id: string | number; title: string; body: ReactNode; callout?: Callout }) {
  return (
    <div className="caption" aria-live="polite">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2 }}
        >
          <h3>{title}</h3>
          <p>{body}</p>
          {callout && (
            <div className={`callout tone-${callout.tone}`}>
              <strong>{callout.title}</strong>
              {callout.body}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
