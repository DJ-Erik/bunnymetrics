"use client";

import { Globe } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type Site = {
  id: string;
  publicId: string;
  name: string;
  domain: string;
  environment: string;
};

const ENV_COLOR: Record<string, string> = {
  production: "bg-success",
  staging: "bg-warning",
  development: "bg-muted-foreground",
};

export function SiteSwitcher({
  sites,
  className,
}: {
  sites: Site[];
  className?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = React.useTransition();

  // Read the active site straight from the URL so the switcher is always in
  // sync with the page, without the layout needing the search params.
  const fromUrl = searchParams.get("site");
  const active = sites.find((site) => site.publicId === fromUrl) ?? sites[0];

  function onChange(publicId: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("site", publicId);
    startTransition(() => {
      router.push(`/dashboard?${params.toString()}`);
    });
  }

  if (!active) return null;

  return (
    <Select value={active.publicId} onValueChange={onChange}>
      <SelectTrigger
        className={cn(
          "h-auto min-h-10 w-full justify-start gap-2.5 rounded-xl py-2",
          pending && "opacity-60",
          className,
        )}
        aria-label="Switch site"
      >
        <Globe className="size-4 shrink-0 text-muted-foreground" />
        <SelectValue>
          <span className="flex min-w-0 flex-col items-start text-left">
            <span className="w-full truncate text-sm font-medium leading-tight">
              {active.name}
            </span>
            <span className="flex w-full items-center gap-1.5 text-[11px] font-normal text-muted-foreground">
              <span
                className={cn(
                  "size-1.5 shrink-0 rounded-full",
                  ENV_COLOR[active.environment] ?? ENV_COLOR.development,
                )}
              />
              <span className="truncate">{active.domain}</span>
            </span>
          </span>
        </SelectValue>
      </SelectTrigger>

      <SelectContent>
        {sites.map((site) => (
          <SelectItem key={site.publicId} value={site.publicId}>
            <span className="flex items-center gap-2.5">
              <span
                className={cn(
                  "size-1.5 shrink-0 rounded-full",
                  ENV_COLOR[site.environment] ?? ENV_COLOR.development,
                )}
              />
              <span className="flex flex-col items-start">
                <span className="text-sm leading-tight">{site.name}</span>
                <span className="text-[11px] text-muted-foreground">
                  {site.domain}
                </span>
              </span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
