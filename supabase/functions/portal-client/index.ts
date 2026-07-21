import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PORTAL_API_URL = "https://api.portalhq.io/api/v3";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const PORTAL_API_KEY = Deno.env.get("PORTAL_API_KEY");
  if (!PORTAL_API_KEY) {
    return new Response(JSON.stringify({ error: "PORTAL_API_KEY not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);

  if (claimsError || !claimsData?.claims?.sub) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userId = claimsData.claims.sub;

  const serviceSupabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    /* ======================================================
       CREATE CLIENT — creates a real Portal client via
       Custodian API and stores the clientId + first CST
    ====================================================== */
    if (action === "create-client") {
      const { data: profile } = await supabase
        .from("profiles")
        .select("portal_client_id")
        .eq("user_id", userId)
        .maybeSingle();

      if (profile?.portal_client_id) {
        return new Response(
          JSON.stringify({
            clientId: profile.portal_client_id,
            message: "Client already registered",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      console.log("Creating Portal client for user:", userId);

      // Create a new Portal client via Custodian API
      const createRes = await fetch(`${PORTAL_API_URL}/custodians/me/clients`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${PORTAL_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isAccountAbstracted: true }),
      });

      if (!createRes.ok) {
        const errText = await createRes.text();
        console.error("Portal client creation error:", createRes.status, errText);
        throw new Error(`Portal client creation failed [${createRes.status}]: ${errText}`);
      }

      const clientData = await createRes.json();
      const clientId = clientData.id;
      console.log("Portal client created:", clientId);

      // Get user metadata to store phone
      const { data: userData } = await serviceSupabase.auth.admin.getUserById(userId);
      const phone = userData?.user?.user_metadata?.phone || null;

      // Persist client ID to profile (upsert in case trigger hasn't fired yet)
      const upsertData: Record<string, unknown> = { user_id: userId, portal_client_id: clientId };
      if (phone) upsertData.phone = phone;

      const { error: upsertError } = await serviceSupabase
        .from("profiles")
        .upsert(upsertData, { onConflict: "user_id" });

      if (upsertError) {
        throw new Error(`Failed to persist portal_client_id: ${upsertError.message}`);
      }

      return new Response(
        JSON.stringify({
          clientId,
          clientSessionToken: clientData.clientSessionToken || null,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    /* ======================================================
       SESSION TOKEN — creates a fresh CST for the user's
       Portal client using the Custodian API
    ====================================================== */
    if (action === "session-token") {
      const { data: profile } = await supabase
        .from("profiles")
        .select("portal_client_id")
        .eq("user_id", userId)
        .maybeSingle();

      if (!profile?.portal_client_id) {
        return new Response(
          JSON.stringify({ error: "No Portal client found. Create one first." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const sessionRes = await fetch(
        `${PORTAL_API_URL}/custodians/me/clients/${profile.portal_client_id}/sessions`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${PORTAL_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        },
      );

      if (!sessionRes.ok) {
        const errText = await sessionRes.text();
        console.error("Session token error:", sessionRes.status, errText);
        throw new Error(`Session token failed [${sessionRes.status}]: ${errText}`);
      }

      const sessionData = await sessionRes.json();

      return new Response(
        JSON.stringify({
          clientId: profile.portal_client_id,
          clientSessionToken: sessionData.clientSessionToken,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        error: "Invalid action. Use ?action=create-client or ?action=session-token",
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Portal Edge Function error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
