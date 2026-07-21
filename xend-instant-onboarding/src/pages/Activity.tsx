import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";
import { useContacts } from "@/hooks/useContacts";
import { useTransactionNotifications } from "@/hooks/useTransactionNotifications";
import AppHeader from "@/components/AppHeader";
import TransactionList from "@/components/TransactionList";
import BottomNav from "@/components/BottomNav";

const Activity = () => {
  const { user, signOut } = useAuth();
  const wallet = useWallet(user?.id);
  const { contacts } = useContacts(user?.id);
  const { notifications, markRead, markAllRead, clearAll } = useTransactionNotifications(wallet.transactions, user?.id);

  return (
    <div className="min-h-[100dvh] bg-background pb-20 md:pb-8">
      <AppHeader
        notifications={notifications}
        onMarkRead={markRead}
        onMarkAllRead={markAllRead}
        onClear={clearAll}
        onRefresh={wallet.refresh}
        onSignOut={signOut}
      />

      <main className="relative z-10 mx-auto max-w-lg px-4 py-4">
        <TransactionList transactions={wallet.transactions} activeChain={wallet.activeChain} contacts={contacts} />
      </main>

      <BottomNav />
    </div>
  );
};

export default Activity;
