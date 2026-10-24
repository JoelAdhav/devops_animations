import { Link, useParams, useSearchParams } from 'react-router-dom'
import { motion } from 'motion/react'
import { ArrowLeft, ArrowRight, BookOpen, Check, Clapperboard, Clock, Gamepad2, ListChecks, MessagesSquare, Terminal, TerminalSquare } from 'lucide-react'
import type { ReactNode } from 'react'
import { findLesson, lessons } from '../lessons/registry'
import { toggleCompleted, useCompleted } from '../lib/storage'
import { ScrollStory } from '../components/Story'
import { Quiz } from '../components/Quiz'
import { SimLab } from '../components/SimLab'
import { spring } from '../lib/motion'

function Block({ icon, tone, title, intro, children }: { icon: ReactNode; tone: string; title: string; intro?: string; children: ReactNode }) {
  return (
    <section className="block">
      <div className="block-head">
        <span className={`block-icon tone-${tone}`}>{icon}</span>
        <div>
          <h2>{title}</h2>
          {intro && (
            <p className="muted" style={{ margin: 0, fontSize: 15 }}>
              {intro}
            </p>
          )}
        </div>
      </div>
      {children}
    </section>
  )
}

export default function LessonPage() {
  const { id } = useParams()
  const lesson = findLesson(id)
  const completed = useCompleted()
  const [params, setParams] = useSearchParams()

  if (!lesson) {
    return (
      <div>
        <h1>Lesson not found</h1>
        <p className="muted">
          <Link to="/" style={{ color: 'var(--sky)' }}>
            Back to all lessons
          </Link>
        </p>
      </div>
    )
  }

  const index = lessons.indexOf(lesson)
  const prev = lessons[index - 1]
  const next = lessons[index + 1]
  const isDone = completed.includes(lesson.id)
  const { Playground, story, simulation } = lesson
  const Icon = lesson.icon
  const tab = simulation && params.get('tab') === 'sim' ? 'sim' : 'learn'
  const tabs = [
    { id: 'learn', label: 'Animation', icon: Clapperboard, note: story ? `${story.sections.length} parts` : undefined },
    { id: 'sim', label: 'Simulation', icon: TerminalSquare, note: simulation ? `${simulation.scenarios.length} tickets` : undefined },
  ] as const

  return (
    <article style={{ maxWidth: 1180 }}>
      <header className={`lesson-head tone-${lesson.tone}`}>
        <div className="lesson-meta">
          <span className="block-icon" style={{ width: 34, height: 34, borderRadius: 10 }}>
            <Icon size={18} />
          </span>
          <span className="chip">{lesson.track}</span>
          <span style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
            <Clock size={14} /> {lesson.minutes} min
          </span>
          {story && (
            <span style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
              <BookOpen size={14} /> {story.sections.length} parts
            </span>
          )}
        </div>
        <h1>{lesson.title}</h1>
        <p>{lesson.summary}</p>
        {story && tab === 'learn' && (
          <p style={{ fontSize: 14 }} className="muted">
            Scroll down: the picture changes as you read each part.
          </p>
        )}
        {simulation && (
          <div className="lesson-tabs" role="tablist" aria-label="Lesson mode">
            {tabs.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                className="lesson-tab"
                onClick={() => setParams(t.id === 'sim' ? { tab: 'sim' } : {}, { replace: true })}
              >
                {tab === t.id && <motion.span layoutId="lesson-tab-pill" className="tab-pill" transition={spring} />}
                <t.icon size={17} />
                <span>{t.label}</span>
                {t.note && <small>{t.note}</small>}
              </button>
            ))}
          </div>
        )}
      </header>

      {tab === 'sim' && simulation && (
        <Block icon={<TerminalSquare size={20} />} tone="rose" title="Real-world tickets" intro={simulation.intro}>
          <SimLab key={lesson.id} scenarios={simulation.scenarios} />
        </Block>
      )}

      {tab === 'learn' && (
        <>

      {/* key forces fresh state when switching lessons */}
      {story && <ScrollStory key={lesson.id} sections={story.sections} Scene={story.Scene} />}

      {Playground && (
        <Block
          icon={<Gamepad2 size={20} />}
          tone="sky"
          title={story ? 'Try it yourself' : 'Simulation'}
          intro={lesson.playgroundIntro ?? (story ? 'Play with it until it feels obvious.' : undefined)}
        >
          <Playground key={lesson.id} />
        </Block>
      )}

      {lesson.terms && (
        <Block icon={<BookOpen size={20} />} tone="violet" title="Key terms" intro="The words you will hear at work and in interviews.">
          <dl className="terms" style={{ margin: 0 }}>
            {lesson.terms.map((t) => (
              <div className="term" key={t.term}>
                <dt>{t.term}</dt>
                <dd>{t.def}</dd>
              </div>
            ))}
          </dl>
        </Block>
      )}

      {lesson.quiz && (
        <Block icon={<ListChecks size={20} />} tone="green" title="Check yourself" intro="Quick questions. Each answer explains why.">
          <Quiz key={lesson.id} questions={lesson.quiz} />
        </Block>
      )}

      <Block icon={<MessagesSquare size={20} />} tone="amber" title="Interview corner">
        <div className="below">
          <section className="card section">
            <h2>Questions they ask</h2>
            {lesson.interview.map((item) => (
              <details className="qa" key={item.q}>
                <summary>{item.q}</summary>
                <p>{item.a}</p>
              </details>
            ))}
          </section>
          <section className="card section">
            <h2>
              <Terminal size={18} /> Commands to remember
            </h2>
            <div className="cmd">
              {lesson.commands.map((c) => (
                <code key={c.cmd}>
                  {c.cmd}
                  {'\n'}
                  <span className="c"># {c.note}</span>
                </code>
              ))}
            </div>
          </section>
        </div>
      </Block>
        </>
      )}

      <div className="lesson-nav">
        {prev ? (
          <Link to={`/lesson/${prev.id}`} className="btn">
            <ArrowLeft size={16} /> {prev.title}
          </Link>
        ) : (
          <span />
        )}
        <button className={`btn${isDone ? '' : ' primary'}`} aria-pressed={isDone} onClick={() => toggleCompleted(lesson.id)}>
          <Check size={16} /> {isDone ? 'Completed' : 'Mark as complete'}
        </button>
        {next ? (
          <Link to={`/lesson/${next.id}`} className="btn">
            {next.title} <ArrowRight size={16} />
          </Link>
        ) : (
          <span />
        )}
      </div>
    </article>
  )
}
