/**
 * Scroll-triggered animated section.
 * Uses Framer Motion's whileInView — no layout shifts, GPU-accelerated.
 * Automatically degrades to instant-visible on reduced-motion devices.
 *
 * Usage:
 *   <AnimatedSection variants={fadeUp} delay={0.1}>
 *     <YourContent />
 *   </AnimatedSection>
 */
import { motion, Variants } from 'framer-motion';
import { ReactNode } from 'react';
import { fadeUp } from '../animations/variants';
import { useReducedMotion } from '../hooks/useReducedMotion';

interface AnimatedSectionProps {
  children: ReactNode;
  variants?: Variants;
  delay?: number;
  className?: string;
  /** Trigger viewport margin (default: 80px from bottom) */
  margin?: string;
  /** Only animate once (default: true) */
  once?: boolean;
  as?: 'div' | 'section' | 'article' | 'li';
}

export default function AnimatedSection({
  children,
  variants,
  delay = 0,
  className = '',
  margin = '0px 0px -80px 0px',
  once = true,
  as = 'div',
}: AnimatedSectionProps) {
  const reduced = useReducedMotion();
  const MotionTag = motion[as];

  // Build variant with delay injected at the transition level
  const appliedVariants: Variants = variants
    ? {
        hidden: variants.hidden,
        visible: {
          ...(variants.visible as object),
          transition: {
            ...((variants.visible as { transition?: object }).transition ?? {}),
            delay,
          },
        },
      }
    : {
        hidden: fadeUp.hidden,
        visible: {
          ...(fadeUp.visible as object),
          transition: {
            ...((fadeUp.visible as { transition?: object }).transition ?? {}),
            delay,
          },
        },
      };

  if (reduced) {
    const Tag = as as keyof JSX.IntrinsicElements;
    return <Tag className={className}>{children}</Tag>;
  }

  return (
    <MotionTag
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, margin }}
      variants={appliedVariants}
    >
      {children}
    </MotionTag>
  );
}
