"use client";

import { Toaster as Sonner } from "sonner";

import { useTheme } from "next-themes";

export function Toaster() {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as "light" | "dark" | "system"}
      position="bottom-right"
      closeButton
      richColors
      toastOptions={{
        classNames: {
          toast:
            "glass-strong !rounded-xl !border-border/60 !text-foreground !shadow-lift",
          description: "!text-muted-foreground",
          actionButton: "!bg-primary !text-primary-foreground !rounded-full",
          cancelButton: "!bg-muted !text-muted-foreground !rounded-full",
        },
      }}
    />
  );
}
