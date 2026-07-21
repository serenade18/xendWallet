import { useState } from "react";
import { Loader2, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import CountryCodePicker from "@/components/CountryCodePicker";

interface EditProfileFormProps {
  currentName: string;
  currentPhone: string;
  onSaved: () => void;
  onCancel: () => void;
}

const EditProfileForm = ({ currentName, currentPhone, onSaved, onCancel }: EditProfileFormProps) => {
  // Parse existing phone to extract country code
  const parsePhone = (phone: string) => {
    if (!phone) return { dial: "+254", number: "" };
    // Try to match known country codes (longest first)
    const codes = ["+971", "+254", "+255", "+256", "+234", "+233", "+250", "+251", "+237", "+221", "+225", "+27", "+91", "+63", "+44", "+49", "+33", "+61", "+1"];
    for (const code of codes) {
      if (phone.startsWith(code)) {
        return { dial: code, number: phone.slice(code.length) };
      }
    }
    return { dial: "+254", number: phone.replace(/^\+/, "") };
  };

  const parsed = parsePhone(currentPhone);
  const [name, setName] = useState(currentName);
  const [dialCode, setDialCode] = useState(parsed.dial);
  const [phoneNumber, setPhoneNumber] = useState(parsed.number);
  const [saving, setSaving] = useState(false);

  const fullPhone = `${dialCode}${phoneNumber.replace(/^0+/, "")}`;

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!phoneNumber.trim()) {
      toast.error("Phone number is required");
      return;
    }

    setSaving(true);
    try {
      // Update auth metadata
      const { error: authError } = await supabase.auth.updateUser({
        data: { name: name.trim(), phone: fullPhone },
      });
      if (authError) throw authError;

      // Update profile table
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error: profileError } = await supabase
          .from("profiles")
          .update({ phone: fullPhone })
          .eq("user_id", user.id);
        if (profileError) throw profileError;
      }

      toast.success("Profile updated!");
      onSaved();
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 animate-slide-up">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Edit Profile</h2>
        <button onClick={onCancel} className="h-7 w-7 rounded-full flex items-center justify-center hover:bg-secondary/50 transition-colors">
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      <div>
        <Label className="text-muted-foreground text-xs font-medium">Full Name</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          className="mt-1 bg-background/60 border-border/80"
        />
      </div>

      <div>
        <Label className="text-muted-foreground text-xs font-medium">Phone Number</Label>
        <div className="mt-1 flex items-stretch h-11 rounded-2xl border border-border/80 bg-background/60 overflow-hidden">
          <CountryCodePicker value={dialCode} onChange={setDialCode} />
          <input
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9]/g, ""))}
            placeholder="712345678"
            className="flex-1 px-3 text-sm bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
            inputMode="tel"
          />
        </div>
      </div>

      <Button
        onClick={handleSave}
        disabled={saving}
        className="w-full rounded-2xl h-11 text-sm font-semibold"
      >
        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
        Save Changes
      </Button>
    </div>
  );
};

export default EditProfileForm;
