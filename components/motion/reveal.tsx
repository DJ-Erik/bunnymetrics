"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import * as React from "react";

import { cn } from "@/lib/utils";

/** Shared easing — a gentle "emphasised" curve used across the whole site. */
export const EASE = [0.16, 1, 0.3, 1] as const;

interface RevealProps extends React.HTMLAttributes<HTMLElement> {
  delay?: number;
  y?: number;
  duration?: number;
  once?: boolean;
  as?: "div" | "section" | "li" | "article" | "header" | "footer";
}

/** Fade + rise once the element scrolls into view. */
export function Reveal({
  children,
  className,
  delay = 0,
  y = 18,
  duration = 0.65,
  once = true,
  as = "div",
  ...props
}: RevealProps) {
  const reduce = useReducedMotion();
  const Comp = motion[as] as typeof motion.div;

  if (reduce) {
    const Static = as;
    return (
      <Static className={className} {...props}>
        {children}
      </Static>
    );
  }

  return (
    <Comp
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: "-80px" }}
      transition={{ duration, delay, ease: EASE }}
      {...(props as Record<string, unknown>)}
    >
      {children}
    </Comp>
  );
}

const staggerParent: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const staggerChild: Variants = {
  hidden: { opacity: 0, y: 22, scale: 0.985 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6, ease: EASE } },
};

/** Parent that cascades its children in. Pair with `<StaggerItem />`. */
export function Stagger({
  children,
  className,
  as = "div",
}: {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "section" | "ul";
}) {
  const Comp = motion[as] as typeof motion.div;
  return (
    <Comp
      className={className}
      variants={staggerParent}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-70px" }}
    >
      {children}
    </Comp>
  );
}

export function StaggerItem({
  children,
  className,
  as = "div",
}: {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "li" | "article";
}) {
  const Comp = motion[as] as typeof motion.div;
  return (
    <Comp className={className} variants={staggerChild}>
      {children}
    </Comp>
  );
}

/** Counts from 0 to `value` when scrolled into view. */
export function AnimatedNumber({
  value,
  className,
  format = (n: number) => new Intl.NumberFormat("en-US").format(Math.round(n)),
  duration = 1.6,
}: {
  value: number;
  className?: string;
  format?: (n: number) => string;
  duration?: number;
}) {
  const reduce = useReducedMotion();
  const ref = React.useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = React.useState(0);
  const [started, setStarted] = React.useState(false);

  React.useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (reduce) {
      setDisplay(value);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !started) setStarted(true);
      },
      { threshold: 0.3 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [started, reduce, value]);

  React.useEffect(() => {
    if (!started || reduce) return;

    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / (duration * 1000), 1);
      // easeOutExpo
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setDisplay(value * eased);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [started, value, duration, reduce]);

  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {format(started || reduce ? display : 0)}
    </span>
  );
}
