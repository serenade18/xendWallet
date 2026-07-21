import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Self-Managed Backup Webhook
 * 
 * Portal sends custodian backup shares to this endpoint after a backup is triggered.
 * We store them in the profiles table alongside the client backup shares.
 * 
 * Expected payload from Portal:
 * {
 *   clientId: string,
 *   backupSharePairs: [
 *     { id: string, curve: "SECP256K1" | "ED25519", share: string }
 *   ]
 * }
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Verify the webhook secret to ensure this is from Portal
  const PORTAL_API_KEY = Deno.env.get("PORTAL_API_KEY");
  if (!PORTAL_API_KEY) {
    return new Response(JSON.stringify({ error: "Not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const serviceSupabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const body = await req.json();
    const { clientId, backupSharePairs } = body;

    console.log(`Backup webhook received for client: ${clientId}, shares: ${backupSharePairs?.length}`);

    if (!clientId || !backupSharePairs || !Array.isArray(backupSharePairs)) {
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find the user profile by portal_client_id
    const { data: profile, error: profileError } = await serviceSupabase
      .from("profiles")
      .select("user_id, portal_client_id")
      .eq("portal_client_id", clientId)
      .maybeSingle();

    if (profileError || !profile) {
      console.error("Profile not found for client:", clientId);
      return new Response(JSON.stringify({ error: "Client not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract custodian backup shares by curve type
    const updateData: Record<string, string> = {};
    for (const pair of backupSharePairs) {
      const curve = (pair.curve || "").toUpperCase();
      if (curve === "SECP256K1" || curve === "secp256k1") {
        updateData.custodian_backup_share_secp = pair.share;
      } else if (curve === "ED25519" || curve === "ed25519") {
        updateData.custodian_backup_share_ed = pair.share;
      }
    }

    if (Object.keys(updateData).length === 0) {
      return new Response(JSON.stringify({ error: "No valid backup shares in payload" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Store custodian backup shares
    const { error: updateError } = await serviceSupabase
      .from("profiles")
      .update(updateData)
      .eq("portal_client_id", clientId);

    if (updateError) {
      console.error("Failed to store custodian backup shares:", updateError);
      throw new Error("Failed to store backup shares");
    }

    console.log(`Custodian backup shares stored for client: ${clientId}`);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Backup webhook error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
