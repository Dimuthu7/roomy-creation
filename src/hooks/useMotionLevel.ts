'use client'
import { useSyncExternalStore } from 'react'

export type MotionLevel = 'full' | 'reduced' | 'mobile'
export const MOBILE_MAX = 767

export function resolveMotionLevel(prefersReduced: boolean, width: number): MotionLevel {
  if (prefersReduced) return 'reduced'
  return width <= MOBILE_MAX ? 'mobile' : 'full'
}

function subscribe(onChange: () => void): () => void {
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  motionQuery.addEventListener('change', onChange)
  window.addEventListener('resize', onChange)
  return () => {
    motionQuery.removeEventListener('change', onChange)
    window.removeEventListener('resize', onChange)
  }
}

function getSnapshot(): MotionLevel {
  return resolveMotionLevel(
    window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    window.innerWidth,
  )
}

// The server cannot know either the preference or the viewport, so it renders the
// safe state: content visible, nothing transformed. That is also what a visitor
// with JS disabled keeps.
function getServerSnapshot(): MotionLevel {
  return 'reduced'
}

export function useMotionLevel(): MotionLevel {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
