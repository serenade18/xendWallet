import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PORTAL_API_URL = "https://api.portalhq.io/api/v3";

/** Fetch a fresh Client Session Token */
async function getCST(portalApiKey: string, portalClientId: string): Promise<string> {
  const res = await fetch(
    `${PORTAL_API_URL}/custodians/me/clients/${portalClientId}/sessions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${portalApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    },
  );
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`CST fetch failed [${res.status}]: ${errText}`);
  }
  const data = await res.json();
  return data.clientSessionToken;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

type KycStatus = "not_started" | "pending" | "approved" | "rejected";

/** Map Noah / Portal status strings → our normalized status */
function normalizeKycStatus(raw?: unknown): KycStatus {
  const s = String(raw || "").trim().toLowerCase();
  const compact = s.replace(/[^a-z0-9]/g, "");
  if (!compact) return "not_started";

  if (["rejected", "declined", "denied", "failed", "failure", "finalreject", "permanentreject"].some((k) => compact.includes(k))) {
    return "rejected";
  }
  if (["notapproved", "unapproved", "unverified"].some((k) => compact.includes(k))) return "pending";
  if (["approved", "verified", "completed", "complete", "success", "onboarded"].some((k) => compact.includes(k))) {
    return "approved";
  }
  if (
    [
      "pending",
      "inprogress",
      "processing",
      "submitted",
      "review",
      "reviewnotstarted",
      "reviewpending",
      "documentinvalid",
      "agreementsrequired",
      "actionrequired",
      "verificationrequired",
      "missingsteps",
      "incomplete",
    ].some((k) => compact.includes(k))
  ) {
    return "pending";
  }
  return "not_started";
}

function normalizedKey(key: string) {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isStatusKey(key: string) {
  const k = normalizedKey(key);
  return (
    [
      "status",
      "kycstatus",
      "verificationstatus",
      "onboardingstatus",
      "reviewstatus",
      "customerstatus",
      "compliancestatus",
      "applicantstatus",
      "entityverificationstatus",
    ].includes(k) ||
    (k.endsWith("status") && /(kyc|verification|onboarding|review|compliance|customer|applicant|entity)/.test(k))
  );
}

function collectStatusValues(obj: unknown, depth = 0): string[] {
  if (!obj || depth > 6 || typeof obj !== "object") return [];
  const values: string[] = [];
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (isStatusKey(key) && ["string", "number", "boolean"].includes(typeof value)) {
      values.push(String(value));
    }
    if (value && typeof value === "object") values.push(...collectStatusValues(value, depth + 1));
  }
  return values;
}

function collectStrings(obj: unknown, depth = 0): string[] {
  if (!obj || depth > 6) return [];
  if (["string", "number", "boolean"].includes(typeof obj)) return [String(obj)];
  if (typeof obj !== "object") return [];
  return Object.values(obj as Record<string, unknown>).flatMap((value) => collectStrings(value, depth + 1));
}

function findStringByKeys(obj: unknown, keys: string[], depth = 0): string | undefined {
  if (!obj || depth > 6 || typeof obj !== "object") return undefined;
  const accepted = new Set(keys.map(normalizedKey));
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (accepted.has(normalizedKey(key)) && typeof value === "string" && value) return value;
  }
  for (const value of Object.values(obj as Record<string, unknown>)) {
    const found = findStringByKeys(value, keys, depth + 1);
    if (found) return found;
  }
  return undefined;
}

function isKycRelatedPayload(data: unknown) {
  const text = collectStrings(data).join(" ").toLowerCase();
  return /(kyc|verification|required|onboarding|compliance|identity|applicant|customer)/.test(text);
}

function mapKycPayload(data: unknown, httpStatus?: number, fallback: KycStatus = "not_started") {
  const statusValues = collectStatusValues(data);
  const normalized = statusValues.map(normalizeKycStatus).filter((s) => s !== "not_started");
  const hostedUrl = findStringByKeys(data, ["hostedUrl", "HostedURL", "hosted_url"]);
  const customerId = findStringByKeys(data, ["customerId", "CustomerID", "customer_id", "noahCustomerId"]);
  let status: KycStatus = "not_started";

  if (httpStatus === 201) status = "approved";
  else if (normalized.includes("rejected")) status = "rejected";
  else if (normalized.includes("pending")) status = "pending";
  else if (normalized.includes("approved")) status = "approved";
  else if (hostedUrl) status = "pending";

  if (status === "not_started" && isKycRelatedPayload(data)) {
    const textStatus = normalizeKycStatus(collectStrings(data).join(" "));
    status = textStatus === "not_started" ? fallback : textStatus;
  }

  return {
    status,
    rawStatus: statusValues.find((value) => normalizeKycStatus(value) === status) || statusValues[0],
    hostedUrl,
    customerId,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const PORTAL_API_KEY = Deno.env.get("PORTAL_API_KEY");
  if (!PORTAL_API_KEY) return json({ error: "PORTAL_API_KEY not configured" }, 500);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
  if (claimsError || !claimsData?.claims) return json({ error: "Unauthorized" }, 401);
  const userId = claimsData.claims.sub;

  const { data: profile } = await supabase
    .from("profiles")
    .select("portal_client_id, wallet_address, noah_kyc_status, noah_kyc_customer_id, noah_kyc_hosted_url, noah_kyc_fiat_options")
    .eq("user_id", userId)
    .maybeSingle();

  if (!profile?.portal_client_id) return json({ error: "Portal client not set up" }, 400);

  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  // ── Read status. If not yet approved, refresh from Noah so the UI unlocks promptly. ──
  if (action === "kyc-status") {
    const cached = profile.noah_kyc_status || "not_started";
    if (cached === "approved") {
      return json({
        status: cached,
        customerId: profile.noah_kyc_customer_id,
        hostedUrl: profile.noah_kyc_hosted_url,
        fiatOptions: profile.noah_kyc_fiat_options || [],
      });
    }
    // Fall through to a Noah refresh below (needs CST)
  }

  // From here we need a Noah session
  let cst: string;
  try {
    cst = await getCST(PORTAL_API_KEY, profile.portal_client_id);
  } catch (e) {
    console.error(e);
    return json({ error: "Failed to authenticate with Portal" }, 500);
  }
  const noahBase = `${PORTAL_API_URL}/clients/me/integrations/noah`;
  const noahHeaders = {
    Authorization: `Bearer ${cst}`,
    "Content-Type": "application/json",
  };

  async function probeKycByPaymentMethods(): Promise<{ status: KycStatus; raw: unknown }> {
    const res = await fetch(`${noahBase}/payouts/payment-methods`, {
      method: "GET",
      headers: noahHeaders,
    });
    const data = await res.json().catch(() => ({}));

    if (res.ok) return { status: "approved", raw: data };

    const mapped = mapKycPayload(data, res.status, "pending");
    if (mapped.status !== "not_started") return { status: mapped.status, raw: data };

    return { status: isKycRelatedPayload(data) ? "pending" : "not_started", raw: data };
  }

  /** Refresh KYC status from Noah and persist to DB */
  async function refreshKycFromNoah() {
    try {
      const res = await fetch(`${noahBase}/customers/kyc`, {
        method: "GET",
        headers: noahHeaders,
      });
      const data = await res.json().catch(() => ({}));
      console.log("Noah KYC GET response", res.status, JSON.stringify(data).slice(0, 500));
      if (!res.ok) {
        // Portal's KYC endpoint may only create/retrieve hosted sessions. When
        // the read path is unavailable, a successful KYC-gated payment-methods
        // call is the strongest available signal that Noah has approved KYC.
        const probe = await probeKycByPaymentMethods().catch(() => null);
        if (probe?.status === "approved") {
          await admin
            .from("profiles")
            .update({
              noah_kyc_status: "approved",
              noah_kyc_updated_at: new Date().toISOString(),
            })
            .eq("user_id", userId);
          return { status: "approved" as const, customerId: profile!.noah_kyc_customer_id, raw: probe.raw };
        }
        const fallback = (profile!.noah_kyc_status || "not_started") as KycStatus;
        const mapped = mapKycPayload(data, res.status, fallback);
        const status = mapped.status === "not_started" && fallback === "pending" ? "pending" : mapped.status;
        return { status, customerId: mapped.customerId || profile!.noah_kyc_customer_id, raw: data };
      }
      const mapped = mapKycPayload(data, res.status, (profile!.noah_kyc_status || "not_started") as KycStatus);
      const status = mapped.status;
      const customerId = mapped.customerId || profile!.noah_kyc_customer_id;
      console.log("Noah KYC normalized", { rawStatus: mapped.rawStatus, status });
      await admin
        .from("profiles")
        .update({
          noah_kyc_status: status,
          noah_kyc_customer_id: customerId,
          noah_kyc_hosted_url: mapped.hostedUrl || profile!.noah_kyc_hosted_url,
          noah_kyc_updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);
      return { status, customerId, hostedUrl: mapped.hostedUrl, raw: data };
    } catch (e) {
      console.error("KYC refresh error:", e);
      return { status: profile!.noah_kyc_status || "not_started", raw: null };
    }
  }

  /** Gate: block action until KYC approved. Refreshes from Noah on `pending`. */
  async function requireKyc() {
    let status = profile!.noah_kyc_status || "not_started";
    if (status !== "approved") {
      // Try refreshing once from Noah in case the user just finished
      const fresh = await refreshKycFromNoah();
      status = fresh.status;
      if (status !== "approved") {
        return json(
          {
            error:
              status === "not_started"
                ? "Please complete identity verification (KYC) before continuing."
                : status === "pending"
                ? "Your identity verification is still being reviewed. Please try again shortly."
                : "Your identity verification was rejected. Please contact support.",
            code: "KYC_REQUIRED",
            status,
          },
          403,
        );
      }
    }
    return null;
  }

  try {
    // ── Live KYC status refresh (cached-miss branch from above) ──
    if (action === "kyc-status") {
      const fresh = await refreshKycFromNoah();
      return json({
        status: fresh.status,
        customerId: fresh.customerId || profile.noah_kyc_customer_id,
        hostedUrl: fresh.hostedUrl || profile.noah_kyc_hosted_url,
        fiatOptions: profile.noah_kyc_fiat_options || [],
      });
    }

    // ── KYC Onboarding ──
    if (action === "kyc") {
      const body = await req.json().catch(() => ({}));
      const fiatOptions = Array.isArray(body.fiatOptions) ? body.fiatOptions : [];
      if (fiatOptions.length === 0) {
        return json(
          { error: "At least one fiat currency is required to start KYC (e.g. USD)." },
          400,
        );
      }
      const res = await fetch(`${noahBase}/customers/kyc`, {
        method: "POST",
        headers: noahHeaders,
        body: JSON.stringify({
          returnUrl: body.returnUrl || url.origin,
          fiatOptions,
          customerType: body.customerType || "Individual",
          metadata: body.metadata || {},
          form: body.form || {},
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        console.error("Noah KYC error:", JSON.stringify(data));
        return json({ error: data.message || "KYC initiation failed" }, res.status);
      }
      const mapped = mapKycPayload(data, res.status, "pending");
      const hostedUrl = mapped.hostedUrl || data?.data?.hostedUrl || data?.hostedUrl;
      const customerId = mapped.customerId || data?.data?.customerId || data?.customerId;
      const status = mapped.status === "not_started" ? "pending" : mapped.status;
      await admin
        .from("profiles")
        .update({
          noah_kyc_status: status,
          noah_kyc_customer_id: customerId,
          noah_kyc_hosted_url: hostedUrl,
          noah_kyc_fiat_options: fiatOptions,
          noah_kyc_updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);
      return json({ ...data, status, customerId });
    }

    // ── Refresh KYC status from Noah ──
    if (action === "kyc-refresh") {
      const fresh = await refreshKycFromNoah();
      return json({ status: fresh.status, customerId: fresh.customerId });
    }

    // ── Get Payout Countries (public, no KYC needed) ──
    if (action === "payout-countries") {
      const res = await fetch(`${noahBase}/payouts/countries`, {
        method: "GET",
        headers: noahHeaders,
      });
      const data = await res.json();
      if (!res.ok) return json({ error: data.message || "Failed to get countries" }, res.status);
      return json(data);
    }

    if (action === "payout-channels") {
      const country = url.searchParams.get("country") || "";
      const fiatCurrency = url.searchParams.get("fiatCurrency") || "";
      const requestedCrypto = url.searchParams.get("cryptoCurrency") || "USDC";

      const buildUrl = (crypto: string) => {
        const qs = new URLSearchParams({ cryptoCurrency: crypto });
        if (country) qs.set("country", country);
        if (fiatCurrency) qs.set("fiatCurrency", fiatCurrency);
        return `${noahBase}/payouts/channels?${qs.toString()}`;
      };

      // Portal/Noah sandbox requires `_TEST` suffix; production uses bare ticker.
      // Try requested value first, then flip suffix on 400.
      const primary = requestedCrypto;
      const alt = requestedCrypto.endsWith("_TEST")
        ? requestedCrypto.replace(/_TEST$/, "")
        : `${requestedCrypto}_TEST`;

      let res = await fetch(buildUrl(primary), { method: "GET", headers: noahHeaders });
      let data = await res.json().catch(() => ({}));

      if (!res.ok && res.status === 400) {
        console.log("payout-channels primary failed, retrying with", alt, JSON.stringify(data).slice(0, 300));
        const res2 = await fetch(buildUrl(alt), { method: "GET", headers: noahHeaders });
        const data2 = await res2.json().catch(() => ({}));
        if (res2.ok) {
          return json(data2);
        }
        // Keep the more informative error
        res = res2;
        data = data2;
      }

      if (!res.ok) {
        console.error("payout-channels error", res.status, JSON.stringify(data));
        return json(
          { error: data.error || data.message || "Failed to get channels", details: data },
          res.status,
        );
      }
      return json(data);
    }

    if (action === "payout-channel-form") {
      const channelId = url.searchParams.get("channelId");
      if (!channelId) return json({ error: "channelId is required" }, 400);
      const res = await fetch(
        `${noahBase}/payouts/channels/${encodeURIComponent(channelId)}/form`,
        { method: "GET", headers: noahHeaders },
      );
      const data = await res.json();
      if (!res.ok) return json({ error: data.message || "Failed to get form" }, res.status);
      return json(data);
    }

    // ── KYC-gated actions below ──

    if (action === "payment-methods") {
      const gate = await requireKyc();
      if (gate) return gate;
      const res = await fetch(`${noahBase}/payouts/payment-methods`, {
        method: "GET",
        headers: noahHeaders,
      });
      const data = await res.json();
      if (!res.ok) {
        // Detect KYC-related messages surfaced by Noah and normalize
        const msg = (data?.message || "").toLowerCase();
        if (msg.includes("kyc") || msg.includes("verify") || msg.includes("onboard")) {
          await admin
            .from("profiles")
            .update({ noah_kyc_status: "not_started" })
            .eq("user_id", userId);
          return json({ error: data.message, code: "KYC_REQUIRED", status: "not_started" }, 403);
        }
        return json({ error: data.message || "Failed to get payment methods" }, res.status);
      }
      return json(data);
    }

    if (action === "quote-payout") {
      const gate = await requireKyc();
      if (gate) return gate;
      const body = await req.json();
      const res = await fetch(`${noahBase}/payouts/quote`, {
        method: "POST",
        headers: noahHeaders,
        body: JSON.stringify({
          channelId: body.channelId,
          cryptoCurrency: body.cryptoCurrency || "USDC",
          fiatAmount: body.fiatAmount,
          fiatCurrency: body.fiatCurrency,
          form: body.form || {},
          paymentMethodId: body.paymentMethodId,
        }),
      });
      const data = await res.json();
      if (!res.ok) return json({ error: data.message || "Failed to get quote" }, res.status);
      return json(data);
    }

    if (action === "initiate-payout") {
      const gate = await requireKyc();
      if (gate) return gate;
      const body = await req.json();
      const res = await fetch(`${noahBase}/payouts`, {
        method: "POST",
        headers: noahHeaders,
        body: JSON.stringify({
          payoutId: body.payoutId,
          sourceAddress: body.sourceAddress || profile.wallet_address,
          expiry: body.expiry || new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          nonce: body.nonce || crypto.randomUUID().replace(/-/g, "").slice(0, 36),
          network: body.network || "solana:devnet",
        }),
      });
      const data = await res.json();
      if (!res.ok) return json({ error: data.message || "Failed to initiate payout" }, res.status);
      return json(data);
    }

    if (action === "initiate-payin") {
      const gate = await requireKyc();
      if (gate) return gate;
      const body = await req.json();

      const requestedCrypto = body.cryptoCurrency || "USDC";
      const altCrypto = requestedCrypto.endsWith("_TEST")
        ? requestedCrypto.replace(/_TEST$/, "")
        : `${requestedCrypto}_TEST`;

      const buildBody = (crypto: string) => JSON.stringify({
        fiatCurrency: body.fiatCurrency,
        cryptoCurrency: crypto,
        network: body.network || "solana:devnet",
        destinationAddress: body.destinationAddress || profile.wallet_address,
      });

      let res = await fetch(`${noahBase}/payins`, {
        method: "POST",
        headers: noahHeaders,
        body: buildBody(requestedCrypto),
      });
      let data = await res.json().catch(() => ({}));

      // Sandbox often expects the _TEST suffix on the crypto ticker — retry
      // once with the flipped suffix before giving up.
      if (!res.ok && (res.status === 400 || res.status === 403)) {
        console.log("initiate-payin primary failed, retrying with", altCrypto, JSON.stringify(data).slice(0, 300));
        const res2 = await fetch(`${noahBase}/payins`, {
          method: "POST",
          headers: noahHeaders,
          body: buildBody(altCrypto),
        });
        const data2 = await res2.json().catch(() => ({}));
        if (res2.ok) {
          return json(data2);
        }
        res = res2;
        data = data2;
      }

      if (!res.ok) {
        console.error("initiate-payin error", res.status, JSON.stringify(data));
        return json(
          { error: data.message || data.error || "Failed to initiate payin", details: data },
          res.status,
        );
      }
      return json(data);
    }

    if (action === "simulate-deposit") {
      const body = await req.json();
      const res = await fetch(`${noahBase}/payins/simulate`, {
        method: "POST",
        headers: noahHeaders,
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) return json({ error: data.message || "Failed to simulate deposit" }, res.status);
      return json(data);
    }

    return json({ error: "Unknown action" }, 400);
  } catch (error: unknown) {
    console.error("Noah offramp error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return json({ error: msg }, 500);
  }
});
