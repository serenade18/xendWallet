import { useState } from "react";
import { ChevronRight, Loader2, Mail, Users, UserPlus, X, Copy, Share2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Contact } from "@/hooks/useContacts";
import { copyToClipboard } from "@/lib/clipboard";
import UserSearchCombobox from "@/components/UserSearchCombobox";

interface SendFormProps {
  onSend: (to: string, amount: string, txType?: string, tokenAddress?: string) => Promise<any>;
  loading: boolean;
  chainName?: string;
  chainKey?: string;
  nativeSymbol?: string;
  chainType?: string;
  tokens?: { symbol: string; label: string; address: string }[];
  contacts?: Contact[];
  onAddContact?: (name: string, email: string) => Promise<void>;
  onClose?: () => void;
  balance?: number;
}

type Step = "input" | "review" | "success";

const SendForm = ({
  onSend,
  loading,
  chainName = "Ethereum",
  chainKey = "ethereum-sepolia",
  nativeSymbol = "ETH",
  chainType = "evm",
  tokens = [],
  contacts = [],
  onAddContact,
  onClose,
  balance = 0,
}: SendFormProps) => {
  const [step, setStep] = useState<Step>("input");
  const [email, setEmail] = useState("");
  const [amount, setAmount] = useState("");
  const [resolvedWallet, setResolvedWallet] = useState("");
  const [resolving, setResolving] = useState(false);
  const [sending, setSending] = useState(false);
  const [showContacts, setShowContacts] = useState(false);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [showSavePrompt, setShowSavePrompt] = useState(false);

  const USDoken = tokens.find((t) => t.symbol === "USD");
  const serviceFee = 0.00;
  const parsedAmount = parseFloat(amount || "0");
  const total = parsedAmount + serviceFee;

  const filteredContacts = email.trim()
    ? contacts.filter(
        (c) =>
          c.name.toLowerCase().includes(email.toLowerCase()) ||
          c.email.toLowerCase().includes(email.toLowerCase())
      )
    : contacts;

  const selectContact = (contact: Contact) => {
    setEmail(contact.email);
    setShowContacts(false);
  };

  const truncateAddress = (addr: string) =>
    addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "";

  const isPhone = (val: string) => /^\+?[0-9\s\-()]{7,}$/.test(val.trim());
  const isEmail = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());

  // Step 1 → Step 2: Validate & resolve email or phone
  const handleContinue = async () => {
    if (!email || !amount) {
      toast.error("Please fill in all fields");
      return;
    }

    const input = email.trim();
    const inputIsPhone = isPhone(input);
    const inputIsEmail = isEmail(input);

    if (!inputIsPhone && !inputIsEmail) {
      toast.error("Enter a valid email or phone number");
      return;
    }

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }

    setResolving(true);
    try {
      let data: string | null = null;
      let error: any = null;

      if (inputIsPhone) {
        const res = await supabase.rpc("get_wallet_by_phone", { lookup_phone: input });
        data = res.data;
        error = res.error;
      } else {
        const res = await supabase.rpc("get_wallet_by_email", { lookup_email: input });
        data = res.data;
        error = res.error;
      }

      if (error) {
        toast.error("Failed to look up recipient");
        return;
      }
      if (!data) {
        toast.error(inputIsPhone
          ? "No wallet found for this phone number. They need to sign up first."
          : "No wallet found for this email. They need to sign up first.");
        return;
      }

      setResolvedWallet(data);
      setStep("review");
    } catch (err: any) {
      toast.error(err.message || "Lookup failed");
    } finally {
      setResolving(false);
    }
  };

  // Step 2 → Step 3: Send
  const handleSend = async () => {
    setSending(true);
    try {
      const tokenAddr = USDoken?.address === "NATIVE" ? undefined : USDoken?.address;
      await onSend(resolvedWallet, amount, "send", tokenAddr);

      // Check save contact
      const isExisting = contacts.some(
        (c) => c.email.toLowerCase() === email.trim().toLowerCase()
      );
      if (!isExisting && onAddContact) {
        setShowSavePrompt(true);
      }

      setStep("success");
    } catch (err: any) {
      toast.error(err.message || "Transfer failed");
    } finally {
      setSending(false);
    }
  };

  const handleSaveContact = async () => {
    if (!onAddContact) return;
    const name = email.trim().split("@")[0];
    try {
      await onAddContact(name, email.trim());
      toast.success("Contact saved!");
    } catch {
      toast.error("Failed to save contact");
    }
    setShowSavePrompt(false);
  };

  const handleBackToHome = () => {
    setStep("input");
    setEmail("");
    setAmount("");
    setResolvedWallet("");
    setShowSavePrompt(false);
    onClose?.();
  };

  const isLoading = loading || resolving || sending;

  // ── STEP 3: Success ──
  if (step === "success") {
    const receiptText = `Sent ${parsedAmount.toFixed(2)} USD to ${email.trim()} (${truncateAddress(resolvedWallet)})\nFee: ${serviceFee.toFixed(2)} USD | Total: ${total.toFixed(2)} USD`;

    const copyReceipt = async () => {
      const ok = await copyToClipboard(receiptText);
      if (ok) toast.success("Receipt copied!");
      else toast.error("Copy failed");
    };

    const shareReceipt = async () => {
      if (navigator.share) {
        try {
          await navigator.share({ title: "Xend Transfer Receipt", text: receiptText });
        } catch {
          copyReceipt();
        }
      } else {
        copyReceipt();
      }
    };

    return (
      <div className="flex flex-col items-center py-8">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-3xl font-bold text-foreground mb-1">
          {parsedAmount.toFixed(2)} USD
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          On the way to {truncateAddress(resolvedWallet)}
        </p>

        {/* Receipt card */}
        <div className="w-full rounded-2xl bg-card border border-border/60 overflow-hidden mb-4">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
            <span className="text-sm text-muted-foreground">To</span>
            <span className="text-sm font-semibold text-foreground">{email.trim()}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
            <span className="text-sm text-muted-foreground">Amount</span>
            <span className="text-sm font-semibold text-foreground">{parsedAmount.toFixed(2)} USD</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
            <span className="text-sm text-muted-foreground">Fee</span>
            <span className="text-sm font-semibold text-foreground">{serviceFee.toFixed(2)} USD</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm font-semibold text-foreground">Total charged</span>
            <span className="text-sm font-bold text-foreground">{total.toFixed(2)} USD</span>
          </div>
        </div>

        {/* Receipt actions */}
        <div className="w-full grid grid-cols-2 gap-3 mb-4">
          <Button
            variant="outline"
            onClick={copyReceipt}
            className="rounded-2xl h-10 text-xs font-semibold border-border/60"
          >
            <Copy className="h-3.5 w-3.5 mr-1.5" />
            Copy Receipt
          </Button>
          <Button
            variant="outline"
            onClick={shareReceipt}
            className="rounded-2xl h-10 text-xs font-semibold border-border/60"
          >
            <Share2 className="h-3.5 w-3.5 mr-1.5" />
            Share Receipt
          </Button>
        </div>

        {/* Save contact prompt */}
        {showSavePrompt && (
          <div className="w-full mb-4 flex items-center justify-between rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3">
            <div className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-primary" />
              <span className="text-xs text-foreground">
                Save <strong>{email.trim()}</strong>?
              </span>
            </div>
            <div className="flex gap-1.5">
              <Button size="sm" variant="ghost" onClick={() => setShowSavePrompt(false)} className="h-7 text-xs px-2">
                Skip
              </Button>
              <Button size="sm" onClick={handleSaveContact} className="h-7 text-xs px-3">
                Save
              </Button>
            </div>
          </div>
        )}

        <Button
          onClick={handleBackToHome}
          className="w-full rounded-2xl h-12 text-sm font-semibold"
        >
          Back to home
        </Button>
      </div>
    );
  }

  // ── STEP 2: Review ──
  if (step === "review") {
    return (
      <div className="flex flex-col">
        <h2 className="text-lg font-bold text-foreground text-center mb-6">Review Transfer</h2>

        <div className="w-full rounded-2xl bg-card border border-border/60 overflow-hidden mb-6">
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-border/40">
            <span className="text-sm text-muted-foreground">Token</span>
            <span className="text-sm font-semibold text-foreground">USD</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-border/40">
            <span className="text-sm text-muted-foreground">Recipient</span>
            <span className="text-sm font-semibold text-foreground">{email.trim()}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3.5">
            <span className="text-sm text-muted-foreground">Wallet address</span>
            <span className="text-xs font-mono text-muted-foreground">
              {resolvedWallet.slice(0, 20)}
              <br />
              {resolvedWallet.slice(20)}
            </span>
          </div>
        </div>

        <div className="w-full rounded-2xl bg-card border border-border/60 overflow-hidden mb-6">
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-border/40">
            <span className="text-sm text-muted-foreground">Transfer amount</span>
            <span className="text-sm font-semibold text-foreground">{parsedAmount.toFixed(2)} USD</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-border/40">
            <span className="text-sm text-muted-foreground">Service fee</span>
            <span className="text-sm font-semibold text-foreground">{serviceFee.toFixed(2)} USD</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3.5">
            <span className="text-sm font-semibold text-foreground">Total</span>
            <span className="text-sm font-bold text-foreground">{total.toFixed(2)} USD</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            onClick={() => setStep("input")}
            className="rounded-2xl h-12 text-sm font-semibold"
          >
            Back
          </Button>
          <Button
            onClick={handleSend}
            disabled={isLoading}
            className="rounded-2xl h-12 text-sm font-semibold"
          >
            {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Send
          </Button>
        </div>
      </div>
    );
  }

  // ── STEP 1: Input ──
  return (
    <div className="flex flex-col">
      {/* Token row */}
      <div className="mb-4">
        <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1.5 font-medium">Token</p>
        <div className="flex items-center justify-between rounded-2xl bg-card border border-border/60 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center">
              <span className="text-[10px] font-bold text-primary-foreground">$</span>
            </div>
            <span className="text-sm font-semibold text-foreground">USD</span>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      {/* Address / Email */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Recipient</p>
          {contacts.length > 0 && (
            <button
              type="button"
              onClick={() => setShowContacts(!showContacts)}
              className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors"
            >
              <Users className="h-3 w-3" />
              Contacts
            </button>
          )}
        </div>

        <div className="relative">
          <Input
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              const val = e.target.value;
              if (contacts.length > 0 && val.length > 0) setShowContacts(true);
              else setShowContacts(false);
              // Show user search when typing and no contact match
              setShowUserSearch(val.length >= 2);
            }}
            onFocus={() => {
              if (contacts.length > 0 && email.length === 0) setShowContacts(true);
              if (email.length >= 2) setShowUserSearch(true);
            }}
            onBlur={() => {
              // Delay to allow click on results
              setTimeout(() => { setShowUserSearch(false); setShowContacts(false); }, 200);
            }}
            placeholder="Email or phone number"
            type="text"
            className="bg-card border-border/60 text-sm h-12 rounded-2xl pr-10"
          />
          {email && (
            <button
              onClick={() => { setEmail(""); setShowContacts(false); setShowUserSearch(false); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-destructive/20 flex items-center justify-center"
            >
              <X className="h-3 w-3 text-destructive" />
            </button>
          )}
        </div>

        {/* Contact picker */}
        {showContacts && contacts.length > 0 && filteredContacts.length > 0 && (
          <div className="mt-2 rounded-2xl border border-border/60 bg-card p-2 max-h-36 overflow-y-auto space-y-0.5">
            {filteredContacts.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => selectContact(c)}
                className="w-full flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-left hover:bg-muted/50 active:bg-muted transition-colors"
              >
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-xs font-semibold text-primary uppercase">
                    {c.name.charAt(0)}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{c.email}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Registered user search */}
        <UserSearchCombobox
          query={email}
          visible={showUserSearch && (!showContacts || filteredContacts.length === 0)}
          onSelect={(identifier) => {
            setEmail(identifier);
            setShowUserSearch(false);
            setShowContacts(false);
          }}
        />
      </div>

      {/* Amount */}
      <div className="mb-2">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Amount</p>
          {balance > 0 && (
            <p className="text-[11px] text-muted-foreground">
              Balance: {balance.toFixed(2)} USD
            </p>
          )}
        </div>
        <Input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00 USD"
          type="text"
          inputMode="decimal"
          className="bg-card border-border/60 text-sm h-12 rounded-2xl"
        />
        <p className="text-[11px] text-muted-foreground/60 mt-1.5">
          Fee will be calculated later
        </p>
      </div>

      <Button
        onClick={handleContinue}
        disabled={isLoading || !email || !amount}
        className="w-full rounded-2xl h-12 text-sm font-semibold mt-4"
      >
        {resolving ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Finding recipient...
          </>
        ) : (
          "Continue"
        )}
      </Button>
    </div>
  );
};

export default SendForm;
