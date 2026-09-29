import Link from "next/link";

import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { AuroraBackground } from "@/components/aurora-background";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative isolate flex min-h-dvh flex-col">
      <AuroraBackground />

      <header className="relative z-10 flex items-center justify-between p-6">
        <Link href="/" className="group rounded-full" aria-label="BunnyMetrics home">
          <Logo />
        </Link>
        <ThemeToggle />
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-5 py-10">
        {children}
      </main>

      <footer className="relative z-10 p-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} BunnyMetrics · MIT licensed
      </footer>
    </div>
  );
}
