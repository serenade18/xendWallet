import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PORTAL_API_URL = "https://api.portalhq.io/api/v3";
const PORTAL_MPC_URL = "https://mpc-client.portalhq.io";

const CHAINS: Record<string, { chain: string; chainId: string; rpcUrl: string; type: string }> = {
  "base-sepolia": {
    chain: "base-sepolia",
    chainId: "eip155:84532",
    rpcUrl: "https://api.portalhq.io/rpc/v1/eip155/84532",
    type: "evm",
  },
  "ethereum-sepolia": {
    chain: "ethereum-sepolia",
    chainId: "eip155:11155111",
    rpcUrl: "https://api.portalhq.io/rpc/v1/eip155/11155111",
    type: "evm",
  },
  "monad-testnet": {
    chain: "monad-testnet",
    chainId: "eip155:10143",
    rpcUrl: "https://api.portalhq.io/rpc/v1/eip155/10143",
    type: "evm",
  },
  "celo-alfajores": {
    chain: "celo-alfajores",
    chainId: "eip155:44787",
    rpcUrl: "https://api.portalhq.io/rpc/v1/eip155/44787",
    type: "evm",
  },
  "polygon-amoy": {
    chain: "polygon-amoy",
    chainId: "eip155:80002",
    rpcUrl: "https://api.portalhq.io/rpc/v1/eip155/80002",
    type: "evm",
  },
};

const DEFAULT_CHAIN = "base-sepolia";

function getChainConfig(chainKey?: string) {
  return CHAINS[chainKey || DEFAULT_CHAIN] || CHAINS[DEFAULT_CHAIN];
}

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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const PORTAL_API_KEY = Deno.env.get("PORTAL_API_KEY");
  if (!PORTAL_API_KEY) {
    return new Response(JSON.stringify({ error: "PORTAL_API_KEY not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const serviceSupabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
  if (claimsError || !claimsData?.claims) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const userId = claimsData.claims.sub;

  try {
    const body = await req.json();
    const { recipients, tokenAddress, chain: chainKey } = body;

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return new Response(JSON.stringify({ error: "recipients array is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (recipients.length > 20) {
      return new Response(JSON.stringify({ error: "Maximum 20 recipients per batch" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const chainCfg = getChainConfig(chainKey);

    if (chainCfg.type !== "evm") {
      return new Response(JSON.stringify({ error: "Batch payouts are only supported on EVM chains" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (!profile?.portal_client_id || !profile?.wallet_share_secp || !profile?.wallet_address) {
      return new Response(JSON.stringify({ error: "Wallet not set up" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get fresh session token
    const cst = await getCST(PORTAL_API_KEY, profile.portal_client_id);

    // Create batch payout record
    const { data: batchRecord } = await supabase
      .from("batch_payouts")
      .insert({
        user_id: userId,
        recipients,
        status: "processing",
      })
      .select()
      .single();

    console.log(`Batch payout: ${recipients.length} recipients, chain: ${chainCfg.chain}, using AA gas sponsorship`);

    // Send all transactions using /v1/assets/send with gas sponsorship
    const txPromises = recipients.map((recipient: { address: string; amount: string }, index: number) => {
      console.log(`Tx ${index}: to=${recipient.address}, amount=${recipient.amount}`);

      return fetch(`${PORTAL_MPC_URL}/v1/assets/send`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cst}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          share: profile.wallet_share_secp,
          chain: chainCfg.chainId,
          to: recipient.address,
          token: tokenAddress || "NATIVE",
          amount: recipient.amount,
          rpcUrl: chainCfg.rpcUrl,
          sponsorGas: true,
        }),
      }).then(async (res) => {
        if (!res.ok) {
          const errText = await res.text();
          console.error(`Tx ${index} to ${recipient.address} failed:`, errText);
          return {
            address: recipient.address,
            amount: recipient.amount,
            status: errText.includes("blocked") ? "blocked" : "failed",
            error: errText,
          };
        }
        const sendData = await res.json();
        const txHash = sendData.result || sendData.transactionHash || sendData.hash || "";
        console.log(`Tx ${index} to ${recipient.address} success: ${txHash}`);
        return {
          address: recipient.address,
          amount: recipient.amount,
          txHash,
          status: "confirmed",
        };
      }).catch((err: Error) => ({
        address: recipient.address,
        amount: recipient.amount,
        status: "error",
        error: err.message,
      }));
    });

    // Submit all transactions concurrently
    const results = await Promise.all(txPromises);

    // Log all transactions to DB concurrently
    const dbInserts = results.map((r: any) =>
      supabase.from("transactions").insert({
        user_id: userId,
        tx_hash: r.txHash || null,
        tx_type: "payout",
        to_address: r.address,
        amount: r.amount,
        token: tokenAddress || "NATIVE",
        chain: chainCfg.chain,
        status: r.status,
        metadata: { batchId: batchRecord?.id, error: r.error, gasSponsored: true },
      })
    );
    await Promise.all(dbInserts);

    // Update batch payout with results
    if (batchRecord?.id) {
      const allSuccess = results.every((r: any) => r.status === "confirmed");
      const allFailed = results.every((r: any) => r.status !== "confirmed");

      await serviceSupabase
        .from("batch_payouts")
        .update({
          results,
          status: allSuccess ? "completed" : allFailed ? "failed" : "partial",
        })
        .eq("id", batchRecord.id);
    }

    return new Response(JSON.stringify({
      batchId: batchRecord?.id,
      results,
      summary: {
        total: recipients.length,
        confirmed: results.filter((r: any) => r.status === "confirmed").length,
        failed: results.filter((r: any) => r.status !== "confirmed").length,
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Batch payout error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
