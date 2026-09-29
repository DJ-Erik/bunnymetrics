import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { listSitesForUser } from "@/lib/stats";

/** Server-side session guard for every authenticated route. */
export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user;
}

export type SiteWithCount = Awaited<ReturnType<typeof listSitesForUser>>[number];

export async function getUserSites(userId: string) {
  return listSitesForUser(userId);
}

export { prisma };
