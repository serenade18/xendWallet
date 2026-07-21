import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PORTAL_API_URL = "https://api.portalhq.io/api/v3";
const PORTAL_MPC_URL = "https://mpc-client.portalhq.io";

type ChainType = "evm" | "stellar" | "tron" | "solana";

const CHAINS: Record<string, { chain: string; chainId: string; rpcUrl: string; signingRpcUrl: string; type: ChainType }> = {
  "base-sepolia": {
    chain: "base-sepolia",
    chainId: "eip155:84532",
    rpcUrl: "https://api.portalhq.io/rpc/v1/eip155/84532",
    signingRpcUrl: "https://api.portalhq.io/rpc/v1/eip155/84532",
    type: "evm",
  },
  "ethereum-sepolia": {
    chain: "ethereum-sepolia",
    chainId: "eip155:11155111",
    rpcUrl: "https://api.portalhq.io/rpc/v1/eip155/11155111",
    signingRpcUrl: "https://api.portalhq.io/rpc/v1/eip155/11155111",
    type: "evm",
  },
  "monad-testnet": {
    chain: "monad-testnet",
    chainId: "eip155:10143",
    rpcUrl: "https://api.portalhq.io/rpc/v1/eip155/10143",
    signingRpcUrl: "https://api.portalhq.io/rpc/v1/eip155/10143",
    type: "evm",
  },
  "celo-alfajores": {
    chain: "celo-alfajores",
    chainId: "eip155:44787",
    rpcUrl: "https://api.portalhq.io/rpc/v1/eip155/44787",
    signingRpcUrl: "https://api.portalhq.io/rpc/v1/eip155/44787",
    type: "evm",
  },
  "polygon-amoy": {
    chain: "polygon-amoy",
    chainId: "eip155:80002",
    rpcUrl: "https://api.portalhq.io/rpc/v1/eip155/80002",
    signingRpcUrl: "https://api.portalhq.io/rpc/v1/eip155/80002",
    type: "evm",
  },
  "solana-devnet": {
    chain: "solana-devnet",
    chainId: "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1",
    rpcUrl: "https://api.devnet.solana.com",
    signingRpcUrl: "https://api.devnet.solana.com",
    type: "solana",
  },
  "stellar-testnet": {
    chain: "stellar-testnet",
    chainId: "stellar:testnet",
    rpcUrl: "https://horizon-testnet.stellar.org",
    signingRpcUrl: "https://horizon-testnet.stellar.org",
    type: "stellar",
  },
  "tron-nile": {
    chain: "tron-nile",
    chainId: "tron:nile",
    rpcUrl: "https://nile.trongrid.io",
    signingRpcUrl: "grpc.nile.trongrid.io:50051",
    type: "tron",
  },
};

const DEFAULT_CHAIN = "solana-devnet";

// Portal faucet only supports these chains
const PORTAL_FAUCET_SUPPORTED_CHAINS: Record<string, string> = {
  "eip155:10143": "MON",    // Monad Testnet
  "eip155:11155111": "ETH", // Ethereum Sepolia
  "eip155:44787": "CELO",   // Celo Alfajores
  "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1": "SOL", // Solana Devnet
};

function isFaucetSupported(chainId: string): boolean {
  return chainId in PORTAL_FAUCET_SUPPORTED_CHAINS;
}

function getChainConfig(chainKey?: string) {
  return CHAINS[chainKey || DEFAULT_CHAIN] || CHAINS[DEFAULT_CHAIN];
}

/** Fetch a fresh Client Session Token for a Portal client */
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

