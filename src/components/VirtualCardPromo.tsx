import { ChevronRight } from "lucide-react";

interface VirtualCardPromoProps {
  currentStep?: number;
  totalSteps?: number;
  onActivate?: () => void;
}

const VirtualCardPromo = ({
  currentStep = 2,
  totalSteps = 4,
  onActivate,
}: VirtualCardPromoProps) => {
  return (
    <button
      onClick={onActivate}
      className="w-full rounded-2xl bg-primary p-5 text-left active:scale-[0.98] transition-all animate-slide-up relative overflow-hidden"
    >
      {/* Decorative bar on left */}
      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary-foreground/20 rounded-l-2xl" />

      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-[10px] font-semibold text-primary-foreground/70 uppercase tracking-[0.15em] mb-1">
            Get Your Xend Card
          </p>
          <h3 className="text-lg font-bold text-primary-foreground leading-tight mb-1">
            Coming soon
          </h3>
          {/* <p className="text-[13px] text-primary-foreground/70 mb-4">
            Your card is almost ready!
          </p> */}

          {/* Progress bar */}
          <div className="flex items-center gap-1 mb-1.5">
            <p className="text-[11px] font-semibold text-primary-foreground/80">
              {currentStep} of {totalSteps} STEPS DONE
            </p>
          </div>
          <div className="flex gap-1.5">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-all ${
                  i < currentStep
                    ? "bg-primary-foreground"
                    : "bg-primary-foreground/25"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Arrow */}
        <div className="h-8 w-8 rounded-full bg-primary-foreground/15 flex items-center justify-center mt-1">
          <ChevronRight className="h-5 w-5 text-primary-foreground" />
        </div>
      </div>
    </button>
  );
};

export default VirtualCardPromo;
