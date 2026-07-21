import { useState } from "react";
import { ArrowLeft, Copy, AlertTriangle, Loader2, CheckCircle2, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { noahApi, NoahApiError, type NoahPayinResult } from "@/lib/noah-api";
import { toNoahNetwork, type ChainConfig } from "@/lib/chains";

type Step = "currency" | "loading" | "details" | "kyc-required";

interface TopUpBankTransferProps {
  userEmail?: string;
  /** The wallet's actual chain + address — required so the payin's network
   * and destinationAddress always match (a mismatch here is a likely cause
   * of Noah/Portal rejecting the request). */
  chain: ChainConfig;
  walletAddress: string;
  onClose: () => void;
}

const CURRENCIES: { code: string; label: string; flag: string }[] = [
  { code: "USD", label: "US Dollar", flag: "🇺🇸" },
  { code: "EUR", label: "Euro", flag: "🇪🇺" },
];

/**
 * Real Noah Bank Onramp (Payin via Virtual Account): mints a dedicated
 * virtual account for the person and auto-converts any deposit into USDC
 * in their Portal wallet. Gated by KycGate at the Dashboard level, same as
 * withdrawals — Noah requires an approved customer before assigning an
 * account.
 */
const TopUpBankTransfer = ({ userEmail = "", chain, walletAddress, onClose }: TopUpBankTransferProps) => {
  const [step, setStep] = useState<Step>("currency");
  const [fiatCurrency, setFiatCurrency] = useState<string>("USD");
  const [bankDetails, setBankDetails] = useState<NoahPayinResult["data"]["bankDetails"] | null>(null);
  const [kycUrl, setKycUrl] = useState("");

  // Sandbox-only: simulate an incoming deposit to test the flow end to end.
  const [simAmount, setSimAmount] = useState("");
  const [simulating, setSimulating] = useState(false);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied!`);
  };

  const handleKycRequired = async () => {
    try {
      const res = await noahApi.initiateKyc(window.location.origin, [fiatCurrency]);
      setKycUrl(res.data?.hostedUrl || "");
      setStep("kyc-required");
    } catch (err: any) {
      toast.error("Failed to start verification: " + (err.message || "Unknown error"));
    }
  };

  const handleSelectCurrency = async (code: string) => {
    setFiatCurrency(code);
    if (!walletAddress) {
      toast.error("Your wallet isn't ready yet — try again in a moment.");
      setStep("currency");
      return;
    }
    setStep("loading");
    try {
      const res = await noahApi.initiatePayin({
        fiatCurrency: code,
        cryptoCurrency: "USDC",
        network: toNoahNetwork(chain),
        destinationAddress: walletAddress,
      });
      setBankDetails(res.data.bankDetails);
      setStep("details");
    } catch (err: any) {
      if (err instanceof NoahApiError && err.isKycRequired) {
        handleKycRequired();
      } else {
        toast.error(err.message || "Failed to set up your virtual account");
        setStep("currency");
      }
    }
  };

  const handleSimulate = async () => {
    if (!bankDetails) return;
    const amount = parseFloat(simAmount);
    if (!amount || amount <= 0) {
      toast.error("Enter an amount to simulate");
      return;
    }
    setSimulating(true);
    try {
      await noahApi.simulateDeposit({
        paymentMethodId: bankDetails.paymentMethodId,
        fiatAmount: simAmount,
        fiatCurrency: fiatCurrency,
      });
      toast.success("Deposit simulated — your wallet will credit shortly");
      setSimAmount("");
    } catch (err: any) {
      toast.error(err.message || "Simulation failed");
    } finally {
      setSimulating(false);
    }
  };

  const DetailRow = ({ label, value, copyable = false }: { label: string; value: string; copyable?: boolean }) => (
    <div className="flex items-center justify-between py-3 border-b border-border/40 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-foreground text-right">{value}</span>
        {copyable && (
          <button onClick={() => copyToClipboard(value, label)} className="text-primary hover:text-primary/80">
            <Copy className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );

  // ── KYC Required ──
  if (step === "kyc-required") {
    return (
      <div className="flex flex-col min-h-[50dvh] items-center justify-center text-center px-4">
        <div className="h-16 w-16 rounded-full bg-warning/15 flex items-center justify-center mb-6">
          <CheckCircle2 className="h-8 w-8 text-warning" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">Verification Required</h2>
        <p className="text-sm text-muted-foreground mb-6 max-w-xs">
          To top up by bank transfer, you need to complete identity verification first.
        </p>
        {kycUrl && (
          <Button onClick={() => window.open(kycUrl, "_blank")} className="w-full max-w-xs h-12 rounded-2xl font-semibold text-sm mb-3">
            Complete Verification
          </Button>
        )}
        <button onClick={onClose} className="text-sm font-medium text-muted-foreground hover:text-foreground">Cancel</button>
      </div>
    );
  }

  // ── Currency selection ──
  if (step === "currency") {
    return (
      <div className="flex flex-col min-h-[50dvh] px-1">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={onClose} className="h-9 w-9 rounded-full flex items-center justify-center hover:bg-secondary/50 transition-colors">
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <h2 className="flex-1 text-center text-lg font-bold text-foreground pr-9">Bank Transfer</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4 px-1">
          Choose a currency — we'll assign you a dedicated virtual account that auto-converts deposits to USDC.
        </p>
        <div className="space-y-2">
          {CURRENCIES.map((c) => (
            <button
              key={c.code}
              onClick={() => handleSelectCurrency(c.code)}
              className="w-full flex items-center gap-3 rounded-2xl bg-card border border-border/60 px-4 py-3.5 active:scale-[0.98] transition-all hover:bg-secondary/30"
            >
              <span className="text-2xl leading-none">{c.flag}</span>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-foreground">{c.label}</p>
                <p className="text-xs text-muted-foreground">{c.code} virtual account</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── Loading ──
  if (step === "loading") {
    return (
      <div className="flex flex-col min-h-[50dvh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-sm text-muted-foreground">Setting up your virtual account...</p>
      </div>
    );
  }

  // ── Details ──
  if (!bankDetails) return null;

  return (
    <div className="flex flex-col min-h-[70dvh] px-1">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => setStep("currency")} className="h-9 w-9 rounded-full flex items-center justify-center hover:bg-secondary/50 transition-colors">
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <h2 className="flex-1 text-center text-lg font-bold text-foreground pr-9">Bank Transfer</h2>
      </div>

      <div className="flex items-center gap-2 mb-4 px-1">
        <span className="text-lg">{CURRENCIES.find((c) => c.code === fiatCurrency)?.flag}</span>
        <span className="text-sm font-medium text-foreground">{fiatCurrency} Virtual Account</span>
      </div>

      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
        Send money from your bank to this account. It's yours — reuse it any time you want to top up.
      </p>

      <div className="space-y-2 mb-4">
        <div className="flex items-start gap-2 rounded-xl bg-warning/10 border border-warning/20 px-3 py-2.5">
          <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
          <p className="text-xs text-foreground">Send from an account in your own name</p>
        </div>
        <div className="flex items-start gap-2 rounded-xl bg-warning/10 border border-warning/20 px-3 py-2.5">
          <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
          <p className="text-xs text-foreground">First transfers may need a small verification deposit</p>
        </div>
      </div>

      <div className="rounded-2xl bg-card border border-border/60 px-4 mb-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider py-3 border-b border-border/40">Bank Details</p>
        <DetailRow label="Bank Name" value={bankDetails.bankName} copyable />
        <DetailRow label="Account Holder" value={bankDetails.accountHolderName} copyable />
        <DetailRow label="Account Number" value={bankDetails.accountNumber} copyable />
        <DetailRow label="Bank Code" value={bankDetails.bankCode} copyable />
        {bankDetails.reference && <DetailRow label="Reference" value={bankDetails.reference} copyable />}
      </div>

      <div className="rounded-2xl bg-secondary/50 border border-border/40 p-4 mb-4">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Powered by Noah. Deposits auto-convert to USDC and land in your Xend wallet — no manual crediting.
          </p>
        </div>
      </div>

      {/* Sandbox-only test helper */}
      <div className="rounded-2xl border border-dashed border-border/60 p-4 mb-4 space-y-3">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-4 w-4 text-muted-foreground" />
          <p className="text-xs font-semibold text-foreground">Sandbox: simulate a deposit</p>
        </div>
        <div className="flex gap-2">
          <Input
            type="number"
            inputMode="decimal"
            placeholder={`Amount in ${fiatCurrency}`}
            value={simAmount}
            onChange={(e) => setSimAmount(e.target.value)}
            className="h-10 rounded-xl text-sm"
          />
          <Button onClick={handleSimulate} disabled={simulating} size="sm" className="rounded-xl shrink-0">
            {simulating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Simulate"}
          </Button>
        </div>
      </div>

      <Button onClick={onClose} className="w-full h-12 rounded-2xl font-semibold text-sm mb-2">
        Done
      </Button>
    </div>
  );
};

export default TopUpBankTransfer;
