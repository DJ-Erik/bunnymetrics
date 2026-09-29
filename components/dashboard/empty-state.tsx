"use client";

import { ArrowRight, Code2, Cookie, Plus, ShieldCheck, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

import { AddSiteDialog } from "@/components/dashboard/add-site-dialog";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const PROMISES = [
  {
    icon: Zap,
    title: "Live in 60 seconds",
    body: "Paste the snippet, refresh, watch traffic arrive.",
  },
  {
    icon: Cookie,
    title: "No consent banner",
    body: "Zero cookies and no personal data collected.",
  },
  {
    icon: ShieldCheck,
    title: "GDPR by default",
    body: "Nothing here needs a data processing agreement.",
  },
];

export function EmptyState({ plan }: { plan: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-5 py-16">
      <div className="w-full max-w-2xl text-center">
        <Logo className="mx-auto mb-8" showWordmark={false} />

        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
          Let&apos;s track your first site
        </h1>
        <p className="mx-auto mt-3 max-w-md text-pretty text-muted-foreground">
          Add a domain, paste one tag, and you&apos;ll know exactly who visits,
          what they read, and where they leave.
        </p>

        <Button
          size="xl"
          className="mt-8"
          onClick={() => setOpen(true)}
        >
          <Plus />
          Add your first site
        </Button>

        <div className="mt-6 flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <span>Free {plan} plan</span>
          <span className="size-1 rounded-full bg-border" />
          <span>No credit card</span>
          <span className="size-1 rounded-full bg-border" />
          <span className="flex items-center gap-1">
            <Code2 className="size-3" />
            1.4kb
          </span>
        </div>
      </div>

      <div className="mt-14 grid w-full max-w-3xl gap-4 sm:grid-cols-3">
        {PROMISES.map((promise) => (
          <Card key={promise.title} className="p-5 text-left">
            <promise.icon className="size-5 text-primary" />
            <p className="mt-3 text-sm font-semibold">{promise.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {promise.body}
            </p>
          </Card>
        ))}
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="mt-10"
        onClick={() => router.push("/")}
      >
        Back to home
        <ArrowRight />
      </Button>

      <AddSiteDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
