'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { useMotionProfile } from './MotionProfileProvider'
import { TAP_SCALE } from './presets'

const MotionButtonBase = motion.create(Button)

// HTMLButtonElement's onAnimation*/onDrag* handlers conflict with framer-motion's
// props of the same name — omit them and take the merged (Button ∪ motion) prop type instead,
// so callers can also pass animate/whileHover/variants etc.
type MotionButtonProps = Omit<
  React.ComponentPropsWithoutRef<typeof MotionButtonBase>,
  'onAnimationStart' | 'onAnimationEnd' | 'onAnimationIteration' | 'onDrag' | 'onDragStart' | 'onDragEnd'
>

/** Button with a tap down-scale — same visuals as Button, just adds
 *  whileTap feedback (skipped under prefers-reduced-motion). */
export const MotionButton = React.forwardRef<HTMLButtonElement, MotionButtonProps>(
  (props, ref) => {
    const { reduced } = useMotionProfile()
    return (
      <MotionButtonBase
        ref={ref}
        whileTap={reduced ? undefined : { scale: TAP_SCALE }}
        transition={{ duration: 0.1 }}
        {...props}
      />
    )
  }
)
MotionButton.displayName = 'MotionButton'
