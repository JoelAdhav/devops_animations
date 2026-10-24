import type { Fs } from './vfs'

/** Everything a simulation goal can look at: the files, where you are, and every command you ran with its output. */
export type SimState = { fs: Fs; cwd: string; log: { line: string; cwd: string; out: string }[] }

/** True if any command matching `re` was run (optionally only while standing in a matching directory). */
export function ran(s: SimState, re: RegExp, where?: (cwd: string) => boolean) {
  return s.log.some((e) => re.test(e.line) && (!where || where(e.cwd)))
}

/** True if any command printed text containing `text`. */
export function saw(s: SimState, text: string) {
  return s.log.some((e) => e.out.includes(text))
}
