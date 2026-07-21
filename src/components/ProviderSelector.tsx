import { ArrowLeft } from "lucide-react";
import type { Country, MobileMoneyProvider } from "@/lib/countries";

interface ProviderSelectorProps {
  country: Country;
  onSelect: (provider: MobileMoneyProvider) => void;
  onBack: () => void;
}

const ProviderSelector = ({ country, onSelect, onBack }: ProviderSelectorProps) => {
  return (
    <div className="flex flex-col min-h-[50dvh] px-1">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} className="h-9 w-9 rounded-full flex items-center justify-center hover:bg-secondary/50 transition-colors">
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <h2 className="flex-1 text-center text-lg font-bold text-foreground pr-9">Select Provider</h2>
      </div>

      <div className="flex items-center gap-2 mb-4 px-1">
        <span className="text-lg">{country.flag}</span>
        <span className="text-sm font-medium text-muted-foreground">{country.name}</span>
      </div>

      <div className="space-y-2">
        {country.mobileMoneyProviders.map((provider) => (
          <button
            key={provider.id}
            onClick={() => onSelect(provider)}
            className="w-full flex items-center gap-3 rounded-2xl bg-card border border-border/60 px-4 py-4 active:scale-[0.98] transition-all hover:bg-secondary/30"
          >
            <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center">
              <span className="text-sm font-bold text-primary">{provider.name.charAt(0)}</span>
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-semibold text-foreground">{provider.name}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ProviderSelector;
