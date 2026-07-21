import { useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export interface CountryCode {
  code: string;
  name: string;
  flag: string;
  dial: string;
}

export const COUNTRY_CODES: CountryCode[] = [
  { code: "KE", name: "Kenya", flag: "🇰🇪", dial: "+254" },
  { code: "NG", name: "Nigeria", flag: "🇳🇬", dial: "+234" },
  { code: "GH", name: "Ghana", flag: "🇬🇭", dial: "+233" },
  { code: "TZ", name: "Tanzania", flag: "🇹🇿", dial: "+255" },
  { code: "UG", name: "Uganda", flag: "🇺🇬", dial: "+256" },
  { code: "ZA", name: "South Africa", flag: "🇿🇦", dial: "+27" },
  { code: "IN", name: "India", flag: "🇮🇳", dial: "+91" },
  { code: "PH", name: "Philippines", flag: "🇵🇭", dial: "+63" },
  { code: "US", name: "United States", flag: "🇺🇸", dial: "+1" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧", dial: "+44" },
  { code: "AE", name: "UAE", flag: "🇦🇪", dial: "+971" },
  { code: "CA", name: "Canada", flag: "🇨🇦", dial: "+1" },
  { code: "AU", name: "Australia", flag: "🇦🇺", dial: "+61" },
  { code: "DE", name: "Germany", flag: "🇩🇪", dial: "+49" },
  { code: "FR", name: "France", flag: "🇫🇷", dial: "+33" },
  { code: "RW", name: "Rwanda", flag: "🇷🇼", dial: "+250" },
  { code: "ET", name: "Ethiopia", flag: "🇪🇹", dial: "+251" },
  { code: "CM", name: "Cameroon", flag: "🇨🇲", dial: "+237" },
  { code: "SN", name: "Senegal", flag: "🇸🇳", dial: "+221" },
  { code: "CI", name: "Côte d'Ivoire", flag: "🇨🇮", dial: "+225" },
];

interface CountryCodePickerProps {
  value: string;
  onChange: (dial: string) => void;
}

const CountryCodePicker = ({ value, onChange }: CountryCodePickerProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selected = COUNTRY_CODES.find((c) => c.dial === value) || COUNTRY_CODES[0];

  const filtered = search.trim()
    ? COUNTRY_CODES.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.dial.includes(search) ||
          c.code.toLowerCase().includes(search.toLowerCase())
      )
    : COUNTRY_CODES;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1 h-full px-3 rounded-l-2xl border-r border-border/60 bg-secondary/30 hover:bg-secondary/50 transition-colors shrink-0"
        >
          <span className="text-base">{selected.flag}</span>
          <span className="text-xs font-medium text-foreground">{selected.dial}</span>
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <div className="relative mb-2">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="w-full pl-8 pr-3 py-2 text-sm rounded-lg bg-background border border-border/60 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            autoFocus
          />
        </div>
        <div className="max-h-48 overflow-y-auto space-y-0.5">
          {filtered.map((c) => (
            <button
              key={c.code + c.dial}
              type="button"
              onClick={() => {
                onChange(c.dial);
                setOpen(false);
                setSearch("");
              }}
              className={`w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors ${
                value === c.dial ? "bg-primary/10 text-primary" : "hover:bg-muted/50 text-foreground"
              }`}
            >
              <span>{c.flag}</span>
              <span className="flex-1 truncate">{c.name}</span>
              <span className="text-xs text-muted-foreground">{c.dial}</span>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">No results</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default CountryCodePicker;
