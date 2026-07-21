import { useEffect, useRef, useState } from "react";
import { Loader2, ShieldAlert } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { getValidatedHostedKycUrl, isAllowedHostedKycOrigin } from "@/lib/noah-hosted-url";

interface NoahKycFrameProps {
  open: boolean;
  /** Raw hostedUrl from Noah — validated internally before ever being rendered. */
  hostedUrl: string | null;
  onOpenChange: (open: boolean) => void;
  /** Fired once Noah emits `{ type: 'kycCompleted' }` via postMessage. */
  onCompleted: () => void;
}

/**
 * Embeds Noah's hosted KYC checkout inline, inside the app, instead of a
 * popup window or a redirect. Noah's checkout is designed to run embedded —
 * it emits `window.postMessage({ type: 'kycCompleted' })` once a valid KYC
 * review status is reached, which we listen for here to close the frame
 * automatically. See: https://docs.noah.com/recipes/onboarding/hosted-onboarding
 */
const NoahKycFrame = ({ open, hostedUrl, onOpenChange, onCompleted }: NoahKycFrameProps) => {
  const [iframeLoading, setIframeLoading] = useState(true);
  const completedRef = useRef(false);

  const safeUrl = getValidatedHostedKycUrl(hostedUrl);

  useEffect(() => {
    if (!open) return;
    setIframeLoading(true);
    completedRef.current = false;
  }, [open, safeUrl]);

  useEffect(() => {
    if (!open) return;

    const handleMessage = (event: MessageEvent) => {
      // Only trust postMessages from Noah's own checkout origin.
      if (!isAllowedHostedKycOrigin(event.origin)) return;
      if ((event.data as { type?: string } | undefined)?.type === "kycCompleted") {
        if (completedRef.current) return;
        completedRef.current = true;
        onCompleted();
        onOpenChange(false);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [open, onCompleted, onOpenChange]);

  // Safety net: if the frame is closed manually without a kycCompleted
  // message (e.g. the user finished but the message was missed), let the
  // caller re-check status against our backend.
  const handleOpenChange = (next: boolean) => {
    if (!next && open && !completedRef.current) {
      onCompleted();
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="p-0 gap-0 max-w-md w-[calc(100%-2rem)] h-[min(760px,85dvh)] overflow-hidden rounded-2xl">
        <DialogTitle className="sr-only">Identity verification</DialogTitle>
        {!safeUrl ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
            <ShieldAlert className="h-8 w-8 text-destructive" />
            <p className="text-sm text-muted-foreground">
              Couldn't open verification securely. Please try again.
            </p>
          </div>
        ) : (
          <div className="relative h-full w-full">
            {iframeLoading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-background">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}
            <iframe
              key={safeUrl}
              src={safeUrl}
              title="Identity verification"
              className="h-full w-full border-0"
              allow="camera; microphone"
              onLoad={() => setIframeLoading(false)}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default NoahKycFrame;