/* ======================================================
   STELLAR: Build XLM payment transaction XDR
====================================================== */
async function buildStellarTransaction(
  sourceAddress: string,
  destinationAddress: string,
  amount: string,
  horizonUrl: string,
): Promise<string> {
  // Fetch source account info (sequence number)
  const accountRes = await fetch(`${horizonUrl}/accounts/${sourceAddress}`);
  if (!accountRes.ok) {
    const err = await accountRes.text();
    throw new Error(`Stellar account not found: ${err}`);
  }
  const accountData = await accountRes.json();
  const sequence = accountData.sequence;

  // Fetch current ledger for base fee and timeouts
  const feeRes = await fetch(`${horizonUrl}/fee_stats`);
  const feeData = feeRes.ok ? await feeRes.json() : null;
  const baseFee = feeData?.fee_charged?.mode || "100";

  // Build transaction using Horizon's transaction builder endpoint is not available,
  // so we use the stellar-sdk via esm.sh
  const { TransactionBuilder, Networks, Operation, Asset, Account } = await import(
    "https://esm.sh/stellar-base@12.1.1"
  );

  const sourceAccount = new Account(sourceAddress, sequence);
  const transaction = new TransactionBuilder(sourceAccount, {
    fee: baseFee,
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(
      Operation.payment({
        destination: destinationAddress,
        asset: Asset.native(),
        amount: amount,
      }),
    )
    .setTimeout(30)
    .build();

  // Serialize to XDR and base64 encode
  const xdr = transaction.toXDR();
  if (typeof xdr === "string") return xdr;
  // If Buffer, convert to base64
  return btoa(String.fromCharCode(...new Uint8Array(xdr)));
}

/* ======================================================
   TRON: Build TRX transfer transaction
====================================================== */
async function buildTronTransaction(
  fromAddress: string,
  toAddress: string,
  amountSun: number,
  tronApiUrl: string,
): Promise<string> {
  // Use TronGrid HTTP API to create unsigned transaction
  const res = await fetch(`${tronApiUrl}/wallet/createtransaction`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      to_address: toAddress,
      owner_address: fromAddress,
      amount: amountSun,
      visible: true,
    }),
  });

  if (!res.ok) {
    throw new Error(`Tron createtransaction failed: ${await res.text()}`);
  }

  const txData = await res.json();
  if (txData.Error) {
    throw new Error(`Tron tx error: ${txData.Error}`);
  }

  // raw_data_hex contains the protobuf-serialized raw_data
  const rawHex = txData.raw_data_hex;
  if (!rawHex) {
    throw new Error("No raw_data_hex in Tron transaction response");
  }

  // Convert hex to base64
  const bytes = new Uint8Array(rawHex.match(/.{1,2}/g)!.map((b: string) => parseInt(b, 16)));
  return btoa(String.fromCharCode(...bytes));
}

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
  if (claimsError || !claimsData?.claims) {
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

    // Helper: get profile
    const getProfile = async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (!profile?.portal_client_id) {
        throw new Error("No Portal client. Create one first.");
      }
      return profile;
    };

    /* ======================================================
       CREATE WALLET via Enclave MPC API
    ====================================================== */
    if (action === "create") {
      const profile = await getProfile();

      if (profile.wallet_address) {
        return new Response(
          JSON.stringify({ error: "Wallet already exists", address: profile.wallet_address }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const cst = await getCST(PORTAL_API_KEY, profile.portal_client_id);

      console.log("Generating wallet for user:", userId);
      const generateRes = await fetch(`${PORTAL_MPC_URL}/v1/generate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cst}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      if (!generateRes.ok) {
        const errText = await generateRes.text();
        console.error("Wallet generate error:", generateRes.status, errText);
        throw new Error(`Wallet generate error [${generateRes.status}]: ${errText}`);
      }

      const walletData = await generateRes.json();
      console.log("Wallet generated successfully. Keys:", Object.keys(walletData));

      const shareIds: string[] = [];
      const secpData = walletData.secp256k1 || walletData.SECP256K1;
      const edData = walletData.ed25519 || walletData.ED25519;

      if (secpData?.id) shareIds.push(secpData.id);
      if (edData?.id) shareIds.push(edData.id);

      if (shareIds.length > 0) {
        const confirmRes = await fetch(
          `${PORTAL_API_URL}/clients/me/signing-share-pairs`,
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${cst}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              status: "STORED_CLIENT",
              signingSharePairIds: shareIds,
            }),
          },
        );

        if (!confirmRes.ok) {
          console.error("Share confirm error:", confirmRes.status, await confirmRes.text());
        }
      }

      let walletAddress = "";
      const meRes = await fetch(`${PORTAL_API_URL}/clients/me`, {
        headers: { Authorization: `Bearer ${cst}` },
      });

      if (meRes.ok) {
        const meData = await meRes.json();
        console.log("Client /me namespaces:", JSON.stringify(meData?.metadata?.namespaces));
        // Extract address based on default chain type
        const defaultChainType = getChainConfig(DEFAULT_CHAIN).type;
        if (defaultChainType === "solana") {
          walletAddress =
            meData?.metadata?.namespaces?.solana?.address ||
            meData?.metadata?.namespaces?.eip155?.address ||
            meData?.address ||
            "";
        } else {
          walletAddress =
            meData?.metadata?.namespaces?.eip155?.address ||
            meData?.address ||
            "";
        }
      }

      await serviceSupabase
        .from("profiles")
        .update({
          wallet_address: walletAddress,
          wallet_id: secpData?.id || "",
          wallet_share_secp: secpData?.share || "",
          wallet_share_ed: edData?.share || "",
        })
        .eq("user_id", userId);

      // Auto-fund is only available on Portal-supported faucet chains
      let autoFundResult: any = null;
      const defaultChainCfg = getChainConfig(DEFAULT_CHAIN);
      if (isFaucetSupported(defaultChainCfg.chainId)) {
        try {
          const fundCst = await getCST(PORTAL_API_KEY, profile.portal_client_id);
          const autoFundRes = await fetch(`${PORTAL_API_URL}/clients/me/fund`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${fundCst}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              chainId: defaultChainCfg.chainId,
              token: "NATIVE",
              amount: "0.01",
            }),
          });

          if (autoFundRes.ok) {
            autoFundResult = await autoFundRes.json();
            console.log("Auto-funded wallet:", JSON.stringify(autoFundResult));
            await supabase.from("transactions").insert({
              user_id: userId,
              tx_type: "fund",
              to_address: walletAddress,
              amount: "0.01",
              token: defaultChainCfg.type === "solana" ? "SOL" : "ETH",
              chain: defaultChainCfg.chain,
              status: "confirmed",
              metadata: { source: "auto-fund-on-create", ...autoFundResult },
            });
          } else if (autoFundRes.status === 429) {
            console.log("Auto-fund quota exhausted");
            autoFundResult = { quotaExhausted: true };
          } else {
            console.log("Auto-fund failed:", autoFundRes.status, await autoFundRes.text());
          }
        } catch (fundErr) {
          console.error("Auto-fund error (non-blocking):", fundErr);
        }
      } else {
        console.log("Auto-fund skipped: chain not supported by Portal faucet");
      }

      return new Response(
        JSON.stringify({ address: walletAddress, walletId: secpData?.id, autoFund: autoFundResult }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    /* ======================================================
       MIGRATE ADDRESS — update existing EVM address to Solana
    ====================================================== */
    if (action === "migrate-address") {
      const profile = await getProfile();
      const currentAddr = profile.wallet_address || "";
      
      // Only migrate if current address looks like EVM (0x...)
      if (!currentAddr.startsWith("0x")) {
        return new Response(
          JSON.stringify({ address: currentAddr, migrated: false, reason: "Already non-EVM" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const cst = await getCST(PORTAL_API_KEY, profile.portal_client_id);
      const meRes = await fetch(`${PORTAL_API_URL}/clients/me`, {
        headers: { Authorization: `Bearer ${cst}` },
      });

      if (!meRes.ok) {
        throw new Error(`Failed to fetch client info: ${meRes.status}`);
      }

      const meData = await meRes.json();
      console.log("Migrate: namespaces:", JSON.stringify(meData?.metadata?.namespaces));
      const solanaAddress = meData?.metadata?.namespaces?.solana?.address || "";

      if (!solanaAddress) {
        return new Response(
          JSON.stringify({ error: "No Solana address found in Portal client" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      await serviceSupabase
        .from("profiles")
        .update({ wallet_address: solanaAddress })
        .eq("user_id", userId);

      console.log(`Migrated ${userId}: ${currentAddr} -> ${solanaAddress}`);

      return new Response(
        JSON.stringify({ address: solanaAddress, previousAddress: currentAddr, migrated: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    /* ======================================================
       GET BALANCE — accepts ?chain= param, works for all chains
    ====================================================== */
    if (action === "balance") {
      const profile = await getProfile();

      if (!profile.wallet_address) {
        return new Response(JSON.stringify({ error: "No wallet found" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const chainKey = url.searchParams.get("chain") || DEFAULT_CHAIN;
      const chainCfg = getChainConfig(chainKey);
      const cst = await getCST(PORTAL_API_KEY, profile.portal_client_id);

      const chainPath = encodeURIComponent(chainCfg.chainId);
      console.log("Fetching balance for:", profile.wallet_address, "chain:", chainCfg.chain);
      const assetsRes = await fetch(
        `${PORTAL_API_URL}/clients/me/chains/${chainPath}/assets`,
        { headers: { Authorization: `Bearer ${cst}` } },
      );

      let nativeBalance: any = null;
      let tokenBalances: any[] = [];
      let autoFunded = false;
      if (assetsRes.ok) {
        const assetsData = await assetsRes.json();
        console.log("Assets response:", JSON.stringify(assetsData).slice(0, 2000));
        nativeBalance = assetsData?.nativeBalance || null;
        tokenBalances = assetsData?.tokenBalances || [];

        // Auto-fund native tokens when balance is low (for gas fees)
        const nativeBal = parseFloat(nativeBalance?.balance || "0");
        const LOW_THRESHOLD = chainCfg.type === "solana" ? 0.005 : 0.005;
        if (nativeBal < LOW_THRESHOLD && isFaucetSupported(chainCfg.chainId)) {
          console.log(`Low native balance (${nativeBal}), auto-funding on ${chainCfg.chain}...`);
          try {
            const fundCst = await getCST(PORTAL_API_KEY, profile.portal_client_id);
            const fundAmount = chainCfg.type === "solana" ? "0.01" : "0.01";
            const autoFundRes = await fetch(`${PORTAL_API_URL}/clients/me/fund`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${fundCst}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                chainId: chainCfg.chainId,
                token: "NATIVE",
                amount: fundAmount,
              }),
            });
            if (autoFundRes.ok) {
              autoFunded = true;
              console.log("Auto-funded native tokens successfully");
              // Re-fetch balance after funding
              const reFetchRes = await fetch(
                `${PORTAL_API_URL}/clients/me/chains/${chainPath}/assets`,
                { headers: { Authorization: `Bearer ${cst}` } },
              );
              if (reFetchRes.ok) {
                const reFetchData = await reFetchRes.json();
                nativeBalance = reFetchData?.nativeBalance || nativeBalance;
                tokenBalances = reFetchData?.tokenBalances || tokenBalances;
              }
            } else {
              console.log("Auto-fund failed:", autoFundRes.status, await autoFundRes.text());
            }
          } catch (e) {
            console.error("Auto-fund error (non-blocking):", e);
          }
        }
      } else {
        console.log("Assets fetch error:", assetsRes.status, await assetsRes.text());
      }

      return new Response(
        JSON.stringify({
          address: profile.wallet_address,
          chain: chainCfg.chain,
          chainId: chainCfg.chainId,
          nativeBalance,
          tokenBalances,
          autoFunded,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    /* ======================================================
       SEND TOKENS — multi-chain: EVM, Stellar, Tron, Solana
    ======================================================== */
    if (action === "send") {
      const body = await req.json();
      const { to, amount, tokenAddress, chain: chainKey } = body;

      if (!to || !amount) {
        return new Response(JSON.stringify({ error: "Missing 'to' or 'amount'" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const chainCfg = getChainConfig(chainKey);
      const profile = await getProfile();
      const cst = await getCST(PORTAL_API_KEY, profile.portal_client_id);

      let signBody: Record<string, any>;

      if (chainCfg.type === "stellar") {
        // Stellar: build XDR transaction, sign with ed25519 share
        if (!profile.wallet_share_ed) {
          return new Response(JSON.stringify({ error: "No ed25519 wallet share found" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        console.log(`Building Stellar tx: ${amount} XLM to ${to}`);
        const base64Tx = await buildStellarTransaction(
          profile.wallet_address,
          to,
          amount,
          chainCfg.rpcUrl,
        );

        signBody = {
          share: profile.wallet_share_ed,
          method: "stellar_sendTransaction",
          params: base64Tx,
          rpcUrl: chainCfg.signingRpcUrl,
          chainId: chainCfg.chainId,
        };
      } else if (chainCfg.type === "tron") {
        // Tron: build transaction via HTTP API, sign with secp256k1 share
        if (!profile.wallet_share_secp) {
          return new Response(JSON.stringify({ error: "No secp256k1 wallet share found" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const amountFloat = parseFloat(amount);
        const amountSun = Math.floor(amountFloat * 1e6); // 1 TRX = 1,000,000 SUN
        console.log(`Building Tron tx: ${amount} TRX (${amountSun} SUN) to ${to}`);

        const base64Tx = await buildTronTransaction(
          profile.wallet_address,
          to,
          amountSun,
          chainCfg.rpcUrl,
        );

        signBody = {
          share: profile.wallet_share_secp,
          method: "tron_sendTransaction",
          params: base64Tx,
          rpcUrl: chainCfg.signingRpcUrl,
          chainId: chainCfg.chainId,
        };
      } 
      // else if (chainCfg.type === "solana") {
      //   // Solana: build transaction via Portal API, sign with ed25519 share
      //   if (!profile.wallet_share_ed) {
      //     return new Response(JSON.stringify({ error: "No ed25519 wallet share found" }), {
      //       status: 400,
      //       headers: { ...corsHeaders, "Content-Type": "application/json" },
      //     });
      //   }

      //   console.log(`Building Solana tx: ${amount} SOL to ${to}`);
      //   const chainPath = encodeURIComponent(chainCfg.chainId);
      //   const buildRes = await fetch(
      //     `${PORTAL_API_URL}/clients/me/chains/${chainPath}/assets/send/build-transaction`,
      //     {
      //       method: "POST",
      //       headers: {
      //         Authorization: `Bearer ${cst}`,
      //         "Content-Type": "application/json",
      //       },
      //       body: JSON.stringify({
      //         to,
      //         token: tokenAddress || "NATIVE",
      //         amount,
      //       }),
      //     },
      //   );

      //   if (!buildRes.ok) {
      //     const errText = await buildRes.text();
      //     console.error("Solana build-transaction error:", buildRes.status, errText);
      //     throw new Error(`Solana build-transaction error [${buildRes.status}]: ${errText}`);
      //   }

      //   const buildData = await buildRes.json();
      //   console.log("Solana build-transaction response:", JSON.stringify(buildData).slice(0, 500));

      //   // The Portal API returns the transaction as a base64-encoded string for Solana
      //   const base64Tx = buildData.transaction;
      //   if (!base64Tx) {
      //     throw new Error("No transaction returned from Solana build-transaction API");
      //   }

      //   signBody = {
      //     share: profile.wallet_share_ed,
      //     method: "sol_signAndConfirmTransaction",
      //     params: base64Tx,
      //     chainId: chainCfg.chainId,
      //   };
      // } 
      else if (chainCfg.type === "solana") {
        if (!profile.wallet_share_ed) {
          return new Response(JSON.stringify({ error: "No ed25519 wallet share found" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const tokenToSend = tokenAddress || "NATIVE";
        const tokenLabel = tokenAddress ? "USDC" : "SOL";
        console.log(`Sending Solana tx: ${amount} ${tokenLabel} (token: ${tokenToSend}) to ${to}`);

        const sendRes = await fetch(`${PORTAL_MPC_URL}/v1/assets/send`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${cst}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            share: profile.wallet_share_ed,
            rpcUrl: chainCfg.signingRpcUrl,
            chain: chainCfg.chainId,
            to,
            token: tokenToSend,
            amount,
          }),
        });

        if (!sendRes.ok) {
          const errText = await sendRes.text();
          console.error("Solana send error:", sendRes.status, errText);
          throw new Error(`Solana send error [${sendRes.status}]: ${errText}`);
        }

        const sendData = await sendRes.json();
        console.log("Solana send response:", JSON.stringify(sendData).slice(0, 1000));
        const transactionHash =
          sendData.result || sendData.transactionHash || sendData.hash || sendData.txHash || "";

        console.log("Solana transaction hash:", transactionHash);

        // Record transaction as pending initially
        const txStatus = transactionHash ? "confirmed" : "pending";

        await supabase.from("transactions").insert({
          user_id: userId,
          tx_hash: transactionHash || null,
          tx_type: body.txType || "send",
          to_address: to,
          amount,
          token: tokenLabel,
          chain: chainCfg.chain,
          status: txStatus,
          metadata: sendData,
        });

        return new Response(
          JSON.stringify({ transactionHash, metadata: sendData, status: txStatus }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      else {
        // EVM: Use /v1/assets/send with Account Abstraction gas sponsorship
        if (!profile.wallet_share_secp) {
          return new Response(JSON.stringify({ error: "No wallet share found" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Use the higher-level /v1/assets/send endpoint which handles
        // transaction building, gas estimation, and AA gas sponsorship
        console.log(`Sending via /v1/assets/send on ${chainCfg.chain} with gas sponsorship`);
        
        const sendPayload = {
          share: profile.wallet_share_secp,
          chain: chainCfg.chainId,
          to,
          token: tokenAddress || "NATIVE",
          amount,
          rpcUrl: chainCfg.signingRpcUrl,
          sponsorGas: true,
        };

        let sendRes = await fetch(`${PORTAL_MPC_URL}/v1/assets/send`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${cst}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(sendPayload),
        });

        // Fallback: if gas sponsorship fails (AA21 prefund error), retry without it
        if (!sendRes.ok) {
          const errText = await sendRes.text();
          
          if (errText.includes("AA21") || errText.includes("prefund")) {
            console.log("Gas sponsorship failed (AA21), retrying without sponsorGas...");
            const retryCst = await getCST(PORTAL_API_KEY, profile.portal_client_id);
            sendRes = await fetch(`${PORTAL_MPC_URL}/v1/assets/send`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${retryCst}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ ...sendPayload, sponsorGas: false }),
            });
          }

          if (!sendRes.ok) {
            const retryErrText = await sendRes.text();
            console.error("Send error:", sendRes.status, retryErrText);

            if (retryErrText.includes("blocked") || retryErrText.includes("firewall")) {
              await supabase.from("transactions").insert({
                user_id: userId,
                tx_type: "send",
                to_address: to,
                amount,
                token: tokenAddress || "NATIVE",
                chain: chainCfg.chain,
                status: "blocked",
                metadata: { reason: "Portal Firewall rejected this transaction" },
              });

              return new Response(
                JSON.stringify({ error: "Transaction blocked by Portal Firewall", status: "blocked" }),
                { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
              );
            }

            throw new Error(`Send error [${sendRes.status}]: ${retryErrText}`);
          }
        }

        const sendData = await sendRes.json();
        const transactionHash = sendData.result || sendData.transactionHash || sendData.hash || "";
        console.log("Transaction sent (AA sponsored):", transactionHash);

        await supabase.from("transactions").insert({
          user_id: userId,
          tx_hash: transactionHash,
          tx_type: body.txType || "send",
          to_address: to,
          amount,
          token: tokenAddress || "NATIVE",
          chain: chainCfg.chain,
          status: "confirmed",
          metadata: { ...sendData, gasSponsored: true },
        });

        return new Response(
          JSON.stringify({ transactionHash, metadata: sendData }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Non-EVM chains still use /v1/sign
      console.log(`Signing tx on ${chainCfg.chain} (${chainCfg.type})`);

      const signRes = await fetch(`${PORTAL_MPC_URL}/v1/sign`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cst}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(signBody),
      });

      if (!signRes.ok) {
        const errText = await signRes.text();
        console.error("Sign error:", signRes.status, errText);

        if (errText.includes("blocked") || errText.includes("firewall")) {
          await supabase.from("transactions").insert({
            user_id: userId,
            tx_type: "send",
            to_address: to,
            amount,
            token: tokenAddress || "NATIVE",
            chain: chainCfg.chain,
            status: "blocked",
            metadata: { reason: "Portal Firewall rejected this transaction" },
          });

          return new Response(
            JSON.stringify({ error: "Transaction blocked by Portal Firewall", status: "blocked" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        throw new Error(`Sign error [${signRes.status}]: ${errText}`);
      }

      const signData = await signRes.json();
      const transactionHash = signData.result || signData.transactionHash || signData.hash || "";
      console.log("Transaction signed & submitted:", transactionHash);

      await supabase.from("transactions").insert({
        user_id: userId,
        tx_hash: transactionHash,
        tx_type: body.txType || "send",
        to_address: to,
        amount,
        token: tokenAddress || "NATIVE",
        chain: chainCfg.chain,
        status: "confirmed",
        metadata: signData || {},
      });

      return new Response(
        JSON.stringify({ transactionHash, metadata: signData }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    /* ======================================================
       GET TRANSACTIONS — also syncs received txs from Portal
    ====================================================== */
    if (action === "transactions") {
      const profile = await getProfile();

      // Sync on-chain activity from Portal to detect received funds
      if (profile.wallet_address) {
        try {
          const cst = await getCST(PORTAL_API_KEY, profile.portal_client_id);
          const defaultChainCfg = getChainConfig(DEFAULT_CHAIN);
          const chainPath = encodeURIComponent(defaultChainCfg.chainId);

          const activityRes = await fetch(
            `${PORTAL_API_URL}/clients/me/transactions?chainId=${chainPath}&order=desc&limit=50`,
            { headers: { Authorization: `Bearer ${cst}` } },
          );

          if (activityRes.ok) {
            const activityData = await activityRes.json();
            const onChainTxs = Array.isArray(activityData) ? activityData : [];

            // Get existing tx hashes to avoid duplicates
            const { data: existingTxs } = await supabase
              .from("transactions")
              .select("tx_hash")
              .eq("user_id", userId)
              .not("tx_hash", "is", null);

            const existingHashes = new Set(
              (existingTxs || []).map((t: any) => t.tx_hash?.toLowerCase())
            );

            const walletAddr = profile.wallet_address.toLowerCase();
            const newReceiveTxs: any[] = [];

            for (const tx of onChainTxs) {
              const hash = (tx.hash || tx.uniqueId || "").toLowerCase();
              if (!hash || existingHashes.has(hash)) continue;

              const toAddr = (tx.to || "").toLowerCase();
              const fromAddr = (tx.from || "").toLowerCase();

              // It's a receive if our wallet is the recipient and not the sender
              if (toAddr === walletAddr && fromAddr !== walletAddr) {
                const value = tx.value || tx.amount || "0";
                const token = tx.asset || tx.tokenSymbol || tx.symbol || "NATIVE";
                const blockTimestamp = tx.metadata?.blockTimestamp || tx.blockTimestamp;

                newReceiveTxs.push({
                  user_id: userId,
                  tx_hash: hash,
                  tx_type: "receive",
                  to_address: profile.wallet_address,
                  amount: value,
                  token,
                  chain: defaultChainCfg.chain,
                  status: "confirmed",
                  created_at: blockTimestamp ? new Date(blockTimestamp).toISOString() : new Date().toISOString(),
                  metadata: { from: tx.from || "unknown", raw: tx },
                });
              }
            }

            if (newReceiveTxs.length > 0) {
              console.log(`Syncing ${newReceiveTxs.length} received transactions`);
              await serviceSupabase.from("transactions").insert(newReceiveTxs);
            }
          } else {
            console.log("Activity fetch non-critical error:", activityRes.status);
          }
        } catch (syncErr) {
          console.error("Transaction sync error (non-blocking):", syncErr);
        }
      }

      const { data: txs } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);

      return new Response(JSON.stringify({ transactions: txs || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    /* ======================================================
       FEE ESTIMATE (EVM only — Stellar/Tron handled client-side)
    ====================================================== */
    if (action === "fee-estimate") {
      const chainKey = url.searchParams.get("chain") || DEFAULT_CHAIN;
      const chainCfg = getChainConfig(chainKey);

      if (chainCfg.type !== "evm") {
        return new Response(
          JSON.stringify({
            chain: chainCfg.chain,
            chainId: chainCfg.chainId,
            gasPrice: chainCfg.type === "stellar" ? "100 stroops" : "Bandwidth-based",
            nativeTransfer: { gasLimit: "N/A", estimatedFee: chainCfg.type === "stellar" ? "0.00001" : "0" },
            tokenTransfer: { gasLimit: "N/A", estimatedFee: chainCfg.type === "stellar" ? "0.00001" : "0" },
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const gasPriceRes = await fetch(chainCfg.rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "eth_gasPrice",
          params: [],
          id: 1,
        }),
      });

      let gasPriceWei = BigInt(0);
      if (gasPriceRes.ok) {
        const gasPriceData = await gasPriceRes.json();
        if (gasPriceData.result) {
          gasPriceWei = BigInt(gasPriceData.result);
        }
      }

      const nativeGasLimit = BigInt(21000);
      const erc20GasLimit = BigInt(65000);

      const nativeFeeWei = gasPriceWei * nativeGasLimit;
      const erc20FeeWei = gasPriceWei * erc20GasLimit;

      const toEth = (wei: bigint) => (Number(wei) / 1e18).toFixed(8);
      const toGwei = (wei: bigint) => (Number(wei) / 1e9).toFixed(2);

      return new Response(
        JSON.stringify({
          chain: chainCfg.chain,
          chainId: chainCfg.chainId,
          gasPrice: toGwei(gasPriceWei) + " Gwei",
          nativeTransfer: {
            gasLimit: nativeGasLimit.toString(),
            estimatedFee: toEth(nativeFeeWei),
          },
          tokenTransfer: {
            gasLimit: erc20GasLimit.toString(),
            estimatedFee: toEth(erc20FeeWei),
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    /* ======================================================
       FUND WALLET (TESTNET ONLY)
    ====================================================== */
    if (action === "fund") {
      const profile = await getProfile();

      const { chainId, amount } = await req.json();

      if (!isFaucetSupported(chainId)) {
        return new Response(
          JSON.stringify({ error: `Portal faucet does not support chain ${chainId}. Use a manual testnet faucet.`, code: "UNSUPPORTED_CHAIN" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const cst = await getCST(PORTAL_API_KEY, profile.portal_client_id);

      const res = await fetch(`${PORTAL_API_URL}/clients/me/fund`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cst}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chainId,
          token: "NATIVE",
          amount: amount || "0.01",
        }),
      });

      if (res.status === 429) {
        return new Response(
          JSON.stringify({ message: "Funding limit reached" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      if (!res.ok) {
        throw new Error(await res.text());
      }

      const fundData = await res.json();
      const fundChain = Object.values(CHAINS).find((c) => c.chainId === chainId)?.chain || chainId;

      await supabase.from("transactions").insert({
        user_id: userId,
        tx_type: "fund",
        to_address: profile.wallet_address || "",
        amount: amount || "0.01",
        token: PORTAL_FAUCET_SUPPORTED_CHAINS[chainId] || "NATIVE",
        chain: fundChain,
        status: "confirmed",
        metadata: { source: "faucet", ...fundData },
      });

      return new Response(
        JSON.stringify(fundData),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    /* ======================================================
       BACKUP WALLET — Self-Managed Backup via Enclave MPC API
    ====================================================== */
    if (action === "backup") {
      const profile = await getProfile();

      if (!profile.wallet_share_secp && !profile.wallet_share_ed) {
        return new Response(JSON.stringify({ error: "No wallet shares to backup" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const cst = await getCST(PORTAL_API_KEY, profile.portal_client_id);

      // Build the generate response format Portal expects
      const generateResponse: Record<string, any> = {};
      if (profile.wallet_share_secp) {
        generateResponse.secp256k1 = { id: profile.wallet_id, share: profile.wallet_share_secp };
      }
      if (profile.wallet_share_ed) {
        generateResponse.ed25519 = { id: profile.wallet_id, share: profile.wallet_share_ed };
      }

      console.log("Running backup for user:", userId);

      // Step 1: Call /v1/backup with the signing shares
      const backupRes = await fetch(`${PORTAL_MPC_URL}/v1/backup`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cst}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          generateResponse: JSON.stringify(generateResponse),
        }),
      });

      if (!backupRes.ok) {
        const errText = await backupRes.text();
        console.error("Backup error:", backupRes.status, errText);
        throw new Error(`Backup error [${backupRes.status}]: ${errText}`);
      }

      const backupData = await backupRes.json();
      const { secp256k1Share, ed25519Share } = backupData;
      console.log("Backup shares generated. secp:", !!secp256k1Share, "ed:", !!ed25519Share);

      // Step 2: Store client backup shares in our DB (no encryption for dev/testnet)
      const backupUpdate: Record<string, string> = { backup_status: "backed_up" };
      const backupShareIds: string[] = [];

      if (secp256k1Share) {
        backupUpdate.backup_share_secp = secp256k1Share.share || JSON.stringify(secp256k1Share);
        if (secp256k1Share.id) backupShareIds.push(secp256k1Share.id);
      }
      if (ed25519Share) {
        backupUpdate.backup_share_ed = ed25519Share.share || JSON.stringify(ed25519Share);
        if (ed25519Share.id) backupShareIds.push(ed25519Share.id);
      }

      await serviceSupabase
        .from("profiles")
        .update(backupUpdate)
        .eq("user_id", userId);

      // Step 3: Mark backup as complete with Portal
      if (backupShareIds.length > 0) {
        const confirmRes = await fetch(
          `${PORTAL_API_URL}/clients/me/backup-share-pairs`,
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${cst}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              status: "STORED_CLIENT_BACKUP_SHARE",
              backupSharePairIds: backupShareIds,
            }),
          },
        );

        if (!confirmRes.ok) {
          console.error("Backup confirm error:", confirmRes.status, await confirmRes.text());
        } else {
          console.log("Backup confirmed with Portal");
        }
      }

      return new Response(
        JSON.stringify({ success: true, backupStatus: "backed_up" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Portal wallet error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
