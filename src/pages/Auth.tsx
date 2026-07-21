import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, Loader2 } from "lucide-react";
import XendLogo from "@/components/XendLogo";
import ThemeToggle from "@/components/ThemeToggle";
import OtpVerification from "@/components/OtpVerification";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import CountryCodePicker from "@/components/CountryCodePicker";

const Auth = () => {
  const { user, loading } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [dialCode, setDialCode] = useState("+254");
  const [submitting, setSubmitting] = useState(false);
  const [otpStep, setOtpStep] = useState(false);
  const [pendingAction, setPendingAction] = useState<"signin" | "signup" | null>(null);
  const { signIn, signUp } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If user is authenticated (and not in signup OTP flow), go to dashboard
  if (user && !otpStep) {
    return <Navigate to="/dashboard" replace />;
  }

  const sendOtp = async () => {
    const { error } = await supabase.functions.invoke("send-otp", {
      body: { email: email.toLowerCase() },
    });
    if (error) {
      toast.error("Failed to send verification code");
      return;
    }
    toast.success("Verification code sent to your email");
  };

  const verifyOtp = async (code: string): Promise<boolean> => {
    const { data, error } = await supabase.functions.invoke("verify-otp", {
      body: { email: email.toLowerCase(), code },
    });
    if (error || !data?.verified) return false;
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password || (isSignUp && (!name || !phone))) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setSubmitting(true);

    try {
      if (isSignUp) {
        const fullPhone = `${dialCode}${phone.replace(/^0+/, "")}`;

        // Enter OTP flow BEFORE signup to prevent redirect race condition
        setPendingAction("signup");
        setOtpStep(true);

        const { error } = await signUp(email, password, {
          name,
          phone: fullPhone,
        });

        if (error) {
          setOtpStep(false);
          setPendingAction(null);

          if (error.message.includes("already registered")) {
            toast.error("This email is already registered. Try signing in.");
          } else {
            toast.error(error.message);
          }
          return;
        }

        // Send OTP after successful signup
        await sendOtp();
      } else {
        const { error } = await signIn(email, password);

        if (error) {
          toast.error(error.message);
          return;
        }
        // Redirect handled by auth state change
      }

    } finally {
      setSubmitting(false);
    }
  };


  const handleOtpVerified = () => {
    // Signup OTP verified — navigate to dashboard
    window.location.href = "/dashboard";
  };

  const handleOtpBack = async () => {
    setOtpStep(false);
    setPendingAction(null);
    // Sign out since we haven't completed 2FA
    await supabase.auth.signOut();
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="fixed top-4 right-4 z-20">
        <ThemeToggle />
      </div>
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-80 w-[600px] rounded-full bg-primary/8 blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-sm animate-slide-up">
        {/* Logo & Brand */}
        <div className="mb-10 text-center">
          <div className="mb-5 inline-flex items-center justify-center">
            <XendLogo className="h-16 w-16 rounded-2xl" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Xend<span className="text-primary">App</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Send & receive USD instantly
          </p>
        </div>

        {/* Form Card */}
        <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm p-7">
          {otpStep ? (
            <OtpVerification
              email={email}
              onVerified={handleOtpVerified}
              onResend={sendOtp}
              onBack={handleOtpBack}
              verifyOtp={verifyOtp}
            />
          ) : (
            <>
              <h2 className="mb-5 text-lg font-semibold text-foreground">
                {isSignUp ? "Create Account" : "Welcome Back"}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                {isSignUp && (
                  <>
                    <div>
                      <Label htmlFor="name" className="text-muted-foreground text-xs font-medium">
                        Full Name
                      </Label>
                      <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your name"
                        className="mt-1 bg-background/60 border-border/80"
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone" className="text-muted-foreground text-xs font-medium">
                        Phone Number
                      </Label>
                      <div className="mt-1 flex items-stretch h-11 rounded-2xl border border-border/80 bg-background/60 overflow-hidden">
                        <CountryCodePicker value={dialCode} onChange={setDialCode} />
                        <input
                          id="phone"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ""))}
                          placeholder="712345678"
                          className="flex-1 px-3 text-sm bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
                          inputMode="tel"
                        />
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <Label htmlFor="email" className="text-muted-foreground text-xs font-medium">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@email.com"
                    className="mt-1 bg-background/60 border-border/80"
                  />
                </div>
                <div>
                  <Label htmlFor="password" className="text-muted-foreground text-xs font-medium">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="mt-1 bg-background/60 border-border/80"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full font-semibold h-11"
                >
                  {submitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowRight className="mr-2 h-4 w-4" />
                  )}
                  {isSignUp ? "Create Account" : "Sign In"}
                </Button>
              </form>

              <div className="mt-5 text-center">
                <button
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  {isSignUp ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
                </button>
              </div>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground/60">
          Secured by MPC · Base Sepolia
        </p>
      </div>
    </div>
  );
};

export default Auth;
