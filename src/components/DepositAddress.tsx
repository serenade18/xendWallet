import { useState } from "react";
import { Copy, Share2, ShieldCheck, ChevronRight, ChevronLeft, Check } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

/* ── Inline network icons (16×16 SVGs) ── */
const EthIcon = () => (
  <svg viewBox="0 0 256 417" className="h-4 w-4" fill="none">
    <path d="M127.961 0l-2.795 9.5v275.668l2.795 2.79 127.962-75.638z" fill="#767676"/>
    <path d="M127.962 0L0 212.32l127.962 75.639V154.158z" fill="#8c8c8c"/>
    <path d="M127.961 312.187l-1.575 1.92V414.1l1.575 4.6L256 236.587z" fill="#5f5f5f"/>
    <path d="M127.962 418.7V312.187L0 236.587z" fill="#8c8c8c"/>
  </svg>
);

const BaseIcon = () => (
  <svg viewBox="0 0 111 111" className="h-4 w-4">
    <circle cx="55.5" cy="55.5" r="55.5" fill="#0052FF"/>
    <path d="M55.5 95C77.315 95 95 77.315 95 55.5S77.315 16 55.5 16C34.917 16 18 31.64 16.14 51.5h52.36v8H16.14C18 79.36 34.917 95 55.5 95z" fill="white"/>
  </svg>
);

const PolygonIcon = () => (
  <svg viewBox="0 0 38.4 33.5" className="h-4 w-4">
    <path d="M29 10.2c-.7-.4-1.6-.4-2.4 0L21 13.5l-3.8 2.1-5.5 3.3c-.7.4-1.6.4-2.4 0L5 16.3c-.7-.4-1.2-1.2-1.2-2.1v-5c0-.8.4-1.6 1.2-2.1l4.3-2.5c.7-.4 1.6-.4 2.4 0L16 7.2c.7.4 1.2 1.2 1.2 2.1v3.3l3.8-2.2V7c0-.8-.4-1.6-1.2-2.1l-8-4.7c-.7-.4-1.6-.4-2.4 0L1.2 5C.4 5.4 0 6.2 0 7v9.4c0 .8.4 1.6 1.2 2.1l8.1 4.7c.7.4 1.6.4 2.4 0l5.5-3.2 3.8-2.2 5.5-3.2c.7-.4 1.6-.4 2.4 0l4.3 2.5c.7.4 1.2 1.2 1.2 2.1v5c0 .8-.4 1.6-1.2 2.1L29 27c-.7.4-1.6.4-2.4 0l-4.3-2.5c-.7-.4-1.2-1.2-1.2-2.1v-3.3l-3.8 2.2v3.3c0 .8.4 1.6 1.2 2.1l8.1 4.7c.7.4 1.6.4 2.4 0l8.1-4.7c.7-.4 1.2-1.2 1.2-2.1V15c0-.8-.4-1.6-1.2-2.1L29 10.2z" fill="#8247E5"/>
  </svg>
);

const SolanaIcon = () => (
  <svg viewBox="0 0 397 311" className="h-4 w-4">
    <linearGradient id="sol-g" x1="360" y1="351" x2="141" y2="-69" gradientUnits="userSpaceOnUse">
      <stop offset="0" stopColor="#00FFA3"/><stop offset="1" stopColor="#DC1FFF"/>
    </linearGradient>
    <path d="M64.6 237.9c2.4-2.4 5.7-3.8 9.2-3.8h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1l62.7-62.7z" fill="url(#sol-g)"/>
    <path d="M64.6 3.8C67.1 1.4 70.4 0 73.8 0h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1L64.6 3.8z" fill="url(#sol-g)"/>
    <path d="M333.1 120.1c-2.4-2.4-5.7-3.8-9.2-3.8H6.5c-5.8 0-8.7 7-4.6 11.1l62.7 62.7c2.4 2.4 5.7 3.8 9.2 3.8h317.4c5.8 0 8.7-7 4.6-11.1l-62.7-62.7z" fill="url(#sol-g)"/>
  </svg>
);

const ArbitrumIcon = () => (
  <svg viewBox="0 0 256 256" className="h-4 w-4">
    <circle cx="128" cy="128" r="128" fill="#213147"/>
    <path d="M150.1 170.3l18.7 51.3 29.1-16.8-32.4-89-15.4 54.5z" fill="#12AAFF"/>
    <path d="M105.9 170.3L87.2 221.6l-29.1-16.8 32.4-89 15.4 54.5z" fill="white"/>
    <path d="M128 50l45 123.5h-90L128 50z" fill="white"/>
  </svg>
);

