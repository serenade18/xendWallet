import { Loader2, CheckCircle, DollarSign, AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WalletSetupProps {
  hasClient: boolean;
  hasWallet: boolean;
  provisioning: boolean;
  provisionError: string | null;
  onRetry: () => Promise<void>;
  onSignOut: () => Promise<void>;
}

/**
 * Shown for the brief moment between signup and a ready-to-use wallet.
 * Setup itself runs automatically in the background (see useWallet's
 * autoProvision) — this screen just reflects progress. No manual taps
 * required, so the person can start sending/receiving right after they
 * verify their account, the way Wave/Sendwave onboarding works.
 */
const WalletSetup = ({
  hasClient,
  hasWallet,
  provisioning,
  provisionError,
  onRetry,
  onSignOut,
}: WalletSetupProps) => {
  const steps = [
    { label: "Initialize account", done: hasClient },
    { label: "Create wallet", done: hasWallet },
  ];

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-80 w-[600px] rounded-full bg-primary/8 blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-md animate-slide-up">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex items-center justify-center rounded-2xl bg-primary/10 p-4">
            <DollarSign className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            {provisionError ? "Almost there" : "Setting up your wallet"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {provisionError
              ? "We hit a snag getting your wallet ready."
              : "This only takes a second — you'll be able to send and receive right after."}
          </p>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm p-6 space-y-4">
          {steps.map((step, i) => (
            <div
              key={i}
              className={`flex items-center gap-4 rounded-xl p-4 transition-all ${
                step.done ? "bg-primary/5 border border-primary/20" : "bg-secondary/50 border border-border/80"
              }`}
            >
              <div className={`rounded-full p-1.5 ${step.done ? "bg-primary/20" : "bg-secondary"}`}>
                {step.done ? (
                  <CheckCircle className="h-5 w-5 text-primary" />
                ) : provisioning ? (
                  <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
                ) : provisionError ? (
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                ) : (
                  <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
                )}
              </div>
              <h3 className="font-semibold text-foreground text-sm">{step.label}</h3>
            </div>
          ))}
        </div>

        {provisionError && (
          <div className="mt-4 space-y-3">
            <p className="text-center text-xs text-destructive">{provisionError}</p>
            <Button onClick={onRetry} disabled={provisioning} className="w-full">
              {provisioning ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="mr-2 h-4 w-4" />
              )}
              Try again
            </Button>
          </div>
        )}

        <div className="mt-4 text-center">
          <button
            onClick={onSignOut}
            className="text-sm text-muted-foreground hover:text-destructive transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
};

export default WalletSetup;
