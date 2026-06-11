import { useMemo, useRef, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  ArrowDownLeft,
  ArrowUpDown,
  Banknote,
  Bus,
  Coffee,
  Plane,
  Plug,
  Repeat,
  Search,
  ShoppingBag,
  ShoppingCart,
} from "lucide-react";
import type { Transaction, TxCategory } from "@worker/transactions";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn, formatMoney } from "@/lib/utils";

const CATEGORY_META: Record<TxCategory, { icon: typeof Coffee; label: string }> = {
  groceries: { icon: ShoppingCart, label: "Groceries" },
  dining: { icon: Coffee, label: "Dining" },
  transport: { icon: Bus, label: "Transport" },
  subscriptions: { icon: Repeat, label: "Subscriptions" },
  shopping: { icon: ShoppingBag, label: "Shopping" },
  travel: { icon: Plane, label: "Travel" },
  income: { icon: ArrowDownLeft, label: "Income" },
  transfer: { icon: Banknote, label: "Transfer" },
  utilities: { icon: Plug, label: "Utilities" },
};

const columns: ColumnDef<Transaction>[] = [
  {
    accessorKey: "merchant",
    header: "Merchant",
    cell: ({ row }) => {
      const tx = row.original;
      const { icon: Icon } = CATEGORY_META[tx.category];
      return (
        <span className="flex min-w-0 items-center gap-3">
          <span
            className={cn(
              "grid size-8 shrink-0 place-items-center rounded-full border",
              tx.category === "income"
                ? "border-moss/30 bg-moss/10 text-moss"
                : "border-border bg-ink-800 text-ivory-dim",
            )}
          >
            <Icon className="size-3.5" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium">{tx.merchant}</span>
            {tx.status === "pending" && (
              <span className="text-[10px] uppercase tracking-[0.12em] text-gold-400">pending</span>
            )}
          </span>
        </span>
      );
    },
  },
  {
    accessorKey: "category",
    header: "Category",
    cell: ({ getValue }) => (
      <Badge variant="secondary" className="hidden md:inline-flex">
        {CATEGORY_META[getValue<TxCategory>()].label}
      </Badge>
    ),
  },
  {
    accessorKey: "date",
    header: "Date",
    sortingFn: "datetime",
    cell: ({ getValue }) =>
      new Date(getValue<string>()).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
  },
  {
    accessorKey: "amount",
    header: "Amount",
    cell: ({ getValue }) => {
      const v = getValue<number>();
      return (
        <span className={cn("figure text-sm font-medium", v > 0 ? "text-moss" : "text-foreground")}>
          {formatMoney(v, { sign: true })}
        </span>
      );
    },
  },
];

/**
 * 500 rows, zero jank: TanStack Table drives the data grid, TanStack Virtual
 * renders only what's on screen.
 */
export function TransactionsTable({ transactions }: { transactions: Transaction[] }) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const data = useMemo(() => transactions, [transactions]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: (row, _columnId, filterValue: string) => {
      const q = filterValue.toLowerCase();
      const tx = row.original;
      return (
        tx.merchant.toLowerCase().includes(q) ||
        CATEGORY_META[tx.category].label.toLowerCase().includes(q)
      );
    },
  });

  const rows = table.getRowModel().rows;

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 64,
    overscan: 12,
  });

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-lg">Activity</h2>
          <p className="text-xs text-ivory-faint">
            {rows.length.toLocaleString()} transactions · virtualized
          </p>
        </div>
        <div className="relative sm:w-64">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ivory-faint" />
          <Input
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Search merchants, categories…"
            className="h-9 pl-9 text-sm"
            aria-label="Search transactions"
          />
        </div>
      </div>

      {/* Header row */}
      <div className="grid grid-cols-[1fr_auto_72px] gap-4 border-b border-border px-4 py-2.5 text-[11px] uppercase tracking-[0.12em] text-ivory-faint md:grid-cols-[1.4fr_0.8fr_0.5fr_0.6fr]">
        {table.getFlatHeaders().map((header) => {
          const canSort = header.column.id === "date" || header.column.id === "amount";
          const sorted = header.column.getIsSorted();
          if (header.column.id === "category")
            return (
              <span key={header.id} className="hidden md:block">
                Category
              </span>
            );
          return (
            <button
              key={header.id}
              type="button"
              disabled={!canSort}
              onClick={header.column.getToggleSortingHandler()}
              className={cn(
                "flex items-center gap-1.5 text-left uppercase tracking-[0.12em]",
                canSort && "transition-colors hover:text-gold-300",
                sorted && "text-gold-300",
                header.column.id === "amount" && "justify-end",
              )}
            >
              {flexRender(header.column.columnDef.header, header.getContext())}
              {canSort && <ArrowUpDown className="size-3" />}
            </button>
          );
        })}
      </div>

      {/* Virtualized body */}
      <div ref={scrollRef} role="table" aria-label="Transactions" className="h-[420px] overflow-y-auto overscroll-contain">
        {rows.length === 0 ? (
          <div className="grid h-full place-items-center text-sm text-ivory-faint">
            Nothing matches “{globalFilter}”.
          </div>
        ) : (
          <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
            {virtualizer.getVirtualItems().map((vRow) => {
              const row = rows[vRow.index];
              return (
                <div
                  key={row.id}
                  role="row"
                  data-testid="tx-row"
                  className="absolute inset-x-0 grid grid-cols-[1fr_auto_72px] items-center gap-4 border-b border-border/50 px-4 transition-colors hover:bg-ink-800/50 md:grid-cols-[1.4fr_0.8fr_0.5fr_0.6fr]"
                  style={{ top: 0, height: vRow.size, transform: `translateY(${vRow.start}px)` }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <span
                      key={cell.id}
                      className={cn(
                        "min-w-0 text-sm text-ivory-dim",
                        cell.column.id === "category" && "hidden md:block",
                        cell.column.id === "amount" && "text-right",
                      )}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </span>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