const OptimismIcon = () => (
  <svg viewBox="0 0 500 500" className="h-4 w-4">
    <circle cx="250" cy="250" r="250" fill="#FF0420"/>
    <text x="250" y="300" textAnchor="middle" fill="white" fontSize="280" fontWeight="bold" fontFamily="sans-serif">O</text>
  </svg>
);

const TronIcon = () => (
  <svg viewBox="0 0 64 64" className="h-4 w-4">
    <path d="M61.55 19.28c-3-2.77-7.15-7-10.53-10l-.2-.14a3.38 3.38 0 00-1.11-.6L13.24 0a2.3 2.3 0 00-2.52.55L.36 11.67a2.31 2.31 0 00.29 3.45l26.62 21.2.08.06 6.39 5.08c.16.12.3.28.47.38a2.22 2.22 0 001.52.35l25.91-20.59a2.28 2.28 0 00-.09-2.32z" fill="#EF0027"/>
  </svg>
);

const TonIcon = () => (
  <svg viewBox="0 0 56 56" className="h-4 w-4">
    <path d="M28 56c15.464 0 28-12.536 28-28S43.464 0 28 0 0 12.536 0 28s12.536 28 28 28z" fill="#0098EA"/>
    <path d="M37.56 15.6H18.44c-3.38 0-5.27 3.82-3.2 6.46l12.12 15.4c.82 1.04 2.46 1.04 3.28 0l12.12-15.4c2.07-2.64.18-6.46-3.2-6.46zM26.24 33.96l-3.4-4.32V19.2h3.4v14.76zm6.92-4.32l-3.4 4.32V19.2h3.4v10.44z" fill="white"/>
  </svg>
);

const NETWORK_ICONS: Record<string, React.ReactNode> = {
  ethereum: <EthIcon />,
  base: <BaseIcon />,
  polygon: <PolygonIcon />,
  solana: <SolanaIcon />,
  arbitrum: <ArbitrumIcon />,
  optimism: <OptimismIcon />,
  tron: <TronIcon />,
  ton: <TonIcon />,
};

interface NetworkOption {
  key: string;
  label: string;
  badge?: string;
  badgeVariant?: "coming-soon" | "fee";
  disabled?: boolean;
}

const NETWORKS: NetworkOption[] = [
  { key: "ethereum", label: "Ethereum (ERC20)" },
  { key: "base", label: "Base" },
  { key: "polygon", label: "Polygon PoS" },
  { key: "solana", label: "Solana" },
  { key: "arbitrum", label: "Arbitrum One" },
  { key: "optimism", label: "Optimism" },
  { key: "tron", label: "Tron (TRC20)", badge: "Fee 5.90 USD", badgeVariant: "fee" },
  { key: "ton", label: "TON", badge: "Coming soon", badgeVariant: "coming-soon", disabled: true },
];

interface DepositAddressProps {
  walletAddress?: string;
  token?: string;
  network?: string;
  topUpFee?: string;
  minimumAmount?: string;
  onBack?: () => void;
}

