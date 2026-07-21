import { ShieldCheck, Loader2, Clock, ArrowRight } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useKycStatus } from "@/hooks/useKycStatus";
import NoahKycFrame from "@/components/NoahKycFrame";

/**
 * Dashboard banner surfacing Noah KYC status and prompting the user
 * to complete verification before making any money movement. Verification
 * happens inline, in an embedded frame, rather than a popup or redirect.
 */
const KycBanner = () => {
  const kyc = useKycStatus(true);
  const [starting, setStarting] = useState(false);
  const [frameOpen, setFrameOpen] = useState(false);

  if (kyc.loading || kyc.isApproved) return null;

  const handleFrameCompleted = async () => {
    const s = await kyc.refresh();
    if (s === "approved") toast.success("Verification complete!");
    else if (s === "rejected") toast.error("Verification was rejected.");
  };

  const handleStart = async () => {
    setStarting(true);
    try {
      const s = await kyc.refresh();
      if (s === "approved") { toast.success("Verification complete!"); return; }
      // Always mint a fresh hosted session — stored URLs expire quickly.
      const url = await kyc.start(["USD"]);
      if (!url) { toast.error("Could not open verification"); return; }
      setFrameOpen(true);
      kyc.startPolling(3500);
    } catch (e: any) {
      toast.error(e?.message || "Failed to start verification");
    } finally {
      setStarting(false);
    }
  };

  const isPending = kyc.status === "pending";
  const isRejected = kyc.status === "rejected";

  return (
    <>
      <NoahKycFrame
        open={frameOpen}
        hostedUrl={kyc.hostedUrl}
        onOpenChange={setFrameOpen}
        onCompleted={handleFrameCompleted}
      />
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
    </>
  );
};

export default KycBanner;
