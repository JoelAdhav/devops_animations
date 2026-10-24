import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { ArrowRight, Check, Clock, Keyboard, MousePointerClick, Sparkles } from 'lucide-react'
import { lessons, tracks } from '../lessons/registry'
import { useCompleted } from '../lib/storage'
import { At, Bubble, Cloud, Envelope, Laptop, Mover, Router, Scene, Server } from '../components/Illustrations'

/** Looping hero animation: a packet travels laptop → router → internet → server and back. */
function HeroScene() {
  const stops = [
    [96, 236],
    [210, 236],
    [300, 150],
    [420, 236],
    [300, 150],
    [210, 236],
  ]
  const [i, setI] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % stops.length), 1300)
    return () => clearInterval(t)
  }, [stops.length])
  const back = i >= 3
  return (
    <Scene label="A message travelling from a laptop through a router and the internet to a server" h={330}>
      <At x={300} y={120}>
        <Cloud title="Internet" w={1.25} />
      </At>
      <path d="M150 260 H170 M250 260 H270 Q300 260 300 180 M330 180 Q330 260 360 260 H370" fill="none" stroke="var(--border-strong)" strokeWidth={3} strokeDasharray="3 9" strokeLinecap="round" />
      <At x={96} y={256}>
        <Laptop title="You" active={i === 0} />
      </At>
      <At x={210} y={262}>
        <Router title="Router" active={i === 1 || i === 5} />
      </At>
      <At x={440} y={244}>
        <Server title="Server" active={i === 3} />
      </At>
      <Mover x={stops[i][0]} y={stops[i][1] - 70}>
        <Envelope tone={back ? 'green' : 'amber'} />
      </Mover>
      <At x={96} y={170} show={i === 0}>
        <Bubble text="GET /index.html" />
      </At>
      <At x={440} y={150} show={i === 3}>
        <Bubble text="200 OK, here you go!" tone="green" />
      </At>
    </Scene>
  )
}

export default function Home() {
  const completed = useCompleted()
  const next = lessons.find((l) => !completed.includes(l.id)) ?? lessons[0]

  return (
    <div style={{ maxWidth: 1180 }}>
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 32, alignItems: 'center', padding: '8px 0 48px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <span className="chip tone-amber" style={{ alignSelf: 'flex-start' }}>
            <Sparkles size={13} /> Zero to DevOps, visually
          </span>
          <h1 style={{ fontSize: 'clamp(34px, 5vw, 54px)', fontWeight: 900 }}>
            Finally <span style={{ background: 'color-mix(in srgb, var(--amber) 55%, transparent)', borderRadius: 10, padding: '0 8px' }}>see</span> how the
            internet, Linux and the cloud work.
          </h1>
          <p className="muted" style={{ fontSize: 18, margin: 0 }}>
            Start from zero. Each lesson tells a story you scroll through while the picture animates beside it. Then you play
            with a simulator, take a quick quiz, and practise the interview questions.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <Link to={`/lesson/${next.id}`} className="btn primary" style={{ height: 48, padding: '0 22px', fontSize: 16 }}>
              {completed.length ? 'Continue learning' : 'Start lesson 1'} <ArrowRight size={18} />
            </Link>
            <span className="muted" style={{ fontSize: 14 }}>
              {lessons.length} lessons · free · no signup
            </span>
          </div>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 13 }} className="muted">
            <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <MousePointerClick size={15} /> Break things on purpose
            </span>
            <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <Keyboard size={15} /> Space, ← and → in simulators
            </span>
          </div>
        </div>
        <div className="story-stage-inner" style={{ padding: 10 }}>
          <HeroScene />
        </div>
      </section>

      {tracks.map((track, ti) => {
        const items = lessons.filter((l) => l.track === track)
        const doneCount = items.filter((l) => completed.includes(l.id)).length
        return (
          <section key={track} style={{ marginBottom: 40 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
              <span className="chip tone-slate">Step {ti + 1}</span>
              <h2 style={{ fontSize: 24 }}>{track}</h2>
              <span className="muted" style={{ fontSize: 14 }}>
                {doneCount}/{items.length} done
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 16 }}>
              {items.map((l, i) => {
                const isDone = completed.includes(l.id)
                const Icon = l.icon
                return (
                  <motion.div
                    key={l.id}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ type: 'spring', stiffness: 260, damping: 20, delay: i * 0.04 }}
                    whileHover={{ y: -4, rotate: -0.4 }}
                  >
                    <Link
                      to={`/lesson/${l.id}`}
                      className={`card tone-${l.tone}`}
                      style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 20, height: '100%' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="block-icon">
                          <Icon size={20} />
                        </span>
                        {isDone ? (
                          <span className="chip tone-green">
                            <Check size={13} /> Done
                          </span>
                        ) : (
                          <span className="muted" style={{ fontSize: 13, fontWeight: 600 }}>
                            Lesson {lessons.indexOf(l) + 1}
                          </span>
                        )}
                      </div>
                      <h3 style={{ fontSize: 19 }}>{l.title}</h3>
                      <p className="muted" style={{ margin: 0, fontSize: 14, flex: 1, lineHeight: 1.6 }}>
                        {l.summary}
                      </p>
                      <div className="muted" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                        <Clock size={14} /> {l.minutes} min
                        <span style={{ marginLeft: 'auto', fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          {isDone ? 'Review' : 'Start'} <ArrowRight size={14} />
                        </span>
                      </div>
                    </Link>
                  </motion.div>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}
