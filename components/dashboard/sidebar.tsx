"use client";

import { signOut } from "next-auth/react";
import Link from "next/link";
import { CreditCard, LayoutDashboard, LogOut, Plus, Settings, User } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { AddSiteDialog } from "@/components/dashboard/add-site-dialog";
import { SiteSwitcher } from "@/components/dashboard/site-switcher";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { initials } from "@/lib/utils";

type Site = {
  id: string;
  publicId: string;
  name: string;
  domain: string;
  environment: string;
};

export function DashboardSidebar({
  user,
  sites,
}: {
  user: { name?: string | null; email?: string | null; plan?: string };
  sites: Site[];
}) {
  const router = useRouter();
  const [addOpen, setAddOpen] = React.useState(false);

  const displayName = user.name || user.email || "Maker";

  return (
    <aside className="hidden h-dvh w-[17rem] shrink-0 flex-col border-r border-border/60 bg-card/40 backdrop-blur-xl lg:flex">
      <div className="flex h-16 items-center border-b border-border/60 px-5">
        <Link href="/" className="group rounded-full" aria-label="BunnyMetrics home">
          <Logo />
        </Link>
      </div>

      <div className="space-y-4 p-4">
        <SiteSwitcher sites={sites} />

        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={() => setAddOpen(true)}
        >
          <Plus />
          Add site
        </Button>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        <SidebarLink href="/dashboard" icon={LayoutDashboard} active>
          Overview
        </SidebarLink>
        <SidebarLink href="/dashboard#install" icon={Settings}>
          Install &amp; API
        </SidebarLink>
        <SidebarLink href="/dashboard#billing" icon={CreditCard}>
          Billing
        </SidebarLink>
      </nav>

      <div className="border-t border-border/60 p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-secondary">
              <Avatar className="size-8">
                <AvatarFallback>{initials(displayName)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium leading-tight">
                  {displayName}
                </p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {user.email}
                </p>
              </div>
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" side="top" className="w-56">
            <DropdownMenuLabel>
              <span className="flex items-center gap-2">
                <User className="size-3" />
                {user.plan ?? "hobby"} plan
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/dashboard#billing">
                <CreditCard />
                Manage plan
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={async () => {
                await signOut({ callbackUrl: "/" });
                toast.success("Signed out");
                router.push("/");
              }}
            >
              <LogOut />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AddSiteDialog open={addOpen} onOpenChange={setAddOpen} />
    </aside>
  );
}

function SidebarLink({
  href,
  icon: Icon,
  active,
  children,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
        active
          ? "bg-primary/12 text-primary"
          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
      }`}
    >
      <Icon className="size-4" />
      {children}
    </Link>
  );
}

export function MobileDashboardBar({
  user,
  sites,
}: {
  user: { name?: string | null; email?: string | null; plan?: string };
  sites: Site[];
}) {
  const [addOpen, setAddOpen] = React.useState(false);
  const router = useRouter();

  return (
    <div className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-xl lg:hidden">
      <div className="flex items-center gap-3 p-3">
        <Link href="/" className="shrink-0" aria-label="BunnyMetrics home">
          <Logo showWordmark={false} />
        </Link>
        <div className="min-w-0 flex-1">
          <SiteSwitcher sites={sites} />
        </div>
        <Button variant="outline" size="icon-sm" onClick={() => setAddOpen(true)} aria-label="Add site">
          <Plus />
        </Button>
        <ThemeToggle />
      </div>
      <div className="flex items-center justify-between gap-2 px-3 pb-3">
        <Badge variant="secondary" className="capitalize">
          {user.plan ?? "hobby"}
        </Badge>
        <Button
          variant="ghost"
          size="xs"
          onClick={async () => {
            await signOut({ redirectTo: "/" });
            toast.success("Signed out");
            router.push("/");
          }}
        >
          <LogOut />
          Sign out
        </Button>
      </div>

      <AddSiteDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}
