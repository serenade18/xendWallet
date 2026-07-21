import { useState } from "react";
import { ArrowLeft, Smartphone, Wallet, CheckCircle2, Clock, MessageSquare, Pencil, Delete } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import CountrySelector from "@/components/CountrySelector";
import ProviderSelector from "@/components/ProviderSelector";
import type { Country, MobileMoneyProvider } from "@/lib/countries";

type Step = "country" | "provider" | "input" | "approval";

interface TopUpMobileMoneyProps {
  walletBalance: number;
  userName?: string;
  userPhone?: string;
  onClose: () => void;
}

const maskPhone = (phone: string) => {
  if (!phone || phone.length < 4) return phone;
  return "****" + phone.slice(-4);
};

const NUMPAD_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "del"] as const;

const TopUpMobileMoney = ({ walletBalance, userName = "My Wallet", userPhone, onClose }: TopUpMobileMoneyProps) => {
  const [step, setStep] = useState<Step>("country");
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<MobileMoneyProvider | null>(null);
  const [amount, setAmount] = useState("");
  const [mpesaNumber, setMpesaNumber] = useState(userPhone || "");
  const [editingPhone, setEditingPhone] = useState(false);

  const exchangeRate = selectedCountry?.exchangeRate || 134.0;
  const currencySymbol = selectedCountry?.currencySymbol || "Ksh";
  const currency = selectedCountry?.currency || "KES";

  const numericAmount = parseFloat(amount) || 0;
  const localAmount = (numericAmount * exchangeRate).toFixed(2);
  const displayPhone = mpesaNumber || userPhone || "";

  const handleNumpadPress = (key: string) => {
    if (key === "del") {
      setAmount((prev) => prev.slice(0, -1));
      return;
    }
    if (key === "." && amount.includes(".")) return;
    const next = amount + key;
    const parts = next.split(".");
    if (parts[1] && parts[1].length > 2) return;
    if (parts[0].length > 7) return;
    setAmount(next);
  };

  const handleAdd = () => {
    if (numericAmount <= 0) {
      toast.error("Enter an amount to continue");
      return;
    }
    if (!displayPhone) {
      toast.error("Enter your phone number first");
      setEditingPhone(true);
      return;
    }
    setStep("approval");
  };

  const handleSavePhone = () => {
    if (!mpesaNumber.trim()) {
      toast.error("Enter a valid phone number");
      return;
    }
    setEditingPhone(false);
  };

  if (step === "country") {
    return (
      <CountrySelector
        title="Select Country"
        onSelect={(country) => {
          setSelectedCountry(country);
          setStep("provider");
        }}
        onBack={onClose}
      />
    );
  }

  if (step === "provider" && selectedCountry) {
    return (
      <ProviderSelector
        country={selectedCountry}
        onSelect={(provider) => {
          setSelectedProvider(provider);
          setStep("input");
        }}
        onBack={() => setStep("country")}
      />
    );
  }

  if (step === "approval") {
    return (
      <div className="flex flex-col min-h-[70dvh] px-1">
        <h2 className="text-2xl font-bold text-foreground mt-2 mb-8">Payment approval required</h2>

        <div className="space-y-6 flex-1">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 shrink-0 rounded-2xl bg-primary/15 flex items-center justify-center">
              <MessageSquare className="h-6 w-6 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed pt-2">
              {selectedProvider?.name || "Your provider"} will send a prompt to{" "}
              <span className="font-semibold text-foreground">{maskPhone(displayPhone)}</span> asking you to approve this payment.
            </p>
          </div>

          <div className="flex items-start gap-4">
            <div className="h-12 w-12 shrink-0 rounded-2xl bg-primary/15 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed pt-2">
              Please approve it within 7 minutes. You might need to enter your wallet PIN or password.
            </p>
          </div>

          <div className="flex items-start gap-4">
            <div className="h-12 w-12 shrink-0 rounded-2xl bg-primary/15 flex items-center justify-center">
              <Clock className="h-6 w-6 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed pt-2">
              If you've already approved, sit tight – we're processing it now.
            </p>
          </div>
        </div>

        <div className="rounded-2xl bg-warning/10 border border-warning/20 p-4 mt-6 mb-6">
          <p className="text-sm font-semibold text-foreground mb-1">Didn't receive the request?</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Don't start a new transaction just yet. Please wait until this one is confirmed, or at least 7 minutes after your last attempt.
          </p>
        </div>

        <Button onClick={onClose} className="w-full h-12 rounded-2xl font-semibold text-sm mb-2">
          Done
        </Button>
        <button
          onClick={() => setStep("input")}
          className="w-full text-center text-sm font-medium text-primary hover:underline pb-2"
        >
          View details
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[75dvh] px-1">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => setStep("provider")} className="h-9 w-9 rounded-full flex items-center justify-center hover:bg-secondary/50 transition-colors">
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <h2 className="flex-1 text-center text-lg font-bold text-foreground pr-9">Add via {selectedProvider?.name}</h2>
      </div>

      {/* Country & Provider Badge */}
      <div className="flex justify-center gap-2 mb-4">
        <div className="rounded-full bg-secondary/80 border border-border/60 px-4 py-2 flex items-center gap-1.5">
          <span className="text-sm">{selectedCountry?.flag}</span>
          <span className="text-xs font-medium text-muted-foreground">{selectedProvider?.name}</span>
        </div>
        <div className="rounded-full bg-secondary/80 border border-border/60 px-4 py-2">
          <span className="text-xs font-medium text-foreground">
            1 USD = {currencySymbol}{exchangeRate.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Amount Display */}
      <div className="flex flex-col items-center py-4">
        <div className="flex items-baseline gap-3">
          <span className="text-5xl font-bold text-foreground tabular-nums min-w-[60px] text-center">
            {amount || "0.00"}
          </span>
          <div className="rounded-full bg-secondary/80 border border-border/60 px-3 py-1.5">
            <span className="text-sm font-medium text-muted-foreground">USDC</span>
          </div>
        </div>
        {numericAmount > 0 && (
          <p className="text-sm text-muted-foreground mt-2 animate-in fade-in">
            ≈ {currencySymbol}{localAmount} {currency}
          </p>
        )}
      </div>

      {/* Numpad */}
      <div className="grid grid-cols-3 gap-2 px-4 mb-4">
        {NUMPAD_KEYS.map((key) => (
          <button
            key={key}
            onClick={() => handleNumpadPress(key)}
            className="h-14 rounded-2xl bg-secondary/50 hover:bg-secondary active:scale-95 flex items-center justify-center transition-all text-lg font-semibold text-foreground"
          >
            {key === "del" ? <Delete className="h-5 w-5 text-muted-foreground" /> : key}
          </button>
        ))}
      </div>

      {/* From / To */}
      <div className="space-y-3 mb-4">
        <div>
          <p className="text-xs text-muted-foreground mb-1.5">From</p>
          {editingPhone ? (
            <div className="rounded-2xl bg-card border border-primary/40 px-4 py-3 space-y-3">
              <p className="text-xs font-medium text-foreground">Enter phone number</p>
              <Input
                type="tel"
                inputMode="tel"
                placeholder="Phone number"
                value={mpesaNumber}
                onChange={(e) => setMpesaNumber(e.target.value)}
                className="h-11 rounded-xl text-sm"
                autoFocus
              />
              <Button size="sm" onClick={handleSavePhone} className="w-full rounded-xl h-9 text-xs font-semibold">
                Save Number
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-2xl bg-card border border-border/60 px-4 py-3">
              <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center">
                <Smartphone className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">
                  {displayPhone ? `${selectedProvider?.name} ${maskPhone(displayPhone)}` : "No number set"}
                </p>
                <p className="text-xs text-muted-foreground">Available instantly</p>
              </div>
              <button
                onClick={() => setEditingPhone(true)}
                className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                <Pencil className="h-3 w-3" />
                Change
              </button>
            </div>
          )}
        </div>

        <div>
          <p className="text-xs text-muted-foreground mb-1.5">To</p>
          <div className="flex items-center gap-3 rounded-2xl bg-card border border-border/60 px-4 py-3">
            <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center">
              <Wallet className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">{userName}'s Wallet</p>
              <p className="text-xs text-muted-foreground">{walletBalance.toFixed(2)} available</p>
            </div>
          </div>
        </div>
      </div>

      {/* Add Button */}
      <Button onClick={handleAdd} className="w-full h-12 rounded-2xl font-semibold text-sm mb-2">
        Add
      </Button>
    </div>
  );
};

export default TopUpMobileMoney;
