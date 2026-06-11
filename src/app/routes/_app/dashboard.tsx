import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { toast } from "sonner";
import { ArrowUpRight, Landmark, PiggyBank, Send, WalletCards } from "lucide-react";
import { balanceSeriesQuery, meQuery, postJson, transactionsQuery, vaultsQuery } from "@/lib/api";
import { useCountUp } from "@/lib/use-count-up";
import { BalanceChart } from "@/components/balance-chart";
import { TransactionsTable } from "@/components/transactions-table";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/utils";
import { planById } from "../../../shared/plans";
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

interface DashboardSearch {
  checkout?: string;
}

export const Route = createFileRoute("/_app/dashboard")({
  validateSearch: (search: Record<string, unknown>): DashboardSearch => ({
    checkout: typeof search.checkout === "string" ? search.checkout : undefined,
  }),
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery(meQuery);
    void context.queryClient.prefetchQuery(transactionsQuery);
    void context.queryClient.prefetchQuery(balanceSeriesQuery);
    void context.queryClient.prefetchQuery(vaultsQuery);
  },
  component: DashboardPage,
});

const RANGES = [
  { id: "1m", label: "1M", days: 30 },
  { id: "3m", label: "3M", days: 90 },
  { id: "6m", label: "6M", days: 180 },
  { id: "all", label: "All", days: Infinity },
] as const;

