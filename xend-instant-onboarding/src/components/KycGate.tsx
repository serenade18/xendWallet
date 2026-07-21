import { useState } from "react";
import { ShieldCheck, Loader2, CheckCircle2, Clock, XCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useKycStatus } from "@/hooks/useKycStatus";

interface KycGateProps {
  /** Fiat currencies the user needs (defaults to ["USD"]). */
  fiatCurrencies?: string[];
  /** Label shown on the CTA when starting KYC. */
  ctaLabel?: string;
  /** Copy shown in the intro block. */
  title?: string;
  description?: string;
  /** Rendered when KYC is approved. */
  children: React.ReactNode;
}

/**
 * Wraps any flow that requires a completed Noah KYC.
 * - Fetches status from DB on mount
 * - Prompts the user to complete KYC if not approved
 * - Opens Noah's hosted KYC in a new tab and polls for approval
 * - Renders `children` only once approved
 */
const KycGate = ({
  fiatCurrencies = ["USD"],
  ctaLabel = "Verify my identity",
  title = "Quick verification required",
  description = "To keep your account and money safe, complete a one-time identity check. It usually takes under 2 minutes.",
  children,
}: KycGateProps) => {
  const kyc = useKycStatus(true);
  const [starting, setStarting] = useState(false);
  const [popupOpen, setPopupOpen] = useState(false);

  if (kyc.loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (kyc.isApproved) return <>{children}</>;

  const openHosted = (url: string) => {
    // Try a popup first for a smoother return; fall back to new tab
    const popup = window.open(url, "noah-kyc", "width=520,height=760,noopener");
    if (!popup) {
      window.location.href = url;
      return;
    }
    setPopupOpen(true);
    kyc.startPolling(3500);
    const checkClosed = window.setInterval(() => {
      if (popup.closed) {
        window.clearInterval(checkClosed);
        setPopupOpen(false);
        kyc.refresh();
      }
    }, 800);
  };

  const handleStart = async (forceFresh = false) => {
    setStarting(true);
    try {
      // Always mint a fresh Noah hosted session on retry — stored URLs expire.
      const url = forceFresh || !kyc.hostedUrl
        ? await kyc.start(fiatCurrencies)
        : kyc.hostedUrl;
      if (!url) {
        toast.error("Could not open verification. Please try again.");
        return;
      }
      openHosted(url);
    } catch (e: any) {
      toast.error(e?.message || "Failed to start verification");
    } finally {
      setStarting(false);
    }
  };

  const handleResume = () => handleStart(true);


  const handleManualRefresh = async () => {
    const s = await kyc.refresh();
    if (s === "approved") toast.success("Verification complete!");
    else if (s === "rejected") toast.error("Verification was rejected.");
    else toast.info("Still reviewing. We'll update as soon as it's done.");
  };

  // ── Rejected ──
  if (kyc.status === "rejected") {
    return (
      <div className="px-6 py-10 text-center space-y-4">
        <div className="mx-auto h-14 w-14 rounded-full bg-destructive/15 flex items-center justify-center">
          <XCircle className="h-7 w-7 text-destructive" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">Verification unsuccessful</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Your identity check didn't go through. Please contact support to resolve this.
          </p>
        </div>
        <Button onClick={() => handleStart()} disabled={starting} className="w-full">
          {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Try again"}
        </Button>
      </div>
    );
  }

  // ── Pending (already started, waiting) ──
  if (kyc.status === "pending") {
    return (
      <div className="px-6 py-10 text-center space-y-4">
        <div className="mx-auto h-14 w-14 rounded-full bg-primary/15 flex items-center justify-center">
          {popupOpen ? (
            <Loader2 className="h-7 w-7 text-primary animate-spin" />
          ) : (
            <Clock className="h-7 w-7 text-primary" />
          )}
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            {popupOpen ? "Complete verification in the popup" : "Verification in progress"}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {popupOpen
              ? "We'll unlock the rest of the app automatically once you're done."
              : "We're reviewing your details. This is usually quick."}
          </p>
        </div>
        <div className="space-y-2">
          <Button onClick={handleResume} className="w-full">
            <ExternalLink className="h-4 w-4 mr-2" />
            Resume verification
          </Button>
          <Button variant="ghost" onClick={handleManualRefresh} className="w-full">
            Check status
          </Button>
        </div>
      </div>
    );
  }

  // ── Not started ──
  return (
    <div className="px-6 py-10 text-center space-y-4">
      <div className="mx-auto h-14 w-14 rounded-full bg-primary/15 flex items-center justify-center">
        <ShieldCheck className="h-7 w-7 text-primary" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>
      <ul className="text-left text-sm text-muted-foreground space-y-2 max-w-xs mx-auto">
        <li className="flex items-start gap-2">
          <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          Government-issued ID
        </li>
        <li className="flex items-start gap-2">
          <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          Quick selfie for liveness check
        </li>
        <li className="flex items-start gap-2">
          <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          Basic contact details
        </li>
      </ul>
      <Button onClick={() => handleStart()} disabled={starting} className="w-full">
        {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : ctaLabel}
      </Button>
    </div>
  );
};

export default KycGate;
