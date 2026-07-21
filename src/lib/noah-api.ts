import { supabase } from "@/integrations/supabase/client";

const BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

async function getAuthHeaders() {
  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  };
}

export class NoahApiError extends Error {
  code?: string;
  status?: string;
  httpStatus: number;
  details?: any;
  constructor(message: string, httpStatus: number, code?: string, status?: string, details?: any) {
    super(message);
    this.name = "NoahApiError";
    this.code = code;
    this.status = status;
    this.httpStatus = httpStatus;
    this.details = details;
  }
  get isKycRequired() {
    return this.code === "KYC_REQUIRED";
  }
}

async function noahFetch(action: string, opts?: { method?: string; body?: any; params?: Record<string, string> }) {
  const headers = await getAuthHeaders();
  const params = new URLSearchParams({ action, ...(opts?.params || {}) });
  const res = await fetch(`${BASE}/noah-offramp?${params}`, {
    method: opts?.method || "POST",
    headers,
    ...(opts?.body ? { body: JSON.stringify(opts.body) } : {}),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    console.error(`Noah API error [${action}]:`, err);
    throw new NoahApiError(err.error || `Noah API error [${res.status}]`, res.status, err.code, err.status, err.details);
  }
  return res.json();
}

export interface NoahKycResult {
  data: { hostedUrl: string };
  status?: NoahKycStatus;
  customerId?: string | null;
}

export interface NoahPayoutCountries {
  data: { countries: Record<string, any> };
}

export interface NoahPayoutChannel {
  id?: string;
  channelId?: string;
  name?: string;
  type?: string;
  country?: string;
  [key: string]: any;
}

export interface NoahPayoutChannels {
  data: { items: NoahPayoutChannel[]; pageToken?: string };
}

export interface NoahChannelForm {
  data: { formSchema: any; formMetadata: any };
}

export interface NoahQuoteResult {
  data: {
    payoutId: string;
    formSessionId: string;
    cryptoAmountEstimate: string;
    totalFee: string;
    nextStep: any;
  };
}

export interface NoahPayoutResult {
  data: {
    destinationAddress: string;
    conditions: {
      amountConditions: { comparisonOperator: string; value: string }[];
      cryptoCurrency: string;
      network: string;
      destinationAddress: string;
    }[];
  };
}

export interface NoahPaymentMethod {
  id: string;
  paymentMethodCategory: string;
  displayDetails: {
    type: string;
    accountNumber?: string;
    bankCode?: string;
    last4?: string;
    scheme?: string;
    identifierType?: string;
    identifier?: string;
  };
  country: string;
  customerId: string;
  capabilities: { payoutFrom: boolean; payinTo: boolean; payoutTo: boolean };
  accountHolderDetails?: { name: { firstName: string; lastName: string } };
}

export interface NoahPayinResult {
  data: {
    payinId: string;
    bankDetails: {
      paymentMethodId: string;
      paymentMethodType: string;
      accountNumber: string;
      network: string;
      accountHolderName: string;
      bankCode: string;
      bankName: string;
      bankAddress: any;
      reference: string;
      relatedPaymentMethods: any[];
    };
  };
}

export type NoahKycStatus = "not_started" | "pending" | "approved" | "rejected";

export interface NoahKycStatusResult {
  status: NoahKycStatus;
  customerId?: string | null;
  hostedUrl?: string | null;
  fiatOptions?: string[];
}

export const noahApi = {
  /** Initiate KYC. Requires at least one fiat currency (defaults to ["USD"]). */
  async initiateKyc(returnUrl?: string, fiatCurrencies: string[] = ["USD"]): Promise<NoahKycResult> {
    const list = (fiatCurrencies || []).filter(Boolean);
    if (list.length === 0) {
      throw new NoahApiError(
        "At least one fiat currency is required to start KYC (e.g. USD).",
        400,
        "MISSING_FIAT_OPTIONS",
      );
    }
    return noahFetch("kyc", {
      body: {
        returnUrl: returnUrl || window.location.origin,
        fiatOptions: list.map((c) => ({ fiatCurrencyCode: c })),
      },
    });
  },

  /** Cached KYC status (from our DB, no network to Noah). */
  async getKycStatus(): Promise<NoahKycStatusResult> {
    return noahFetch("kyc-status", { method: "POST" });
  },

  /** Force refresh KYC status from Noah and persist to DB. */
  async refreshKycStatus(): Promise<{ status: NoahKycStatus; customerId?: string }> {
    return noahFetch("kyc-refresh", { method: "POST" });
  },


  /** Get supported payout countries */
  async getPayoutCountries(): Promise<NoahPayoutCountries> {
    return noahFetch("payout-countries", { method: "POST" });
  },

  /** Get payout channels for a country. cryptoCurrency defaults to USDC (edge function auto-tries _TEST on sandbox). */
  async getPayoutChannels(
    country?: string,
    opts?: { fiatCurrency?: string; cryptoCurrency?: string },
  ): Promise<NoahPayoutChannels> {
    const params: Record<string, string> = {};
    if (country) params.country = country;
    if (opts?.fiatCurrency) params.fiatCurrency = opts.fiatCurrency;
    if (opts?.cryptoCurrency) params.cryptoCurrency = opts.cryptoCurrency;
    return noahFetch("payout-channels", { method: "POST", params });
  },

  /** Get form schema for a payout channel */
  async getChannelForm(channelId: string): Promise<NoahChannelForm> {
    return noahFetch("payout-channel-form", {
      method: "POST",
      params: { channelId },
    });
  },

  /** Get a quote for a payout */
  async quotePayout(params: {
    channelId: string;
    fiatAmount: string;
    fiatCurrency: string;
    cryptoCurrency?: string;
    form?: Record<string, any>;
    paymentMethodId?: string;
  }): Promise<NoahQuoteResult> {
    return noahFetch("quote-payout", { body: params });
  },

  /** Initiate a payout - returns destination address to send crypto to */
  async initiatePayout(params: {
    payoutId: string;
    sourceAddress?: string;
    network?: string;
    expiry?: string;
    nonce?: string;
  }): Promise<NoahPayoutResult> {
    return noahFetch("initiate-payout", { body: params });
  },

  /** List payment methods */
  async listPaymentMethods(): Promise<{ data: { paymentMethods: NoahPaymentMethod[] } }> {
    return noahFetch("payment-methods", { method: "POST" });
  },

  /** Initiate payin (on-ramp: fiat → crypto) */
  async initiatePayin(params: {
    fiatCurrency: string;
    cryptoCurrency?: string;
    network?: string;
    destinationAddress?: string;
  }): Promise<NoahPayinResult> {
    return noahFetch("initiate-payin", { body: params });
  },

  /** Simulate a fiat deposit (test/sandbox only) */
  async simulateDeposit(body: any): Promise<any> {
    return noahFetch("simulate-deposit", { body });
  },
};
