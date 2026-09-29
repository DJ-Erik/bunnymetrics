import { cn } from "@/lib/utils";

/** The mark: a geometric bunny head reduced to two ears + a rounded face. */
export function LogoMark({
  className,
  ...props
}: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={cn("size-8", className)}
      {...props}
    >
      <defs>
        <linearGradient id="bm-mark" x1="4" y1="2" x2="28" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="hsl(var(--primary))" />
          <stop offset="0.55" stopColor="hsl(var(--accent))" />
          <stop offset="1" stopColor="hsl(var(--cyan))" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="30" height="30" rx="9" fill="url(#bm-mark)" opacity="0.16" />
      <rect
        x="1"
        y="1"
        width="30"
        height="30"
        rx="9"
        stroke="url(#bm-mark)"
        strokeOpacity="0.5"
        strokeWidth="1"
      />
      {/* ears */}
      <path
        d="M11.4 12.6c-.7-2.6-.5-4.6.5-5.1 1-.5 2.3.9 2.9 3.4"
        stroke="url(#bm-mark)"
        strokeWidth="2.1"
        strokeLinecap="round"
      />
      <path
        d="M20.6 12.6c.7-2.6.5-4.6-.5-5.1-1-.5-2.3.9-2.9 3.4"
        stroke="url(#bm-mark)"
        strokeWidth="2.1"
        strokeLinecap="round"
      />
      {/* face */}
      <path
        d="M16 12.2c3.9 0 6.6 2.5 6.6 5.9 0 3.6-2.9 6.3-6.6 6.3s-6.6-2.7-6.6-6.3c0-3.4 2.7-5.9 6.6-5.9Z"
        fill="url(#bm-mark)"
      />
      {/* eyes */}
      <circle cx="13.5" cy="17.4" r="1.35" fill="hsl(var(--background))" />
      <circle cx="18.5" cy="17.4" r="1.35" fill="hsl(var(--background))" />
    </svg>
  );
}

export function Logo({
  className,
  wordmarkClassName,
  showWordmark = true,
}: {
  className?: string;
  wordmarkClassName?: string;
  showWordmark?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark className="size-8 shrink-0 transition-transform duration-500 group-hover:rotate-12" />
      {showWordmark && (
        <span
          className={cn(
            "font-display text-[1.05rem] font-bold tracking-tight",
            wordmarkClassName,
          )}
        >
          Bunny<span className="text-primary">Metrics</span>
        </span>
      )}
    </span>
  );
}
