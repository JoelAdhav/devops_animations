import { useEffect, useRef, useState, type ComponentType, type ReactNode } from 'react'
import { AlertTriangle, Info, Lightbulb, Sparkles } from 'lucide-react'
import type { Tone } from './Diagram'

export type StorySection = { title: string; body: ReactNode }

/**
 * Scroll-driven lesson: text on the left, a sticky animated scene on the right.
 * The scene receives the index of the section currently in the middle of the screen.
 */
export function ScrollStory({ sections, Scene }: { sections: StorySection[]; Scene: ComponentType<{ step: number }> }) {
  const [active, setActive] = useState(0)
  const refs = useRef<(HTMLElement | null)[]>([])

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.idx))
        }
      },
      // A thin band across the middle of the viewport decides which section is "current".
      { rootMargin: '-45% 0px -50% 0px' },
    )
    refs.current.forEach((el) => el && io.observe(el))
    return () => io.disconnect()
  }, [sections.length])

  function jump(i: number) {
    refs.current[i]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return (
    <div className="story">
      <div className="story-text">
        {sections.map((s, i) => (
          <section
            key={s.title}
            data-idx={i}
            ref={(el) => {
              refs.current[i] = el
            }}
            className={`story-step${i === active ? ' active' : ''}`}
            onClick={() => i !== active && jump(i)}
          >
            <span className="story-num">{i + 1}</span>
            <h2>{s.title}</h2>
            <div className="story-body">{s.body}</div>
          </section>
        ))}
      </div>
      <div className="story-stage">
        <div className="story-stage-inner">
          <div className="story-stage-bar">
            <span>
              {active + 1} / {sections.length} · {sections[active].title}
            </span>
            <div className="story-dots">
              {sections.map((s, i) => (
                <button key={s.title} aria-label={`Go to: ${s.title}`} aria-current={i === active ? 'step' : undefined} onClick={() => jump(i)} />
              ))}
            </div>
          </div>
          <Scene step={active} />
        </div>
      </div>
    </div>
  )
}

const TIP_ICON = { analogy: Lightbulb, note: Info, warn: AlertTriangle, pro: Sparkles }
const TIP_TONE: Record<keyof typeof TIP_ICON, Tone> = { analogy: 'amber', note: 'sky', warn: 'rose', pro: 'violet' }
const TIP_LABEL = { analogy: 'Think of it like this', note: 'Good to know', warn: 'Careful', pro: 'Interview tip' }

/** Highlighted box inside story text. */
export function Tip({ kind = 'analogy', children }: { kind?: keyof typeof TIP_ICON; children: ReactNode }) {
  const Icon = TIP_ICON[kind]
  return (
    <div className={`tip tone-${TIP_TONE[kind]}`}>
      <Icon size={18} />
      <p>
        <b>{TIP_LABEL[kind]}: </b>
        {children}
      </p>
    </div>
  )
}

/** Terminal snippet. Lines starting with "$ " get a prompt; "# " lines are comments; others are output. */
export function Shell({ children }: { children: string }) {
  const lines = children.replace(/^\n/, '').replace(/\n\s*$/, '').split('\n')
  return (
    <code className="shell">
      {lines.map((l, i) => (
        <span key={i}>
          {l.startsWith('$ ') ? (
            <>
              <span className="p">$ </span>
              {l.slice(2)}
            </>
          ) : l.startsWith('# ') ? (
            <span className="c">{l}</span>
          ) : (
            <span className="o">{l}</span>
          )}
          {i < lines.length - 1 && '\n'}
        </span>
      ))}
    </code>
  )
}
