import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Check, X } from 'lucide-react'
import { Caption, type Callout } from '../components/Caption'
import type { Tone } from '../components/Diagram'

const WHO: { name: string; who: string; tone: Tone }[] = [
  { name: 'Owner (u)', who: 'joel', tone: 'sky' },
  { name: 'Group (g)', who: 'devs', tone: 'violet' },
  { name: 'Others (o)', who: 'everyone else', tone: 'amber' },
]
const BITS = [
  { ch: 'r', val: 4, file: 'read the file', dir: 'list names (ls)' },
  { ch: 'w', val: 2, file: 'edit / truncate it', dir: 'create, delete, rename files' },
  { ch: 'x', val: 1, file: 'run it as a program', dir: 'enter it (cd)' },
]

const PRESETS: { mode: string; use: string }[] = [
  { mode: '644', use: 'Normal file' },
  { mode: '755', use: 'Script / directory' },
  { mode: '600', use: 'SSH private key' },
  { mode: '700', use: 'Private directory' },
  { mode: '777', use: 'Never do this' },
]

export default function LinuxPermissions() {
  const [digits, setDigits] = useState([7, 5, 5])
  const [isDir, setIsDir] = useState(false)
  const [typed, setTyped] = useState('755')
  const [error, setError] = useState('')

  const mode = digits.join('')
  const symbolic = digits.map((d) => BITS.map((b) => (d & b.val ? b.ch : '-')).join(''))
  const fileName = isDir ? 'releases' : 'deploy.sh'

  function setMode(m: string) {
    setDigits(m.split('').map(Number))
    setTyped(m)
    setError('')
  }

  function toggle(g: number, val: number) {
    const next = digits.map((d, i) => (i === g ? d ^ val : d))
    setDigits(next)
    setTyped(next.join(''))
    setError('')
  }

  function apply() {
    if (!/^[0-7]{3}$/.test(typed)) {
      setError('Enter three digits from 0 to 7, like 644.')
      return
    }
    setMode(typed)
  }

  let callout: Callout | undefined
  if (digits[2] & 2) callout = { tone: 'rose', title: 'Anyone on the system can modify this', body: 'World-writable files are a classic security hole. Fix ownership with chown instead of opening permissions.' }
  else if (mode === '600' || mode === '400') callout = { tone: 'green', title: 'Correct for SSH keys', body: 'SSH refuses keys readable by others ("UNPROTECTED PRIVATE KEY FILE"). 600 or 400 fixes it.' }
  else if (isDir && digits.some((d) => d & 4 && !(d & 1))) callout = { tone: 'amber', title: 'Read without execute on a directory', body: 'They can list names but cannot cd in or open the files. Directories almost always need r and x together.' }

  const typeChar = isDir ? 'd' : '-'

  return (
    <div className="card stage">
      <div className="toolbar">
        <span className="label">Presets</span>
        <div className="seg" role="group" aria-label="Permission presets">
          {PRESETS.map((p) => (
            <button key={p.mode} aria-pressed={mode === p.mode} className={p.mode === '777' ? 'bad' : ''} onClick={() => setMode(p.mode)}>
              <span className="mono">{p.mode}</span> <span style={{ opacity: 0.7 }}>{p.use}</span>
            </button>
          ))}
        </div>
        <div className="seg" role="group" aria-label="File type" style={{ marginLeft: 'auto' }}>
          <button aria-pressed={!isDir} onClick={() => setIsDir(false)}>File</button>
          <button aria-pressed={isDir} onClick={() => setIsDir(true)}>Directory</button>
        </div>
      </div>

      {/* ls -l output with animated characters */}
      <div className="terminal">
        <header><i /><i /><i /><span style={{ marginLeft: 6 }}>bash</span></header>
        <div className="body" style={{ height: 'auto', fontSize: 'clamp(14px, 2.4vw, 20px)', padding: '16px 18px' }}>
          <div className="cmdline" style={{ fontSize: 13, marginBottom: 6 }}>$ ls -l{isDir ? 'd' : ''} {fileName}</div>
          <span className="dim">{typeChar}</span>
          {symbolic.map((grp, g) => (
            <span key={g} style={{ color: `var(--${WHO[g].tone})` }}>
              {grp.split('').map((ch, k) => (
                <AnimatePresence mode="popLayout" key={k} initial={false}>
                  <motion.span
                    key={ch}
                    initial={{ y: -10, opacity: 0 }}
                    animate={{ y: 0, opacity: ch === '-' ? 0.35 : 1 }}
                    exit={{ y: 10, opacity: 0 }}
                    style={{ display: 'inline-block' }}
                  >
                    {ch}
                  </motion.span>
                </AnimatePresence>
              ))}
            </span>
          ))}
          <span className="dim"> 1 </span>
          <span style={{ color: 'var(--sky)' }}>joel</span> <span style={{ color: 'var(--violet)' }}>devs</span>
          <span className="dim"> {isDir ? '4.0K' : '2.1K'} Oct 24 10:42 </span>
          <span>{fileName}</span>
        </div>
      </div>

      {/* Bit toggles per class */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
        {WHO.map((w, g) => (
          <div
            key={w.name}
            className={`tone-${w.tone}`}
            style={{ borderRadius: 12, border: '1px solid color-mix(in srgb, var(--tone) 40%, transparent)', padding: 14, background: 'color-mix(in srgb, var(--tone) 6%, transparent)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
              <span style={{ fontWeight: 600 }}>{w.name}</span>
              <span className="muted" style={{ fontSize: 12 }}>{w.who}</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {BITS.map((b) => {
                const on = !!(digits[g] & b.val)
                return (
                  <motion.button
                    key={b.ch}
                    onClick={() => toggle(g, b.val)}
                    whileTap={{ scale: 0.92 }}
                    aria-pressed={on}
                    aria-label={`${w.name} ${b.ch}`}
                    style={{
                      flex: 1,
                      height: 58,
                      borderRadius: 10,
                      border: `1.5px solid ${on ? 'var(--tone)' : 'var(--border-strong)'}`,
                      background: on ? 'color-mix(in srgb, var(--tone) 22%, transparent)' : 'var(--panel-2)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s',
                    }}
                  >
                    <span className="mono" style={{ fontSize: 18, fontWeight: 500, color: on ? 'var(--tone)' : 'var(--faint)' }}>{b.ch}</span>
                    <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{b.val}</span>
                  </motion.button>
                )
              })}
            </div>
            <div className="mono" style={{ marginTop: 10, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="muted">{BITS.map((b) => (digits[g] & b.val ? b.val : 0)).join(' + ')} =</span>
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={digits[g]}
                  initial={{ scale: 1.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  style={{ fontSize: 22, color: 'var(--tone)', fontWeight: 600, display: 'inline-block' }}
                >
                  {digits[g]}
                </motion.span>
              </AnimatePresence>
            </div>
          </div>
        ))}
      </div>

      {/* chmod input */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--mono)', fontSize: 14 }}>
          <span className="muted">$ chmod</span>
          <input
            value={typed}
            onChange={(e) => {
              setTyped(e.target.value.trim())
              setError('')
            }}
            onKeyDown={(e) => e.key === 'Enter' && apply()}
            maxLength={3}
            aria-label="Octal mode"
            aria-invalid={!!error}
            style={{
              width: 72,
              height: 36,
              borderRadius: 8,
              border: `1px solid ${error ? 'var(--rose)' : 'var(--border-strong)'}`,
              background: 'var(--panel-2)',
              padding: '0 10px',
              fontFamily: 'var(--mono)',
            }}
          />
          <span>{fileName}</span>
        </div>
        <button className="btn" onClick={apply}>Run</button>
        {error && <span style={{ color: 'var(--rose)', fontSize: 13, alignSelf: 'center' }}>{error}</span>}
      </div>

      {/* Who can do what */}
      <div className="mini-table">
        <header>Who can do what with {fileName}</header>
        {WHO.map((w, g) => (
          <div className="row" key={w.name} style={{ fontFamily: 'var(--font)', flexWrap: 'wrap' }}>
            <span style={{ color: `var(--${w.tone})`, minWidth: 120 }}>{w.who}</span>
            <span style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              {BITS.map((b) => {
                const on = !!(digits[g] & b.val)
                return (
                  <span key={b.ch} style={{ display: 'flex', gap: 4, alignItems: 'center', color: on ? 'var(--text)' : 'var(--faint)' }}>
                    {on ? <Check size={14} color="var(--green)" /> : <X size={14} />}
                    {isDir ? b.dir : b.file}
                  </span>
                )
              })}
            </span>
          </div>
        ))}
      </div>

      <Caption
        id={`${mode}-${isDir}`}
        title={`chmod ${mode} = ${typeChar}${symbolic.join('')}`}
        body="Each digit is the sum of read (4), write (2) and execute (1). First digit is the owner, then the group, then everyone else."
        callout={callout}
      />
    </div>
  )
}
