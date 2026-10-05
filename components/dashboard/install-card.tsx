"use client";

import { Check, Code2, Terminal, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { CopyButton } from "@/components/copy-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { defaultLocale } from "@/lib/locales";

const INSTALL_COMMANDS = {
  next: `# app/layout.tsx — add inside <head> or <body>
import Script from "next/script";

<Script
  src="SCRIPT_URL"
  data-site="SITE_ID"
  strategy="afterInteractive"
/>`,
  html: `<!-- Anywhere before </body> -->
<script
  defer
  src="SCRIPT_URL"
  data-site="SITE_ID"
></script>`,
  astro: `--- src/layouts/Layout.astro ---
<script
  is:inline
  defer
  src="SCRIPT_URL"
  data-site="SITE_ID"
></script>`,
  rails: `<%# app/views/layouts/application.html.erb %>
<script
  defer
  src="SCRIPT_URL"
  data-site="SITE_ID"
></script>`,
  api: `curl "SCRIPT_COLLECT_URL" \\
  -d "type=pageview" \\
  -d "path=/pricing" \\
  -d "vid=$(uuidgen)" \\
  -d "br=curl" \\
  -d "os=server" \\
  -d "dv=server"`,
};

type Variant = keyof typeof INSTALL_COMMANDS;

export function InstallCard({
  locale,
  sitePublicId,
  domain,
}: {
  locale: string;
  sitePublicId: string;
  domain: string;
}) {
  const t = useTranslations("install");
  const td = useTranslations("install.delete");
  const router = useRouter();
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

  const snippet = `<script defer src="${base}/tracking.js" data-site="${sitePublicId}"></script>`;
  const collectUrl = `${base}/api/collect?site=${sitePublicId}`;

  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  const code = (body: string) =>
    body
      .replaceAll("SCRIPT_URL", `${base}/tracking.js`)
      .replaceAll("SITE_ID", sitePublicId)
      .replaceAll("SCRIPT_COLLECT_URL", collectUrl);

  async function onDelete() {
    setDeleting(true);
    try {
      const response = await fetch(`/api/sites/${sitePublicId}`, { method: "DELETE" });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(
          data.error ?? td("error"),
        );
      }
      toast.success(td("deleted"), { description: td("deletedDescription") });
      setDeleteOpen(false);
      router.push(locale === defaultLocale ? "/dashboard" : `/${locale}/dashboard`);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : td("error"),
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <Card glass id="install" className="scroll-mt-20">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Code2 className="size-4 text-primary" />
                {t("title", { domain })}
              </CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">{t("subtitle")}</p>
            </div>
            <Badge variant="success" className="gap-1.5">
              <span className="size-1.5 rounded-full bg-success" />
              {t("live")}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="group relative overflow-hidden rounded-xl border border-border/70 bg-background/60">
            <div className="flex items-center justify-between gap-2 border-b border-border/60 px-4 py-2">
              <span className="font-mono text-[11px] text-muted-foreground">
                {t("head")}
              </span>
              <CopyButton value={snippet} size="xs" />
            </div>
            <pre className="overflow-x-auto p-4 font-mono text-[12px] leading-relaxed">
              <code className="text-foreground/85">{snippet}</code>
            </pre>
          </div>

          <Tabs defaultValue="next">
            <TabsList>
              <TabsTrigger value="next">{t("next")}</TabsTrigger>
              <TabsTrigger value="html">{t("html")}</TabsTrigger>
              <TabsTrigger value="astro">{t("astro")}</TabsTrigger>
              <TabsTrigger value="rails">{t("rails")}</TabsTrigger>
              <TabsTrigger value="api">
                <Terminal />
                {t("api")}
              </TabsTrigger>
            </TabsList>

            {(Object.keys(INSTALL_COMMANDS) as Variant[]).map((variant) => {
              const body = code(INSTALL_COMMANDS[variant]);
              return (
                <TabsContent key={variant} value={variant} className="mt-3">
                  <div className="relative overflow-hidden rounded-xl border border-border/70 bg-background/60">
                    <div className="absolute right-2 top-2 z-10">
                      <CopyButton value={body} size="xs" variant="glass" label="" />
                    </div>
                    <pre className="overflow-x-auto p-4 pr-16 font-mono text-[11.5px] leading-relaxed text-foreground/80">
                      <code>{body}</code>
                    </pre>
                  </div>
                </TabsContent>
              );
            })}
          </Tabs>

          <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
            <p className="text-xs font-medium">{t("customEvent.title")}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("customEvent.description")}
            </p>
            <div className="mt-3 flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-background/60">
              <pre className="overflow-x-auto px-3 py-2 font-mono text-[11px] text-foreground/80">
                <code>{t("customEvent.example")}</code>
              </pre>
              <CopyButton
                value={t("customEvent.example")}
                size="xs"
                variant="glass"
                label=""
                className="mr-2 shrink-0"
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-border/60 pt-4">
            <p className="text-xs text-muted-foreground">{td("lead")}</p>
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 />
              {td("trigger")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{td("title", { domain })}</DialogTitle>
            <DialogDescription>{td("description")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)} disabled={deleting}>
              {td("cancel")}
            </Button>
            <Button variant="destructive" onClick={onDelete} disabled={deleting}>
              {deleting ? <Loader2 className="animate-spin" /> : <Trash2 />}
              {td("confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export { Check };
