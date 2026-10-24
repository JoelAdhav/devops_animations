import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Check, PartyPopper, RotateCcw, X } from 'lucide-react'

export type QuizQuestion = { q: string; options: string[]; answer: number; why: string }

function Question({ item, index, onResult }: { item: QuizQuestion; index: number; onResult: (ok: boolean) => void }) {
  const [picked, setPicked] = useState<number | null>(null)
  const [checked, setChecked] = useState(false)
  const [error, setError] = useState('')

  function check() {
    if (picked === null) {
      setError('Pick an answer first.')
      return
    }
    setChecked(true)
    onResult(picked === item.answer)
  }

  const ok = checked && picked === item.answer

  return (
    <div className="quiz-q">
      <h3>
        {index + 1}. {item.q}
      </h3>
      <div className="quiz-options" role="radiogroup">
        {item.options.map((opt, i) => {
          const cls = checked ? (i === item.answer ? 'right' : i === picked ? 'wrong' : '') : ''
          return (
            <button
              key={opt}
              role="radio"
              aria-checked={picked === i}
              aria-pressed={!checked && picked === i}
              className={`quiz-option ${cls}`}
              disabled={checked}
              onClick={() => {
                setPicked(i)
                setError('')
              }}
            >
              <span className="quiz-letter">{checked && i === item.answer ? <Check size={15} /> : checked && i === picked ? <X size={15} /> : String.fromCharCode(65 + i)}</span>
              {opt}
            </button>
          )
        })}
      </div>
      {!checked && (
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 12 }}>
          <button className="btn" onClick={check}>
            Check answer
          </button>
          {error && <span className="field-error">{error}</span>}
        </div>
      )}
      <AnimatePresence>
        {checked && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 18 }}
            className={`callout tone-${ok ? 'green' : 'rose'}`}
          >
            <strong>{ok ? 'Correct!' : 'Not quite.'}</strong>
            {item.why}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function Quiz({ questions }: { questions: QuizQuestion[] }) {
  const [results, setResults] = useState<Record<number, boolean>>({})
  const [round, setRound] = useState(0)
  const answered = Object.keys(results).length
  const score = Object.values(results).filter(Boolean).length
  const finished = answered === questions.length

  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      {questions.map((q, i) => (
        <Question key={`${round}-${i}`} item={q} index={i} onResult={(ok) => setResults((r) => ({ ...r, [i]: ok }))} />
      ))}
      <div style={{ padding: '14px 20px', borderTop: '1.5px solid var(--border)', background: 'var(--panel-2)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 600 }}>
          {finished ? (
            <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
              {score === questions.length && <PartyPopper size={18} color="var(--amber)" />}
              You got {score} of {questions.length}
              {score === questions.length ? '. Perfect!' : '. Scroll up to review, then try again.'}
            </span>
          ) : (
            <span className="muted">
              {answered} of {questions.length} answered
            </span>
          )}
        </span>
        {finished && (
          <button
            className="btn"
            style={{ marginLeft: 'auto' }}
            onClick={() => {
              setResults({})
              setRound((r) => r + 1)
            }}
          >
            <RotateCcw size={16} /> Retry
          </button>
        )}
      </div>
    </div>
  )
}
