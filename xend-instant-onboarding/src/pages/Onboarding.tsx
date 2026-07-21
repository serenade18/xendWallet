import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, ArrowRight, Send, Globe, Landmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import XendLogo from "@/components/XendLogo";

const slides = [
  {
    icon: Globe,
    title: "Banking Without Borders",
    description: "Send, receive, and manage money globally with fast, secure, and low-cost transfers.",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    icon: Landmark,
    title: "Global Accounts in Minutes",
    description: "Get access to virtual accounts and receive payments like a local in multiple currencies.",
    color: "text-accent",
    bg: "bg-accent/10",
  },
  {
    icon: Shield,
    title: "Your Money. Protected.",
    description: "Advanced security keeps your wallet and transactions safe, so you can send money with confidence.",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    icon: Send,
    title: "Move Money Instantly",
    description: "Transfer funds across borders in just a few taps with transparent fees and real-time tracking.",
    color: "text-accent",
    bg: "bg-accent/10",
  },
];


const Onboarding = () => {
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);
  const [visible, setVisible] = useState(true);

  const finish = () => {
    navigate("/auth", { replace: true });
  };

  const next = () => {
    if (current === slides.length - 1) {
      finish();
      return;
    }
    setVisible(false);
    setTimeout(() => {
      setCurrent((p) => p + 1);
      setVisible(true);
    }, 200);
  };

  const slide = slides[current];
  const Icon = slide.icon;

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-between bg-background p-6">
      {/* Glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-64 w-[80vw] max-w-[500px] rounded-full bg-primary/6 blur-[80px]" />
      </div>

      {/* Top: Logo + Skip */}
      <div className="relative z-10 w-full flex items-center justify-between">
        <XendLogo variant="full" className="h-7" />
        <button onClick={finish} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          Skip
        </button>
      </div>

      {/* Content */}
      <div
        className={`relative z-10 flex flex-1 flex-col items-center justify-center text-center transition-all duration-200 ${
          visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        }`}
      >
        <div className={`mb-8 rounded-3xl ${slide.bg} p-6`}>
          <Icon className={`h-16 w-16 ${slide.color}`} />
        </div>
        <h1 className="text-2xl font-bold text-foreground">{slide.title}</h1>
        <p className="mt-3 max-w-xs text-sm text-muted-foreground leading-relaxed">
          {slide.description}
        </p>
      </div>

      {/* Bottom */}
      <div className="relative z-10 w-full max-w-xs space-y-5 pb-4">
        {/* Dots */}
        <div className="flex items-center justify-center gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                setVisible(false);
                setTimeout(() => {
                  setCurrent(i);
                  setVisible(true);
                }, 200);
              }}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === current ? "w-6 bg-primary" : "w-2 bg-muted-foreground/30"
              }`}
            />
          ))}
        </div>

        <Button onClick={next} className="w-full h-12 font-semibold text-sm">
          {current === slides.length - 1 ? "Get Started" : "Next"}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default Onboarding;
