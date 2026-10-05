"use client";

import { signIn } from "next-auth/react";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Lock, Mail } from "lucide-react";

import { Link } from "@/i18n/navigation";

export function LoginForm({ locale }: { locale: string }) {
  const t = useTranslations("auth.login");
  const router = useRouter();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  // Read post-login redirect after mount rather than via useSearchParams, so
  // the page stays fully prerendered instead of bailing to client rendering.
  const [callbackUrl, setCallbackUrl] = React.useState("/dashboard");
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const target = params.get("callbackUrl");
    if (target && target.startsWith("/") && !target.startsWith("//")) {
      setCallbackUrl(target);
    }
  }, []);

  /** Stay in the active language after signing in. */
  const home = locale === "en" ? "/dashboard" : `/${locale}/dashboard`;

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setPending(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setErrors({ form: t("error") });
        return;
      }

      toast.success(t("success"));
      router.push(callbackUrl === "/dashboard" ? home : callbackUrl);
      router.refresh();
    } catch {
      setErrors({ form: t("error") });
    } finally {
      setPending(false);
    }
  }

  function fillDemo() {
    setEmail("demo@bunnymetrics.dev");
    setPassword("demo1234");
    setErrors({});
  }

  return (
    <div className="w-full max-w-md">
      <div className="glass-strong sheen rounded-3xl p-7 sm:p-8">
        <div className="text-center">
          <h1 className="font-display text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>

        <form onSubmit={onSubmit} className="mt-7 space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="email">{t("email")}</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@acme.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={Boolean(errors.email)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">{t("password")}</Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={Boolean(errors.password)}
                className="pl-10"
              />
            </div>
          </div>

          {errors.form && (
            <p
              role="alert"
              className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {errors.form}
            </p>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={pending}>
            {pending ? (
              <>
                <Loader2 className="animate-spin" />
                {t("submitting")}
              </>
            ) : (
              t("submit")
            )}
          </Button>
        </form>

        <div className="mt-6 rounded-xl border border-border/60 bg-background/40 p-4">
          <p className="text-xs font-medium">{t("demoTitle")}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t("demoBody")}</p>
          <Button
            type="button"
            variant="subtle"
            size="sm"
            className="mt-3 w-full"
            onClick={fillDemo}
          >
            {t("demoButton")}
          </Button>
        </div>
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {t("noAccount")}{" "}
        <Link
          href="/signup"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          {t("startFree")}
        </Link>
      </p>
    </div>
  );
}
