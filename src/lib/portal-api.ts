import { supabase } from "@/integrations/supabase/client";

export interface PortalClientResult {
  clientId: string;
  clientSessionToken: string;
}

export interface WalletResult {
  address: string;
  walletId: string;
}

export interface TokenBalance {
  balance: string;
  decimals: number;
  name: string;
  rawBalance: string;
  symbol: string;
  metadata?: any;
}

export interface BalanceResult {
  address: string;
  chain: string;
  chainId: string;
  nativeBalance: TokenBalance | null;
  tokenBalances: TokenBalance[];
}

export interface SendResult {
  transactionHash: string;
  metadata: any;
}

export interface BatchPayoutResult {
  batchId: string;
  results: {
    address: string;
    amount: string;
    txHash?: string;
    status: string;
    error?: string;
  }[];
  summary: {
    total: number;
    confirmed: number;
    failed: number;
  };
}

export interface FeeEstimate {
  chain: string;
  chainId: string;
  gasPrice: string;
  nativeTransfer: { gasLimit: string; estimatedFee: string };
  tokenTransfer: { gasLimit: string; estimatedFee: string };
}

export interface Transaction {
  id: string;
  tx_hash: string | null;
  tx_type: string;
  to_address: string;
  amount: string;
  token: string;
  chain: string;
  status: string;
  metadata: any;
  created_at: string;
}

async function getAuthHeaders() {
  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  };
}

const BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

// Module-level in-flight lock so multiple call sites (useAuth firing on
// session, useWallet firing on mount, etc.) collapse into a single
// createClient → createWallet → backup sequence instead of racing.
let provisioningPromise: Promise<void> | null = null;
// Once we've confirmed the wallet is set up (or just finished setting it
// up), never call the create endpoints again for the rest of this page
// load — auth events like TOKEN_REFRESHED fire repeatedly and shouldn't
// each trigger a network round-trip.
let provisioningConfirmed = false;

export const portalApi = {
  async createClient(): Promise<PortalClientResult> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${BASE}/portal-client?action=create-client`, {
      method: "POST",
      headers,
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to create client");
    }
    return res.json();
  },

  async getSessionToken(): Promise<{ clientSessionToken: string; clientId: string }> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${BASE}/portal-client?action=session-token`, {
      method: "POST",
      headers,
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to get session token");
    }
    return res.json();
  },

  async createWallet(): Promise<WalletResult> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${BASE}/portal-wallet?action=create`, {
      method: "POST",
      headers,
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to create wallet");
    }
    return res.json();
  },

  async migrateAddress(): Promise<{ address: string; migrated: boolean }> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${BASE}/portal-wallet?action=migrate-address`, {
      method: "POST",
      headers,
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to migrate address");
    }
    return res.json();
  },

  async getBalance(chain?: string): Promise<BalanceResult> {
    const headers = await getAuthHeaders();
    const chainParam = chain ? `&chain=${encodeURIComponent(chain)}` : "";
    const res = await fetch(`${BASE}/portal-wallet?action=balance${chainParam}`, {
      method: "POST",
      headers,
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to get balance");
    }
    return res.json();
  },

  async fundWallet(
    amount: string,
    chainId = "eip155:84532",
    _token = "NATIVE"
  ): Promise<{ success: boolean }> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${BASE}/portal-wallet?action=fund`, {
      method: "POST",
      headers,
      body: JSON.stringify({ chainId, token: "NATIVE", amount }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to fund wallet");
    }
    return res.json();
  },

  async sendTokens(to: string, amount: string, txType = "send", tokenAddress?: string, chain?: string): Promise<SendResult> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${BASE}/portal-wallet?action=send`, {
      method: "POST",
      headers,
      body: JSON.stringify({ to, amount, txType, tokenAddress, chain }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to send tokens");
    }
    return res.json();
  },

  async getTransactions(): Promise<Transaction[]> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${BASE}/portal-wallet?action=transactions`, {
      method: "POST",
      headers,
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to get transactions");
    }
    const data = await res.json();
    return data.transactions;
  },

  async batchPayout(recipients: { address: string; amount: string }[], tokenAddress?: string): Promise<BatchPayoutResult> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${BASE}/portal-payout`, {
      method: "POST",
      headers,
      body: JSON.stringify({ recipients, tokenAddress }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to execute batch payout");
    }
    return res.json();
  },

  async getFeeEstimate(chain?: string): Promise<FeeEstimate> {
    const headers = await getAuthHeaders();
    const chainParam = chain ? `&chain=${encodeURIComponent(chain)}` : "";
    const res = await fetch(`${BASE}/portal-wallet?action=fee-estimate${chainParam}`, {
      method: "POST",
      headers,
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to get fee estimate");
    }
    return res.json();
  },

  async backupWallet(): Promise<{ success: boolean; backupStatus: string }> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${BASE}/portal-wallet?action=backup`, {
      method: "POST",
      headers,
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to backup wallet");
    }
    return res.json();
  },

  /**
   * Provisions the Portal client + wallet in the background as soon as a
   * session exists, so the person can start sending/receiving the moment
   * they land on the dashboard. Safe to call from multiple places — every
   * caller shares the same in-flight request instead of racing, and the
   * underlying edge functions are idempotent (no-op if already set up).
   */
  ensureWalletReady(): Promise<void> {
    if (provisioningConfirmed) return Promise.resolve();
    if (provisioningPromise) return provisioningPromise;
    provisioningPromise = (async () => {
      await portalApi.createClient();
      await portalApi.createWallet();
      try {
        await portalApi.backupWallet();
      } catch (e) {
        console.error("Auto-backup failed (non-blocking):", e);
      }
      provisioningConfirmed = true;
    })().finally(() => {
      provisioningPromise = null;
    });
    return provisioningPromise;
  },
};
