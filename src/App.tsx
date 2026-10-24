import { useEffect, useState } from 'react'
import { NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { Activity, Check, Menu, Moon, Sun } from 'lucide-react'
import { lessons, tracks } from './lessons/registry'
import { loadTheme, saveTheme, useCompleted, type Theme } from './lib/storage'
import Home from './pages/Home'
import LessonPage from './pages/LessonPage'

function Brand() {
  return (
    <NavLink to="/" className="brand">
      <span className="brand-mark">
        <Activity size={19} strokeWidth={2.6} />
      </span>
      <span>
        DevOps Visual Lab
        <small>Learn by watching it work</small>
      </span>
    </NavLink>
  )
}

export default function App() {
  const [theme, setTheme] = useState<Theme>(loadTheme)
  const [menuOpen, setMenuOpen] = useState(false)
  const completed = useCompleted()
  const location = useLocation()

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    saveTheme(theme)
  }, [theme])

  // Jump to the top whenever the page changes.
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [location.pathname])

  const done = lessons.filter((l) => completed.includes(l.id)).length
  const ThemeIcon = theme === 'dark' ? Sun : Moon

  return (
    <div className="app">
      <header className="topbar">
        <Brand />
        <button className="btn icon" aria-label="Open menu" onClick={() => setMenuOpen(true)}>
          <Menu size={18} />
        </button>
      </header>

      {/* Any link click inside the sidebar closes the mobile menu. */}
      <aside
        className={`sidebar${menuOpen ? ' open' : ''}`}
        onClick={(e) => (e.target as HTMLElement).closest('a') && setMenuOpen(false)}
      >
        <Brand />

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 16 }} aria-label="Lessons">
          {tracks.map((track) => (
            <div className="nav-group" key={track}>
              <h4>{track}</h4>
              {lessons
                .filter((l) => l.track === track)
                .map((l) => {
                  const isDone = completed.includes(l.id)
                  return (
                    <NavLink key={l.id} to={`/lesson/${l.id}`} className="nav-link">
                      <span className={`nav-num${isDone ? ' done' : ''}`}>{isDone ? <Check size={13} strokeWidth={3} /> : lessons.indexOf(l) + 1}</span>
                      {l.title}
                    </NavLink>
                  )
                })}
            </div>
          ))}
        </nav>

        <div className="sidebar-foot">
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6, fontWeight: 600 }}>
              <span className="muted">Your progress</span>
              <span>
                {done}/{lessons.length}
              </span>
            </div>
            <div className="progress">
              <span style={{ width: `${(done / lessons.length) * 100}%` }} />
            </div>
          </div>
          <button className="btn" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            <ThemeIcon size={16} /> {theme === 'dark' ? 'Light' : 'Dark'} mode
          </button>
        </div>
      </aside>
      {menuOpen && <div aria-hidden onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 35 }} />}

      <main className="main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/lesson/:id" element={<LessonPage />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </main>
    </div>
  )
}
