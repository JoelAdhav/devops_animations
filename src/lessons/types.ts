import type { ComponentType } from 'react'
import type { LucideIcon } from 'lucide-react'
import type { Tone } from '../components/Diagram'
import type { StorySection } from '../components/Story'
import type { QuizQuestion } from '../components/Quiz'
import type { Scenario } from '../components/SimLab'

export type Lesson = {
  id: string
  title: string
  /** Sidebar group the lesson belongs to. */
  track: string
  tone: Tone
  icon: LucideIcon
  summary: string
  minutes: number
  /** Scroll-driven explanation (text + sticky animated scene). */
  story?: { sections: StorySection[]; Scene: ComponentType<{ step: number }> }
  /** Interactive "try it yourself" simulator. */
  Playground?: ComponentType
  playgroundIntro?: string
  /** Real-world tickets solved in a terminal. Shown in the lesson's Simulation tab. */
  simulation?: { intro: string; scenarios: Scenario[] }
  terms?: { term: string; def: string }[]
  quiz?: QuizQuestion[]
  interview: { q: string; a: string }[]
  commands: { cmd: string; note: string }[]
}
