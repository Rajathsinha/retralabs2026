import { motion } from 'framer-motion';
import { useEffect, useState, useRef } from 'react';

interface PremiumHeroAnimationProps {
  children: React.ReactNode;
  delay?: number;
}

export function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return prefersReducedMotion;
}

// Hero text reveal with character stagger
export function HeroHeadline({ text, delay = 0 }: { text: string; delay?: number }) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, delay }}
    >
      {text.split(' ').map((word, wordIdx) => (
        <motion.span key={wordIdx} style={{ display: 'inline-block', marginRight: '0.25em' }}>
          {word.split('').map((char, charIdx) => (
            <motion.span
              key={charIdx}
              initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, filter: 'blur(8px)' }}
              animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, filter: 'blur(0)' }}
              transition={{
                duration: prefersReducedMotion ? 0 : 0.5,
                delay: prefersReducedMotion ? 0 : delay + (wordIdx * 0.04) + (charIdx * 0.02),
                ease: 'easeOut',
              }}
              style={{ display: 'inline-block' }}
            >
              {char}
            </motion.span>
          ))}
        </motion.span>
      ))}
    </motion.div>
  );
}

// Fade up animation for elements entering viewport
export function FadeUpOnScroll({ children, delay = 0 }: PremiumHeroAnimationProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.15 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <motion.div
      ref={ref}
      initial={prefersReducedMotion ? {} : { opacity: 0, y: 24 }}
      animate={inView || prefersReducedMotion ? { opacity: 1, y: 0 } : {}}
      transition={{
        duration: prefersReducedMotion ? 0 : 0.7,
        delay: prefersReducedMotion ? 0 : delay,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      {children}
    </motion.div>
  );
}

// Interactive button with scale and glow
export function PremiumButton({ children, onClick, className = '' }: { children: React.ReactNode; onClick?: () => void; className?: string }) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.button
      onClick={onClick}
      className={className}
      whileHover={prefersReducedMotion ? {} : { scale: 1.03 }}
      whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25, duration: prefersReducedMotion ? 0 : 0.2 }}
    >
      {children}
    </motion.button>
  );
}

// Floating product image with rotation and glow
export function FloatingProduct({ src, alt }: { src: string; alt: string }) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
      animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.3, ease: 'easeOut' }}
    >
      {/* Pulsing glow */}
      {!prefersReducedMotion && (
        <motion.div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            background: 'radial-gradient(ellipse 70% 65% at 50% 52%, rgba(37,99,235,0.15) 0%, rgba(37,99,235,0.05) 50%, transparent 80%)',
            pointerEvents: 'none',
          }}
          animate={{ scale: [0.95, 1.05, 0.95] }}
          transition={{
            duration: 7,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}

      {/* Floating animation */}
      <motion.div
        style={{ position: 'relative' }}
        animate={
          prefersReducedMotion
            ? {}
            : {
                y: [0, -8, 0],
                rotate: [-1, 0.5, -1],
              }
        }
        transition={{
          y: { duration: 6, repeat: Infinity, ease: 'easeInOut' },
          rotate: { duration: 18, repeat: Infinity, ease: 'linear' },
        }}
      >
        <img src={src} alt={alt} className="w-full h-full object-contain" />
      </motion.div>
    </motion.div>
  );
}

// Glass reflection sweep effect
export function GlassReflection() {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) return null;

  return (
    <motion.div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
        pointerEvents: 'none',
        borderRadius: '50%',
      }}
      animate={{ x: ['-100%', '100%'] }}
      transition={{
        duration: 14,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    />
  );
}

// Scroll progress indicator
export function ScrollIndicator() {
  const [scrollY, setScrollY] = useState(0);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrolled = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      setScrollY(scrolled);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (prefersReducedMotion) return null;

  return (
    <motion.div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        background: 'linear-gradient(90deg, #2563EB 0%, #00C896 100%)',
        width: `${scrollY}%`,
        zIndex: 9000,
      }}
      transition={{ duration: 0.3 }}
    />
  );
}

// Staggered card entrance
export function StaggerContainer({ children, delay = 0 }: { children: React.ReactNode[]; delay?: number }) {
  const prefersReducedMotion = useReducedMotion();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: prefersReducedMotion ? 0 : 0.1,
        delayChildren: delay,
      },
    },
  };

  const itemVariants = {
    hidden: prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: prefersReducedMotion ? 0 : 0.5, ease: 'easeOut' },
    },
  };

  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <motion.div
      ref={ref}
      variants={containerVariants}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
    >
      {Array.isArray(children) &&
        children.map((child, idx) => (
          <motion.div key={idx} variants={itemVariants}>
            {child}
          </motion.div>
        ))}
    </motion.div>
  );
}

// Hover lift effect for cards
export function LiftCard({ children, className = '' }: PremiumHeroAnimationProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      whileHover={
        prefersReducedMotion
          ? {}
          : {
              y: -4,
              boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
            }
      }
      transition={{ duration: prefersReducedMotion ? 0 : 0.3, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}
