import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Loader2, Zap } from "lucide-react";
import { toast } from "sonner";

interface Recipient {
  address: string;
  amount: string;
}

interface BatchPayoutFormProps {
  onPayout: (recipients: { address: string; amount: string }[]) => Promise<any>;
  loading: boolean;
}

const BatchPayoutForm = ({ onPayout, loading }: BatchPayoutFormProps) => {
  const [recipients, setRecipients] = useState<Recipient[]>([{ address: "", amount: "" }]);

  const addRecipient = () => {
    if (recipients.length >= 20) {
      toast.error("Maximum 20 recipients");
      return;
    }
    setRecipients([...recipients, { address: "", amount: "" }]);
  };

  const removeRecipient = (index: number) => {
    if (recipients.length <= 1) return;
    setRecipients(recipients.filter((_, i) => i !== index));
  };

  const updateRecipient = (index: number, field: keyof Recipient, value: string) => {
    const updated = [...recipients];
    updated[index] = { ...updated[index], [field]: value };
    setRecipients(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const valid = recipients.filter((r) => r.address && r.amount);
    if (valid.length === 0) {
      toast.error("Add at least one recipient");
      return;
    }

    for (const r of valid) {
      if (!/^0x[a-fA-F0-9]{40}$/.test(r.address)) {
        toast.error(`Invalid address: ${r.address.slice(0, 10)}...`);
        return;
      }
      if (isNaN(parseFloat(r.amount)) || parseFloat(r.amount) <= 0) {
        toast.error("All amounts must be positive");
        return;
      }
    }

    try {
      const result = await onPayout(valid);
      toast.success(`Done: ${result.summary.confirmed}/${result.summary.total} succeeded`);
      setRecipients([{ address: "", amount: "" }]);
    } catch (err: any) {
      toast.error(err.message || "Batch payout failed");
    }
  };

  const totalAmount = recipients.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0).toFixed(6);

  return (
    <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-foreground">Batch Payout</h3>
        <span className="text-[10px] text-muted-foreground bg-secondary/50 rounded-md px-2 py-0.5">
          {recipients.length}/20
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-2 max-h-[240px] overflow-y-auto -mx-1 px-1">
          {recipients.map((r, i) => (
            <div key={i} className="flex gap-1.5 items-end">
              <div className="flex-1 min-w-0">
                {i === 0 && <Label className="text-[10px] text-muted-foreground">Address</Label>}
                <Input
                  value={r.address}
                  onChange={(e) => updateRecipient(i, "address", e.target.value)}
                  placeholder="0x..."
                  className="bg-background/60 border-border/80 font-mono text-[11px] h-10"
                />
              </div>
              <div className="w-20 shrink-0">
                {i === 0 && <Label className="text-[10px] text-muted-foreground">Amount</Label>}
                <Input
                  value={r.amount}
                  onChange={(e) => updateRecipient(i, "amount", e.target.value)}
                  placeholder="0.00"
                  inputMode="decimal"
                  className="bg-background/60 border-border/80 text-[11px] h-10"
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeRecipient(i)}
                className="text-muted-foreground hover:text-destructive h-10 w-10 p-0 shrink-0"
                disabled={recipients.length <= 1}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>

        <Button type="button" variant="ghost" size="sm" onClick={addRecipient} className="text-primary w-full h-10">
          <Plus className="mr-1 h-3.5 w-3.5" /> Add Recipient
        </Button>

        <div className="rounded-xl bg-secondary/30 px-4 py-2.5 flex justify-between items-center">
          <span className="text-[11px] text-muted-foreground">Total</span>
          <span className="font-mono text-sm font-semibold text-foreground">{totalAmount}</span>
        </div>

        <Button type="submit" disabled={loading} className="w-full font-semibold h-12 text-sm active:scale-[0.98] transition-transform">
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
          Send Batch
        </Button>
      </form>
    </div>
  );
};

export default BatchPayoutForm;
