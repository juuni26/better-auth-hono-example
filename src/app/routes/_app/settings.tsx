import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import { toast } from "sonner";
import { ShieldAlert } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_app/settings")({
  component: SettingsPage,
});

const PREFS = [
  {
    key: "tx-alerts",
    label: "Transaction alerts",
    hint: "A push the instant money moves",
    defaultOn: true,
  },
  {
    key: "weekly-digest",
    label: "Weekly digest",
    hint: "Sunday-evening summary of your money's week",
    defaultOn: true,
  },
  {
    key: "product-news",
    label: "Product news",
    hint: "New features, no fluff, never more than monthly",
    defaultOn: false,
  },
] as const;

function usePref(key: string, defaultOn: boolean) {
  const storageKey = `vellum:pref:${key}`;
  const [on, setOn] = useState(defaultOn);
  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored !== null) setOn(stored === "1");
  }, [storageKey]);
  return [
    on,
    (v: boolean) => {
      setOn(v);
      localStorage.setItem(storageKey, v ? "1" : "0");
    },
  ] as const;
}

function PrefRow({ pref }: { pref: (typeof PREFS)[number] }) {
  const [on, setOn] = usePref(pref.key, pref.defaultOn);
  return (
    <div className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
      <div>
        <Label htmlFor={`pref-${pref.key}`} className="text-sm text-foreground">
          {pref.label}
        </Label>
        <p className="mt-0.5 text-xs text-ivory-faint">{pref.hint}</p>
      </div>
      <Switch
        id={`pref-${pref.key}`}
        checked={on}
        onCheckedChange={(v) => {
          setOn(v);
          toast(`${pref.label} ${v ? "on" : "off"}.`);
        }}
      />
    </div>
  );
}

function SettingsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deletePassword, setDeletePassword] = useState("");

  const changePassword = useMutation({
    mutationFn: async (form: { current: string; next: string }) => {
      const { error } = await authClient.changePassword({
        currentPassword: form.current,
        newPassword: form.next,
        revokeOtherSessions: true,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => toast.success("Password changed. Other sessions were signed out."),
    onError: (e) => toast.error(e.message),
  });

  const deleteAccount = useMutation({
    mutationFn: async () => {
      const { error } = await authClient.deleteUser({ password: deletePassword });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.clear();
      toast("Your account is gone. Take care out there.");
      navigate({ to: "/" });
    },
    onError: (e) => toast.error(e.message),
  });

  function onPasswordSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const current = String(form.get("current") ?? "");
    const next = String(form.get("next") ?? "");
    if (next.length < 8) {
      toast.error("New password needs at least 8 characters.");
      return;
    }
    changePassword.mutate(
      { current, next },
      { onSuccess: () => (e.target as HTMLFormElement).reset() },
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col gap-6"
    >
      <header>
        <h1 className="font-display text-3xl">Settings</h1>
        <p className="mt-1.5 text-sm text-ivory-faint">Preferences, security, and the exit door.</p>
      </header>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>Choose what's worth interrupting you for.</CardDescription>
        </CardHeader>
        <CardContent className="divide-y divide-border">
          {PREFS.map((p) => (
            <PrefRow key={p.key} pref={p} />
          ))}
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <CardTitle>Security</CardTitle>
          <CardDescription>
            Changing your password signs out every other device, just in case.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-5 sm:max-w-md" onSubmit={onPasswordSubmit}>
            <div className="flex flex-col gap-2">
              <Label htmlFor="current">Current password</Label>
              <Input
                id="current"
                name="current"
                type="password"
                autoComplete="current-password"
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="next">New password</Label>
              <Input
                id="next"
                name="next"
                type="password"
                autoComplete="new-password"
                minLength={8}
                placeholder="At least 8 characters"
                required
              />
            </div>
            <Button type="submit" loading={changePassword.isPending} className="self-start">
              Change password
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="border-ember/25">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-ember">
            <ShieldAlert className="size-4" /> Danger zone
          </CardTitle>
          <CardDescription>
            Deleting your account removes your profile, sessions, and subscription. There is no undo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="destructive">Delete account</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete your Vellum account?</DialogTitle>
                <DialogDescription>
                  This wipes everything immediately. Confirm with your password to continue.
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-2">
                <Label htmlFor="delete-password">Password</Label>
                <Input
                  id="delete-password"
                  type="password"
                  autoComplete="current-password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                />
              </div>
              <DialogFooter>
                <Button
                  variant="destructive"
                  onClick={() => deleteAccount.mutate()}
                  loading={deleteAccount.isPending}
                  disabled={deletePassword.length === 0}
                >
                  Delete forever
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </motion.div>
  );
}
