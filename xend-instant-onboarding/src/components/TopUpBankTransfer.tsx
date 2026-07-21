import { useState } from "react";
import { ArrowLeft, Copy, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import CountrySelector from "@/components/CountrySelector";
import type { Country } from "@/lib/countries";

type Step = "country" | "details";

interface TopUpBankTransferProps {
  userEmail?: string;
  onClose: () => void;
}

const TopUpBankTransfer = ({ userEmail = "", onClose }: TopUpBankTransferProps) => {
  const [step, setStep] = useState<Step>("country");
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);

  const paymentReference = `XEND TOP UP – ${userEmail.toUpperCase()}`;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied!`);
  };

  if (step === "country") {
    return (
      <CountrySelector
        title="Select Country"
        onSelect={(country) => {
          if (!country.bankTransferDetails) {
            toast.info(`Bank transfer not yet available for ${country.name}`);
            return;
          }
          setSelectedCountry(country);
          setStep("details");
        }}
        onBack={onClose}
      />
    );
  }

  if (!selectedCountry?.bankTransferDetails) return null;

  const bank = selectedCountry.bankTransferDetails;

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

  return (
    <div className="flex flex-col min-h-[70dvh] px-1">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => setStep("country")} className="h-9 w-9 rounded-full flex items-center justify-center hover:bg-secondary/50 transition-colors">
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <h2 className="flex-1 text-center text-lg font-bold text-foreground pr-9">Bank Transfer</h2>
      </div>

      {/* Country badge */}
      <div className="flex items-center gap-2 mb-4 px-1">
        <span className="text-lg">{selectedCountry.flag}</span>
        <span className="text-sm font-medium text-foreground">{selectedCountry.name}</span>
        <span className="text-xs text-muted-foreground">({selectedCountry.currency})</span>
      </div>

      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
        Top up your Xend wallet by sending money from your bank account.
      </p>

      {/* Warnings */}
      <div className="space-y-2 mb-4">
        <div className="flex items-start gap-2 rounded-xl bg-warning/10 border border-warning/20 px-3 py-2.5">
          <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
          <p className="text-xs text-foreground">Send money to the bank account below</p>
        </div>
        <div className="flex items-start gap-2 rounded-xl bg-warning/10 border border-warning/20 px-3 py-2.5">
          <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
          <p className="text-xs text-foreground">Include the <strong>reference provided</strong></p>
        </div>
        <div className="flex items-start gap-2 rounded-xl bg-warning/10 border border-warning/20 px-3 py-2.5">
          <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
          <p className="text-xs text-foreground">Your wallet will be credited within <strong>2–3 business days</strong></p>
        </div>
      </div>

      {/* Exchange Rate */}
      <div className="flex justify-center mb-4">
        <div className="rounded-full bg-secondary/80 border border-border/60 px-5 py-2">
          <span className="text-sm font-medium text-foreground">
            1 USD = {selectedCountry.currencySymbol}{selectedCountry.exchangeRate.toLocaleString()} {selectedCountry.currency}
          </span>
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground text-center mb-4 italic">
        Final credited amount will be calculated based on the rate at the time funds are received.
      </p>

      {/* Bank Details Card */}
      <div className="rounded-2xl bg-card border border-border/60 px-4 mb-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider py-3 border-b border-border/40">Bank Details</p>
        <DetailRow label="Bank Name" value={bank.bankName} />
        <DetailRow label="Account Name" value={bank.accountName} copyable />
        <DetailRow label="Account Number" value={`${bank.accountNumber} (${selectedCountry.currency})`} copyable />
        {bank.swiftCode && <DetailRow label="SWIFT Code" value={bank.swiftCode} copyable />}
        {bank.bankCode && <DetailRow label="Bank Code" value={bank.bankCode} />}
        {bank.branchCode && <DetailRow label="Branch Code" value={bank.branchCode} />}
        {bank.branchName && <DetailRow label="Branch Name" value={bank.branchName} />}
      </div>

      {/* Payment Reference */}
      <div className="rounded-2xl bg-primary/10 border border-primary/20 px-4 py-4 mb-4">
        <p className="text-xs font-semibold text-foreground mb-2">⚠️ Payment Reference</p>
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-mono font-bold text-primary break-all">{paymentReference}</p>
          <button onClick={() => copyToClipboard(paymentReference, "Reference")} className="shrink-0 text-primary hover:text-primary/80">
            <Copy className="h-4 w-4" />
          </button>
        </div>
        <p className="text-[11px] text-muted-foreground mt-2 italic">
          Always include this reference so we can credit your wallet correctly.
        </p>
      </div>

      <Button onClick={onClose} className="w-full h-12 rounded-2xl font-semibold text-sm mb-2">
        Done
      </Button>
    </div>
  );
};

export default TopUpBankTransfer;
