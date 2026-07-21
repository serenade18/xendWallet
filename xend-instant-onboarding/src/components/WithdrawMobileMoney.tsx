import { useState, useEffect } from "react";
import { ArrowLeft, Smartphone, Wallet, CheckCircle2, Clock, MessageSquare, Pencil, Delete, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { noahApi, type NoahPayoutChannel, type NoahQuoteResult } from "@/lib/noah-api";
import { normalizeNoahCountries, sortedCountryEntries, type NoahCountryInfo } from "@/lib/noah-countries";

type Step = "countries" | "channels" | "form" | "amount" | "review" | "processing" | "success" | "kyc-required";

interface WithdrawMobileMoneyProps {
  walletBalance: number;
  userName?: string;
  userPhone?: string;
  onClose: () => void;
  onSendCrypto?: (to: string, amount: string, txType?: string) => Promise<any>;
}

const NUMPAD_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "del"] as const;

const maskPhone = (phone: string) => {
  if (!phone || phone.length < 4) return phone;
  return "****" + phone.slice(-4);
};

const WithdrawMobileMoney = ({ walletBalance, userName, userPhone, onClose, onSendCrypto }: WithdrawMobileMoneyProps) => {
  const [step, setStep] = useState<Step>("countries");
  const [loading, setLoading] = useState(false);

  // Noah data
  const [countries, setCountries] = useState<Record<string, NoahCountryInfo>>({});
  const [countrySearch, setCountrySearch] = useState("");
  const [selectedCountryCode, setSelectedCountryCode] = useState("");
  const [channels, setChannels] = useState<NoahPayoutChannel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<NoahPayoutChannel | null>(null);
  const [formSchema, setFormSchema] = useState<any>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);

  // Amount & Quote
  const [amount, setAmount] = useState("");
  const [quote, setQuote] = useState<NoahQuoteResult["data"] | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [kycUrl, setKycUrl] = useState("");

  // Phone
  const [mpesaNumber, setMpesaNumber] = useState(userPhone || "");
  const [editingPhone, setEditingPhone] = useState(false);

  const numericAmount = parseFloat(amount) || 0;
  const displayPhone = mpesaNumber || userPhone || "";

  // ── Load Countries ──
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [countriesRes, pmRes] = await Promise.all([
          noahApi.getPayoutCountries(),
          noahApi.listPaymentMethods(),
        ]);
        setCountries(normalizeNoahCountries(countriesRes.data?.countries));
        setPaymentMethods(pmRes.data?.paymentMethods || []);
      } catch (err: any) {
        console.error("Failed to load Noah countries:", err);
        toast.error(err.message || "Failed to load countries");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // ── Load Channels for Country ──
  const handleCountrySelect = async (countryCode: string) => {
    setSelectedCountryCode(countryCode);
    setLoading(true);
    try {
      const fiatCurrency = countries[countryCode]?.currency;
      const res = await noahApi.getPayoutChannels(countryCode, { fiatCurrency });
      const items = res.data?.items || [];
      // Filter for mobile money type channels
      const mobileChannels = items.filter((ch: any) =>
        ch.type?.toLowerCase().includes("mobile") ||
        ch.name?.toLowerCase().includes("mobile") ||
        ch.name?.toLowerCase().includes("mpesa") ||
        ch.name?.toLowerCase().includes("momo") ||
        ch.paymentMethodCategory?.toLowerCase().includes("mobile")
      );
      setChannels(mobileChannels.length > 0 ? mobileChannels : items);
      setStep("channels");
    } catch (err: any) {
      if (err.message?.toLowerCase().includes("kyc")) {
        handleKycRequired();
      } else {
        toast.error(err.message || "Failed to load channels");
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Load Channel Form ──
  const handleChannelSelect = async (channel: NoahPayoutChannel) => {
    setSelectedChannel(channel);
    const channelId = channel.id || channel.channelId;
    if (!channelId) {
      setStep("amount");
      return;
    }
    setLoading(true);
    try {
      const res = await noahApi.getChannelForm(channelId);
      setFormSchema(res.data?.formSchema);
      if (res.data?.formSchema && Object.keys(res.data.formSchema).length > 0) {
        setStep("form");
      } else {
        setStep("amount");
      }
    } catch (err: any) {
      console.error("Channel form error:", err);
      setStep("amount");
    } finally {
      setLoading(false);
    }
  };

  // ── KYC Required ──
  const handleKycRequired = async () => {
    try {
      const res = await noahApi.initiateKyc(window.location.origin);
      setKycUrl(res.data?.hostedUrl || "");
      setStep("kyc-required");
    } catch (err: any) {
      toast.error("Failed to start KYC: " + (err.message || "Unknown error"));
    }
  };

  // ── Get Quote ──
  const handleContinue = async () => {
    if (numericAmount <= 0) { toast.error("Enter an amount to withdraw"); return; }
    if (numericAmount > walletBalance) { toast.error("Insufficient balance"); return; }
    if (!displayPhone && !Object.keys(formData).length) {
      toast.error("Enter your phone number");
      setEditingPhone(true);
      return;
    }

    const channelId = selectedChannel?.id || selectedChannel?.channelId;
    if (!channelId) { toast.error("No channel selected"); return; }

    setQuoteLoading(true);
    try {
      // Find a matching payment method
      const pm = paymentMethods.find((p) =>
        p.country === selectedCountryCode && p.capabilities?.payoutTo
      );

      const quoteRes = await noahApi.quotePayout({
        channelId,
        fiatAmount: amount,
        fiatCurrency: countries[selectedCountryCode]?.currency || "USD",
        cryptoCurrency: "USDC",
        form: { ...formData, phone: displayPhone },
        paymentMethodId: pm?.id,
      });
      setQuote(quoteRes.data);
      setStep("review");
    } catch (err: any) {
      if (err.message?.toLowerCase().includes("kyc")) {
        handleKycRequired();
      } else {
        toast.error(err.message || "Failed to get quote");
      }
    } finally {
      setQuoteLoading(false);
    }
  };

  // ── Confirm Payout ──
  const handleConfirm = async () => {
    if (!quote?.payoutId) { toast.error("No quote available"); return; }
    setStep("processing");
    try {
      const payoutRes = await noahApi.initiatePayout({
        payoutId: quote.payoutId,
        network: "solana:devnet",
      });

      // Send crypto to the destination address Noah provided
      const destAddr = payoutRes.data?.destinationAddress;
      const cryptoAmount = quote.cryptoAmountEstimate;

      if (destAddr && cryptoAmount && onSendCrypto) {
        await onSendCrypto(destAddr, cryptoAmount, "withdraw");
      }

      setStep("success");
      toast.success("Withdrawal initiated successfully!");
    } catch (err: any) {
      toast.error(err.message || "Withdrawal failed");
      setStep("review");
    }
  };

  const handleNumpadPress = (key: string) => {
    if (key === "del") { setAmount((prev) => prev.slice(0, -1)); return; }
    if (key === "." && amount.includes(".")) return;
    const next = amount + key;
    const parts = next.split(".");
    if (parts[1] && parts[1].length > 2) return;
    if (parts[0].length > 7) return;
    setAmount(next);
  };

  const handleSavePhone = () => {
    if (!mpesaNumber.trim()) { toast.error("Enter a valid phone number"); return; }
    setEditingPhone(false);
  };

  const countryEntries = sortedCountryEntries(countries).filter(([code, info]) => {
    const q = countrySearch.trim().toLowerCase();
    if (!q) return true;
    return (
      code.toLowerCase().includes(q) ||
      info.name.toLowerCase().includes(q) ||
      info.currency.toLowerCase().includes(q)
    );
  });

  // ── KYC Required Screen ──
  if (step === "kyc-required") {
    return (
      <div className="flex flex-col min-h-[50dvh] items-center justify-center text-center px-4">
        <div className="h-16 w-16 rounded-full bg-warning/15 flex items-center justify-center mb-6">
          <CheckCircle2 className="h-8 w-8 text-warning" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">Verification Required</h2>
        <p className="text-sm text-muted-foreground mb-6 max-w-xs">
          To withdraw funds, you need to complete identity verification first.
        </p>
        {kycUrl ? (
          <Button onClick={() => window.open(kycUrl, "_blank")} className="w-full max-w-xs h-12 rounded-2xl font-semibold text-sm mb-3">
            Complete Verification
          </Button>
        ) : null}
        <button onClick={onClose} className="text-sm font-medium text-muted-foreground hover:text-foreground">Cancel</button>
      </div>
    );
  }

  // ── Countries Screen ──
  if (step === "countries") {
    if (loading) {
      return (
        <div className="flex flex-col min-h-[50dvh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-sm text-muted-foreground">Loading countries...</p>
        </div>
      );
    }
    return (
      <div className="flex flex-col min-h-[50dvh] px-1">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={onClose} className="h-9 w-9 rounded-full flex items-center justify-center hover:bg-secondary/50 transition-colors">
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <h2 className="flex-1 text-center text-lg font-bold text-foreground pr-9">Select Country</h2>
        </div>
        {Object.keys(countries).length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">No payout countries available</p>
            <p className="text-xs text-muted-foreground mt-1">KYC verification may be required</p>
            <Button onClick={handleKycRequired} variant="outline" className="mt-4 rounded-2xl">
              Start Verification
            </Button>
          </div>
        ) : (
          <>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={countrySearch}
                onChange={(e) => setCountrySearch(e.target.value)}
                placeholder="Search country or currency..."
                className="pl-9 h-11 rounded-xl text-sm bg-card border-border/60"
              />
            </div>
            <div className="space-y-1.5 overflow-y-auto max-h-[55dvh]">
              {countryEntries.map(([code, info]) => (
                <button key={code} onClick={() => handleCountrySelect(code)}
                  className="w-full flex items-center gap-3 rounded-2xl bg-card border border-border/60 px-4 py-3.5 active:scale-[0.98] transition-all hover:bg-secondary/30">
                  <span className="text-2xl leading-none">{info.flag}</span>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-semibold text-foreground">{info.name}</p>
                    <p className="text-xs text-muted-foreground">{code} · {info.currencies.join(" / ")}</p>
                  </div>
                </button>
              ))}
              {countryEntries.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">No countries match</p>
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  // ── Channels Screen ──
  if (step === "channels") {
    if (loading) {
      return (
        <div className="flex flex-col min-h-[50dvh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-sm text-muted-foreground">Loading providers...</p>
        </div>
      );
    }
    return (
      <div className="flex flex-col min-h-[50dvh] px-1">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => setStep("countries")} className="h-9 w-9 rounded-full flex items-center justify-center hover:bg-secondary/50 transition-colors">
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <h2 className="flex-1 text-center text-lg font-bold text-foreground pr-9">Select Provider</h2>
        </div>
        {channels.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">No mobile money providers available for this country</p>
          </div>
        ) : (
          <div className="space-y-2">
            {channels.map((channel, i) => (
              <button key={channel.id || channel.channelId || i} onClick={() => handleChannelSelect(channel)}
                className="w-full flex items-center gap-3 rounded-2xl bg-card border border-border/60 px-4 py-4 active:scale-[0.98] transition-all hover:bg-secondary/30">
                <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center">
                  <Smartphone className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold text-foreground">{channel.name || channel.type || "Mobile Money"}</p>
                  <p className="text-xs text-muted-foreground">{channel.type || ""}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Dynamic Form Screen ──
  if (step === "form" && formSchema) {
    const formFields = Object.entries(formSchema.properties || formSchema || {});
    return (
      <div className="flex flex-col min-h-[50dvh] px-1">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setStep("channels")} className="h-9 w-9 rounded-full flex items-center justify-center hover:bg-secondary/50 transition-colors">
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <h2 className="flex-1 text-center text-lg font-bold text-foreground pr-9">Details</h2>
        </div>
        <div className="space-y-4 flex-1">
          {formFields.map(([key, field]: [string, any]) => (
            <div key={key} className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">{field.title || key}</label>
              <Input
                type={field.type === "number" ? "number" : "text"}
                placeholder={field.description || `Enter ${field.title || key}`}
                value={formData[key] || ""}
                onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                className="h-12 rounded-xl text-sm"
              />
            </div>
          ))}
        </div>
        <Button onClick={() => setStep("amount")} className="w-full h-12 rounded-2xl font-semibold text-sm mb-2 mt-6">
          Continue
        </Button>
      </div>
    );
  }

  // ── Success Screen ──
  if (step === "success") {
    return (
      <div className="flex flex-col min-h-[70dvh] px-1 items-center justify-center text-center">
        <div className="text-6xl mb-4">✅</div>
        <h2 className="text-xl font-bold text-foreground mb-2">Withdrawal Initiated</h2>
        <p className="text-sm text-muted-foreground max-w-xs mb-2">
          Your withdrawal of <span className="font-semibold text-foreground">{amount} USDC</span> has been submitted.
        </p>
        {quote && (
          <p className="text-sm text-muted-foreground mb-6">
            Estimated: {quote.cryptoAmountEstimate} USDC · Fee: {quote.totalFee}
          </p>
        )}
        <Button onClick={onClose} className="w-full max-w-xs h-12 rounded-2xl font-semibold text-sm">Done</Button>
      </div>
    );
  }

  // ── Processing Screen ──
  if (step === "processing") {
    return (
      <div className="flex flex-col min-h-[70dvh] px-1 items-center justify-center text-center">
        <div className="h-16 w-16 rounded-full bg-primary/15 flex items-center justify-center mb-6 animate-pulse">
          <Clock className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">Processing withdrawal</h2>
        <p className="text-sm text-muted-foreground max-w-xs mb-2">
          Sending <span className="font-semibold text-foreground">{amount} USDC</span> via {selectedChannel?.name || "mobile money"}
        </p>
        <p className="text-xs text-muted-foreground mb-8">This may take a few minutes</p>
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // ── Review Screen ──
  if (step === "review" && quote) {
    return (
      <div className="flex flex-col min-h-[70dvh] px-1">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setStep("amount")} className="h-9 w-9 rounded-full flex items-center justify-center hover:bg-secondary/50 transition-colors">
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <h2 className="flex-1 text-center text-lg font-bold text-foreground pr-9">Confirm Withdrawal</h2>
        </div>
        <div className="space-y-4 flex-1">
          <div className="rounded-2xl bg-card border border-border/60 p-5 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">You send</span>
              <span className="text-lg font-bold text-foreground">{quote.cryptoAmountEstimate} USDC</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Fee</span>
              <span className="text-sm font-medium text-muted-foreground">{quote.totalFee}</span>
            </div>
            <div className="border-t border-border/60 pt-3 flex justify-between items-center">
              <span className="text-sm text-muted-foreground">You receive</span>
              <span className="text-lg font-bold text-primary">
                {amount} {countries[selectedCountryCode]?.currency || "USD"}
              </span>
            </div>
          </div>
          <div className="rounded-2xl bg-card border border-border/60 px-4 py-3 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center">
              <Smartphone className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">{selectedChannel?.name || "Mobile Money"}</p>
              <p className="text-xs text-muted-foreground">{displayPhone ? maskPhone(displayPhone) : selectedCountryCode}</p>
            </div>
          </div>
        </div>
        <Button onClick={handleConfirm} className="w-full h-12 rounded-2xl font-semibold text-sm mb-2 mt-6">Confirm Withdrawal</Button>
        <button onClick={() => setStep("amount")} className="w-full text-center text-sm font-medium text-muted-foreground hover:text-foreground pb-2">Go back</button>
      </div>
    );
  }

  // ── Amount Input Screen ──
  return (
    <div className="flex flex-col min-h-[75dvh] px-1">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => setStep(formSchema ? "form" : "channels")} className="h-9 w-9 rounded-full flex items-center justify-center hover:bg-secondary/50 transition-colors">
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <h2 className="flex-1 text-center text-lg font-bold text-foreground pr-9">
          Withdraw via {selectedChannel?.name || "Mobile Money"}
        </h2>
      </div>

      <div className="flex justify-center gap-2 mb-4">
        <div className="rounded-full bg-secondary/80 border border-border/60 px-4 py-2 flex items-center gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">{selectedChannel?.name || "Mobile Money"}</span>
        </div>
        <div className="rounded-full bg-secondary/80 border border-border/60 px-4 py-2">
          <span className="text-xs font-medium text-foreground">{countries[selectedCountryCode]?.currency || "Local Currency"}</span>
        </div>
      </div>

      <div className="flex flex-col items-center py-3">
        <div className="flex items-baseline gap-3">
          <span className="text-5xl font-bold text-foreground tabular-nums min-w-[60px] text-center">{amount || "0.00"}</span>
          <div className="rounded-full bg-secondary/80 border border-border/60 px-3 py-1.5">
            <span className="text-sm font-medium text-muted-foreground">{countries[selectedCountryCode]?.currency || "USD"}</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">Balance: ${walletBalance.toFixed(2)} USDC</p>
      </div>

      <div className="grid grid-cols-3 gap-2 px-4 mb-4">
        {NUMPAD_KEYS.map((key) => (
          <button key={key} onClick={() => handleNumpadPress(key)}
            className="h-14 rounded-2xl bg-secondary/50 hover:bg-secondary active:scale-95 flex items-center justify-center transition-all text-lg font-semibold text-foreground">
            {key === "del" ? <Delete className="h-5 w-5 text-muted-foreground" /> : key}
          </button>
        ))}
      </div>

      <div className="mb-4">
        <p className="text-xs text-muted-foreground mb-1.5">To</p>
        {editingPhone ? (
          <div className="rounded-2xl bg-card border border-primary/40 px-4 py-3 space-y-3">
            <p className="text-xs font-medium text-foreground">Enter phone number</p>
            <Input type="tel" inputMode="tel" placeholder="Phone number" value={mpesaNumber}
              onChange={(e) => setMpesaNumber(e.target.value)} className="h-11 rounded-xl text-sm" autoFocus />
            <Button size="sm" onClick={handleSavePhone} className="w-full rounded-xl h-9 text-xs font-semibold">Save Number</Button>
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-2xl bg-card border border-border/60 px-4 py-3">
            <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center">
              <Smartphone className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">
                {displayPhone ? maskPhone(displayPhone) : "No number set"}
              </p>
              <p className="text-xs text-muted-foreground">Receive via {selectedChannel?.name || "mobile money"}</p>
            </div>
            <button onClick={() => setEditingPhone(true)} className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              <Pencil className="h-3 w-3" /> Change
            </button>
          </div>
        )}
      </div>

      <Button onClick={handleContinue} disabled={quoteLoading} className="w-full h-12 rounded-2xl font-semibold text-sm mb-2">
        {quoteLoading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Getting Quote...</> : "Continue"}
      </Button>
    </div>
  );
};

export default WithdrawMobileMoney;
