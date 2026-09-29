import { cn } from "@/lib/utils";

/**
 * Decorative aurora field. Purely presentational, so it is hidden from
 * assistive tech and from the layout when the user prefers reduced motion.
 */
export function AuroraBackground({
  className,
  variant = "hero",
}: {
  className?: string;
  variant?: "hero" | "page" | "cta";
}) {
  if (variant === "page") {
    return (
      <div
        aria-hidden="true"
        className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
      >
        <div className="absolute inset-0 grid-bg mask-fade-b opacity-60" />
        <div className="absolute -top-40 left-1/3 size-[38rem] rounded-full bg-primary/[0.09] blur-[120px]" />
        <div className="absolute -top-24 right-0 size-[30rem] rounded-full bg-accent/[0.09] blur-[120px]" />
      </div>
    );
  }

  if (variant === "cta") {
    return (
      <div
        aria-hidden="true"
        className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
      >
        <div className="absolute left-1/2 top-1/2 size-[46rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/[0.16] blur-[130px]" />
        <div className="absolute bottom-0 right-1/4 size-[26rem] rounded-full bg-accent/[0.16] blur-[110px]" />
        <div className="absolute left-1/4 top-0 size-[22rem] rounded-full bg-[hsl(var(--cyan))]/[0.13] blur-[110px]" />
      </div>
    );
  }

  return (
    <div
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
    >
      <div className="absolute inset-0 grid-bg mask-fade-b opacity-70" />
      <div className="absolute -top-48 left-1/2 size-[52rem] -translate-x-1/2 rounded-full bg-primary/[0.20] blur-[140px]" />
      <div className="absolute -top-24 right-[8%] size-[32rem] rounded-full bg-accent/[0.20] blur-[130px]" />
      <div className="absolute top-24 left-[6%] size-[26rem] rounded-full bg-[hsl(var(--cyan))]/[0.16] blur-[120px]" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-foreground/15 to-transparent" />
    </div>
  );
}
