import { useState } from "react";
import TopUpBankTransfer from "@/components/TopUpBankTransfer";
import { DEFAULT_CHAIN } from "@/lib/chains";
import WithdrawMobileMoney from "@/components/WithdrawMobileMoney";
import WithdrawBank from "@/components/WithdrawBank";
import WithdrawCrypto from "@/components/WithdrawCrypto";
import GlobalTransferForm from "@/components/GlobalTransferForm";
import { DashboardSkeleton } from "@/components/DashboardSkeleton";
import { ArrowUpRight, Plus, ArrowDownToLine, ChevronRight, QrCode, Landmark, CreditCard, Wallet, Globe, Send, Smartphone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";
import { useContacts } from "@/hooks/useContacts";
import { toast } from "sonner";
import { useTransactionNotifications } from "@/hooks/useTransactionNotifications";
import WalletSetup from "@/components/WalletSetup";
import SendForm from "@/components/SendForm";
import WalletSendForm from "@/components/WalletSendForm";
import TransactionList from "@/components/TransactionList";
import DepositAddress from "@/components/DepositAddress";
import BottomNav from "@/components/BottomNav";
import AppHeader from "@/components/AppHeader";
import MarketingBanners from "@/components/MarketingBanners";
import KycGate from "@/components/KycGate";
import KycBanner from "@/components/KycBanner";
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription,
} from "@/components/ui/drawer";

