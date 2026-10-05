"use client";

import { ArrowRight, Code2, Cookie, Plus, ShieldCheck, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import * as React from "react";

import { AddSiteDialog } from "@/components/dashboard/add-site-dialog";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { defaultLocale } from "@/lib/locales";

const PROMISES = ["promise1", "promise2", "promise3"] as const;
const ICONS = [Zap, Cookie, ShieldCheck];

export function EmptyState({ locale, plan }: { locale: string; plan: string }) {
  const t = useTranslations("dashboard.empty");
  const router = useRouter();
  const [open, setOpen] = React.useState(false);

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-5 py-16">
      <div className="w-full max-w-2xl text-center">
        <Logo className="mx-auto mb-8" showWordmark={false} />

        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-pretty text-muted-foreground">
          {t("subtitle")}
        </p>

        <Button size="xl" className="mt-8" onClick={() => setOpen(true)}>
          <Plus />
          {t("cta")}
        </Button>

        <div className="mt-6 flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <span>{t("plan", { plan })}</span>
          <span className="size-1 rounded-full bg-border" />
          <span>{t("noCard")}</span>
          <span className="size-1 rounded-full bg-border" />
          <span className="flex items-center gap-1">
            <Code2 className="size-3" />
            {t("size")}
          </span>
        </div>
      </div>

      <div className="mt-14 grid w-full max-w-3xl gap-4 sm:grid-cols-3">
        {PROMISES.map((key, index) => {
          const Icon = ICONS[index];
          return (
            <Card key={key} className="p-5 text-left">
              <Icon className="size-5 text-primary" />
              <p className="mt-3 text-sm font-semibold">{t(`${key}.title`)}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {t(`${key}.body`)}
              </p>
            </Card>
          );
        })}
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="mt-10"
        onClick={() => router.push(locale === defaultLocale ? "/" : `/${locale}`)}
      >
        {t("backHome")}
        <ArrowRight />
      </Button>

      <AddSiteDialog locale={locale} open={open} onOpenChange={setOpen} />
    </div>
  );
}
