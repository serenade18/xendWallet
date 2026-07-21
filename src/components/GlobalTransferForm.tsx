import { useState } from "react";
import { ArrowLeft, ChevronRight, Loader2, X, Copy, Share2, Smartphone, Building2, Banknote, Delete } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import CountrySelector from "@/components/CountrySelector";
import type { Country } from "@/lib/countries";

type Step = "country" | "method" | "recipient" | "review" | "processing" | "success";
type SendMethod = "bank" | "mobile_money" | "cash_pickup";

interface GlobalTransferFormProps {
  onClose: () => void;
  balance?: number;
}

const FEE_PERCENT = 1.0;
const NUMPAD_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "del"] as const;

const METHOD_CONFIG: Record<SendMethod, { label: string; icon: typeof Smartphone; description: string }> = {
  mobile_money: { label: "Mobile Money", icon: Smartphone, description: "Send to mobile wallet" },
  bank: { label: "Bank Transfer", icon: Building2, description: "Send to bank account" },
  cash_pickup: { label: "Cash Pick Up", icon: Banknote, description: "Recipient picks up cash" },
};

const GlobalTransferForm = ({ onClose, balance = 0 }: GlobalTransferFormProps) => {
  const [step, setStep] = useState<Step>("country");
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<SendMethod | null>(null);
  const [recipientPhone, setRecipientPhone] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [amount, setAmount] = useState("");

  const exchangeRate = selectedCountry?.exchangeRate || 134.0;
  const currencySymbol = selectedCountry?.currencySymbol || "";
  const currency = selectedCountry?.currency || "";

  const numericAmount = parseFloat(amount) || 0;
  const fee = numericAmount * (FEE_PERCENT / 100);
  const totalDeducted = numericAmount + fee;
  const localReceived = (numericAmount * exchangeRate).toFixed(2);

  const handleNumpadPress = (key: string) => {
    if (key === "del") { setAmount((prev) => prev.slice(0, -1)); return; }
    if (key === "." && amount.includes(".")) return;
    const next = amount + key;
    const parts = next.split(".");
    if (parts[1] && parts[1].length > 2) return;
    if (parts[0].length > 7) return;
    setAmount(next);
  };

  const handleRecipientNext = () => {
    if (!recipientPhone.trim()) { toast.error("Enter recipient's phone number"); return; }
    if (!recipientName.trim()) { toast.error("Enter recipient's name"); return; }
    if (numericAmount <= 0) { toast.error("Enter an amount"); return; }
    if (totalDeducted > balance) { toast.error("Insufficient balance"); return; }
    setStep("review");
  };

  const handleConfirm = () => {
    setStep("processing");
    setTimeout(() => {
      setStep("success");
    }, 2000);
  };

  if (step === "country") {
    return <CountrySelector title="Send To" onSelect={(c) => { setSelectedCountry(c); setStep("method"); }} onBack={onClose} />;
  }

  if (step === "method" && selectedCountry) {
    const methods = selectedCountry.sendMethods || ["bank", "mobile_money"];
    return (
      <div className="flex flex-col min-h-[50dvh] px-1">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => setStep("country")} className="h-9 w-9 rounded-full flex items-center justify-center hover:bg-secondary/50 transition-colors">
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <h2 className="flex-1 text-center text-lg font-bold text-foreground pr-9">Payment Method</h2>
        </div>
        <div className="flex items-center gap-2 mb-4 px-1">
          <span className="text-lg">{selectedCountry.flag}</span>
          <span className="text-sm font-medium text-muted-foreground">Sending to {selectedCountry.name}</span>
        </div>
        <div className="space-y-2">
          {methods.map((method) => {
            const config = METHOD_CONFIG[method];
            const Icon = config.icon;
            return (
              <button key={method} onClick={() => { setSelectedMethod(method); setStep("recipient"); }}
                className="w-full flex items-center gap-4 rounded-2xl bg-card border border-border/60 px-5 py-4 active:scale-[0.98] transition-all">
                <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-[15px] font-semibold text-foreground">{config.label}</p>
                  <p className="text-[13px] text-muted-foreground">{config.description}</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (step === "success") {
    const receiptText = `Sent $${numericAmount.toFixed(2)} (${currencySymbol}${localReceived}) to ${recipientName} in ${selectedCountry?.name}`;
    const copyReceipt = () => { navigator.clipboard.writeText(receiptText); toast.success("Receipt copied!"); };
    return (
      <div className="flex flex-col items-center py-8 px-1">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-3xl font-bold text-foreground mb-1">${numericAmount.toFixed(2)}</h2>
        <p className="text-sm text-muted-foreground mb-1">≈ {currencySymbol}{localReceived} {currency}</p>
        <p className="text-sm text-muted-foreground mb-6">On the way to {recipientName} in {selectedCountry?.flag} {selectedCountry?.name}</p>
        <div className="w-full rounded-2xl bg-card border border-border/60 overflow-hidden mb-4">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
            <span className="text-sm text-muted-foreground">To</span>
            <span className="text-sm font-semibold text-foreground">{recipientName}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
            <span className="text-sm text-muted-foreground">Method</span>
            <span className="text-sm font-semibold text-foreground">{selectedMethod ? METHOD_CONFIG[selectedMethod].label : ""}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
            <span className="text-sm text-muted-foreground">Amount</span>
            <span className="text-sm font-semibold text-foreground">${numericAmount.toFixed(2)} USDC</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm text-muted-foreground">They receive</span>
            <span className="text-sm font-bold text-primary">{currencySymbol}{localReceived} {currency}</span>
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
        <Button onClick={onClose} className="w-full rounded-2xl h-12 text-sm font-semibold">Back to home</Button>
      </div>
    );
  }

  if (step === "processing") {
    return (
      <div className="flex flex-col min-h-[60dvh] px-1 items-center justify-center text-center">
        <Loader2 className="h-12 w-12 text-primary animate-spin mb-6" />
        <h2 className="text-xl font-bold text-foreground mb-2">Processing transfer</h2>
        <p className="text-sm text-muted-foreground max-w-xs">Sending {currencySymbol}{localReceived} to {recipientName}...</p>
      </div>
    );
  }

  if (step === "review") {
    return (
      <div className="flex flex-col min-h-[70dvh] px-1">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setStep("recipient")} className="h-9 w-9 rounded-full flex items-center justify-center hover:bg-secondary/50 transition-colors">
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <h2 className="flex-1 text-center text-lg font-bold text-foreground pr-9">Review Transfer</h2>
        </div>
        <div className="space-y-4 flex-1">
          <div className="rounded-2xl bg-card border border-border/60 p-5 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">You send</span>
              <span className="text-lg font-bold text-foreground">${numericAmount.toFixed(2)} USDC</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Fee ({FEE_PERCENT}%)</span>
              <span className="text-sm font-medium text-muted-foreground">-${fee.toFixed(2)}</span>
            </div>
            <div className="border-t border-border/60 pt-3 flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total deducted</span>
              <span className="text-sm font-bold text-foreground">${totalDeducted.toFixed(2)} USDC</span>
            </div>
            <div className="border-t border-border/60 pt-3 flex justify-between items-center">
              <span className="text-sm text-muted-foreground">They receive</span>
              <span className="text-lg font-bold text-primary">{currencySymbol}{localReceived} {currency}</span>
            </div>
          </div>
          <div className="rounded-2xl bg-card border border-border/60 px-4 py-3">
            <div className="flex items-center justify-between py-1">
              <span className="text-xs text-muted-foreground">Recipient</span>
              <span className="text-sm font-semibold text-foreground">{recipientName}</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-xs text-muted-foreground">Phone</span>
              <span className="text-sm font-semibold text-foreground">{recipientPhone}</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-xs text-muted-foreground">Country</span>
              <span className="text-sm font-semibold text-foreground">{selectedCountry?.flag} {selectedCountry?.name}</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-xs text-muted-foreground">Method</span>
              <span className="text-sm font-semibold text-foreground">{selectedMethod ? METHOD_CONFIG[selectedMethod].label : ""}</span>
            </div>
          </div>
        </div>
        <Button onClick={handleConfirm} className="w-full h-12 rounded-2xl font-semibold text-sm mb-2 mt-6">Send Money</Button>
        <button onClick={() => setStep("recipient")} className="w-full text-center text-sm font-medium text-muted-foreground hover:text-foreground pb-2">Go back</button>
      </div>
    );
  }

  // ── Recipient & Amount Screen ──
  return (
    <div className="flex flex-col min-h-[75dvh] px-1">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => setStep("method")} className="h-9 w-9 rounded-full flex items-center justify-center hover:bg-secondary/50 transition-colors">
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <h2 className="flex-1 text-center text-lg font-bold text-foreground pr-9">Recipient Details</h2>
      </div>

      <div className="flex items-center gap-2 mb-4 px-1">
        <span className="text-lg">{selectedCountry?.flag}</span>
        <span className="text-sm text-muted-foreground">{selectedCountry?.name} · {selectedMethod ? METHOD_CONFIG[selectedMethod].label : ""}</span>
      </div>

      <div className="space-y-3 mb-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Recipient Name</label>
          <Input type="text" placeholder="Full name" value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)} className="h-11 rounded-xl text-sm" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Phone Number</label>
          <Input type="tel" inputMode="tel" placeholder="Phone number" value={recipientPhone}
            onChange={(e) => setRecipientPhone(e.target.value)} className="h-11 rounded-xl text-sm" />
        </div>
      </div>

      {/* Amount with numpad */}
      <div className="flex justify-center gap-2 mb-2">
        <div className="rounded-full bg-secondary/80 border border-border/60 px-4 py-1.5">
          <span className="text-xs font-medium text-foreground">1 USD = {currencySymbol}{exchangeRate.toLocaleString()}</span>
        </div>
      </div>

      <div className="flex flex-col items-center py-2">
        <div className="flex items-baseline gap-3">
          <span className="text-4xl font-bold text-foreground tabular-nums min-w-[50px] text-center">{amount || "0.00"}</span>
          <div className="rounded-full bg-secondary/80 border border-border/60 px-3 py-1">
            <span className="text-xs font-medium text-muted-foreground">USDC</span>
          </div>
        </div>
        {numericAmount > 0 && (
          <p className="text-xs text-muted-foreground mt-1 animate-in fade-in">
            ≈ {currencySymbol}{localReceived} {currency} · Fee ${fee.toFixed(2)}
          </p>
        )}
        <p className="text-[11px] text-muted-foreground mt-0.5">Balance: ${balance.toFixed(2)}</p>
      </div>

      <div className="grid grid-cols-3 gap-1.5 px-4 mb-4">
        {NUMPAD_KEYS.map((key) => (
          <button key={key} onClick={() => handleNumpadPress(key)}
            className="h-12 rounded-xl bg-secondary/50 hover:bg-secondary active:scale-95 flex items-center justify-center transition-all text-base font-semibold text-foreground">
            {key === "del" ? <Delete className="h-4 w-4 text-muted-foreground" /> : key}
          </button>
        ))}
      </div>

      <Button onClick={handleRecipientNext} className="w-full h-12 rounded-2xl font-semibold text-sm mb-2">Continue</Button>
    </div>
  );
};

export default GlobalTransferForm;
