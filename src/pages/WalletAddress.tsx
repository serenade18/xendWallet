import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";
import { ChevronLeft, Copy, Share2, ShieldCheck } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import { copyToClipboard } from "@/lib/clipboard";

const WalletAddress = () => {
  const { user } = useAuth();
  const wallet = useWallet(user?.id);
  const navigate = useNavigate();
  const address = wallet.profile?.wallet_address || "";

  const truncated = address ? `${address.slice(0, 6)}....${address.slice(-5)}` : "";

  const copyAddress = async () => {
    if (address) {
      const ok = await copyToClipboard(address);
      if (ok) toast.success("Address copied!");
      else toast.error("Copy failed — please copy manually");
    }
  };

  const shareAddress = async () => {
    if (address && navigator.share) {
      try { await navigator.share({ title: "My Xend USD Wallet Address", text: address }); }
      catch { await copyAddress(); }
    } else { await copyAddress(); }
  };

  return (
    <div className="min-h-[100dvh] bg-background pb-20 md:pb-8">
      <div className="mx-auto max-w-lg px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-center relative mb-8">
          <button
            onClick={() => navigate(-1)}
            className="absolute left-0 h-8 w-8 rounded-full bg-card border border-border/60 flex items-center justify-center active:scale-95 transition-all"
          >
            <ChevronLeft className="h-4 w-4 text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground">USD Wallet Address</h1>
        </div>

        <p className="text-center text-sm text-muted-foreground mb-6">
          For Stablecoin Payments
        </p>

        {/* QR Code */}
        <div className="flex flex-col items-center">
          <div className="rounded-2xl bg-card border border-border/60 p-5 mb-3">
            <QRCodeSVG
              value={address || "empty"}
              size={200}
              bgColor="transparent"
              fgColor="hsl(var(--foreground))"
              level="M"
              includeMargin={false}
            />
          </div>

          <p className="text-sm font-semibold text-primary font-mono mb-6">{truncated}</p>

          {/* Network info */}
          <div className="w-full rounded-2xl bg-card border border-border/60 overflow-hidden mb-4">
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-border/40">
              <span className="text-sm text-muted-foreground">Token</span>
              <span className="text-sm font-semibold text-foreground">USD (Stablecoins)</span>
            </div>
            <div className="flex items-center justify-between px-4 py-3.5">
              <span className="text-sm text-muted-foreground">Network</span>
              <span className="text-sm font-semibold text-foreground">{wallet.activeChain.name}</span>
            </div>
          </div>

          <div className="w-full flex items-start gap-2.5 rounded-2xl bg-card border border-border/60 px-4 py-3.5 mb-6">
            <ShieldCheck className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-[12px] text-muted-foreground leading-relaxed">
              Only send supported stablecoins (USDC, USDT) on the correct network to this address
            </p>
          </div>

          <div className="w-full grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              onClick={copyAddress}
              className="rounded-2xl h-12 text-sm font-semibold border-primary text-primary hover:bg-primary/10"
            >
              <Copy className="h-4 w-4 mr-2" /> Copy
            </Button>
            <Button onClick={shareAddress} className="rounded-2xl h-12 text-sm font-semibold">
              <Share2 className="h-4 w-4 mr-2" /> Share
            </Button>
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
};

export default WalletAddress;
