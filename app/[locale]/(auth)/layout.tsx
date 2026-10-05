import { getTranslations, setRequestLocale } from "next-intl/server";

import { Logo } from "@/components/logo";
import { AuroraBackground } from "@/components/aurora-background";
import { Link } from "@/i18n/navigation";

/**
 * Shared chrome for /login and /signup.
 *
 * Reads no headers or cookies: anything dynamic here opts both auth routes out
 * of static prerendering. `setRequestLocale` is what keeps them prerendering —
 * without it `getTranslations` awaits request headers, and the guard in
 * scripts/check-bailout.mjs fails the build.
 *
 * The language switcher is rendered by each page rather than here, because this
 * layout covers two routes and cannot tell which one it is rendering.
 */
export default async function AuthLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("auth");
  const tn = await getTranslations("nav");

  return (
    <div className="relative isolate flex min-h-dvh flex-col">
      <AuroraBackground />

      <header className="relative z-10 flex items-center justify-between p-6">
        <Link href="/" className="group rounded-full" aria-label={tn("home")}>
          <Logo />
        </Link>
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-5 py-10">
        {children}
      </main>

      <footer className="relative z-10 p-6 text-center text-xs text-muted-foreground">
        {t("footer", { year: new Date().getFullYear() })}
      </footer>
    </div>
  );
}