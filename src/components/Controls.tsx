import { useEffect } from 'react'
import { Pause, Play, RotateCcw, SkipBack, SkipForward } from 'lucide-react'
import type { Stepper } from '../lib/useStepper'

/** Play / step / reset buttons plus a progress strip. Arrow keys and Space work too. */
export function Controls({ s, failed }: { s: Stepper; failed?: boolean }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement
      if (el.closest('input, select, textarea, button')) return
      if (e.key === 'ArrowRight') s.next()
      else if (e.key === 'ArrowLeft') s.prev()
      else if (e.key === ' ') {
        e.preventDefault()
        if (s.playing) s.pause()
        else s.play()
      } else return
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [s])

  return (
    <div className="controls">
      <button className="btn icon" onClick={s.prev} aria-label="Previous step" title="Previous (←)">
        <SkipBack size={16} />
      </button>
      {s.playing ? (
        <button className="btn primary" onClick={s.pause} title="Pause (Space)">
          <Pause size={16} /> Pause
        </button>
      ) : (
        <button className="btn primary" onClick={s.play} title="Play (Space)">
          <Play size={16} /> {s.done ? 'Replay' : s.step > 0 ? 'Resume' : 'Play'}
        </button>
      )}
      <button className="btn icon" onClick={s.next} aria-label="Next step" title="Next (→)">
        <SkipForward size={16} />
      </button>
      <button className="btn icon" onClick={s.reset} aria-label="Reset" title="Reset">
        <RotateCcw size={16} />
      </button>
      <div className="steps" aria-label={`Step ${s.step} of ${s.total}`}>
        {Array.from({ length: s.total }, (_, i) => (
          <span key={i} className={i < s.step ? (failed && i === s.step - 1 && s.done ? 'bad' : 'on') : ''} />
        ))}
      </div>
    </div>
  )
}
