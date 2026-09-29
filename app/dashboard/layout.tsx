import type { Metadata } from "next";

import { DashboardSidebar, MobileDashboardBar } from "@/components/dashboard/sidebar";
import { AuroraBackground } from "@/components/aurora-background";
import { getUserSites, requireUser } from "@/lib/guards";

export const metadata: Metadata = {
  title: { default: "Dashboard", template: "%s · BunnyMetrics" },
  description: "Traffic, pages, referrers and realtime visitors for your sites.",
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const sites = await getUserSites(user.id);
  const account = { name: user.name, email: user.email, plan: user.plan };

  return (
    <div className="relative isolate flex min-h-dvh">
      <AuroraBackground variant="page" className="fixed inset-0 -z-10" />

      <DashboardSidebar user={account} sites={sites} />

      <div className="flex min-w-0 flex-1 flex-col">
        <MobileDashboardBar user={account} sites={sites} />
        {children}
      </div>
    </div>
  );
}