const fmt = (val: number, decimals = 2) =>
  val.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const wallet = useWallet(user?.id);
  const { contacts, addContact } = useContacts(user?.id);
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [sendFormOpen, setSendFormOpen] = useState(false);
  const [walletSendOpen, setWalletSendOpen] = useState(false);
  const [depositOpen, setDepositOpen] = useState(false);
  const [bankTransferOpen, setBankTransferOpen] = useState(false);
  const [withdrawMobileOpen, setWithdrawMobileOpen] = useState(false);
  const [withdrawBankOpen, setWithdrawBankOpen] = useState(false);
  const [withdrawCryptoOpen, setWithdrawCryptoOpen] = useState(false);
  const [globalTransferOpen, setGlobalTransferOpen] = useState(false);
  const navigate = useNavigate();

  const { notifications, markRead, markAllRead, clearAll } = useTransactionNotifications(wallet.transactions, user?.id);

  if (wallet.loading) {
    return <DashboardSkeleton />;
  }

  if (!wallet.hasClient || !wallet.hasWallet) {
    return (
      <WalletSetup
        hasClient={wallet.hasClient}
        hasWallet={wallet.hasWallet}
        provisioning={wallet.provisioning}
        provisionError={wallet.provisionError}
        onRetry={wallet.retryProvisioning}
        onSignOut={signOut}
      />
    );
  }

  const tokens = wallet.balance?.tokenBalances || [];
  const stablecoins = tokens.filter((t) =>
    ["USDC", "USDT", "DAI", "USD"].includes(t.symbol?.toUpperCase() || "")
  );
  const totalStable = stablecoins.reduce((sum, t) => sum + parseFloat(t.balance || "0"), 0);

  return (
    <div className="min-h-[100dvh] bg-background pb-20 md:pb-0">
      <AppHeader
        notifications={notifications}
        onMarkRead={markRead}
        onMarkAllRead={markAllRead}
        onClear={clearAll}
        onRefresh={wallet.refresh}
        onSignOut={signOut}
      />

      <main className="relative z-10 mx-auto max-w-lg px-4 pt-6 pb-8 space-y-4">
        {/* ─── Balance ─── */}
        <div className="text-center py-2 animate-slide-up">
          <p className="text-[11px] text-muted-foreground uppercase tracking-[0.18em] mb-2">
            Xend Balance
          </p>
          <div className="flex items-baseline justify-center">
            <span className="text-5xl sm:text-6xl font-extrabold text-foreground tracking-tight leading-none">
              ${fmt(totalStable, 2).split(".")[0]}
            </span>
            <span className="text-2xl sm:text-3xl font-bold text-foreground/60 ml-0.5">
              .{fmt(totalStable, 2).split(".")[1]}
            </span>
          </div>
        </div>

        {/* ─── Action Buttons ─── */}
        <div className="flex gap-3 animate-slide-up">
          <button onClick={() => setTopUpOpen(true)}
            className="flex-1 flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-primary py-4 text-primary-foreground font-semibold text-[13px] active:scale-[0.97] transition-all">
            <Plus className="h-5 w-5" strokeWidth={2.5} /> Top Up
          </button>
          <button onClick={() => setSendOpen(true)}
            className="flex-1 flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-primary py-4 text-primary-foreground font-semibold text-[13px] active:scale-[0.97] transition-all">
            <ArrowUpRight className="h-5 w-5" strokeWidth={2.5} /> Send
          </button>
          <button onClick={() => setWithdrawOpen(true)}
            className="flex-1 flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-primary py-4 text-primary-foreground font-semibold text-[13px] active:scale-[0.97] transition-all">
            <ArrowDownToLine className="h-5 w-5" strokeWidth={2.5} /> Withdraw
          </button>
        </div>

        <KycBanner />

        <MarketingBanners />

        <div className="animate-slide-up">
          <TransactionList transactions={wallet.transactions} activeChain={wallet.activeChain} contacts={contacts} />
        </div>
      </main>

      <BottomNav />

      {/* ═══ TOP UP DRAWER ═══ */}
      <Drawer open={topUpOpen} onOpenChange={setTopUpOpen}>
        <DrawerContent className="max-w-lg mx-auto">
          <DrawerHeader className="text-center pt-6 pb-2">
            <DrawerTitle className="text-xl font-bold">Add Money With</DrawerTitle>
            <DrawerDescription className="sr-only">Choose a funding method</DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-8 space-y-3">
            <button onClick={() => { setTopUpOpen(false); toast.info("Debit card payments coming soon!"); }}
              className="w-full flex items-center gap-4 rounded-2xl bg-card border border-border/60 px-5 py-4 active:scale-[0.98] transition-all">
              <div className="h-12 w-12 rounded-full bg-accent/20 flex items-center justify-center">
                <CreditCard className="h-6 w-6 text-accent" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-[15px] font-semibold text-foreground">Debit Card <span className="text-xs font-normal text-muted-foreground">(Instant)</span></p>
                <p className="text-[13px] text-muted-foreground">From supported debit and credit cards</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>

            <button onClick={() => { setTopUpOpen(false); setTimeout(() => setDepositOpen(true), 200); }}
              className="w-full flex items-center gap-4 rounded-2xl bg-card border border-border/60 px-5 py-4 active:scale-[0.98] transition-all">
              <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center">
                <QrCode className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-[15px] font-semibold text-foreground">Stablecoins / Crypto Wallet <span className="text-xs font-normal text-muted-foreground">(Instant)</span></p>
                <p className="text-[13px] text-muted-foreground">From any supported crypto or stablecoin wallet</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>

            <button onClick={() => { setTopUpOpen(false); setTimeout(() => setBankTransferOpen(true), 200); }}
              className="w-full flex items-center gap-4 rounded-2xl bg-card border border-border/60 px-5 py-4 active:scale-[0.98] transition-all">
              <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center">
                <Landmark className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-[15px] font-semibold text-foreground">Bank Transfer <span className="text-xs font-normal text-muted-foreground">(Auto-credited)</span></p>
                <p className="text-[13px] text-muted-foreground">Get a dedicated virtual account in USD or EUR</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>
        </DrawerContent>
      </Drawer>

      {/* ═══ SEND DRAWER ═══ */}
      <Drawer open={sendOpen} onOpenChange={setSendOpen}>
        <DrawerContent className="max-w-lg mx-auto">
          <DrawerHeader className="text-center pt-6 pb-2">
            <DrawerTitle className="text-xl font-bold">Send Money Via</DrawerTitle>
            <DrawerDescription className="sr-only">Choose a send method</DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-8 space-y-3">
            <button onClick={() => { setSendOpen(false); setTimeout(() => setSendFormOpen(true), 200); }}
              className="w-full flex items-center gap-4 rounded-2xl bg-card border border-border/60 px-5 py-4 active:scale-[0.98] transition-all">
              <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                <Send className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-[15px] font-semibold text-foreground">Xend User <span className="text-xs font-normal text-muted-foreground">(Instant)</span></p>
                <p className="text-[13px] text-muted-foreground">Instant transfers between Xend users globally</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>

            <button onClick={() => { setSendOpen(false); setTimeout(() => setGlobalTransferOpen(true), 200); }}
              className="w-full flex items-center gap-4 rounded-2xl bg-card border border-border/60 px-5 py-4 active:scale-[0.98] transition-all">
              <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                <Globe className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-[15px] font-semibold text-foreground">Global Transfers</p>
                <p className="text-[13px] text-muted-foreground">Send to bank accounts & mobile wallets worldwide</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>

            <button onClick={() => { setSendOpen(false); setTimeout(() => setWalletSendOpen(true), 200); }}
              className="w-full flex items-center gap-4 rounded-2xl bg-card border border-border/60 px-5 py-4 active:scale-[0.98] transition-all">
              <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center">
                <Wallet className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-[15px] font-semibold text-foreground">Other Wallet <span className="text-xs font-normal text-muted-foreground">(Instant)</span></p>
                <p className="text-[13px] text-muted-foreground">Send USDC to any supported crypto wallet</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>
        </DrawerContent>
      </Drawer>

      {/* ═══ WITHDRAW DRAWER ═══ */}
      <Drawer open={withdrawOpen} onOpenChange={setWithdrawOpen}>
        <DrawerContent className="max-w-lg mx-auto">
          <DrawerHeader className="text-center pt-6 pb-2">
            <DrawerTitle className="text-xl font-bold">Withdraw To</DrawerTitle>
            <DrawerDescription className="sr-only">Choose withdrawal method</DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-8 space-y-3">
            <button onClick={() => { setWithdrawOpen(false); setTimeout(() => setWithdrawMobileOpen(true), 200); }}
              className="w-full flex items-center gap-4 rounded-2xl bg-card border border-border/60 px-5 py-4 active:scale-[0.98] transition-all">
              <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                <Smartphone className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-[15px] font-semibold text-foreground">Mobile Money <span className="text-xs font-normal text-muted-foreground">(Instant)</span></p>
                <p className="text-[13px] text-muted-foreground">Withdraw to supported mobile wallets globally</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>

            <button onClick={() => { setWithdrawOpen(false); setTimeout(() => setWithdrawBankOpen(true), 200); }}
              className="w-full flex items-center gap-4 rounded-2xl bg-card border border-border/60 px-5 py-4 active:scale-[0.98] transition-all">
              <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center">
                <Landmark className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-[15px] font-semibold text-foreground">Bank Transfer <span className="text-xs font-normal text-muted-foreground">(2-3 Days)</span></p>
                <p className="text-[13px] text-muted-foreground">Withdraw to your bank account</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>

            <button onClick={() => { setWithdrawOpen(false); setTimeout(() => setWithdrawCryptoOpen(true), 200); }}
              className="w-full flex items-center gap-4 rounded-2xl bg-card border border-border/60 px-5 py-4 active:scale-[0.98] transition-all">
              <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center">
                <Wallet className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-[15px] font-semibold text-foreground">Crypto Wallet <span className="text-xs font-normal text-muted-foreground">(Instant)</span></p>
                <p className="text-[13px] text-muted-foreground">Withdraw USDC to supported crypto wallets</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>
        </DrawerContent>
      </Drawer>

      {/* ═══ SUB-DRAWERS ═══ */}

      {/* Send Form */}
      <Drawer open={sendFormOpen} onOpenChange={setSendFormOpen}>
        <DrawerContent className="max-w-lg mx-auto max-h-[85dvh]">
          <DrawerHeader className="text-center pt-6 pb-2">
            <DrawerTitle className="text-xl font-bold">Send Money</DrawerTitle>
            <DrawerDescription className="sr-only">Send money to a recipient</DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-8 overflow-y-auto">
            <SendForm onSend={wallet.sendTokens} loading={wallet.actionLoading}
              chainName={wallet.activeChain.name} chainKey={wallet.activeChain.key}
              nativeSymbol={wallet.activeChain.nativeSymbol} chainType={wallet.activeChain.type}
              tokens={wallet.activeChain.tokens} contacts={contacts} onAddContact={addContact}
              onClose={() => setSendFormOpen(false)} balance={totalStable} />
          </div>
        </DrawerContent>
      </Drawer>

      {/* Deposit Address */}
      <Drawer open={depositOpen} onOpenChange={setDepositOpen}>
        <DrawerContent className="max-w-lg mx-auto max-h-[90dvh]">
          <DrawerHeader className="sr-only">
            <DrawerTitle>Deposit</DrawerTitle>
            <DrawerDescription>Your deposit address</DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-8 pt-2 overflow-y-auto">
            <DepositAddress walletAddress={wallet.profile?.wallet_address ?? ""} token="USDC"
              network={wallet.activeChain.name} topUpFee="0.00 USDC" minimumAmount="1.00 USDC"
              onBack={() => setDepositOpen(false)} />
          </div>
        </DrawerContent>
      </Drawer>

      {/* Wallet Send / Withdraw Crypto (Send) */}
      <Drawer open={walletSendOpen} onOpenChange={setWalletSendOpen}>
        <DrawerContent className="max-w-lg mx-auto max-h-[90dvh]">
          <DrawerHeader className="text-center pt-6 pb-2">
            <DrawerTitle className="text-xl font-bold">Send to Wallet</DrawerTitle>
            <DrawerDescription className="sr-only">Send USDC to a crypto wallet</DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-8 overflow-y-auto">
            <WalletSendForm onSend={wallet.sendTokens} loading={wallet.actionLoading}
              activeChain={wallet.activeChain} tokens={wallet.activeChain.tokens}
              onClose={() => setWalletSendOpen(false)} balance={totalStable} />
          </div>
        </DrawerContent>
      </Drawer>

      {/* Bank Transfer Top Up */}
      <Drawer open={bankTransferOpen} onOpenChange={setBankTransferOpen}>
        <DrawerContent className="max-w-lg mx-auto max-h-[90dvh]">
          <DrawerHeader className="sr-only">
            <DrawerTitle>Bank Transfer Top Up</DrawerTitle>
            <DrawerDescription>Add money via bank transfer</DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-6 pt-2 overflow-y-auto">
            {bankTransferOpen && (
              <KycGate ctaLabel="Verify to top up">
                <TopUpBankTransfer
                  userEmail={user?.email || ""}
                  chain={DEFAULT_CHAIN}
                  walletAddress={wallet.profile?.wallet_address || ""}
                  onClose={() => setBankTransferOpen(false)}
                />
              </KycGate>
            )}
          </div>
        </DrawerContent>
      </Drawer>

      {/* Global Transfers */}
      <Drawer open={globalTransferOpen} onOpenChange={setGlobalTransferOpen}>
        <DrawerContent className="max-w-lg mx-auto max-h-[90dvh]">
          <DrawerHeader className="sr-only">
            <DrawerTitle>Global Transfer</DrawerTitle>
            <DrawerDescription>Send money globally</DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-6 pt-2 overflow-y-auto">
            <GlobalTransferForm onClose={() => setGlobalTransferOpen(false)} balance={totalStable} onSendCrypto={wallet.sendTokens} />
          </div>
        </DrawerContent>
      </Drawer>

      {/* Withdraw Mobile Money */}
      <Drawer open={withdrawMobileOpen} onOpenChange={setWithdrawMobileOpen}>
        <DrawerContent className="max-w-lg mx-auto max-h-[90dvh]">
          <DrawerHeader className="sr-only">
            <DrawerTitle>Withdraw to Mobile Money</DrawerTitle>
            <DrawerDescription>Withdraw funds to mobile money</DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-6 pt-2 overflow-y-auto">
            {withdrawMobileOpen && (
              <KycGate ctaLabel="Verify to withdraw">
                <WithdrawMobileMoney walletBalance={totalStable} userName={user?.user_metadata?.name}
                  userPhone={user?.user_metadata?.phone || user?.phone || (wallet.profile as any)?.phone || ""}
                  onClose={() => setWithdrawMobileOpen(false)}
                  onSendCrypto={wallet.sendTokens} />
              </KycGate>
            )}
          </div>
        </DrawerContent>
      </Drawer>

      {/* Withdraw Bank */}
      <Drawer open={withdrawBankOpen} onOpenChange={setWithdrawBankOpen}>
        <DrawerContent className="max-w-lg mx-auto max-h-[90dvh]">
          <DrawerHeader className="sr-only">
            <DrawerTitle>Withdraw to Bank</DrawerTitle>
            <DrawerDescription>Withdraw funds to bank account</DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-6 pt-2 overflow-y-auto">
            {withdrawBankOpen && (
              <KycGate ctaLabel="Verify to withdraw">
                <WithdrawBank walletBalance={totalStable} userName={user?.user_metadata?.name}
                  onClose={() => setWithdrawBankOpen(false)}
                  onSendCrypto={wallet.sendTokens} />
              </KycGate>
            )}
          </div>
        </DrawerContent>
      </Drawer>

      {/* Withdraw Crypto */}
      <Drawer open={withdrawCryptoOpen} onOpenChange={setWithdrawCryptoOpen}>
        <DrawerContent className="max-w-lg mx-auto max-h-[90dvh]">
          <DrawerHeader className="text-center pt-6 pb-2">
            <DrawerTitle className="text-xl font-bold">Withdraw to Wallet</DrawerTitle>
            <DrawerDescription className="sr-only">Withdraw USDC to crypto wallet</DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-8 overflow-y-auto">
            <WithdrawCrypto onSend={wallet.sendTokens} loading={wallet.actionLoading}
              activeChain={wallet.activeChain} tokens={wallet.activeChain.tokens}
              onClose={() => setWithdrawCryptoOpen(false)} balance={totalStable} />
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
};

export default Dashboard;
