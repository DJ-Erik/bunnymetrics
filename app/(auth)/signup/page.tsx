import type { Metadata } from "next";

import { SignupForm } from "@/components/auth/signup-form";

export const metadata: Metadata = {
  title: "Create your account",
  description:
    "Start free with 10,000 events a month. No credit card, no cookie banner.",
};

export default function SignupPage() {
  return <SignupForm />;
}