const DepositAddress = ({
  walletAddress = "",
  token = "USD",
  network = "Ethereum (ERC20)",
  topUpFee = "0.00 USD",
  minimumAmount = "1.00 USD",
  onBack,
}: DepositAddressProps) => {
  const [selectedNetwork, setSelectedNetwork] = useState(network);
  const [showNetworkPicker, setShowNetworkPicker] = useState(false);

  const truncated = walletAddress
    ? `${walletAddress.slice(0, 6)}....${walletAddress.slice(-5)}`
    : "";

  const copyAddress = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress);
      toast.success("Address copied!");
    }
  };

  const shareAddress = async () => {
    if (walletAddress && navigator.share) {
      try {
        await navigator.share({ title: "My Xend Wallet Address", text: walletAddress });
      } catch {
        copyAddress();
      }
    } else {
      copyAddress();
    }
  };

  // ── Network Picker View ──
  if (showNetworkPicker) {
    return (
      <div className="flex flex-col">
        <div className="flex items-center justify-center relative mb-5">
          <button
            onClick={() => setShowNetworkPicker(false)}
            className="absolute left-0 h-8 w-8 rounded-full bg-card border border-border/60 flex items-center justify-center active:scale-95 transition-all"
          >
            <ChevronLeft className="h-4 w-4 text-foreground" />
          </button>
          <h2 className="text-lg font-bold text-foreground">Select Network</h2>
        </div>

        <div className="space-y-2">
          {NETWORKS.map((net) => (
            <button
              key={net.key}
              disabled={net.disabled}
              onClick={() => {
                if (!net.disabled) {
                  setSelectedNetwork(net.label);
                  setShowNetworkPicker(false);
                }
              }}
              className={`w-full flex items-center gap-3 rounded-2xl bg-card border px-4 py-3.5 transition-all ${
                net.disabled
                  ? "opacity-50 cursor-not-allowed border-border/40"
                  : "border-border/60 active:scale-[0.98]"
              } ${selectedNetwork === net.label ? "border-primary/60" : ""}`}
            >
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                {NETWORK_ICONS[net.key] || (
                  <span className="text-[11px] font-bold text-muted-foreground">
                    {net.label.charAt(0)}
                  </span>
                )}
              </div>

              <span className="flex-1 text-left text-sm font-semibold text-foreground">
                {net.label}
              </span>

              {net.badge && net.badgeVariant === "coming-soon" && (
                <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full border border-border/60 text-muted-foreground">
                  {net.badge}
                </span>
              )}
              {net.badge && net.badgeVariant === "fee" && (
                <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-primary/15 text-primary">
                  {net.badge}
                </span>
              )}
              {selectedNetwork === net.label && !net.badge && (
                <Check className="h-5 w-5 text-primary" />
              )}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── Address View ──
  return (
    <div className="flex flex-col items-center">
      <h2 className="text-lg font-bold text-foreground mb-5">Your Address</h2>

      <div className="rounded-2xl bg-card border border-border/60 p-5 mb-3">
        <QRCodeSVG
          value={walletAddress || "empty"}
          size={180}
          bgColor="transparent"
          fgColor="hsl(var(--foreground))"
          level="M"
          includeMargin={false}
        />
      </div>

      <p className="text-sm font-semibold text-primary font-mono mb-6">{truncated}</p>

      <div className="w-full rounded-2xl bg-card border border-border/60 overflow-hidden mb-4">
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-border/40">
          <span className="text-sm text-muted-foreground">Receive token</span>
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
              <span className="text-[10px] font-bold text-primary-foreground">$</span>
            </div>
            <span className="text-sm font-semibold text-foreground">{token}</span>
          </div>
        </div>

        <button
          onClick={() => setShowNetworkPicker(true)}
          className="w-full flex items-center justify-between px-4 py-3.5 active:bg-muted/30 transition-colors"
        >
          <span className="text-sm text-muted-foreground">Network</span>
          <div className="flex items-center gap-1">
            <span className="text-sm font-semibold text-foreground">{selectedNetwork}</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </button>
      </div>

      <div className="w-full rounded-2xl bg-card border border-border/60 overflow-hidden mb-4">
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-border/40">
          <span className="text-sm text-muted-foreground">Top up fee</span>
          <span className="text-sm font-semibold text-foreground">{topUpFee}</span>
        </div>
        <div className="flex items-center justify-between px-4 py-3.5">
          <span className="text-sm text-muted-foreground">Minimum amount</span>
          <span className="text-sm font-semibold text-foreground">{minimumAmount}</span>
        </div>
      </div>

      <div className="w-full flex items-start gap-2.5 rounded-2xl bg-card border border-border/60 px-4 py-3.5 mb-6">
        <ShieldCheck className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
        <p className="text-[12px] text-muted-foreground leading-relaxed">
          Use this address only for {token} deposits above the minimum to avoid losing funds
        </p>
      </div>

      <div className="w-full grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          onClick={copyAddress}
          className="rounded-2xl h-12 text-sm font-semibold border-primary text-primary hover:bg-primary/10"
        >
          <Copy className="h-4 w-4 mr-2" />
          Copy
        </Button>
        <Button onClick={shareAddress} className="rounded-2xl h-12 text-sm font-semibold">
          <Share2 className="h-4 w-4 mr-2" />
          Share
        </Button>
      </div>
    </div>
  );
};

export default DepositAddress;
