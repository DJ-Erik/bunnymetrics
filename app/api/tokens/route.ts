import { z } from "zod";

import { apiError, apiOk, authenticate, generateToken } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * `POST /api/tokens` — mint a server-side API key for batch ingestion.
 * The plaintext token is returned exactly once; only its bcrypt hash is stored.
 */
export async function POST(request: Request) {
  const auth = await authenticate(request);
  if (!auth) return apiError("Unauthorized", 401);

  if (auth.via !== "session") {
    return apiError("Create tokens from the dashboard, not with a token", 403);
  }

  const body = await request.json().catch(() => ({}));
  const name = z
    .string()
    .trim()
    .min(2, "Give the token a name")
    .max(64)
    .safeParse((body as { name?: unknown })?.name);

  if (!name.success) {
    return apiError(name.error.issues[0]?.message ?? "Invalid name", 422);
  }

  const existing = await prisma.apiToken.count({ where: { userId: auth.userId } });
  if (existing >= 20) {
    return apiError("You've hit the limit of 20 API tokens", 409);
  }

  const { hash } = await import("bcryptjs");
  const token = generateToken();
  // First 11 chars identify the row; the rest is the secret.
  const prefix = token.slice(0, 11);

  await prisma.apiToken.create({
    data: {
      name: name.data,
      prefix,
      hash: await hash(token, 10),
      userId: auth.userId,
    },
  });

  return apiOk({ token, prefix, name: name.data }, 201);
}

/** `GET /api/tokens` — list token metadata (never the secret). */
export async function GET(request: Request) {
  const auth = await authenticate(request);
  if (!auth) return apiError("Unauthorized", 401);

  const tokens = await prisma.apiToken.findMany({
    where: { userId: auth.userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      prefix: true,
      createdAt: true,
      lastUsedAt: true,
      expiresAt: true,
    },
  });

  return apiOk({ tokens });
}
