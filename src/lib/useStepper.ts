import { useCallback, useEffect, useState } from 'react'

export type Stepper = {
  step: number
  total: number
  /** Last reachable step. Lower than `total` when a simulated failure stops the flow early. */
  limit: number
  playing: boolean
  done: boolean
  play: () => void
  pause: () => void
  next: () => void
  prev: () => void
  reset: () => void
}

/**
 * Drives a step-by-step animation. Step 0 is the idle state; step N means N steps have finished.
 */
export function useStepper(total: number, opts: { interval?: number; stopAt?: number } = {}): Stepper {
  const interval = opts.interval ?? 1500
  const limit = Math.min(opts.stopAt ?? total, total)
  const [step, setStep] = useState(0)
  const [wantPlay, setWantPlay] = useState(false)
  const playing = wantPlay && step < limit

  useEffect(() => {
    if (!playing) return
    const t = setTimeout(() => setStep((s) => Math.min(s + 1, limit)), step === 0 ? 250 : interval)
    return () => clearTimeout(t)
  }, [playing, step, limit, interval])

  const play = useCallback(() => {
    setStep((s) => (s >= limit ? 0 : s))
    setWantPlay(true)
  }, [limit])
  const pause = useCallback(() => setWantPlay(false), [])
  const next = useCallback(() => {
    setWantPlay(false)
    setStep((s) => Math.min(s + 1, limit))
  }, [limit])
  const prev = useCallback(() => {
    setWantPlay(false)
    setStep((s) => Math.max(s - 1, 0))
  }, [])
  const reset = useCallback(() => {
    setWantPlay(false)
    setStep(0)
  }, [])

  return { step, total, limit, playing, done: step >= limit, play, pause, next, prev, reset }
}
