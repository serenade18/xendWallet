import { useState } from "react";
import { ArrowLeft, ChevronRight, Loader2, X, Copy, Share2, Delete } from "lucide-react";
import { copyToClipboard } from "@/lib/clipboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { validateAddress, SUPPORTED_CHAINS } from "@/lib/chains";
import type { ChainConfig } from "@/lib/chains";

interface WalletSendFormProps {
  onSend: (to: string, amount: string, txType?: string, tokenAddress?: string) => Promise<any>;
  loading: boolean;
  activeChain: ChainConfig;
  tokens?: { symbol: string; label: string; address: string }[];
  onClose?: () => void;
  balance?: number;
}

type Step = "input" | "review" | "success";

const NUMPAD_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "del"] as const;

const WalletSendForm = ({
  onSend,
  loading,
  activeChain,
  tokens = [],
  onClose,
  balance = 0,
}: WalletSendFormProps) => {
  const [step, setStep] = useState<Step>("input");
  const [address, setAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [sending, setSending] = useState(false);
  const [selectedChain, setSelectedChain] = useState<ChainConfig>(activeChain);
  const [showNetworkPicker, setShowNetworkPicker] = useState(false);

  const USDCToken = tokens.find((t) => t.symbol === "USD");
  const serviceFee = 0.00;
  const parsedAmount = parseFloat(amount || "0");
  const total = parsedAmount + serviceFee;

  const truncateAddr = (addr: string) =>
    addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "";

  const handleNumpadPress = (key: string) => {
    if (key === "del") { setAmount((prev) => prev.slice(0, -1)); return; }
    if (key === "." && amount.includes(".")) return;
    const next = amount + key;
    const parts = next.split(".");
    if (parts[1] && parts[1].length > 2) return;
    if (parts[0].length > 7) return;
    setAmount(next);
  };

  const handleContinue = () => {
    if (!address || !amount) { toast.error("Please fill in all fields"); return; }
    if (!validateAddress(address.trim(), selectedChain)) {
      toast.error(`Invalid ${selectedChain.name} wallet address`); return;
    }
    if (isNaN(parsedAmount) || parsedAmount <= 0) { toast.error("Enter a valid amount"); return; }
    setStep("review");
  };

  const handleSend = async () => {
    setSending(true);
    try {
      const tokenAddr = USDCToken?.address === "NATIVE" ? undefined : USDCToken?.address;
      await onSend(address.trim(), amount, "send", tokenAddr);
      setStep("success");
    } catch (err: any) {
      toast.error(err.message || "Transfer failed");
    } finally {
      setSending(false);
    }
  };

  const handleBackToHome = () => {
    setStep("input");
    setAddress("");
    setAmount("");
    onClose?.();
  };

  const isLoading = loading || sending;

  // ── Network Picker ──
  if (showNetworkPicker) {
    return (
      <div className="flex flex-col px-1">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => setShowNetworkPicker(false)} className="h-9 w-9 rounded-full flex items-center justify-center hover:bg-secondary/50 transition-colors">
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <h2 className="flex-1 text-center text-lg font-bold text-foreground pr-9">Select Network</h2>
        </div>
        <div className="space-y-2">
          {SUPPORTED_CHAINS.map((chain) => (
            <button key={chain.key} onClick={() => { setSelectedChain(chain); setShowNetworkPicker(false); }}
              className={`w-full flex items-center gap-3 rounded-2xl border px-4 py-4 active:scale-[0.98] transition-all ${
                selectedChain.key === chain.key ? "bg-primary/10 border-primary/40" : "bg-card border-border/60"
              }`}>
              <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center">
                <span className="text-xs font-bold text-primary">{chain.nativeSymbol.charAt(0)}</span>
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-foreground">{chain.name}</p>
                <p className="text-xs text-muted-foreground">{chain.type.toUpperCase()}</p>
              </div>
              {selectedChain.key === chain.key && (
                <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-[10px] text-primary-foreground">✓</span>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── Success ──
  if (step === "success") {
    const receiptText = `Sent ${parsedAmount.toFixed(2)} USDC to ${truncateAddr(address.trim())} on ${selectedChain.name}`;
    const copyReceipt = async () => { const ok = await copyToClipboard(receiptText); if (ok) toast.success("Receipt copied!"); else toast.error("Copy failed"); };
    return (
      <div className="flex flex-col items-center py-8">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-3xl font-bold text-foreground mb-1">{parsedAmount.toFixed(2)} USDC</h2>
        <p className="text-sm text-muted-foreground mb-6">Sent to {truncateAddr(address.trim())} on {selectedChain.name}</p>
        <div className="w-full rounded-2xl bg-card border border-border/60 overflow-hidden mb-4">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
            <span className="text-sm text-muted-foreground">To</span>
            <span className="text-xs font-mono text-foreground">{truncateAddr(address.trim())}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
            <span className="text-sm text-muted-foreground">Token</span>
            <span className="text-sm font-semibold text-foreground">USDC</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
            <span className="text-sm text-muted-foreground">Network</span>
            <span className="text-sm font-semibold text-foreground">{selectedChain.name}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm font-semibold text-foreground">Amount</span>
            <span className="text-sm font-bold text-foreground">{parsedAmount.toFixed(2)} USDC</span>
          </div>
        </div>
        <div className="w-full grid grid-cols-2 gap-3 mb-4">
          <Button variant="outline" onClick={copyReceipt} className="rounded-2xl h-10 text-xs font-semibold border-border/60">
            <Copy className="h-3.5 w-3.5 mr-1.5" /> Copy Receipt
          </Button>
          <Button variant="outline" onClick={async () => {
            if (navigator.share) { try { await navigator.share({ title: "Xend Transfer", text: receiptText }); } catch { copyReceipt(); } } else { copyReceipt(); }
          }} className="rounded-2xl h-10 text-xs font-semibold border-border/60">
            <Share2 className="h-3.5 w-3.5 mr-1.5" /> Share
          </Button>
        </div>
        <Button onClick={handleBackToHome} className="w-full rounded-2xl h-12 text-sm font-semibold">Back to home</Button>
      </div>
    );
  }

  // ── Review ──
  if (step === "review") {
    return (
      <div className="flex flex-col">
        <h2 className="text-lg font-bold text-foreground text-center mb-6">Review Transfer</h2>
        <div className="w-full rounded-2xl bg-card border border-border/60 overflow-hidden mb-6">
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-border/40">
            <span className="text-sm text-muted-foreground">Token</span>
            <span className="text-sm font-semibold text-foreground">USDC</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-border/40">
            <span className="text-sm text-muted-foreground">Network</span>
            <span className="text-sm font-semibold text-foreground">{selectedChain.name}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3.5">
            <span className="text-sm text-muted-foreground">Wallet address</span>
            <span className="text-xs font-mono text-muted-foreground">
              {address.trim().slice(0, 20)}<br />{address.trim().slice(20)}
            </span>
          </div>
        </div>
        <div className="w-full rounded-2xl bg-card border border-border/60 overflow-hidden mb-6">
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-border/40">
            <span className="text-sm text-muted-foreground">Amount</span>
            <span className="text-sm font-semibold text-foreground">{parsedAmount.toFixed(2)} USDC</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-border/40">
            <span className="text-sm text-muted-foreground">Service fee</span>
            <span className="text-sm font-semibold text-foreground">{serviceFee.toFixed(2)} USDC</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3.5">
            <span className="text-sm font-semibold text-foreground">Total</span>
            <span className="text-sm font-bold text-foreground">{total.toFixed(2)} USDC</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" onClick={() => setStep("input")} className="rounded-2xl h-12 text-sm font-semibold">Back</Button>
          <Button onClick={handleSend} disabled={isLoading} className="rounded-2xl h-12 text-sm font-semibold">
            {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Send
          </Button>
        </div>
      </div>
    );
  }

  // ── Input ──
  return (
    <div className="flex flex-col">
      {/* Token */}
      <div className="mb-3">
        <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1.5 font-medium">Token</p>
        <div className="flex items-center justify-between rounded-2xl bg-card border border-border/60 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center">
              <span className="text-[10px] font-bold text-primary-foreground">$</span>
            </div>
            <span className="text-sm font-semibold text-foreground">USDC</span>
          </div>
        </div>
      </div>

      {/* Network */}
      <div className="mb-3">
        <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1.5 font-medium">Network</p>
        <button onClick={() => setShowNetworkPicker(true)}
          className="w-full flex items-center justify-between rounded-2xl bg-card border border-border/60 px-4 py-3">
          <span className="text-sm font-semibold text-foreground">{selectedChain.name}</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {/* Wallet Address */}
      <div className="mb-3">
        <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1.5 font-medium">Wallet Address</p>
        <div className="relative">
          <Input value={address} onChange={(e) => setAddress(e.target.value)}
            placeholder={selectedChain.type === "solana" ? "Solana address..." : "0x..."}
            type="text" className="bg-card border-border/60 text-sm h-12 rounded-2xl pr-10 font-mono" />
          {address && (
            <button onClick={() => setAddress("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-destructive/20 flex items-center justify-center">
              <X className="h-3 w-3 text-destructive" />
            </button>
          )}
        </div>
      </div>

      {/* Amount with numpad */}
      <div className="mb-2">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Amount</p>
          {balance > 0 && <p className="text-[11px] text-muted-foreground">Balance: {balance.toFixed(2)} USDC</p>}
        </div>
        <div className="flex items-center justify-center py-2">
          <span className="text-3xl font-bold text-foreground tabular-nums">{amount || "0.00"}</span>
          <span className="text-sm font-medium text-muted-foreground ml-2">USDC</span>
        </div>
        <div className="grid grid-cols-3 gap-1.5 px-2 mb-2">
          {NUMPAD_KEYS.map((key) => (
            <button key={key} onClick={() => handleNumpadPress(key)}
              className="h-11 rounded-xl bg-secondary/50 hover:bg-secondary active:scale-95 flex items-center justify-center transition-all text-base font-semibold text-foreground">
              {key === "del" ? <Delete className="h-4 w-4 text-muted-foreground" /> : key}
            </button>
          ))}
        </div>
      </div>

      <Button onClick={handleContinue} disabled={isLoading || !address || !amount}
        className="w-full rounded-2xl h-12 text-sm font-semibold mt-2">
        Continue
      </Button>
    </div>
  );
};

export default WalletSendForm;
