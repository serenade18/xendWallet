import { useState, useEffect, useMemo } from "react";
import {
  ArrowLeft, ChevronRight, Loader2, Copy, Share2, Smartphone, Building2, Banknote,
  Delete, Search, Clock, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { noahApi, type NoahPayoutChannel, type NoahQuoteResult } from "@/lib/noah-api";
import {
  normalizeNoahCountries, sortedCountryEntries, type NoahCountryInfo,
} from "@/lib/noah-countries";
import { SchemaField, setPath, checkRequired } from "@/components/noah/SchemaField";

type Step =
  | "countries" | "method" | "channels" | "form" | "amount"
  | "review" | "processing" | "success" | "kyc-required";
type Method = "bank" | "mobile_money" | "cash_pickup";

interface GlobalTransferFormProps {
  onClose: () => void;
  balance?: number;
  onSendCrypto?: (to: string, amount: string, txType?: string) => Promise<any>;
}

const NUMPAD_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "del"] as const;

const METHOD_META: Record<Method, { label: string; description: string; Icon: typeof Smartphone }> = {
  mobile_money: { label: "Mobile Money", description: "Send to a mobile wallet", Icon: Smartphone },
  bank:         { label: "Bank Transfer", description: "Send to a bank account",   Icon: Building2 },
  cash_pickup:  { label: "Cash Pick Up",  description: "Recipient picks up cash",   Icon: Banknote },
};

const categorize = (ch: any): Method | null => {
  const cat = (ch.paymentMethodCategory || "").toLowerCase();
  const type = (ch.paymentMethodType || ch.type || ch.name || "").toLowerCase();
  if (cat === "bank" || type.includes("bank") || type.includes("ach") || type.includes("wire") || type.includes("swift") || type.includes("sepa")) return "bank";
  if (cat.includes("mobile") || type.includes("mobile") || type.includes("mpesa") || type.includes("momo") || type.includes("wallet")) return "mobile_money";
  if (cat.includes("cash") || type.includes("cash") || type.includes("pickup")) return "cash_pickup";
  return null;
};

const formatDuration = (secs?: number) => {
  if (!secs) return null;
  if (secs < 3600) return `~${Math.round(secs / 60)} min`;
  if (secs < 86400) return `~${Math.round(secs / 3600)} hr`;
  return `~${Math.round(secs / 86400)} day${secs >= 172800 ? "s" : ""}`;
};

const formatFee = (ch: any) => {
  const fixed = ch.feeConfig?.fixed;
  const pct = ch.feeConfig?.percentage;
  const cur = ch.feeConfig?.fiatCurrency || ch.fiatCurrency || "";
  const parts: string[] = [];
  if (fixed && parseFloat(fixed) > 0) parts.push(`${cur} ${fixed}`);
  if (pct && parseFloat(pct) > 0) parts.push(`${pct}%`);
  return parts.length ? parts.join(" + ") : "Free";
};

