import { useState, useEffect, useMemo } from "react";
import { ArrowLeft, Building2, Clock, Delete, CheckCircle2, Loader2, Search, Zap, Globe, Landmark, ChevronDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { noahApi, type NoahPayoutChannel, type NoahQuoteResult } from "@/lib/noah-api";
import { normalizeNoahCountries, sortedCountryEntries, type NoahCountryInfo } from "@/lib/noah-countries";

// ── Nested value helpers (dot-path) ──
const getPath = (obj: any, path: string): any =>
  path.split(".").reduce((acc, k) => (acc == null ? undefined : acc[k]), obj);
const setPath = (obj: any, path: string, value: any): any => {
  const keys = path.split(".");
  const next = { ...(obj || {}) };
  let cur: any = next;
  for (let i = 0; i < keys.length - 1; i++) {
    cur[keys[i]] = { ...(cur[keys[i]] || {}) };
    cur = cur[keys[i]];
  }
  cur[keys[keys.length - 1]] = value;
  return next;
};

interface OneOfOpt { const: string; title: string; "x-symbol"?: string }

// Searchable select for oneOf enums (e.g. countryCode with flags)
const OneOfSelect = ({
  value, onChange, options, placeholder,
}: { value: string; onChange: (v: string) => void; options: OneOfOpt[]; placeholder?: string }) => {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const selected = options.find((o) => o.const === value);
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return options;
    return options.filter(
      (o) => o.title.toLowerCase().includes(s) || o.const.toLowerCase().includes(s)
    );
  }, [q, options]);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="w-full h-12 rounded-xl border border-input bg-background px-3 flex items-center gap-2 text-sm hover:bg-secondary/40 transition-colors"
        >
          {selected ? (
            <>
              <span className="text-lg leading-none">{selected["x-symbol"] || "🏳️"}</span>
              <span className="flex-1 text-left text-foreground truncate">{selected.title}</span>
              <span className="text-xs text-muted-foreground">{selected.const}</span>
            </>
          ) : (
            <span className="flex-1 text-left text-muted-foreground">{placeholder || "Select..."}</span>
          )}
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <div className="p-2 border-b border-border/60">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search country..."
              className="pl-8 h-9 rounded-lg text-sm"
              autoFocus
            />
          </div>
        </div>
        <div className="max-h-64 overflow-y-auto py-1">
          {filtered.map((o) => (
            <button
              key={o.const}
              type="button"
              onClick={() => { onChange(o.const); setOpen(false); setQ(""); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-secondary/50 text-left"
            >
              <span className="text-base leading-none">{o["x-symbol"] || "🏳️"}</span>
              <span className="flex-1 text-foreground truncate">{o.title}</span>
              <span className="text-xs text-muted-foreground">{o.const}</span>
              {value === o.const && <Check className="h-4 w-4 text-primary" />}
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="px-3 py-4 text-xs text-muted-foreground text-center">No matches</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

// Recursive schema field renderer
const SchemaField = ({
  name, path, field, value, onChange,
}: { name: string; path: string; field: any; value: any; onChange: (path: string, v: any) => void }) => {
  const label = field.title || name;

  // Nested object
  if (field.type === "object" && field.properties) {
    const subKeys = Object.keys(field.properties);
    return (
      <div className="rounded-2xl border border-border/60 bg-card/50 p-3 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        {subKeys.map((k) => (
          <SchemaField
            key={k}
            name={k}
            path={`${path}.${k}`}
            field={field.properties[k]}
            value={getPath(value, k)}
            onChange={onChange}
          />
        ))}
      </div>
    );
  }

  // oneOf enum (country picker etc.)
  if (Array.isArray(field.oneOf) && field.oneOf.every((o: any) => typeof o.const === "string")) {
    return (
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">{label}</label>
        <OneOfSelect
          value={value || ""}
          onChange={(v) => onChange(path, v)}
          options={field.oneOf}
          placeholder={`Select ${label.toLowerCase()}`}
        />
      </div>
    );
  }

  // simple enum
  if (Array.isArray(field.enum)) {
    return (
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">{label}</label>
        <select
          value={value || ""}
          onChange={(e) => onChange(path, e.target.value)}
          className="w-full h-12 rounded-xl border border-input bg-background px-3 text-sm"
        >
          <option value="">Select...</option>
          {field.enum.map((v: string) => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <Input
        type={field.type === "number" || field.type === "integer" ? "number" : "text"}
        placeholder={field.description || `Enter ${label}`}
        maxLength={field.maxLength}
        value={value ?? ""}
        onChange={(e) => onChange(path, e.target.value)}
        className="h-12 rounded-xl text-sm"
      />
    </div>
  );
};

type Step = "countries" | "channels" | "form" | "amount" | "review" | "processing" | "success" | "kyc-required";

interface WithdrawBankProps {
  walletBalance: number;
  userName?: string;
  onClose: () => void;
  onSendCrypto?: (to: string, amount: string, txType?: string) => Promise<any>;
}

const NUMPAD_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "del"] as const;

const WithdrawBank = ({ walletBalance, userName, onClose, onSendCrypto }: WithdrawBankProps) => {
  const [step, setStep] = useState<Step>("countries");
  const [loading, setLoading] = useState(false);

  // Noah data
  const [countries, setCountries] = useState<Record<string, NoahCountryInfo>>({});
  const [countrySearch, setCountrySearch] = useState("");
  const [selectedCountryCode, setSelectedCountryCode] = useState("");
  const [channels, setChannels] = useState<NoahPayoutChannel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<NoahPayoutChannel | null>(null);
  const [formSchema, setFormSchema] = useState<any>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);

  // Amount & Quote
  const [amount, setAmount] = useState("");
  const [quote, setQuote] = useState<NoahQuoteResult["data"] | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [kycUrl, setKycUrl] = useState("");

  const numericAmount = parseFloat(amount) || 0;

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

  const handleCountrySelect = async (countryCode: string) => {
    setSelectedCountryCode(countryCode);
    setLoading(true);
    try {
      const fiatCurrency = countries[countryCode]?.currency;
      const res = await noahApi.getPayoutChannels(countryCode, { fiatCurrency });
      const items = res.data?.items || [];
      // Filter for bank-type channels
      const bankChannels = items.filter((ch: any) =>
        (ch.paymentMethodCategory || "").toLowerCase() === "bank" ||
        (ch.paymentMethodType || "").toLowerCase().startsWith("bank") ||
        ch.type?.toLowerCase().includes("bank") ||
        ch.name?.toLowerCase().includes("bank")
      );
      setChannels(bankChannels.length > 0 ? bankChannels : items);
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

  const handleKycRequired = async () => {
    try {
      const res = await noahApi.initiateKyc(window.location.origin);
      setKycUrl(res.data?.hostedUrl || "");
      setStep("kyc-required");
    } catch (err: any) {
      toast.error("Failed to start KYC: " + (err.message || "Unknown error"));
    }
  };

  const handleFormNext = () => {
    // Recursively validate required fields (supports nested objects)
    const checkRequired = (schema: any, data: any, prefix = ""): string | null => {
      if (!schema) return null;
      if (Array.isArray(schema.required)) {
        for (const f of schema.required) {
          const v = data?.[f];
          const label = schema.properties?.[f]?.title || f;
          if (v == null || (typeof v === "string" && !v.trim()) ||
              (typeof v === "object" && !Array.isArray(v) && Object.keys(v).length === 0)) {
            return prefix ? `${prefix} · ${label}` : label;
          }
        }
      }
      if (schema.properties) {
        for (const [k, sub] of Object.entries<any>(schema.properties)) {
          if (sub?.type === "object" && sub.properties) {
            const err = checkRequired(sub, data?.[k], sub.title || k);
            if (err) return err;
          }
        }
      }
      return null;
    };
    const missing = checkRequired(formSchema, formData);
    if (missing) { toast.error(`Please fill in ${missing}`); return; }
    setStep("amount");
  };

  const handleContinue = async () => {
    if (numericAmount <= 0) { toast.error("Enter an amount"); return; }
    if (numericAmount > walletBalance) { toast.error("Insufficient balance"); return; }

    const channelId = selectedChannel?.id || selectedChannel?.channelId;
    if (!channelId) { toast.error("No channel selected"); return; }

    setQuoteLoading(true);
    try {
      const pm = paymentMethods.find((p) =>
        p.country === selectedCountryCode && p.capabilities?.payoutTo
      );
      const quoteRes = await noahApi.quotePayout({
        channelId,
        fiatAmount: amount,
        fiatCurrency: countries[selectedCountryCode]?.currency || "USD",
        cryptoCurrency: "USDC",
        form: formData,
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
        await onSendCrypto(destAddr, cryptoAmount, "withdraw");
      }

      setStep("success");
      toast.success("Bank withdrawal initiated!");
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

  const countryEntries = sortedCountryEntries(countries).filter(([code, info]) => {
    const q = countrySearch.trim().toLowerCase();
    if (!q) return true;
    return (
      code.toLowerCase().includes(q) ||
      info.name.toLowerCase().includes(q) ||
      info.currency.toLowerCase().includes(q)
    );
  });

  // ── KYC Required ──
  if (step === "kyc-required") {
    return (
      <div className="flex flex-col min-h-[50dvh] items-center justify-center text-center px-4">
        <div className="h-16 w-16 rounded-full bg-warning/15 flex items-center justify-center mb-6">
          <CheckCircle2 className="h-8 w-8 text-warning" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">Verification Required</h2>
        <p className="text-sm text-muted-foreground mb-6 max-w-xs">
          To withdraw to your bank, you need to complete identity verification first.
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
          <h2 className="flex-1 text-center text-lg font-bold text-foreground pr-9">Select Country</h2>
        </div>
        {Object.keys(countries).length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">No countries available</p>
            <Button onClick={handleKycRequired} variant="outline" className="mt-4 rounded-2xl">Start Verification</Button>
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

  // ── Channels ──
  if (step === "channels") {
    if (loading) {
      return (
        <div className="flex flex-col min-h-[50dvh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-sm text-muted-foreground">Loading banks...</p>
        </div>
      );
    }

    const channelMeta = (type: string = "") => {
      const t = type.toLowerCase();
      if (t.includes("ach")) return { label: "ACH Transfer", sub: "US domestic bank transfer", Icon: Landmark };
      if (t.includes("fedwire") || t.includes("wire")) return { label: "Fedwire", sub: "Same-day US wire transfer", Icon: Zap };
      if (t.includes("swift")) return { label: "SWIFT", sub: "International bank transfer", Icon: Globe };
      if (t.includes("sepa")) return { label: "SEPA", sub: "Euro bank transfer", Icon: Landmark };
      return { label: type || "Bank Transfer", sub: "", Icon: Building2 };
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

    return (
      <div className="flex flex-col min-h-[50dvh] px-1">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => setStep("countries")} className="h-9 w-9 rounded-full flex items-center justify-center hover:bg-secondary/50 transition-colors">
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <h2 className="flex-1 text-center text-lg font-bold text-foreground pr-9">Choose Payout Method</h2>
        </div>

        <div className="flex items-center gap-2 mb-4 px-1">
          <span className="text-lg">{countries[selectedCountryCode]?.flag}</span>
          <span className="text-sm font-medium text-foreground">{countries[selectedCountryCode]?.name}</span>
          <span className="text-xs text-muted-foreground">· {countries[selectedCountryCode]?.currency}</span>
        </div>

        {channels.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">No bank channels available for this country</p>
          </div>
        ) : (
          <div className="space-y-2.5 overflow-y-auto max-h-[60dvh]">
            {channels.map((channel: any, i) => {
              const meta = channelMeta(channel.paymentMethodType || channel.type || channel.name);
              const dur = formatDuration(channel.processingSeconds);
              const min = channel.limits?.minLimit;
              const cur = channel.fiatCurrency || countries[selectedCountryCode]?.currency || "";
              return (
                <button
                  key={channel.id || channel.channelId || i}
                  onClick={() => handleChannelSelect(channel)}
                  className="w-full rounded-2xl bg-card border border-border/60 px-4 py-3.5 active:scale-[0.98] transition-all hover:bg-secondary/30 text-left"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                      <meta.Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">{meta.label}</p>
                      {meta.sub && <p className="text-[11px] text-muted-foreground">{meta.sub}</p>}
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

  // ── Dynamic Form ──
  if (step === "form") {
    const formFields = formSchema?.properties ? Object.entries(formSchema.properties) : [];
    return (
      <div className="flex flex-col min-h-[70dvh] px-1">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setStep("channels")} className="h-9 w-9 rounded-full flex items-center justify-center hover:bg-secondary/50 transition-colors">
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <h2 className="flex-1 text-center text-lg font-bold text-foreground pr-9">Bank Details</h2>
        </div>
        <div className="space-y-4 flex-1 overflow-y-auto max-h-[60dvh] pr-1">
          {formFields.length > 0 ? formFields.map(([key, field]: [string, any]) => (
            <SchemaField
              key={key}
              name={key}
              path={key}
              field={field}
              value={formData[key]}
              onChange={(path, v) => setFormData((prev) => setPath(prev, path, v))}
            />
          )) : (
            <>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Account Number</label>
                <Input type="text" inputMode="numeric" placeholder="Enter account number"
                  value={formData.accountNumber || ""}
                  onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                  className="h-12 rounded-xl text-sm" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Account Holder Name</label>
                <Input type="text" placeholder="As it appears on your bank account"
                  value={formData.accountHolderName || ""}
                  onChange={(e) => setFormData({ ...formData, accountHolderName: e.target.value })}
                  className="h-12 rounded-xl text-sm" />
              </div>
            </>
          )}
          <div className="rounded-2xl bg-secondary/50 border border-border/40 p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-foreground">Secure withdrawal</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Your details are encrypted. Powered by Noah offramp.
                </p>
              </div>
            </div>
          </div>
        </div>
        <Button onClick={handleFormNext} className="w-full h-12 rounded-2xl font-semibold text-sm mb-2 mt-6">Continue</Button>
      </div>
    );
  }

  // ── Success ──
  if (step === "success") {
    return (
      <div className="flex flex-col min-h-[70dvh] px-1 items-center justify-center text-center">
        <div className="text-6xl mb-4">✅</div>
        <h2 className="text-xl font-bold text-foreground mb-2">Withdrawal Initiated</h2>
        <p className="text-sm text-muted-foreground max-w-xs mb-2">
          Your bank withdrawal of <span className="font-semibold text-foreground">{amount} {countries[selectedCountryCode]?.currency || "USD"}</span> has been submitted.
        </p>
        {quote && (
          <p className="text-sm text-muted-foreground mb-6">
            Crypto sent: {quote.cryptoAmountEstimate} USDC · Fee: {quote.totalFee}
          </p>
        )}
        <p className="text-xs text-muted-foreground mb-8">Bank transfers typically take 2–3 business days</p>
        <Button onClick={onClose} className="w-full max-w-xs h-12 rounded-2xl font-semibold text-sm">Done</Button>
      </div>
    );
  }

  // ── Processing ──
  if (step === "processing") {
    return (
      <div className="flex flex-col min-h-[70dvh] px-1 items-center justify-center text-center">
        <div className="h-16 w-16 rounded-full bg-primary/15 flex items-center justify-center mb-6 animate-pulse">
          <Clock className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">Processing withdrawal</h2>
        <p className="text-sm text-muted-foreground max-w-xs mb-8">
          Sending to {selectedChannel?.name || "bank"} in {countries[selectedCountryCode]?.name || selectedCountryCode}
        </p>
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">{selectedChannel?.name || "Bank Transfer"}</p>
              <p className="text-xs text-muted-foreground">{formData.accountNumber || formData.accountHolderName || selectedCountryCode}</p>
            </div>
          </div>
        </div>
        <Button onClick={handleConfirm} className="w-full h-12 rounded-2xl font-semibold text-sm mb-2 mt-6">Confirm Withdrawal</Button>
        <button onClick={() => setStep("amount")} className="w-full text-center text-sm font-medium text-muted-foreground hover:text-foreground pb-2">Go back</button>
      </div>
    );
  }

  // ── Amount Input ──
  return (
    <div className="flex flex-col min-h-[75dvh] px-1">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => setStep("form")} className="h-9 w-9 rounded-full flex items-center justify-center hover:bg-secondary/50 transition-colors">
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <h2 className="flex-1 text-center text-lg font-bold text-foreground pr-9">Withdraw to Bank</h2>
      </div>
      <div className="flex justify-center mb-4">
        <div className="rounded-full bg-secondary/80 border border-border/60 px-5 py-2">
          <span className="text-sm font-medium text-foreground">{countries[selectedCountryCode]?.currency || "USD"}</span>
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
        <div className="flex items-center gap-3 rounded-2xl bg-card border border-border/60 px-4 py-3">
          <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">{selectedChannel?.name || "Bank"}</p>
            <p className="text-xs text-muted-foreground">{formData.accountHolderName || ""} · {formData.accountNumber || ""}</p>
          </div>
          <button onClick={() => setStep("form")} className="text-xs font-medium text-primary hover:underline">Edit</button>
        </div>
      </div>
      <Button onClick={handleContinue} disabled={quoteLoading} className="w-full h-12 rounded-2xl font-semibold text-sm mb-2">
        {quoteLoading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Getting Quote...</> : "Continue"}
      </Button>
    </div>
  );
};

export default WithdrawBank;
