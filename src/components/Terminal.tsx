import { useEffect, useRef, useState } from 'react'
import { complete, pretty, run, type CustomCommand, type Fs, type OutLine, type Result } from '../lib/vfs'

/** `at` is the directory the command was typed in; set only on command lines. */
type Line = OutLine & { at?: string }

function Prompt({ host, cwd }: { host: string; cwd: string }) {
  return (
    <span style={{ whiteSpace: 'nowrap' }}>
      <span className="ok">joel@{host}</span>:<span className="cmdline">{pretty(cwd)}</span>${' '}
    </span>
  )
}

/**
 * Interactive terminal over the in-memory shell. The parent owns the filesystem and directory;
 * the terminal owns the screen, the input line and command history (↑/↓, Tab, Ctrl+C, Ctrl+L).
 * Remount it with a new `key` to reset the screen.
 */
export function Terminal({
  fs,
  cwd,
  onRun,
  host = 'server',
  banner,
  title,
  height = 300,
  autoFocus = false,
  commands,
}: {
  fs: Fs
  cwd: string
  onRun: (r: Result, line: string, prevCwd: string) => void
  host?: string
  banner?: string[]
  title?: string
  height?: number
  autoFocus?: boolean
  /** Extra commands this terminal understands (e.g. a scenario's fake curl). */
  commands?: Record<string, CustomCommand>
}) {
  const [lines, setLines] = useState<Line[]>(() => (banner ?? ['Type "help" to see the commands. Tab completes names, ↑ recalls history.']).map((text) => ({ text, kind: 'info' })))
  const [input, setInput] = useState('')
  const [history, setHistory] = useState<string[]>([])
  const [hIdx, setHIdx] = useState(-1)
  const bodyRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight })
  }, [lines, input])

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus({ preventScroll: true })
  }, [autoFocus])

  function submit() {
    const line = input
    setInput('')
    setHIdx(-1)
    if (!line.trim()) {
      setLines((l) => [...l, { at: cwd, text: '' }])
      return
    }
    const nextHistory = [...history, line]
    setHistory(nextHistory)
    const r = run(fs, cwd, line, { history: nextHistory, host, commands })
    onRun(r, line, cwd)
    setLines((l) => (r.clear ? r.out : [...l, { at: cwd, text: line }, ...r.out]))
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') submit()
    else if (e.key === 'Tab') {
      e.preventDefault()
      const c = complete(fs, cwd, input, commands ? Object.keys(commands) : [])
      setInput(c.value)
      if (c.options.length) setLines((l) => [...l, { at: cwd, text: input }, { text: c.options.join('  '), kind: 'info' }])
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const n = Math.min(hIdx + 1, history.length - 1)
      if (n >= 0) {
        setHIdx(n)
        setInput(history[history.length - 1 - n])
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      const n = hIdx - 1
      setHIdx(Math.max(n, -1))
      setInput(n >= 0 ? history[history.length - 1 - n] : '')
    } else if (e.ctrlKey && e.key.toLowerCase() === 'c') {
      if (window.getSelection()?.toString()) return
      e.preventDefault()
      setLines((l) => [...l, { at: cwd, text: input + '^C' }])
      setInput('')
    } else if (e.ctrlKey && e.key.toLowerCase() === 'l') {
      e.preventDefault()
      setLines([])
    }
  }

  return (
    <div className="terminal" onClick={() => !window.getSelection()?.toString() && inputRef.current?.focus({ preventScroll: true })} style={{ cursor: 'text' }}>
      <header>
        <i />
        <i />
        <i />
        <span style={{ marginLeft: 6 }}>{title ?? `joel@${host}: ssh session (sandbox, nothing here is real)`}</span>
      </header>
      <div className="body" ref={bodyRef} style={{ height }}>
        {lines.map((l, i) => (
          <div key={i} className={l.kind === 'err' ? 'err' : l.kind === 'info' ? 'dim' : undefined}>
            {l.at && <Prompt host={host} cwd={l.at} />}
            {l.text}
          </div>
        ))}
        <div style={{ display: 'flex' }}>
          <Prompt host={host} cwd={cwd} />
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            aria-label="Terminal input"
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            style={{ flex: 1, minWidth: 0, background: 'transparent', border: 0, outline: 'none', color: '#f3f6fd', fontFamily: 'var(--mono)', fontSize: 12.5, padding: 0 }}
          />
        </div>
      </div>
    </div>
  )
}
