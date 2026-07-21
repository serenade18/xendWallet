import { useMemo, useState } from "react";
import { ChevronDown, Search, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// ── Nested value helpers (dot-path) ──
export const getPath = (obj: any, path: string): any =>
  path.split(".").reduce((acc, k) => (acc == null ? undefined : acc[k]), obj);

export const setPath = (obj: any, path: string, value: any): any => {
  const keys = path.split(".");
  const next = { ...(obj || {}) };
  let cur: any = next;
  for (let i = 0; i < keys.length - 1; i++) {
    cur[keys[i]] = { ...(cur[keys[i]] || {}) };
    cur = cur[keys[i]];
  }
  cur[keys[keys.length - 1]] = value;
  return next;
};

export interface OneOfOpt { const: string; title: string; "x-symbol"?: string }

export const OneOfSelect = ({
  value, onChange, options, placeholder,
}: { value: string; onChange: (v: string) => void; options: OneOfOpt[]; placeholder?: string }) => {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const selected = options.find((o) => o.const === value);
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return options;
    return options.filter(
      (o) => o.title.toLowerCase().includes(s) || o.const.toLowerCase().includes(s)
    );
  }, [q, options]);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="w-full h-12 rounded-xl border border-input bg-background px-3 flex items-center gap-2 text-sm hover:bg-secondary/40 transition-colors"
        >
          {selected ? (
            <>
              <span className="text-lg leading-none">{selected["x-symbol"] || "🏳️"}</span>
              <span className="flex-1 text-left text-foreground truncate">{selected.title}</span>
              <span className="text-xs text-muted-foreground">{selected.const}</span>
            </>
          ) : (
            <span className="flex-1 text-left text-muted-foreground">{placeholder || "Select..."}</span>
          )}
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <div className="p-2 border-b border-border/60">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search..."
              className="pl-8 h-9 rounded-lg text-sm"
              autoFocus
            />
          </div>
        </div>
        <div className="max-h-64 overflow-y-auto py-1">
          {filtered.map((o) => (
            <button
              key={o.const}
              type="button"
              onClick={() => { onChange(o.const); setOpen(false); setQ(""); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-secondary/50 text-left"
            >
              <span className="text-base leading-none">{o["x-symbol"] || "🏳️"}</span>
              <span className="flex-1 text-foreground truncate">{o.title}</span>
              <span className="text-xs text-muted-foreground">{o.const}</span>
              {value === o.const && <Check className="h-4 w-4 text-primary" />}
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="px-3 py-4 text-xs text-muted-foreground text-center">No matches</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export const SchemaField = ({
  name, path, field, value, onChange,
}: { name: string; path: string; field: any; value: any; onChange: (path: string, v: any) => void }) => {
  const label = field.title || name;

  if (field.type === "object" && field.properties) {
    const subKeys = Object.keys(field.properties);
    return (
      <div className="rounded-2xl border border-border/60 bg-card/50 p-3 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        {subKeys.map((k) => (
          <SchemaField
            key={k}
            name={k}
            path={`${path}.${k}`}
            field={field.properties[k]}
            value={getPath(value, k)}
            onChange={onChange}
          />
        ))}
      </div>
    );
  }

  if (Array.isArray(field.oneOf) && field.oneOf.every((o: any) => typeof o.const === "string")) {
    return (
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">{label}</label>
        <OneOfSelect
          value={value || ""}
          onChange={(v) => onChange(path, v)}
          options={field.oneOf}
          placeholder={`Select ${label.toLowerCase()}`}
        />
      </div>
    );
  }

  if (Array.isArray(field.enum)) {
    return (
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">{label}</label>
        <select
          value={value || ""}
          onChange={(e) => onChange(path, e.target.value)}
          className="w-full h-12 rounded-xl border border-input bg-background px-3 text-sm"
        >
          <option value="">Select...</option>
          {field.enum.map((v: string) => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <Input
        type={field.type === "number" || field.type === "integer" ? "number" : "text"}
        placeholder={field.description || `Enter ${label}`}
        maxLength={field.maxLength}
        value={value ?? ""}
        onChange={(e) => onChange(path, e.target.value)}
        className="h-12 rounded-xl text-sm"
      />
    </div>
  );
};

export const checkRequired = (schema: any, data: any, prefix = ""): string | null => {
  if (!schema) return null;
  if (Array.isArray(schema.required)) {
    for (const f of schema.required) {
      const v = data?.[f];
      const label = schema.properties?.[f]?.title || f;
      if (v == null || (typeof v === "string" && !v.trim()) ||
          (typeof v === "object" && !Array.isArray(v) && Object.keys(v).length === 0)) {
        return prefix ? `${prefix} · ${label}` : label;
      }
    }
  }
  if (schema.properties) {
    for (const [k, sub] of Object.entries<any>(schema.properties)) {
      if (sub?.type === "object" && sub.properties) {
        const err = checkRequired(sub, data?.[k], sub.title || k);
        if (err) return err;
      }
    }
  }
  return null;
};
