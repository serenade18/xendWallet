import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";
import { Copy, Mail, Phone, User, Wallet, ShieldCheck, Loader2, CheckCircle2, ChevronRight, HelpCircle, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import { useNavigate } from "react-router-dom";
import EditProfileForm from "@/components/EditProfileForm";
import FundForm from "@/components/FundForm";

const Profile = () => {
  const { user, signOut } = useAuth();
  const wallet = useWallet(user?.id);
  const meta = user?.user_metadata as { name?: string; phone?: string } | undefined;
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);

  const handleBackup = async () => {
    try {
      await wallet.backupWallet();
      toast.success("Wallet backed up successfully!");
    } catch (err: any) {
      toast.error(err.message || "Backup failed");
    }
  };

  const handleProfileSaved = () => {
    setEditing(false);
    // Force refresh user data
    window.location.reload();
  };

  return (
    <div className="min-h-[100dvh] bg-background pb-20 md:pb-8">
      <AppHeader onSignOut={signOut} />

      <main className="relative z-10 mx-auto max-w-lg px-4 py-6 space-y-5">
        {/* Avatar + Name */}
        <div className="flex flex-col items-center text-center animate-slide-up">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 mb-4">
            <User className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-xl font-bold text-foreground">{meta?.name || "User"}</h1>
          <p className="text-sm text-muted-foreground mt-1">{user?.email}</p>
        </div>

        {/* Edit Profile */}
        {editing ? (
          <div className="rounded-xl border border-border/40 bg-card/60 p-4 animate-slide-up">
            <EditProfileForm
              currentName={meta?.name || ""}
              currentPhone={meta?.phone || ""}
              onSaved={handleProfileSaved}
              onCancel={() => setEditing(false)}
            />
          </div>
        ) : (
          <>
            {/* Info Cards */}
            <div className="space-y-2 animate-slide-up">
              <div className="flex items-center gap-3 rounded-xl bg-secondary/30 px-4 py-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-medium">Email</p>
                  <p className="text-sm text-foreground truncate">{user?.email || "—"}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-xl bg-secondary/30 px-4 py-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-medium">Xend Account No</p>
                  <p className="text-sm text-foreground truncate">{meta?.phone || "—"}</p>
                </div>
              </div>

              {/* USD Wallet Address - tappable */}
              {wallet.profile?.wallet_address && (
                <button
                  onClick={() => navigate("/wallet-address")}
                  className="w-full flex items-center gap-3 rounded-xl bg-secondary/30 px-4 py-3 active:bg-secondary/50 transition-colors text-left"
                >
                  <Wallet className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-medium">
                      USD Wallet Address (For Stablecoin Payments)
                    </p>
                    <p className="text-sm text-foreground font-mono truncate">
                      {wallet.profile.wallet_address.slice(0, 10)}...{wallet.profile.wallet_address.slice(-6)}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>
              )}
            </div>

            {/* Edit button */}
            <Button
              variant="outline"
              onClick={() => setEditing(true)}
              className="w-full border-border/40 text-foreground hover:bg-secondary/30"
            >
              <Pencil className="mr-2 h-4 w-4" />
              Edit Profile
            </Button>
          </>
        )}

        {/* Account Info */}
        <div className="rounded-xl border border-border/40 bg-card/60 p-4 space-y-3 animate-slide-up">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Account</h2>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Member since</span>
            <span className="text-foreground">
              {user?.created_at
                ? new Date(user.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                : "—"}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Auth provider</span>
            <span className="text-foreground capitalize">{user?.app_metadata?.provider || "email"}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Backup status</span>
            <span className={`font-medium flex items-center gap-1.5 ${wallet.isBackedUp ? "text-primary" : "text-muted-foreground"}`}>
              {wallet.isBackedUp ? (<><CheckCircle2 className="h-3.5 w-3.5" /><span>Backed up</span></>) : "Not backed up"}
            </span>
          </div>
        </div>

        {/* Backup Wallet */}
        {wallet.hasWallet && (
          <Button variant="outline" onClick={handleBackup} disabled={wallet.actionLoading} className="w-full border-primary/30 text-primary hover:bg-primary/10 hover:text-primary">
            {wallet.actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
            {wallet.isBackedUp ? "Re-backup Wallet" : "Backup Wallet"}
          </Button>
        )}

        {/* fund wallet */}
        {wallet.hasWallet && (
          <FundForm
            walletAddress={wallet.profile?.wallet_address ?? undefined}
            chainId={wallet.activeChain.chainId}
            nativeSymbol={wallet.activeChain.nativeSymbol}
            onFunded={() => wallet.refresh()}
          />
        )}


        {/* Help Link */}
        <button
          onClick={() => navigate("/help")}
          className="w-full rounded-xl border border-border/40 bg-card/60 px-4 py-4 flex items-center justify-between hover:bg-secondary/30 transition-colors animate-slide-up"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <HelpCircle className="h-5 w-5 text-primary" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-foreground">Help & Support</p>
              <p className="text-xs text-muted-foreground">FAQs, tickets, and AI support</p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
      </main>

      <BottomNav />
    </div>
  );
};

export default Profile;
