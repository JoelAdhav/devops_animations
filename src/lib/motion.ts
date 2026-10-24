import type { Transition } from 'motion/react'

/** Shared spring presets: lively, slightly overshooting motion used across the app. */
export const spring: Transition = { type: 'spring', stiffness: 260, damping: 17 }
export const bouncy: Transition = { type: 'spring', stiffness: 380, damping: 14 }
export const travel: Transition = { type: 'spring', stiffness: 90, damping: 13, mass: 0.9 }