const GlobalTransferForm = ({ onClose, balance = 0, onSendCrypto }: GlobalTransferFormProps) => {
  const [step, setStep] = useState<Step>("countries");
  const [loading, setLoading] = useState(false);

  // Noah data
  const [countries, setCountries] = useState<Record<string, NoahCountryInfo>>({});
  const [countrySearch, setCountrySearch] = useState("");
  const [selectedCountryCode, setSelectedCountryCode] = useState("");
  const [allChannels, setAllChannels] = useState<NoahPayoutChannel[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<Method | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<NoahPayoutChannel | null>(null);
  const [formSchema, setFormSchema] = useState<any>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);

  // Amount / quote
  const [amount, setAmount] = useState("");
  const [quote, setQuote] = useState<NoahQuoteResult["data"] | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [kycUrl, setKycUrl] = useState("");

  const numericAmount = parseFloat(amount) || 0;

  // ── Load Countries + Payment Methods ──
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [c, pm] = await Promise.all([
          noahApi.getPayoutCountries(),
          noahApi.listPaymentMethods(),
        ]);
        setCountries(normalizeNoahCountries(c.data?.countries));
        setPaymentMethods(pm.data?.paymentMethods || []);
      } catch (err: any) {
        console.error("Noah load error:", err);
        toast.error(err.message || "Failed to load countries");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleKycRequired = async () => {
    try {
      const res = await noahApi.initiateKyc(window.location.origin);
      setKycUrl(res.data?.hostedUrl || "");
      setStep("kyc-required");
    } catch (err: any) {
      toast.error("Failed to start KYC: " + (err.message || "Unknown error"));
    }
  };

  const handleCountrySelect = async (code: string) => {
    setSelectedCountryCode(code);
    setLoading(true);
    try {
      const fiatCurrency = countries[code]?.currency;
      const res = await noahApi.getPayoutChannels(code, { fiatCurrency });
      setAllChannels(res.data?.items || []);
      setStep("method");
    } catch (err: any) {
      if (err.message?.toLowerCase().includes("kyc")) handleKycRequired();
      else toast.error(err.message || "Failed to load channels");
    } finally {
      setLoading(false);
    }
  };

  const availableMethods = useMemo(() => {
    const set = new Set<Method>();
    for (const ch of allChannels) {
      const m = categorize(ch);
      if (m) set.add(m);
    }
    return Array.from(set);
  }, [allChannels]);

  const filteredChannels = useMemo(
    () => allChannels.filter((ch) => categorize(ch) === selectedMethod),
    [allChannels, selectedMethod],
  );

  const handleChannelSelect = async (channel: NoahPayoutChannel) => {
    setSelectedChannel(channel);
    const channelId = channel.id || channel.channelId;
    if (!channelId) { setStep("form"); return; }
    setLoading(true);
    try {
      const res = await noahApi.getChannelForm(channelId);
      setFormSchema(res.data?.formSchema);
      setStep("form");
    } catch (err: any) {
      console.error("Channel form error:", err);
      setStep("form");
    } finally {
      setLoading(false);
    }
  };

  const handleFormNext = () => {
    const missing = checkRequired(formSchema, formData);
    if (missing) { toast.error(`Please fill in ${missing}`); return; }
    setStep("amount");
  };

  const handleContinue = async () => {
    if (numericAmount <= 0) { toast.error("Enter an amount"); return; }
    if (numericAmount > balance) { toast.error("Insufficient balance"); return; }
    const channelId = selectedChannel?.id || selectedChannel?.channelId;
    if (!channelId) { toast.error("No channel selected"); return; }

    setQuoteLoading(true);
    try {
      const pm = paymentMethods.find((p) =>
        p.country === selectedCountryCode && p.capabilities?.payoutTo,
      );
      const q = await noahApi.quotePayout({
        channelId,
        fiatAmount: amount,
        fiatCurrency: countries[selectedCountryCode]?.currency || "USD",
        cryptoCurrency: "USDC",
        form: formData,
        paymentMethodId: pm?.id,
      });
      setQuote(q.data);
      setStep("review");
    } catch (err: any) {
      if (err.message?.toLowerCase().includes("kyc")) handleKycRequired();
      else toast.error(err.message || "Failed to get quote");
    } finally {
      setQuoteLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!quote?.payoutId) { toast.error("No quote available"); return; }
    setStep("processing");
    try {
      const payoutRes = await noahApi.initiatePayout({
        payoutId: quote.payoutId,
        network: "solana:devnet",
      });
      const destAddr = payoutRes.data?.destinationAddress;
      const cryptoAmount = quote.cryptoAmountEstimate;
      if (destAddr && cryptoAmount && onSendCrypto) {
        await onSendCrypto(destAddr, cryptoAmount, "transfer");
      }
      setStep("success");
      toast.success("Transfer initiated!");
    } catch (err: any) {
      toast.error(err.message || "Transfer failed");
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

  const countryEntries = sortedCountryEntries(countries).filter(([code, info]) => {
    const q = countrySearch.trim().toLowerCase();
    if (!q) return true;
    return code.toLowerCase().includes(q) || info.name.toLowerCase().includes(q) || info.currency.toLowerCase().includes(q);
  });

  const country = countries[selectedCountryCode];
  const fiat = country?.currency || "USD";

  // ── KYC ──
  if (step === "kyc-required") {
    return (
      <div className="flex flex-col min-h-[50dvh] items-center justify-center text-center px-4">
        <div className="h-16 w-16 rounded-full bg-warning/15 flex items-center justify-center mb-6">
          <CheckCircle2 className="h-8 w-8 text-warning" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">Verification Required</h2>
        <p className="text-sm text-muted-foreground mb-6 max-w-xs">
          To send money globally, complete identity verification first.
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

  // ── Countries ──
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
          <h2 className="flex-1 text-center text-lg font-bold text-foreground pr-9">Send To</h2>
        </div>
        {Object.keys(countries).length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">No payout countries available</p>
            <Button onClick={handleKycRequired} variant="outline" className="mt-4 rounded-2xl">Start Verification</Button>
          </div>
        ) : (
          <>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={countrySearch} onChange={(e) => setCountrySearch(e.target.value)}
                placeholder="Search country or currency..."
                className="pl-9 h-11 rounded-xl text-sm bg-card border-border/60" />
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
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
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

  // ── Method ──
  if (step === "method") {
    if (loading) {
      return (
        <div className="flex flex-col min-h-[50dvh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-sm text-muted-foreground">Loading methods...</p>
        </div>
      );
    }
    const methods: Method[] = availableMethods.length ? availableMethods : ["bank", "mobile_money"];
    return (
      <div className="flex flex-col min-h-[50dvh] px-1">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => setStep("countries")} className="h-9 w-9 rounded-full flex items-center justify-center hover:bg-secondary/50 transition-colors">
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <h2 className="flex-1 text-center text-lg font-bold text-foreground pr-9">Payment Method</h2>
        </div>
        <div className="flex items-center gap-2 mb-4 px-1">
          <span className="text-lg">{country?.flag}</span>
          <span className="text-sm font-medium text-foreground">{country?.name}</span>
          <span className="text-xs text-muted-foreground">· {fiat}</span>
        </div>
        {allChannels.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No payout channels available for this country</p>
        ) : (
          <div className="space-y-2">
            {methods.map((m) => {
              const meta = METHOD_META[m];
              const count = allChannels.filter((ch) => categorize(ch) === m).length;
              if (count === 0) return null;
              return (
                <button key={m} onClick={() => { setSelectedMethod(m); setStep("channels"); }}
                  className="w-full flex items-center gap-4 rounded-2xl bg-card border border-border/60 px-5 py-4 active:scale-[0.98] transition-all">
                  <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                    <meta.Icon className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-[15px] font-semibold text-foreground">{meta.label}</p>
                    <p className="text-[13px] text-muted-foreground">{count} option{count > 1 ? "s" : ""} available</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── Channels ──
  if (step === "channels") {
    const meta = selectedMethod ? METHOD_META[selectedMethod] : null;
    return (
      <div className="flex flex-col min-h-[50dvh] px-1">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => setStep("method")} className="h-9 w-9 rounded-full flex items-center justify-center hover:bg-secondary/50 transition-colors">
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <h2 className="flex-1 text-center text-lg font-bold text-foreground pr-9">Choose Provider</h2>
        </div>
        <div className="flex items-center gap-2 mb-4 px-1">
          <span className="text-lg">{country?.flag}</span>
          <span className="text-sm text-muted-foreground">{country?.name} · {meta?.label}</span>
        </div>
        {filteredChannels.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No providers available</p>
        ) : (
          <div className="space-y-2.5 overflow-y-auto max-h-[60dvh]">
            {filteredChannels.map((channel: any, i) => {
              const Icon = meta?.Icon || Building2;
              const dur = formatDuration(channel.processingSeconds);
              const min = channel.limits?.minLimit;
              const cur = channel.fiatCurrency || fiat;
              return (
                <button key={channel.id || channel.channelId || i} onClick={() => handleChannelSelect(channel)}
                  className="w-full rounded-2xl bg-card border border-border/60 px-4 py-3.5 active:scale-[0.98] transition-all hover:bg-secondary/30 text-left">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">{channel.paymentMethodType || channel.name || channel.type || "Provider"}</p>
                      {channel.name && channel.name !== channel.paymentMethodType && (
                        <p className="text-[11px] text-muted-foreground">{channel.name}</p>
                      )}
                    </div>
                    {dur && (
                      <div className="flex items-center gap-1 rounded-full bg-secondary/70 px-2 py-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-[10px] font-medium text-muted-foreground">{dur}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2 pl-[52px]">
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Fee</span>
                      <span className="text-xs font-semibold text-foreground">{formatFee(channel)}</span>
                    </div>
                    {min && (
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Min</span>
                        <span className="text-xs font-semibold text-foreground">{cur} {min}</span>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── Dynamic Form (recipient details) ──
  if (step === "form") {
    const fields = formSchema?.properties ? Object.entries(formSchema.properties) : [];
    return (
      <div className="flex flex-col min-h-[70dvh] px-1">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setStep("channels")} className="h-9 w-9 rounded-full flex items-center justify-center hover:bg-secondary/50 transition-colors">
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <h2 className="flex-1 text-center text-lg font-bold text-foreground pr-9">Recipient Details</h2>
        </div>
        <div className="space-y-4 flex-1 overflow-y-auto max-h-[60dvh] pr-1">
          {fields.length > 0 ? fields.map(([key, field]: [string, any]) => (
            <SchemaField key={key} name={key} path={key} field={field}
              value={formData[key]}
              onChange={(path, v) => setFormData((prev) => setPath(prev, path, v))} />
          )) : (
            <>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Recipient Name</label>
                <Input value={formData.recipientName || ""} placeholder="Full name"
                  onChange={(e) => setFormData({ ...formData, recipientName: e.target.value })}
                  className="h-12 rounded-xl text-sm" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Phone / Account</label>
                <Input value={formData.accountNumber || ""} placeholder="Number"
                  onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                  className="h-12 rounded-xl text-sm" />
              </div>
            </>
          )}
          <div className="rounded-2xl bg-secondary/50 border border-border/40 p-4 flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-foreground">Secure transfer</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">Encrypted end-to-end. Powered by Noah.</p>
            </div>
          </div>
        </div>
        <Button onClick={handleFormNext} className="w-full h-12 rounded-2xl font-semibold text-sm mb-2 mt-6">Continue</Button>
      </div>
    );
  }

  // ── Review ──
  if (step === "review" && quote) {
    return (
      <div className="flex flex-col min-h-[70dvh] px-1">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setStep("amount")} className="h-9 w-9 rounded-full flex items-center justify-center hover:bg-secondary/50 transition-colors">
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <h2 className="flex-1 text-center text-lg font-bold text-foreground pr-9">Review Transfer</h2>
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
              <span className="text-sm text-muted-foreground">They receive</span>
              <span className="text-lg font-bold text-primary">{amount} {fiat}</span>
            </div>
          </div>
          <div className="rounded-2xl bg-card border border-border/60 px-4 py-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Country</span>
              <span className="text-sm font-semibold text-foreground">{country?.flag} {country?.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Method</span>
              <span className="text-sm font-semibold text-foreground">{selectedMethod ? METHOD_META[selectedMethod].label : ""}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Provider</span>
              <span className="text-sm font-semibold text-foreground">{selectedChannel?.paymentMethodType || selectedChannel?.name}</span>
            </div>
          </div>
        </div>
        <Button onClick={handleConfirm} className="w-full h-12 rounded-2xl font-semibold text-sm mb-2 mt-6">Send Money</Button>
        <button onClick={() => setStep("amount")} className="w-full text-center text-sm font-medium text-muted-foreground hover:text-foreground pb-2">Go back</button>
      </div>
    );
  }

  // ── Processing ──
  if (step === "processing") {
    return (
      <div className="flex flex-col min-h-[60dvh] px-1 items-center justify-center text-center">
        <div className="h-16 w-16 rounded-full bg-primary/15 flex items-center justify-center mb-6 animate-pulse">
          <Clock className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">Processing transfer</h2>
        <p className="text-sm text-muted-foreground max-w-xs mb-6">
          Sending {amount} {fiat} to {country?.name}
        </p>
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // ── Success ──
  if (step === "success") {
    const receiptText = `Sent ${quote?.cryptoAmountEstimate || amount} USDC → ${amount} ${fiat} to ${country?.name} via ${selectedChannel?.paymentMethodType || selectedChannel?.name || "Noah"}`;
    const copyReceipt = () => { navigator.clipboard.writeText(receiptText); toast.success("Receipt copied!"); };
    return (
      <div className="flex flex-col items-center py-8 px-1">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-3xl font-bold text-foreground mb-1">{amount} {fiat}</h2>
        <p className="text-sm text-muted-foreground mb-1">≈ {quote?.cryptoAmountEstimate} USDC</p>
        <p className="text-sm text-muted-foreground mb-6">On the way to {country?.flag} {country?.name}</p>
        <div className="w-full rounded-2xl bg-card border border-border/60 overflow-hidden mb-4">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
            <span className="text-sm text-muted-foreground">Method</span>
            <span className="text-sm font-semibold text-foreground">{selectedMethod ? METHOD_META[selectedMethod].label : ""}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
            <span className="text-sm text-muted-foreground">Provider</span>
            <span className="text-sm font-semibold text-foreground">{selectedChannel?.paymentMethodType || selectedChannel?.name}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
            <span className="text-sm text-muted-foreground">Amount</span>
            <span className="text-sm font-semibold text-foreground">{quote?.cryptoAmountEstimate} USDC</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm text-muted-foreground">They receive</span>
            <span className="text-sm font-bold text-primary">{amount} {fiat}</span>
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

  // ── Amount ──
  return (
    <div className="flex flex-col min-h-[75dvh] px-1">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => setStep("form")} className="h-9 w-9 rounded-full flex items-center justify-center hover:bg-secondary/50 transition-colors">
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <h2 className="flex-1 text-center text-lg font-bold text-foreground pr-9">Amount</h2>
      </div>
      <div className="flex items-center gap-2 mb-3 px-1">
        <span className="text-lg">{country?.flag}</span>
        <span className="text-sm text-muted-foreground">{country?.name} · {selectedMethod ? METHOD_META[selectedMethod].label : ""}</span>
      </div>
      <div className="flex justify-center mb-3">
        <div className="rounded-full bg-secondary/80 border border-border/60 px-5 py-2">
          <span className="text-sm font-medium text-foreground">{fiat}</span>
        </div>
      </div>
      <div className="flex flex-col items-center py-2">
        <div className="flex items-baseline gap-3">
          <span className="text-5xl font-bold text-foreground tabular-nums min-w-[60px] text-center">{amount || "0.00"}</span>
          <div className="rounded-full bg-secondary/80 border border-border/60 px-3 py-1.5">
            <span className="text-sm font-medium text-muted-foreground">{fiat}</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">Balance: ${balance.toFixed(2)} USDC</p>
      </div>
      <div className="grid grid-cols-3 gap-2 px-4 mb-4">
        {NUMPAD_KEYS.map((key) => (
          <button key={key} onClick={() => handleNumpadPress(key)}
            className="h-14 rounded-2xl bg-secondary/50 hover:bg-secondary active:scale-95 flex items-center justify-center transition-all text-lg font-semibold text-foreground">
            {key === "del" ? <Delete className="h-5 w-5 text-muted-foreground" /> : key}
          </button>
        ))}
      </div>
      <Button onClick={handleContinue} disabled={quoteLoading} className="w-full h-12 rounded-2xl font-semibold text-sm mb-2">
        {quoteLoading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Getting Quote...</> : "Continue"}
      </Button>
    </div>
  );
};

export default GlobalTransferForm;
