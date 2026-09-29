"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";
import { ArrowRight, Loader2, Lock, Mail, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const PERKS = [
  "10,000 events every month, free",
  "No credit card, no consent banner",
  "Live in under 60 seconds",
];

export function SignupForm() {
  const router = useRouter();

  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setPending(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = (await response.json()) as {
        error?: string;
        fields?: Record<string, string>;
      };

      if (!response.ok) {
        setErrors(data.fields ?? { form: data.error ?? "Could not create account" });
        return;
      }

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setErrors({ form: "Account created — but sign-in failed. Try logging in." });
        return;
      }

      toast.success("Account created", {
        description: "Add your first site to start tracking.",
      });
      router.push("/dashboard");
      router.refresh();
    } catch {
      setErrors({ form: "Network error. Please try again." });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="glass-strong sheen rounded-3xl p-7 sm:p-8">
        <div className="text-center">
          <h1 className="font-display text-2xl font-bold tracking-tight">
            Start tracking free
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            No credit card. No cookie banner. Cancel whenever.
          </p>
        </div>

        <ul className="mt-6 space-y-2">
          {PERKS.map((perk) => (
            <li key={perk} className="flex items-center gap-2.5 text-sm text-muted-foreground">
              <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-success/15">
                <svg viewBox="0 0 12 12" className="size-2.5 fill-success" aria-hidden>
                  <path d="M10 3.5 5.2 8.8 2 5.6l.9-.9 2.3 2.3L9.1 2.6z" />
                </svg>
              </span>
              {perk}
            </li>
          ))}
        </ul>

        <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="name"
                type="text"
                autoComplete="name"
                required
                placeholder="Ada Lovelace"
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-invalid={Boolean(errors.name)}
                className="pl-10"
              />
            </div>
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

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
            {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={Boolean(errors.password)}
                className="pl-10"
              />
            </div>
            {errors.password && (
              <p className="text-xs text-destructive">{errors.password}</p>
            )}
          </div>

          {errors.form && (
            <p
              role="alert"
              className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {errors.form}
            </p>
          )}

          <Button type="submit" size="lg" className="group w-full" disabled={pending}>
            {pending ? (
              <>
                <Loader2 className="animate-spin" />
                Creating account…
              </>
            ) : (
              <>
                Create account
                <ArrowRight className="transition-transform group-hover:translate-x-1" />
              </>
            )}
          </Button>
        </form>
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
