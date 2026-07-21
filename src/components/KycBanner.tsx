import { ShieldCheck, Loader2, Clock, ArrowRight } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useKycStatus } from "@/hooks/useKycStatus";

/**
 * Dashboard banner surfacing Noah KYC status and prompting the user
 * to complete verification before making any money movement.
 */
const KycBanner = () => {
  const kyc = useKycStatus(true);
  const [starting, setStarting] = useState(false);

  if (kyc.loading || kyc.isApproved) return null;

  const openHosted = (url: string) => {
    const popup = window.open(url, "noah-kyc", "width=520,height=760,noopener");
    if (!popup) { window.location.href = url; return; }
    kyc.startPolling(3500);
    const t = window.setInterval(() => {
      if (popup.closed) { window.clearInterval(t); kyc.refresh(); }
    }, 800);
  };

  const handleStart = async () => {
    setStarting(true);
    try {
      const s = await kyc.refresh();
      if (s === "approved") { toast.success("Verification complete!"); return; }
      // Always mint a fresh hosted session — stored URLs expire quickly.
      const url = await kyc.start(["USD"]);
      if (!url) { toast.error("Could not open verification"); return; }
      openHosted(url);
    } catch (e: any) {
      toast.error(e?.message || "Failed to start verification");
    } finally {
      setStarting(false);
    }
  };

  const isPending = kyc.status === "pending";
  const isRejected = kyc.status === "rejected";

  return (
    <button
      onClick={handleStart}
      disabled={starting}
      className="w-full flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3 text-left active:scale-[0.99] transition-all animate-slide-up"
    >
      <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
        {starting ? (
          <Loader2 className="h-5 w-5 text-primary animate-spin" />
        ) : isPending ? (
          <Clock className="h-5 w-5 text-primary" />
        ) : (
          <ShieldCheck className="h-5 w-5 text-primary" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">
          {isRejected ? "Verification unsuccessful" : isPending ? "Finish your verification" : "Verify your identity"}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {isRejected
            ? "Tap to retry so you can top up and withdraw"
            : isPending
            ? "Tap to resume — we'll unlock things automatically"
            : "One quick check unlocks top-ups and withdrawals"}
        </p>
      </div>
      <ArrowRight className="h-4 w-4 text-primary shrink-0" />
    </button>
  );
};

export default KycBanner;
