import { useState, useEffect, useRef } from "react";
import { Loader2, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface UserResult {
  email: string | null;
  phone: string | null;
  name: string | null;
}

interface UserSearchComboboxProps {
  query: string;
  onSelect: (identifier: string) => void;
  visible: boolean;
}

const UserSearchCombobox = ({ query, onSelect, visible }: UserSearchComboboxProps) => {
  const [results, setResults] = useState<UserResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!visible || !query || query.trim().length < 2) {
      setResults([]);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.rpc("search_users", { query: query.trim() });
        if (!error && data) {
          setResults(data as UserResult[]);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, visible]);

  if (!visible || (results.length === 0 && !loading)) return null;

  return (
    <div className="mt-1.5 rounded-2xl border border-border/60 bg-card p-2 max-h-40 overflow-y-auto space-y-0.5 animate-slide-up">
      {loading && (
        <div className="flex items-center justify-center py-3">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      )}
      {!loading &&
        results.map((user, i) => {
          const display = user.email || user.phone || "Unknown";
          const label = user.name && user.name !== user.email ? user.name : display.split("@")[0];
          return (
            <button
              key={i}
              type="button"
              onClick={() => onSelect(display)}
              className="w-full flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-left hover:bg-muted/50 active:bg-muted transition-colors"
            >
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <User className="h-3.5 w-3.5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{label}</p>
                <p className="text-[11px] text-muted-foreground truncate">{display}</p>
              </div>
            </button>
          );
        })}
      {!loading && results.length === 0 && query.trim().length >= 2 && (
        <p className="text-xs text-muted-foreground text-center py-3">No users found</p>
      )}
    </div>
  );
};

export default UserSearchCombobox;
