import { randomBytes, randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

/** Prefixed, URL-safe, non-sequential public key for a site or API token. */
export function generatePublicId(prefix = "bm"): string {
  return `${prefix}_${randomBytes(9).toString("base64url")}`;
}

export function generateToken(): string {
  return `bmt_${randomUUID().replace(/-/g, "")}`;
}

/** True once a real Stripe key is configured; otherwise billing runs mocked. */
export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

const json = (data: unknown, status = 200) =>
  NextResponse.json(data as Record<string, unknown>, {
    status,
    headers: { "Cache-Control": "no-store" },
  });

export const apiError = (message: string, status = 400, extra?: Record<string, unknown>) =>
  json({ error: message, ...extra }, status);

export const apiOk = <T>(data: T, status = 200) => json(data, status);

/**
 * Resolve the caller from a NextAuth session, or from an `Authorization:
 * Bearer bmt_…` API token for server-to-server ingestion.
 */
export async function authenticate(request: Request): Promise<{
  userId: string;
  via: "session" | "token";
} | null> {
  const { auth } = await import("@/lib/auth");

  const session = await auth();
  if (session?.user?.id) {
    return { userId: session.user.id, via: "session" };
  }

  const header = request.headers.get("authorization");
  if (header?.toLowerCase().startsWith("bearer ")) {
    const raw = header.slice(7).trim();
    // Tokens are `bmt_<secret>`; the first 11 chars are the lookup prefix.
    const prefix = raw.slice(0, 11);
    if (prefix.length < 11) return null;

    const record = await prisma.apiToken.findUnique({ where: { prefix } });
    if (!record) return null;
    if (record.expiresAt && record.expiresAt < new Date()) return null;

    const { compare } = await import("bcryptjs");
    if (!(await compare(raw, record.hash))) return null;

    await prisma.apiToken.update({
      where: { id: record.id },
      data: { lastUsedAt: new Date() },
    });
    return { userId: record.userId, via: "token" };
  }

  return null;
}
