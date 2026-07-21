// Helpers to enrich Noah's payout-countries payload ({ "KE": ["KES"], ... })
// with display name + emoji flag.

const REGION_NAMES =
  typeof Intl !== "undefined" && (Intl as any).DisplayNames
    ? new (Intl as any).DisplayNames(["en"], { type: "region" })
    : null;

export function countryFlag(code: string): string {
  if (!code || code.length !== 2) return "🏳️";
  if (code.toUpperCase() === "XX") return "🌍";
  const cc = code.toUpperCase();
  return String.fromCodePoint(
    ...cc.split("").map((c) => 0x1f1e6 + c.charCodeAt(0) - 65),
  );
}

export function countryName(code: string): string {
  if (code === "XX") return "Global";
  try {
    return REGION_NAMES?.of(code.toUpperCase()) || code;
  } catch {
    return code;
  }
}

export interface NoahCountryInfo {
  code: string;
  name: string;
  flag: string;
  currency: string; // primary
  currencies: string[];
}

/** Accepts Noah's { "KE": ["KES"] } shape and also the already-normalized shape. */
export function normalizeNoahCountries(
  raw: Record<string, any> | undefined | null,
): Record<string, NoahCountryInfo> {
  const out: Record<string, NoahCountryInfo> = {};
  if (!raw) return out;
  for (const [code, val] of Object.entries(raw)) {
    let currencies: string[] = [];
    if (Array.isArray(val)) currencies = val.filter(Boolean);
    else if (val && typeof val === "object") {
      currencies = (val.currencies as string[]) ||
        (val.currency ? [val.currency] : []);
    }
    out[code] = {
      code,
      name: countryName(code),
      flag: countryFlag(code),
      currency: currencies[0] || "USD",
      currencies,
    };
  }
  return out;
}

export function sortedCountryEntries(
  countries: Record<string, NoahCountryInfo>,
): [string, NoahCountryInfo][] {
  return Object.entries(countries).sort(([, a], [, b]) =>
    a.name.localeCompare(b.name),
  );
}
