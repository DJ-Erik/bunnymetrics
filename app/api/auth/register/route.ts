import { hash } from "bcryptjs";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { fieldErrors, signUpSchema } from "@/lib/validations";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = signUpSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please fix the highlighted fields", fields: fieldErrors(parsed.error) },
      { status: 422 },
    );
  }

  const email = parsed.data.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      {
        error: "An account with that email already exists",
        fields: { email: "Already registered — try signing in" },
      },
      { status: 409 },
    );
  }

  const user = await prisma.user.create({
    data: {
      email,
      name: parsed.data.name,
      password: await hash(parsed.data.password, 10),
      plan: "hobby",
    },
    select: { id: true, email: true, name: true, plan: true },
  });

  return NextResponse.json({ user }, { status: 201 });
}
