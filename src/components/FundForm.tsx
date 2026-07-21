import { useState } from "react";
import { ExternalLink, Copy, Loader2, Coins, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { portalApi } from "@/lib/portal-api";

interface FundFormProps {
  walletAddress?: string;
  chainId?: string;
  nativeSymbol?: string;
  onFunded?: () => void;
}

const FAUCETS = [
  { name: "Circle", url: "https://faucet.circle.com/", label: "Free USD" },
];

// Portal faucet only supports these chains
const FAUCET_SUPPORTED_CHAINS = [
  "eip155:10143",   // Monad Testnet
  "eip155:11155111", // Ethereum Sepolia
  "eip155:44787",   // Celo Alfajores
  "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1", // Solana Devnet
];

const FundForm = ({ walletAddress, chainId = "eip155:84532", nativeSymbol = "ETH", onFunded }: FundFormProps) => {
  const [loading, setLoading] = useState(false);
  const [quotaExhausted, setQuotaExhausted] = useState(false);

  const faucetSupported = FAUCET_SUPPORTED_CHAINS.includes(chainId);

  const copyAddress = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress);
      toast.success("Address copied!");
    }
  };

  const handleQuickFund = async () => {
    setLoading(true);
    try {
      const result = await portalApi.fundWallet("0.01", chainId, nativeSymbol);
      if ((result as any)?.message === "Funding limit reached") {
        setQuotaExhausted(true);
        toast.info("Faucet quota reached — use a manual faucet below.");
      } else {
        toast.success(`Funded 0.01 ${nativeSymbol}!`);
        setQuotaExhausted(false);
        onFunded?.();
      }
    } catch (err: any) {
      setQuotaExhausted(true);
      toast.error(err.message || "Funding failed — try a manual faucet.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl bg-primary/10 border border-primary/20 p-4 animate-slide-up">
      <div className="flex items-center gap-3 mb-3">
        <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
          <Coins className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Fund Your Wallet</p>
          <p className="text-[11px] text-muted-foreground">
            {!faucetSupported
              ? "Use the Circle faucet to get free USD"
              : quotaExhausted
              ? "Quota reached — use Circle faucet"
              : "Get free testnet USD to start"}
          </p>
        </div>
      </div>

      {/* Quick fund button */}
      {faucetSupported && (
        <Button
          onClick={handleQuickFund}
          disabled={loading}
          className="w-full mb-3 rounded-xl"
          size="sm"
        >
          {loading ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : quotaExhausted ? (
            <AlertTriangle className="mr-1.5 h-3.5 w-3.5" />
          ) : (
            <Coins className="mr-1.5 h-3.5 w-3.5" />
          )}
          {loading ? "Funding..." : quotaExhausted ? "Retry Fund" : "Fund Account"}
        </Button>
      )}

    </div>
  );
};

export default FundForm;
