import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { portalApi, type BalanceResult, type Transaction } from "@/lib/portal-api";
import { DEFAULT_CHAIN, type ChainConfig } from "@/lib/chains";

const POLL_INTERVAL = 30_000; // 30 seconds

interface Profile {
  portal_client_id: string | null;
  wallet_address: string | null;
  wallet_id: string | null;
  backup_status: string | null;
}

export function useWallet(userId: string | undefined) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [balance, setBalance] = useState<BalanceResult | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeChain, setActiveChain] = useState<ChainConfig>(DEFAULT_CHAIN);

  const fetchProfile = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from("profiles")
      .select("portal_client_id, wallet_address, wallet_id, backup_status")
      .eq("user_id", userId)
      .maybeSingle();
    setProfile(data as Profile | null);
    setLoading(false);
  }, [userId]);

  const fetchBalance = useCallback(async () => {
    if (!profile?.wallet_address) return;
    try {
      const data = await portalApi.getBalance(activeChain.key);
      setBalance(data);
    } catch (err) {
      console.error("Balance fetch error:", err);
    }
  }, [profile?.wallet_address, activeChain.key]);

  const fetchTransactions = useCallback(async () => {
    if (!profile?.wallet_address) return;
    try {
      const txs = await portalApi.getTransactions();
      setTransactions(txs);
    } catch (err) {
      console.error("Transactions fetch error:", err);
    }
  }, [profile?.wallet_address]);

  // Auto-provision: as soon as we know the profile has no Portal client/wallet
  // yet, kick off setup in the background so the person can start sending and
  // receiving the moment they land on the dashboard — no manual "Initialize /
  // Create Wallet" taps required (Wave/Sendwave-style instant readiness).
  const provisioningRef = useRef(false);
  const [provisioning, setProvisioning] = useState(false);
  const [provisionError, setProvisionError] = useState<string | null>(null);

  const autoProvision = useCallback(async () => {
    if (!userId || provisioningRef.current) return;
    provisioningRef.current = true;
    setProvisioning(true);
    setProvisionError(null);
    try {
      await portalApi.createClient();
      await portalApi.createWallet();
      // Auto-backup right away too — never block on this.
      portalApi.backupWallet().catch((e) =>
        console.error("Auto-backup failed (non-blocking):", e)
      );
      await fetchProfile();
    } catch (e: any) {
      console.error("Auto-provisioning failed:", e);
      setProvisionError(e?.message || "Failed to set up your wallet");
    } finally {
      provisioningRef.current = false;
      setProvisioning(false);
    }
  }, [userId, fetchProfile]);

  useEffect(() => {
    if (loading) return;
    if (!userId || !profile) return;
    if (profile.portal_client_id && profile.wallet_address) return;
    autoProvision();
  }, [loading, userId, profile, autoProvision]);

  // Auto-migrate EVM addresses to Solana
  const migrateRef = useRef(false);
  useEffect(() => {
    if (profile?.wallet_address?.startsWith("0x") && profile?.portal_client_id && !migrateRef.current) {
      migrateRef.current = true;
      console.log("Auto-migrating EVM address to Solana...");
      portalApi.migrateAddress()
        .then((result) => {
          if (result.migrated) {
            console.log("Migration successful:", result.address);
            fetchProfile();
          }
        })
        .catch((err) => console.error("Address migration failed:", err));
    }
  }, [profile?.wallet_address, profile?.portal_client_id, fetchProfile]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    if (profile?.wallet_address) {
      fetchBalance();
      fetchTransactions();
    }
  }, [profile?.wallet_address, fetchBalance, fetchTransactions]);

  // Auto-poll for new transactions
  useEffect(() => {
    if (!profile?.wallet_address) return;
    const interval = setInterval(() => {
      fetchTransactions();
    }, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [profile?.wallet_address, fetchTransactions]);

  const setupClient = async () => {
    setActionLoading(true);
    try {
      await portalApi.createClient();
      await fetchProfile();
    } finally {
      setActionLoading(false);
    }
  };

  const createWallet = async () => {
    setActionLoading(true);
    try {
      await portalApi.createWallet();
      await fetchProfile();
      // Auto-backup after wallet creation
      try {
        await portalApi.backupWallet();
        await fetchProfile();
      } catch (backupErr) {
        console.error("Auto-backup failed (non-blocking):", backupErr);
      }
    } finally {
      setActionLoading(false);
    }
  };

  const fundWallet = async (amount: string) => {
    setActionLoading(true);
    try {
      await portalApi.fundWallet(amount, activeChain.chainId);
      await refresh();
    } finally {
      setActionLoading(false);
    }
  };

  const sendTokens = async (to: string, amount: string, txType?: string, tokenAddress?: string) => {
    setActionLoading(true);
    try {
      const result = await portalApi.sendTokens(to, amount, txType, tokenAddress, activeChain.key);
      // Poll balance a few times to catch on-chain confirmation
      await fetchTransactions();
      await fetchBalance();
      // Delayed re-fetch to catch blockchain propagation
      setTimeout(async () => {
        await fetchBalance();
        await fetchTransactions();
      }, 5000);
      setTimeout(async () => {
        await fetchBalance();
        await fetchTransactions();
      }, 15000);
      return result;
    } finally {
      setActionLoading(false);
    }
  };

  const batchPayout = async (recipients: { address: string; amount: string }[]) => {
    setActionLoading(true);
    try {
      const result = await portalApi.batchPayout(recipients);
      await fetchBalance();
      await fetchTransactions();
      return result;
    } finally {
      setActionLoading(false);
    }
  };

  const switchChain = (chain: ChainConfig) => {
    setActiveChain(chain);
  };

  const backupWallet = async () => {
    setActionLoading(true);
    try {
      const result = await portalApi.backupWallet();
      await fetchProfile();
      return result;
    } finally {
      setActionLoading(false);
    }
  };

  const refresh = async () => {
    await fetchBalance();
    await fetchTransactions();
  };

  return {
    profile,
    balance,
    transactions,
    loading,
    actionLoading,
    activeChain,
    switchChain,
    setupClient,
    createWallet,
    fundWallet,
    sendTokens,
    batchPayout,
    backupWallet,
    refresh,
    hasClient: !!profile?.portal_client_id,
    hasWallet: !!profile?.wallet_address,
    isBackedUp: profile?.backup_status === "backed_up",
    provisioning,
    provisionError,
    retryProvisioning: autoProvision,
  };
}
