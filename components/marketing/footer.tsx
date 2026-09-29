import { Github, Heart, Mail } from "lucide-react";
import Link from "next/link";

import { Logo } from "@/components/logo";
import { Container } from "@/components/marketing/section";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "/#features" },
      { label: "Pricing", href: "/#pricing" },
      { label: "How it works", href: "/#how-it-works" },
      { label: "Changelog", href: "/dashboard" },
    ],
  },
  {
    title: "Developers",
    links: [
      { label: "Documentation", href: "/#faq" },
      { label: "Tracking API", href: "/#faq" },
      { label: "Self-hosting", href: "/#pricing" },
      { label: "Status", href: "/#faq" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/#faq" },
      { label: "Blog", href: "/#features" },
      { label: "Privacy", href: "/#faq" },
      { label: "Terms", href: "/#faq" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="relative border-t border-border/50">
      <Container size="wide">
        <div className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[1.5fr_repeat(3,1fr)]">
          <div>
            <Link href="/" className="group inline-flex rounded-full">
              <Logo />
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Privacy-first web analytics for people who&apos;d rather ship than
              configure. Built with Next.js, Prisma and a stubborn 1.4kb budget.
            </p>
            <div className="mt-5 flex items-center gap-2">
              <a
                href="https://github.com"
                target="_blank"
                rel="noreferrer noopener"
                aria-label="GitHub"
                className="glass flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
              >
                <Github className="size-4" />
              </a>
              <a
                href="mailto:hello@bunnymetrics.dev"
                aria-label="Email us"
                className="glass flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
              >
                <Mail className="size-4" />
              </a>
            </div>
          </div>

          {COLUMNS.map((column) => (
            <div key={column.title}>
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground/70">
                {column.title}
              </h3>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-primary"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-border/50 py-7 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} BunnyMetrics. Open source, MIT licensed.
          </p>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            Made with{" "}
            <Heart className="size-3.5 fill-primary text-primary" />
            by a small team that hates dark patterns
          </p>
        </div>
      </Container>
    </footer>
  );
}
