"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Lock, Mail } from "lucide-react";

export function LoginForm() {
  const router = useRouter();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  // Read post-login redirect after mount rather than via useSearchParams, so
  // the page stays fully prerenderable instead of bailing to client rendering.
  const [callbackUrl, setCallbackUrl] = React.useState("/dashboard");
  React.useEffect(() => {
    const target = new URLSearchParams(window.location.search).get("callbackUrl");
    if (target && target.startsWith("/") && !target.startsWith("//")) {
      setCallbackUrl(target);
    }
  }, []);

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
        setErrors({ form: "That email and password don't match an account." });
        return;
      }

      toast.success("Welcome back");
      router.push(callbackUrl);
      router.refresh();
    } catch {
      setErrors({ form: "Something went wrong. Please try again." });
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
          <h1 className="font-display text-2xl font-bold tracking-tight">
            Welcome back
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to see what your visitors are doing.
          </p>
        </div>

        <form onSubmit={onSubmit} className="mt-7 space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
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
            <Label htmlFor="password">Password</Label>
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
                Signing in…
              </>
            ) : (
              "Sign in"
            )}
          </Button>
        </form>

        <div className="mt-6 rounded-xl border border-border/60 bg-background/40 p-4">
          <p className="text-xs font-medium">Want to look around first?</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Use the seeded demo account with 30 days of realistic traffic.
          </p>
          <Button
            type="button"
            variant="subtle"
            size="sm"
            className="mt-3 w-full"
            onClick={fillDemo}
          >
            Use demo credentials
          </Button>
        </div>
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link
          href="/signup"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Start free
        </Link>
      </p>
    </div>
  );
}
