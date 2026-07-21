import { useMemo, useState, useEffect } from "react";
import type { Transaction } from "@/lib/portal-api";
import type { ChainConfig } from "@/lib/chains";
import { getChainByKey } from "@/lib/chains";
import { supabase } from "@/integrations/supabase/client";
import type { Contact } from "@/hooks/useContacts";
import {
  ArrowUpRight, ArrowDownLeft, Plus, ChevronLeft, ChevronRight,
  Clock, ExternalLink, Copy, Share2, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription,
} from "@/components/ui/drawer";

interface TransactionListProps {
  transactions: Transaction[];
  activeChain: ChainConfig;
  contacts?: Contact[];
}

const PAGE_SIZE = 10;
type TxTypeFilter = "all" | "send" | "receive" | "fund";

const typeFilters: { key: TxTypeFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "send", label: "Sent" },
  { key: "receive", label: "Received" },
  { key: "fund", label: "Added" },
];

function formatUsd(amount: string): string {
  const val = parseFloat(amount);
  return `$${val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function shortAddr(addr: string): string {
  if (!addr) return "Unknown";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
}

function groupByDate(txs: Transaction[]): Record<string, Transaction[]> {
  const groups: Record<string, Transaction[]> = {};
  for (const tx of txs) {
    const d = new Date(tx.created_at);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    let label: string;
    if (d.toDateString() === today.toDateString()) label = "Today";
    else if (d.toDateString() === yesterday.toDateString()) label = "Yesterday";
    else label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    if (!groups[label]) groups[label] = [];
    groups[label].push(tx);
  }
  return groups;
}

const txStyles = {
  send: {
    icon: ArrowUpRight,
    iconBg: "bg-muted",
    iconColor: "text-foreground",
    amountColor: "text-foreground",
    prefix: "- ",
    label: "Sent",
  },
  receive: {
    icon: ArrowDownLeft,
    iconBg: "bg-success/10",
    iconColor: "text-success",
    amountColor: "text-success",
    prefix: "+ ",
    label: "Received",
  },
  fund: {
    icon: Plus,
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
    amountColor: "text-success",
    prefix: "+ ",
    label: "Top up",
  },
};

const TransactionList = ({ transactions, activeChain, contacts = [] }: TransactionListProps) => {
  const [typeFilter, setTypeFilter] = useState<TxTypeFilter>("all");
  const [page, setPage] = useState(0);
  const [emailMap, setEmailMap] = useState<Record<string, string>>({});
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  const contactsByEmail = useMemo(() => {
    const map: Record<string, string> = {};
    for (const c of contacts) {
      map[c.email.toLowerCase()] = c.name;
    }
    return map;
  }, [contacts]);

  useEffect(() => {
    const addresses = new Set<string>();
    for (const tx of transactions) {
      if (tx.tx_type === "send" && tx.to_address) addresses.add(tx.to_address);
      if (tx.tx_type === "receive" && tx.metadata?.from) addresses.add(tx.metadata.from as string);
    }
    const toResolve = Array.from(addresses).filter((a) => !(a in emailMap));
    if (toResolve.length === 0) return;

    Promise.all(
      toResolve.map(async (addr) => {
        const { data } = await supabase.rpc("get_email_by_wallet", { wallet: addr });
        return [addr, data as string | null] as const;
      })
    ).then((results) => {
      setEmailMap((prev) => {
        const next = { ...prev };
        for (const [addr, email] of results) {
          if (email) next[addr] = email;
        }
        return next;
      });
    });
  }, [transactions]);

  function friendlyLabel(tx: Transaction): string {
    if (tx.tx_type === "receive") {
      const from = tx.metadata?.from as string | undefined;
      if (from && emailMap[from]) {
        const email = emailMap[from];
        const contactName = contactsByEmail[email.toLowerCase()];
        return contactName || email;
      }
      return from ? shortAddr(from) : "Received";
    }
    if (tx.tx_type === "fund") return "Top up";
    if (tx.to_address && emailMap[tx.to_address]) {
      const email = emailMap[tx.to_address];
      const contactName = contactsByEmail[email.toLowerCase()];
      return contactName || email;
    }
    return shortAddr(tx.to_address);
  }

  const filtered = useMemo(() => {
    setPage(0);
    let txs = transactions;
    if (typeFilter !== "all") txs = txs.filter((tx) => tx.tx_type === typeFilter);
    return txs;
  }, [transactions, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = useMemo(() => filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE), [filtered, page]);
  const grouped = useMemo(() => groupByDate(paginated), [paginated]);

  // ── Transaction Detail Drawer ──
  const renderDetail = () => {
    if (!selectedTx) return null;
    const tx = selectedTx;
    const style = txStyles[tx.tx_type as keyof typeof txStyles] || txStyles.send;
    const Icon = style.icon;
    const txChain = getChainByKey(tx.chain);
    const isFailed = tx.status === "failed" || tx.status === "blocked";
    const isPending = tx.status === "pending";
    const isIncoming = tx.tx_type === "receive" || tx.tx_type === "fund";
    const val = parseFloat(tx.amount || "0");

    const statusLabel = isFailed ? "Failed" : isPending ? "Processing" : "Confirmed";
    const statusColor = isFailed ? "text-destructive" : isPending ? "text-yellow-500" : "text-success";
    const recipientLabel = friendlyLabel(tx);

    const receiptText = [
      `${style.label}: $${val.toFixed(2)}`,
      `To: ${recipientLabel}`,
      `Date: ${formatDateTime(tx.created_at)}`,
      `Status: ${statusLabel}`,
    ].filter(Boolean).join("\n");

    const copyReceipt = () => {
      navigator.clipboard.writeText(receiptText);
      toast.success("Receipt copied!");
    };

    const shareReceipt = async () => {
      if (navigator.share) {
        try { await navigator.share({ title: "Xend Transaction", text: receiptText }); }
        catch { copyReceipt(); }
      } else { copyReceipt(); }
    };

    return (
      <div className="flex flex-col items-center">
        <div className={`h-14 w-14 rounded-full flex items-center justify-center mb-4 ${style.iconBg}`}>
          <Icon className={`h-6 w-6 ${style.iconColor}`} />
        </div>
        <h2 className="text-3xl font-bold text-foreground mb-0.5">
          {isIncoming ? "+" : "-"} ${val.toFixed(2)}
        </h2>
        <p className="text-sm text-muted-foreground mb-6">{style.label}</p>

        <div className="w-full rounded-2xl bg-card border border-border/60 overflow-hidden mb-4">
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-border/40">
            <span className="text-sm text-muted-foreground">Status</span>
            <span className={`text-sm font-semibold ${statusColor}`}>{statusLabel}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-border/40">
            <span className="text-sm text-muted-foreground">
              {tx.tx_type === "receive" ? "From" : "To"}
            </span>
            <span className="text-sm font-semibold text-foreground">{recipientLabel}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-border/40">
            <span className="text-sm text-muted-foreground">Date</span>
            <span className="text-sm font-semibold text-foreground">{formatDateTime(tx.created_at)}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-border/40">
            <span className="text-sm text-muted-foreground">Fee</span>
            <span className="text-sm font-semibold text-foreground">
              {(tx.metadata as any)?.gasSponsored ? "Sponsored" : "$0.00"}
            </span>
          </div>
          {tx.tx_hash && (
            <div className="flex items-center justify-between px-4 py-3.5">
              <span className="text-sm text-muted-foreground">Reference</span>
              <a
                href={`${txChain.explorerTxUrl}${tx.tx_hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm font-semibold text-primary"
              >
                View <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}
        </div>

        <div className="w-full grid grid-cols-2 gap-3">
          <Button variant="outline" onClick={copyReceipt} className="rounded-2xl h-10 text-xs font-semibold border-border/60">
            <Copy className="h-3.5 w-3.5 mr-1.5" /> Copy Receipt
          </Button>
          <Button variant="outline" onClick={shareReceipt} className="rounded-2xl h-10 text-xs font-semibold border-border/60">
            <Share2 className="h-3.5 w-3.5 mr-1.5" /> Share
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-foreground mb-1">Transactions</h2>

      {/* Filter pills */}
      <div className="flex gap-1.5 mb-4">
        {typeFilters.map((f) => {
          const isActive = typeFilter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setTypeFilter(f.key)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary/40 text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {paginated.length === 0 ? (
        <div className="text-center py-12 rounded-2xl bg-card border border-border/60">
          <Clock className="mx-auto h-8 w-8 text-muted-foreground/20 mb-3" />
          <p className="text-sm text-muted-foreground">No transactions yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Send or receive money to see activity here</p>
        </div>
      ) : (
        <div className="space-y-1">
          {Object.entries(grouped).map(([dateLabel, txs]) => (
            <div key={dateLabel}>
              <div className="flex items-baseline justify-between pt-3 pb-2">
                <p className="text-sm font-bold text-foreground">{dateLabel}</p>
              </div>
              {txs.map((tx) => {
                const style = txStyles[tx.tx_type as keyof typeof txStyles] || txStyles.send;
                const Icon = style.icon;
                const isFailed = tx.status === "failed" || tx.status === "blocked";
                const isPending = tx.status === "pending";
                const isIncoming = tx.tx_type === "receive" || tx.tx_type === "fund";
                const val = parseFloat(tx.amount || "0");

                return (
                  <button
                    key={tx.id}
                    onClick={() => setSelectedTx(tx)}
                    className="w-full flex items-center gap-3 py-3 px-1 active:bg-muted/30 rounded-xl transition-colors text-left"
                  >
                    <div className={`shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${style.iconBg}`}>
                      <Icon className={`h-4 w-4 ${style.iconColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground leading-tight truncate">
                        {friendlyLabel(tx)}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
                        <Clock className="h-3 w-3" />
                        {isPending ? (
                          <span className="text-warning">Processing…</span>
                        ) : isFailed ? (
                          <span className="text-destructive">Failed</span>
                        ) : (
                          formatTime(tx.created_at)
                        )}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-sm font-semibold tabular-nums ${
                        isFailed ? "text-muted-foreground line-through" :
                        isIncoming ? "text-success" : "text-foreground"
                      }`}>
                        {isIncoming ? "+" : "-"} ${val.toFixed(2)}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {filtered.length > PAGE_SIZE && (
        <div className="flex items-center justify-between px-1 py-3 mt-2 border-t border-border/40">
          <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors">
            <ChevronLeft className="h-3.5 w-3.5" /> Prev
          </button>
          <span className="text-[10px] text-muted-foreground">{page + 1} / {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors">
            Next <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <Drawer open={!!selectedTx} onOpenChange={(open) => { if (!open) setSelectedTx(null); }}>
        <DrawerContent className="max-w-lg mx-auto max-h-[85dvh]">
          <DrawerHeader className="sr-only">
            <DrawerTitle>Transaction Details</DrawerTitle>
            <DrawerDescription>View transaction details</DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-8 pt-2 overflow-y-auto">
            {renderDetail()}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
};

export default TransactionList;
