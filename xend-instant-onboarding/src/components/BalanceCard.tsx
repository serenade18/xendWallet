import type { BalanceResult } from "@/lib/portal-api";
import type { ChainConfig } from "@/lib/chains";
import { TrendingUp, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

interface BalanceCardProps {
  balance: BalanceResult | null;
  chain: ChainConfig;
}

const STABLECOIN_SYMBOLS = ["USDC", "USDT", "DAI", "BUSD", "FRAX", "TUSD", "USD"];

const COIN_COLORS: Record<string, { bg: string; text: string; bar: string }> = {
  USDC: { bg: "bg-blue-500/15", text: "text-blue-400", bar: "bg-blue-400" },
  USDT: { bg: "bg-emerald-500/15", text: "text-emerald-400", bar: "bg-emerald-400" },
  DAI: { bg: "bg-amber-500/15", text: "text-amber-400", bar: "bg-amber-400" },
  BUSD: { bg: "bg-yellow-500/15", text: "text-yellow-400", bar: "bg-yellow-400" },
  FRAX: { bg: "bg-gray-500/15", text: "text-gray-400", bar: "bg-gray-400" },
  TUSD: { bg: "bg-indigo-500/15", text: "text-indigo-400", bar: "bg-indigo-400" },
};

const fmt = (val: number, decimals = 2) =>
  val.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

const BalanceCard = ({ balance, chain }: BalanceCardProps) => {
  const [showOther, setShowOther] = useState(false);
  const nativeBal = balance?.nativeBalance;
  const tokens = balance?.tokenBalances || [];

  const stablecoins = tokens.filter((t) =>
    STABLECOIN_SYMBOLS.includes(t.symbol?.toUpperCase() || "")
  );
  const otherTokens = tokens.filter(
    (t) => !STABLECOIN_SYMBOLS.includes(t.symbol?.toUpperCase() || "")
  );
  const totalStable = stablecoins.reduce((sum, t) => sum + parseFloat(t.balance || "0"), 0);
  const nativeVal = parseFloat(nativeBal?.balance || "0");
  const hasAny = stablecoins.length > 0 || nativeVal > 0 || otherTokens.length > 0;

  return (
    <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm overflow-hidden animate-slide-up">
      {/* Aggregated Total */}
      <div className="px-5 pt-5 pb-3 text-center">
        <p className="text-[10px] text-muted-foreground uppercase tracking-[0.15em] mb-1">
          Total Balance
        </p>
        <span className="text-4xl sm:text-5xl font-bold text-foreground tracking-tight leading-none">
          ${fmt(totalStable)}
        </span>
        <p className="text-[11px] text-muted-foreground mt-2">
          USD
        </p>
      </div>

      {/* Proportion Bar */}
      {stablecoins.length > 1 && totalStable > 0 && (
        <div className="px-5 pb-3">
          <div className="flex h-2 rounded-full overflow-hidden bg-secondary/40 gap-px">
            {stablecoins.map((token) => {
              const val = parseFloat(token.balance || "0");
              const pct = (val / totalStable) * 100;
              if (pct < 0.5) return null;
              const sym = token.symbol?.toUpperCase() || "";
              const barColor = COIN_COLORS[sym]?.bar || "bg-muted-foreground";
              return (
                <div
                  key={token.symbol}
                  className={`${barColor} rounded-full transition-all duration-500`}
                  style={{ width: `${pct}%` }}
                />
              );
            })}
          </div>
          <div className="flex gap-3 mt-1.5 justify-center flex-wrap">
            {stablecoins.map((token) => {
              const val = parseFloat(token.balance || "0");
              const pct = totalStable > 0 ? ((val / totalStable) * 100).toFixed(0) : "0";
              const sym = token.symbol?.toUpperCase() || "";
              const dotColor = COIN_COLORS[sym]?.bar || "bg-muted-foreground";
              return (
                <span key={token.symbol} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <span className={`inline-block h-1.5 w-1.5 rounded-full ${dotColor}`} />
                  {sym === "USDC" ? "USD" : token.symbol} {pct}%
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Stablecoin Rows */}
      <div className="px-3 pb-1 space-y-0.5">
        {stablecoins.map((token) => {
          const sym = token.symbol?.toUpperCase() || "";
          const colors = COIN_COLORS[sym] || { bg: "bg-secondary", text: "text-muted-foreground" };
          return (
            <div
              key={token.symbol}
              className="flex items-center justify-between rounded-xl px-3 py-3 active:bg-secondary/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center text-xs font-bold ${colors.bg} ${colors.text}`}>
                  {sym.slice(0, 2)}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{sym === "USDC" ? "USD" : token.symbol}</p>
                  <p className="text-[11px] text-muted-foreground leading-tight">{sym === "USDC" ? "US Dollar" : token.name}</p>
                </div>
              </div>
              <p className="text-sm font-mono font-semibold text-foreground">
                ${fmt(parseFloat(token.balance || "0"))}
              </p>
            </div>
          );
        })}
      </div>

      {/* Other Assets (hidden — USD only mode) */}

      {/* Empty state */}
      {!hasAny && (
        <div className="text-center px-5 pb-5 pt-2">
          <TrendingUp className="mx-auto h-6 w-6 text-muted-foreground/30 mb-2" />
          <p className="text-xs text-muted-foreground">No tokens yet — fund your wallet to get started</p>
        </div>
      )}
    </div>
  );
};

export default BalanceCard;
