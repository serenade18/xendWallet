import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldCheck } from "lucide-react";

interface OtpVerificationProps {
  email: string;
  onVerified: () => void;
  onResend: () => Promise<void>;
  onBack: () => void;
  verifyOtp: (code: string) => Promise<boolean>;
}

const OtpVerification = ({ email, onVerified, onResend, onBack, verifyOtp }: OtpVerificationProps) => {
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);
    setError("");

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const newCode = [...code];
    for (let i = 0; i < pasted.length; i++) {
      newCode[i] = pasted[i];
    }
    setCode(newCode);
    if (pasted.length > 0) {
      inputRefs.current[Math.min(pasted.length, 5)]?.focus();
    }
  };

  const handleVerify = async () => {
    const fullCode = code.join("");
    if (fullCode.length !== 6) {
      setError("Please enter the full 6-digit code");
      return;
    }
    setVerifying(true);
    setError("");
    try {
      const ok = await verifyOtp(fullCode);
      if (ok) {
        onVerified();
      } else {
        setError("Invalid or expired code. Please try again.");
      }
    } catch {
      setError("Verification failed. Please try again.");
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await onResend();
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="text-center">
      <div className="mb-5 inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary/10">
        <ShieldCheck className="h-7 w-7 text-primary" />
      </div>
      <h2 className="text-lg font-semibold text-foreground mb-1">Verify your email</h2>
      <p className="text-sm text-muted-foreground mb-6">
        We sent a 6-digit code to <span className="font-medium text-foreground">{email}</span>
      </p>

      <div className="flex justify-center gap-2 mb-4" onPaste={handlePaste}>
        {code.map((digit, i) => (
          <input
            key={i}
            ref={(el) => { inputRefs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            className="h-12 w-10 rounded-lg border border-border/80 bg-background/60 text-center text-lg font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all"
          />
        ))}
      </div>

      {error && <p className="text-sm text-destructive mb-3">{error}</p>}

      <Button onClick={handleVerify} disabled={verifying} className="w-full font-semibold h-11 mb-3">
        {verifying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Verify
      </Button>

      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-sm text-muted-foreground hover:text-primary transition-colors">
          ← Back
        </button>
        <button
          onClick={handleResend}
          disabled={resending}
          className="text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          {resending ? "Sending..." : "Resend code"}
        </button>
      </div>
    </div>
  );
};

export default OtpVerification;
