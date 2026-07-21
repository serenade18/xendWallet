import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Transaction } from "@/lib/portal-api";
import { getChainByKey } from "@/lib/chains";
import type { AppNotification } from "@/components/NotificationCenter";
import { TransactionToast } from "@/components/TransactionToast";

interface DbNotification {
  id: string;
  transaction_id: string;
  read: boolean;
  created_at: string;
}

export function useTransactionNotifications(transactions: Transaction[], userId?: string) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [dbNotifs, setDbNotifs] = useState<DbNotification[] | null>(null);
  const prevIdsRef = useRef<Set<string>>(new Set());
  const initialLoadDone = useRef(false);

  // Step 1: Load persisted notifications from DB once
  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data } = await supabase
        .from("notifications")
        .select("id, transaction_id, read, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);
      setDbNotifs((data as DbNotification[]) ?? []);
    })();
  }, [userId]);

  // Step 2: Once we have BOTH db notifs and transactions, reconcile
  useEffect(() => {
    if (!userId || dbNotifs === null || transactions.length === 0) return;
    if (initialLoadDone.current) return;
    initialLoadDone.current = true;

    const txMap = new Map(transactions.map((tx) => [tx.id, tx]));
    const dbMap = new Map(dbNotifs.map((n) => [n.transaction_id, n]));

    // Build notifications from DB records matched to transactions
    const loaded: AppNotification[] = [];
    for (const row of dbNotifs) {
      const tx = txMap.get(row.transaction_id);
      if (tx) {
        loaded.push({
          id: row.id,
          tx,
          read: row.read ?? false,
          timestamp: new Date(row.created_at).getTime(),
        });
      }
    }

    setNotifications(loaded);

    // Mark all current transaction IDs as "seen" so we don't re-notify
    prevIdsRef.current = new Set(transactions.map((tx) => tx.id));
  }, [dbNotifs, transactions, userId]);

  // Step 3: Detect NEW transactions after initial load
  useEffect(() => {
    if (!userId || !initialLoadDone.current) return;

    const currentIds = new Set(transactions.map((tx) => tx.id));
    const newTxs = transactions.filter((tx) => !prevIdsRef.current.has(tx.id));

    if (newTxs.length > 0) {
      const rows = newTxs.map((tx) => ({
        user_id: userId,
        transaction_id: tx.id,
        read: false,
      }));

      supabase.from("notifications").insert(rows).select("id, transaction_id, created_at").then(({ data: inserted }) => {
        const newNotifs: AppNotification[] = newTxs.map((tx, i) => ({
          id: inserted?.[i]?.id ?? `notif-${tx.id}`,
          tx,
          read: false,
          timestamp: inserted?.[i]?.created_at ? new Date(inserted[i].created_at).getTime() : Date.now(),
        }));
        setNotifications((prev) => [...newNotifs, ...prev].slice(0, 50));
      });

      for (const tx of newTxs) {
        const chain = getChainByKey(tx.chain);
        toast.custom(() =>
          TransactionToast({
            type: tx.tx_type as "receive" | "fund" | "send",
            status: tx.status,
            amount: tx.amount,
            token: tx.token,
            chainName: chain.name,
          })
        );
      }
    }

    prevIdsRef.current = currentIds;
  }, [transactions, userId]);

  const markRead = useCallback(async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    await supabase.from("notifications").update({ read: true }).eq("id", id);
  }, []);

  const markAllRead = useCallback(async () => {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    if (unreadIds.length > 0) {
      await supabase.from("notifications").update({ read: true }).in("id", unreadIds);
    }
  }, [notifications]);

  const clearAll = useCallback(async () => {
    const ids = notifications.map((n) => n.id);
    setNotifications([]);
    if (ids.length > 0) {
      await supabase.from("notifications").delete().in("id", ids);
    }
  }, [notifications]);

  return { notifications, markRead, markAllRead, clearAll };
}
