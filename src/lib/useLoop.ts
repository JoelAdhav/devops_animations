import { useEffect, useState } from 'react'

/** Counts 0, 1, ... length-1 and wraps, advancing every `ms`. Restarts from 0 whenever the component mounts. */
export function useLoop(length: number, ms: number) {
  const [i, setI] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % length), ms)
    return () => clearInterval(t)
  }, [length, ms])
  return i
}
