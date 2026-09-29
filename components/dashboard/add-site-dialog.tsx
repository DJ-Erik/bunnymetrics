"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const EXAMPLES = ["acme.com", "mysite.dev", "blog.example.org"];

export function AddSiteDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [domain, setDomain] = React.useState("");
  const [environment, setEnvironment] = React.useState("production");
  const [pending, setPending] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (open) {
      setName("");
      setDomain("");
      setEnvironment("production");
      setErrors({});
    }
  }, [open]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setPending(true);

    try {
      const response = await fetch("/api/sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, domain, environment }),
      });

      const data = (await response.json()) as {
        error?: string;
        fields?: Record<string, string>;
        site?: { publicId: string };
      };

      if (!response.ok) {
        setErrors(data.fields ?? { form: data.error ?? "Could not create site" });
        return;
      }

      toast.success("Site created", {
        description: "Paste the snippet into your site to start collecting.",
      });
      onOpenChange(false);
      router.push(`/dashboard?site=${data.site?.publicId}`);
      router.refresh();
    } catch {
      setErrors({ form: "Network error. Please try again." });
    } finally {
      setPending(false);
    }
  }

  // Derive a sensible name from the domain until the user types their own.
  const onDomainChange = (value: string) => {
    setDomain(value);
    if (!name || name === autoNameFromDomain(domain)) {
      setName(autoNameFromDomain(value));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a new site</DialogTitle>
          <DialogDescription>
            We&apos;ll generate a unique tracking key for this property.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="site-domain">Domain</Label>
            <Input
              id="site-domain"
              autoFocus
              required
              placeholder="acme.com"
              value={domain}
              onChange={(e) => onDomainChange(e.target.value)}
              aria-invalid={Boolean(errors.domain)}
            />
            {errors.domain ? (
              <p className="text-xs text-destructive">{errors.domain}</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                No protocol needed. Try{" "}
                {EXAMPLES.slice(0, 2).map((example, i) => (
                  <React.Fragment key={example}>
                    <button
                      type="button"
                      className="text-primary underline-offset-2 hover:underline"
                      onClick={() => onDomainChange(example)}
                    >
                      {example}
                    </button>
                    {i === 0 && ", "}
                  </React.Fragment>
                ))}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="site-name">Display name</Label>
            <Input
              id="site-name"
              required
              placeholder="Acme Marketing Site"
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-invalid={Boolean(errors.name)}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="site-environment">Environment</Label>
            <Select value={environment} onValueChange={setEnvironment}>
              <SelectTrigger id="site-environment">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="production">Production</SelectItem>
                <SelectItem value="staging">Staging</SelectItem>
                <SelectItem value="development">Development</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {errors.form && (
            <p
              role="alert"
              className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {errors.form}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="animate-spin" /> : <Plus />}
              Create site
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function autoNameFromDomain(value: string): string {
  const clean = value
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0];

  if (!clean) return "";
  const base = clean.split(".")[0] ?? clean;
  return base.charAt(0).toUpperCase() + base.slice(1);
}
