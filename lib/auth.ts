import NextAuth, { type DefaultSession, type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { signInSchema } from "@/lib/validations";

/**
 * Extend the session so every server component / route handler can read the
 * authenticated user without an extra database round-trip.
 */
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      plan: string;
    } & DefaultSession["user"];
  }

  interface User {
    plan: string;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    plan: string;
  }
}

const credentialsProvider = Credentials({
  name: "Email & password",
  credentials: {
    email: { label: "Email", type: "email" },
    password: { label: "Password", type: "password" },
  },
  async authorize(rawCredentials) {
    const parsed = signInSchema.safeParse(rawCredentials);
    if (!parsed.success) return null;

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (!user) return null;

    const valid = await compare(password, user.password);
    if (!valid) return null;

    return {
      id: user.id,
      email: user.email,
      name: user.name ?? user.email.split("@")[0],
      image: user.image ?? null,
      plan: user.plan,
    };
  },
});

export const authConfig: NextAuthConfig = {
  providers: [credentialsProvider],
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 },
  pages: { signIn: "/login", error: "/login" },
  trustHost: true,
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // `user.id` is optional on the base User type but always present for
        // the credentials provider, which always sets it.
        token.id = user.id ?? token.sub ?? "";
        token.plan = user.plan ?? "hobby";
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id ?? token.sub ?? "";
      session.user.plan = token.plan ?? "hobby";
      return session;
    },
  },
};

export const { handlers, signIn, signOut, auth } = NextAuth(authConfig);
