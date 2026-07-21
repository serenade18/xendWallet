import { useState } from "react";
import { ArrowLeft, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { SUPPORTED_COUNTRIES, type Country } from "@/lib/countries";

interface CountrySelectorProps {
  title?: string;
  onSelect: (country: Country) => void;
  onBack: () => void;
}

const CountrySelector = ({ title = "Select Country", onSelect, onBack }: CountrySelectorProps) => {
  const [search, setSearch] = useState("");

  const filtered = SUPPORTED_COUNTRIES.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      c.currency.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col min-h-[60dvh] px-1">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} className="h-9 w-9 rounded-full flex items-center justify-center hover:bg-secondary/50 transition-colors">
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <h2 className="flex-1 text-center text-lg font-bold text-foreground pr-9">{title}</h2>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search country or currency..."
          className="pl-9 h-11 rounded-xl text-sm bg-card border-border/60"
          autoFocus
        />
      </div>

      <div className="space-y-1.5 overflow-y-auto max-h-[55dvh]">
        {filtered.map((country) => (
          <button
            key={country.code}
            onClick={() => onSelect(country)}
            className="w-full flex items-center gap-3 rounded-2xl bg-card border border-border/60 px-4 py-3.5 active:scale-[0.98] transition-all hover:bg-secondary/30"
          >
            <span className="text-2xl">{country.flag}</span>
            <div className="flex-1 text-left">
              <p className="text-sm font-semibold text-foreground">{country.name}</p>
              <p className="text-xs text-muted-foreground">{country.currency} · 1 USD = {country.currencySymbol}{country.exchangeRate.toLocaleString()}</p>
            </div>
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">No countries found</p>
        )}
      </div>
    </div>
  );
};

export default CountrySelector;
