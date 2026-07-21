import { useState } from "react";
import { ArrowDownUp, ChevronDown, Loader2, CheckCircle2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type Token = {
  symbol: string;
  name: string;
  icon: string;
  balance: number;
  rate: number; // rate relative to USD
};

const MOCK_TOKENS: Token[] = [
  { symbol: "USD", name: "USD Coin", icon: "💵", balance: 0, rate: 1 },
  { symbol: "USD", name: "Tether", icon: "💲", balance: 0, rate: 1.0001 },
  { symbol: "ETH", name: "Ethereum", icon: "⟠", balance: 0, rate: 0.000285 },
  { symbol: "SOL", name: "Solana", icon: "◎", balance: 0, rate: 0.00588 },
  { symbol: "DAI", name: "Dai", icon: "◈", balance: 0, rate: 0.9999 },
  { symbol: "MATIC", name: "Polygon", icon: "⬡", balance: 0, rate: 2.174 },
];

type Step = "input" | "review" | "success";

interface SwapFormProps {
  totalBalance: number;
  onClose?: () => void;
}

const SwapForm = ({ totalBalance, onClose }: SwapFormProps) => {
  const [step, setStep] = useState<Step>("input");
  const [fromToken, setFromToken] = useState<Token>({ ...MOCK_TOKENS[0], balance: totalBalance });
  const [toToken, setToToken] = useState<Token>(MOCK_TOKENS[2]); // ETH
  const [amount, setAmount] = useState("");
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const tokens = MOCK_TOKENS.map((t) =>
    t.symbol === "USD" ? { ...t, balance: totalBalance } : t
  );

  const numAmount = parseFloat(amount) || 0;
  const receiveAmount = numAmount * (fromToken.rate / toToken.rate);
  const fee = numAmount * 0.003; // 0.3% fee
  const rate = fromToken.rate / toToken.rate;

  const handleSwapDirection = () => {
    setFromToken(toToken);
    setToToken(fromToken);
    setAmount("");
  };

  const handleContinue = () => {
    if (numAmount <= 0) {
      toast.error("Enter an amount");
      return;
    }
    if (numAmount > fromToken.balance) {
      toast.error("Insufficient balance");
      return;
    }
    if (fromToken.symbol === toToken.symbol) {
      toast.error("Select different tokens");
      return;
    }
    setStep("review");
  };

  const handleConfirm = async () => {
    setLoading(true);
    // Mock swap delay
    await new Promise((r) => setTimeout(r, 2000));
    setLoading(false);
    setStep("success");
  };

  const handleReset = () => {
    setStep("input");
    setAmount("");
    onClose?.();
  };

  const TokenPicker = ({
    onSelect,
    onClose: closePicker,
    exclude,
  }: {
    onSelect: (t: Token) => void;
    onClose: () => void;
    exclude: string;
  }) => (
    <div className="absolute inset-0 z-20 bg-background rounded-xl animate-slide-up">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
        <h3 className="text-sm font-semibold text-foreground">Select token</h3>
        <button onClick={closePicker} className="text-xs text-muted-foreground hover:text-foreground">Cancel</button>
      </div>
      <div className="divide-y divide-border/20">
        {tokens
          .filter((t) => t.symbol !== exclude)
          .map((t) => (
            <button
              key={t.symbol}
              onClick={() => {
                onSelect(t);
                closePicker();
              }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/30 transition-colors"
            >
              <span className="text-xl">{t.icon}</span>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-foreground">{t.symbol}</p>
                <p className="text-[11px] text-muted-foreground">{t.name}</p>
              </div>
              <p className="text-xs text-muted-foreground">{t.balance.toFixed(4)}</p>
            </button>
          ))}
      </div>
    </div>
  );

  if (step === "success") {
    return (
      <div className="flex flex-col items-center justify-center py-8 px-4 text-center space-y-4 animate-slide-up">
        <div className="h-16 w-16 rounded-full bg-primary/15 flex items-center justify-center">
          <CheckCircle2 className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-xl font-bold text-foreground">Swap Complete</h3>
        <p className="text-sm text-muted-foreground">
          Swapped {numAmount.toFixed(2)} {fromToken.symbol} for {receiveAmount.toFixed(6)} {toToken.symbol}
        </p>

        {/* Receipt */}
        <div className="w-full rounded-xl border border-border/40 bg-card/60 p-4 space-y-2 text-left">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">From</span>
            <span className="text-foreground font-medium">{numAmount.toFixed(2)} {fromToken.symbol}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">To</span>
            <span className="text-foreground font-medium">{receiveAmount.toFixed(6)} {toToken.symbol}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Rate</span>
            <span className="text-foreground">1 {fromToken.symbol} = {rate.toFixed(6)} {toToken.symbol}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Fee</span>
            <span className="text-foreground">{fee.toFixed(4)} {fromToken.symbol}</span>
          </div>
        </div>

        <Button onClick={handleReset} className="w-full">Done</Button>
      </div>
    );
  }

  if (step === "review") {
    return (
      <div className="px-1 py-4 space-y-5 animate-slide-up">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => setStep("input")} className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-secondary/40 transition-colors">
            <ArrowLeft className="h-4 w-4 text-foreground" />
          </button>
          <h3 className="text-lg font-bold text-foreground">Review Swap</h3>
        </div>

        <div className="rounded-xl border border-border/40 bg-card/60 p-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">You pay</span>
            <span className="text-foreground font-semibold">{numAmount.toFixed(2)} {fromToken.symbol}</span>
          </div>
          <div className="flex justify-center">
            <ArrowDownUp className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">You receive</span>
            <span className="text-foreground font-semibold">{receiveAmount.toFixed(6)} {toToken.symbol}</span>
          </div>
        </div>

        <div className="rounded-xl border border-border/40 bg-card/60 p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Exchange rate</span>
            <span className="text-foreground">1 {fromToken.symbol} = {rate.toFixed(6)} {toToken.symbol}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Fee (0.3%)</span>
            <span className="text-foreground">{fee.toFixed(4)} {fromToken.symbol}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Network</span>
            <span className="text-foreground">Base</span>
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground text-center">
          Rate may change. You'll receive at least {(receiveAmount * 0.995).toFixed(6)} {toToken.symbol}
        </p>

        <Button onClick={handleConfirm} disabled={loading} className="w-full h-12 text-[15px] font-semibold">
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Confirm Swap"}
        </Button>
      </div>
    );
  }

  return (
    <div className="relative px-1 py-4 space-y-4">
      {showFromPicker && (
        <TokenPicker
          onSelect={setFromToken}
          onClose={() => setShowFromPicker(false)}
          exclude={toToken.symbol}
        />
      )}
      {showToPicker && (
        <TokenPicker
          onSelect={setToToken}
          onClose={() => setShowToPicker(false)}
          exclude={fromToken.symbol}
        />
      )}

      <h3 className="text-lg font-bold text-foreground text-center">Swap</h3>

      {/* From */}
      <div className="rounded-xl border border-border/40 bg-card/60 p-4 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">You pay</p>
          <p className="text-[11px] text-muted-foreground">
            Balance: {fromToken.balance.toFixed(2)} {fromToken.symbol}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="flex-1 text-2xl font-bold border-0 bg-transparent p-0 h-auto focus-visible:ring-0 placeholder:text-muted-foreground/40"
          />
          <button
            onClick={() => setShowFromPicker(true)}
            className="flex items-center gap-1.5 rounded-full bg-secondary/50 px-3 py-1.5 hover:bg-secondary/70 transition-colors"
          >
            <span className="text-base">{fromToken.icon}</span>
            <span className="text-sm font-semibold text-foreground">{fromToken.symbol}</span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>
        {numAmount > 0 && (
          <button
            onClick={() => setAmount(fromToken.balance.toFixed(2))}
            className="text-[11px] text-primary font-medium hover:underline"
          >
            Max
          </button>
        )}
      </div>

      {/* Swap direction */}
      <div className="flex justify-center -my-1">
        <button
          onClick={handleSwapDirection}
          className="h-10 w-10 rounded-full border border-border/60 bg-card flex items-center justify-center hover:bg-secondary/40 transition-colors active:scale-95"
        >
          <ArrowDownUp className="h-4 w-4 text-primary" />
        </button>
      </div>

      {/* To */}
      <div className="rounded-xl border border-border/40 bg-card/60 p-4 space-y-2">
        <p className="text-xs text-muted-foreground">You receive</p>
        <div className="flex items-center gap-2">
          <p className="flex-1 text-2xl font-bold text-foreground">
            {numAmount > 0 ? receiveAmount.toFixed(6) : "0.00"}
          </p>
          <button
            onClick={() => setShowToPicker(true)}
            className="flex items-center gap-1.5 rounded-full bg-secondary/50 px-3 py-1.5 hover:bg-secondary/70 transition-colors"
          >
            <span className="text-base">{toToken.icon}</span>
            <span className="text-sm font-semibold text-foreground">{toToken.symbol}</span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Rate info */}
      {numAmount > 0 && (
        <div className="rounded-xl border border-border/30 bg-card/40 px-4 py-2.5 flex items-center justify-between animate-slide-up">
          <span className="text-xs text-muted-foreground">Rate</span>
          <span className="text-xs text-foreground">
            1 {fromToken.symbol} = {rate.toFixed(6)} {toToken.symbol}
          </span>
        </div>
      )}

      <Button onClick={handleContinue} className="w-full h-12 text-[15px] font-semibold">
        Review Swap
      </Button>
    </div>
  );
};

export default SwapForm;