function DashboardPage() {
  const { user } = Route.useRouteContext();
  const { checkout } = Route.useSearch();
  const navigate = Route.useNavigate();
  const queryClient = useQueryClient();
  const { data: me } = useSuspenseQuery(meQuery);
  const { data: series } = useQuery(balanceSeriesQuery);
  const { data: transactions } = useQuery(transactionsQuery);
  const [range, setRange] = useState<(typeof RANGES)[number]["id"]>("3m");

  const [sendOpen, setSendOpen] = useState(false);
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");

  const [vaultsOpen, setVaultsOpen] = useState(false);
  const [newVaultName, setNewVaultName] = useState("");

  const { data: vaults } = useQuery(vaultsQuery);

  useEffect(() => {
    if (checkout === "success") {
      const plan = planById(me.subscription?.plan);
      toast.success(
        plan ? `${plan.name} is active. Your money thanks you.` : "Subscription active.",
      );
      // Strip the param so refreshes don't re-toast.
      navigate({ search: {}, replace: true });
    }
  }, [checkout, me.subscription?.plan, navigate]);

  const sendMoney = useMutation({
    mutationFn: (vars: { recipient: string; amount: number }) =>
      postJson("/api/transactions/send", vars),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["balance-series"] });
      toast.success(`Sent ${formatMoney(Math.abs(Number(amount) * 100))} to ${recipient}`);
      setSendOpen(false);
      setRecipient("");
      setAmount("");
    },
    onError: (e) => toast.error(e.message),
  });

  const topUp = useMutation({
    mutationFn: (amt: number) =>
      postJson<{ url?: string; success?: boolean }>("/api/transactions/topup", { amount: amt }),
    onSuccess: (res) => {
      if (res.url) {
        window.location.href = res.url;
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["balance-series"] });
      toast.success("Account topped up successfully.");
    },
    onError: (e) => toast.error(e.message),
  });

  const createVault = useMutation({
    mutationFn: (name: string) => postJson("/api/vaults", { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vaults"] });
      toast.success(`Vault "${newVaultName}" created.`);
      setNewVaultName("");
    },
    onError: (e) => toast.error(e.message),
  });

  const filteredSeries = useMemo(() => {
    if (!series) return [];
    const { days } = RANGES.find((r) => r.id === range)!;
    if (days === Infinity) return series;
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return series.filter((p) => new Date(p.date).getTime() >= cutoff);
  }, [series, range]);

  const balance = filteredSeries.at(-1)?.balance ?? 0;
  const opening = filteredSeries[0]?.balance ?? 0;
  const delta = balance - opening;
  const animatedBalance = useCountUp(balance, 1200);

  const firstName = user.name.split(" ")[0] || "there";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      >
        <p className="text-sm text-ivory-faint">
          {greeting}, {firstName}
        </p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-ivory-faint">
              <Landmark className="size-3.5" /> Total balance
            </div>
            <p className="figure mt-2 text-[44px] font-medium leading-none sm:text-6xl">
              {balance === 0 && !series ? "—" : formatMoney(Math.round(animatedBalance))}
            </p>
            <p className="mt-2.5 flex items-center gap-2 text-sm">
              <Badge variant={delta >= 0 ? "positive" : "destructive"}>
                {delta >= 0 ? "▲" : "▼"} {formatMoney(Math.abs(delta))}
              </Badge>
              <span className="text-ivory-faint">
                {RANGES.find((r) => r.id === range)!.label === "All"
                  ? "all time"
                  : `past ${RANGES.find((r) => r.id === range)!.label.toLowerCase()}`}
              </span>
            </p>
          </div>
          <Tabs value={range} onValueChange={(v) => setRange(v as typeof range)}>
            <TabsList>
              {RANGES.map((r) => (
                <TabsTrigger key={r.id} value={r.id}>
                  {r.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </motion.header>

      {/* Chart */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
        className="rounded-lg border border-border bg-card p-4 sm:p-6"
      >
        {series ? (
          <BalanceChart points={filteredSeries} />
        ) : (
          <Skeleton className="h-44 w-full sm:h-56" />
        )}
      </motion.section>

      {/* Quick actions */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}
        className="grid grid-cols-2 gap-3 sm:grid-cols-4"
      >
        {[
          {
            icon: Send,
            label: "Send",
            hint: "Instant transfers between members",
            action: () => setSendOpen(true),
          },
          {
            icon: PiggyBank,
            label: "Vaults",
            hint: "Auto-saving at 4.60% APY",
            action: () => setVaultsOpen(true),
          },
          {
            icon: WalletCards,
            label: "Cards",
            hint: "Freeze, limits, virtual numbers",
            action: () => toast("Cards — wired to your real endpoints on day one."),
          },
          {
            icon: ArrowUpRight,
            label: "Add money",
            hint: "Top up from any bank",
            action: () => topUp.mutate(50000), // Default $500 for demo
          },
        ].map(({ icon: Icon, label, action }) => (
          <button
            key={label}
            type="button"
            data-testid={`qa-${label.toLowerCase().replace(/\s+/g, "-")}`}
            onClick={action}
            className="group flex items-center gap-3 rounded-lg border border-border bg-ink-900/60 p-4 text-left transition-all duration-200 hover:border-gold-500/35 hover:bg-ink-850 active:scale-[0.98]"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-full border border-gold-500/25 bg-gold-500/10 transition-transform duration-300 group-hover:-rotate-6">
              <Icon className="size-4 text-gold-400" />
            </span>
            <span className="text-sm font-medium">{label}</span>
          </button>
        ))}
      </motion.section>

      {/* Send Money Dialog */}
      <Dialog open={sendOpen} onOpenChange={setSendOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send money</DialogTitle>
            <DialogDescription>Transfer funds instantly to another Vellum member.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="recipient">Recipient</Label>
              <Input
                id="recipient"
                placeholder="Name or @handle"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="amount">Amount ($)</Label>
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="default"
              className="w-full"
              disabled={!recipient || !amount || sendMoney.isPending}
              loading={sendMoney.isPending}
              onClick={() => sendMoney.mutate({ recipient, amount: Number(amount) * 100 })}
            >
              Send {amount ? formatMoney(Number(amount) * 100) : "money"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Vaults Dialog */}
      <Dialog open={vaultsOpen} onOpenChange={setVaultsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Vaults</DialogTitle>
            <DialogDescription>
              Name a goal, set a rule, and watch your money grow at 4.60% APY.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-4">
            {vaults?.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border py-8 text-center">
                <p className="text-sm text-ivory-faint">No vaults yet. Start one for your next trip.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {vaults?.map((v) => (
                  <div
                    key={v.id}
                    className="flex items-center justify-between rounded-md border border-border bg-ink-850/50 p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{v.name}</p>
                      <p className="text-xs text-ivory-faint">Earns 4.60% APY</p>
                    </div>
                    <p className="figure text-sm font-medium">{formatMoney(v.balance)}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col gap-2 pt-4">
              <Label htmlFor="vault-name">New vault</Label>
              <div className="flex gap-2">
                <Input
                  id="vault-name"
                  placeholder="e.g. Tokyo Trip"
                  value={newVaultName}
                  onChange={(e) => setNewVaultName(e.target.value)}
                />
                <Button
                  disabled={!newVaultName || createVault.isPending}
                  loading={createVault.isPending}
                  onClick={() => createVault.mutate(newVaultName)}
                >
                  Create
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Transactions */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.24, ease: [0.22, 1, 0.36, 1] }}
      >
        {transactions ? (
          <TransactionsTable transactions={transactions} />
        ) : (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        )}
      </motion.section>
    </div>
  );
}
