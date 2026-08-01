'use client'
import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { useMotionLevel } from '@/hooks/useMotionLevel'

export function WeaveReveal({
  children,
  from = 'left',
  delay = 0,
  className,
}: {
  children: ReactNode
  from?: 'left' | 'right'
  delay?: number
  className?: string
}) {
  const level = useMotionLevel()

  if (level === 'reduced') return <div className={className}>{children}</div>

  const offset = level === 'mobile' ? 0 : from === 'left' ? -48 : 48

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, x: offset }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{
        duration: 0.42,
        delay,
        ease: [0.22, 1.2, 0.36, 1], // decisive, slight overshoot
      }}
    >
      {children}
    </motion.div>
  )
}
