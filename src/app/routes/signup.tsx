import { useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { sessionQuery } from "@/lib/session";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { planById, type PlanId } from "../../shared/plans";

interface SignupSearch {
  plan?: PlanId;
}

export const Route = createFileRoute("/signup")({
  validateSearch: (search: Record<string, unknown>): SignupSearch => ({
    plan: planById(typeof search.plan === "string" ? search.plan : undefined)?.id,
  }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { plan } = Route.useSearch();
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");

    if (password.length < 8) {
      toast.error("Password needs at least 8 characters.");
      return;
    }

    setSubmitting(true);
    const { error } = await authClient.signUp.email({ name, email, password });
    setSubmitting(false);

    if (error) {
      toast.error(error.message ?? "Could not create your account.");
      return;
    }
    // Force-fetch (staleTime: 0) so route guards see the new session immediately.
    await queryClient.fetchQuery({ ...sessionQuery, staleTime: 0 });
    toast.success(`Welcome to Vellum, ${name.split(" ")[0]}.`);
    navigate({ to: "/onboarding", search: plan ? { plan } : undefined });
  }

  return (
    <AuthShell>
      <h1 className="font-display text-3xl">Open your account</h1>
      <p className="mt-2 text-sm text-ivory-dim">
        90 seconds, no credit check.{" "}
        {plan && (
          <>
            You picked <span className="text-gold-300">{planById(plan)?.name}</span> — nice taste.
          </>
        )}
      </p>

      <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-5" noValidate>
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">Full name</Label>
          <Input
            id="name"
            name="name"
            autoComplete="name"
            placeholder="Ada Lovelace"
            required
            autoFocus
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="ada@example.com"
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="At least 8 characters"
              minLength={8}
              required
              className="pr-11"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ivory-faint transition-colors hover:text-foreground"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>

        <Button type="submit" size="lg" loading={submitting} className="mt-2">
          {submitting ? "Creating your account…" : "Create account"}
        </Button>
      </form>

      <p className="mt-6 text-sm text-ivory-faint">
        Already a member?{" "}
        <Link to="/login" className="text-gold-400 underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
