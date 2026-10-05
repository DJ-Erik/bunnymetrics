import { getTranslations } from "next-intl/server";
import { Github, Heart, Mail } from "lucide-react";

import { LanguageSwitcher } from "@/components/language-switcher";
import { Logo } from "@/components/logo";
import { Container } from "@/components/marketing/section";
import { Link } from "@/i18n/navigation";

const COLUMNS = [
  {
    namespace: "footer.columns.product",
    titleKey: "title",
    links: [
      { label: "features", href: "/#features" },
      { label: "pricing", href: "/#pricing" },
      { label: "howItWorks", href: "/#how-it-works" },
      { label: "changelog", href: "/dashboard" },
    ],
  },
  {
    namespace: "footer.columns.developers",
    titleKey: "title",
    links: [
      { label: "docs", href: "/#faq" },
      { label: "api", href: "/#faq" },
      { label: "selfHosting", href: "/#pricing" },
      { label: "status", href: "/#faq" },
    ],
  },
  {
    namespace: "footer.columns.company",
    titleKey: "title",
    links: [
      { label: "about", href: "/#faq" },
      { label: "blog", href: "/#features" },
      { label: "privacy", href: "/#faq" },
      { label: "terms", href: "/#faq" },
    ],
  },
] as const;

export async function Footer({
  locale,
  currentPath,
}: {
  locale: string;
  currentPath: string;
}) {
  const t = await getTranslations("footer");
  const tl = await getTranslations("language");

  return (
    <footer className="relative border-t border-border/50">
      <Container size="wide">
        <div className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[1.5fr_repeat(3,1fr)]">
          <div>
            <Link href="/" className="group inline-flex rounded-full">
              <Logo />
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              {t("description")}
            </p>
            <div className="mt-5 flex items-center gap-2">
              <LanguageSwitcher
                locale={locale}
                currentPath={currentPath}
                label={tl("label")}
              />
              <a
                href="https://github.com"
                target="_blank"
                rel="noreferrer noopener"
                aria-label={t("github")}
                className="glass flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
              >
                <Github className="size-4" />
              </a>
              <a
                href="mailto:hello@bunnymetrics.dev"
                aria-label={t("email")}
                className="glass flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
              >
                <Mail className="size-4" />
              </a>
            </div>
          </div>

          {COLUMNS.map((column) => (
            <FooterColumn key={column.namespace} namespace={column.namespace} titleKey={column.titleKey} links={column.links} />
          ))}
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-border/50 py-7 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            {t("copyright", { year: new Date().getFullYear() })}
          </p>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {t("madeWith")} <Heart className="size-3.5 fill-primary text-primary" />
            {t("madeWithTail")}
          </p>
        </div>
      </Container>
    </footer>
  );
}

async function FooterColumn({
  namespace,
  titleKey,
  links,
}: {
  namespace: string;
  titleKey: string;
  links: ReadonlyArray<{ label: string; href: string }>;
}) {
  const t = await getTranslations(namespace);

  return (
    <div>
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground/70">
        {t(titleKey)}
      </h3>
      <ul className="mt-4 space-y-2.5">
        {links.map((link) => (
          <li key={link.label}>
            <Link
              href={link.href}
              className="text-sm text-muted-foreground transition-colors hover:text-primary"
            >
              {t(link.label)}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
