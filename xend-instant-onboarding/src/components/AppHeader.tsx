import { RefreshCw, LogOut, Wallet, Clock, BookUser, User } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import XendLogo from "@/components/XendLogo";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/ThemeToggle";
import NotificationCenter from "@/components/NotificationCenter";

interface AppHeaderProps {
  chainName?: string;
  notifications?: any[];
  onMarkRead?: (id: string) => void;
  onMarkAllRead?: () => void;
  onClear?: () => void;
  onRefresh?: () => void;
  onSignOut?: () => void;
}

const AppHeader = ({
  chainName,
  notifications,
  onMarkRead,
  onMarkAllRead,
  onClear,
  onRefresh,
  onSignOut,
}: AppHeaderProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { path: "/dashboard", icon: Wallet, label: "Home" },
    { path: "/activity", icon: Clock, label: "Activity" },
    { path: "/contacts", icon: BookUser, label: "Contacts" },
    { path: "/profile", icon: User, label: "Profile" },
  ];

  return (
    <header className="sticky top-0 z-20 border-b border-border/40 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <XendLogo className="h-7 w-7 rounded-lg" />
          <span className="text-sm font-bold text-foreground">
            Xend<span className="text-primary">App</span>
          </span>
        </div>

        {chainName && (
          <div className="flex items-center gap-1.5 rounded-lg bg-secondary/50 px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-success inline-block" />
            {chainName}
          </div>
        )}

        <div className="flex items-center gap-0.5">
          <div className="hidden md:flex items-center gap-1 mr-1">
            {navItems.map((tab) => (
              <button
                key={tab.path}
                onClick={() => navigate(tab.path)}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  location.pathname === tab.path
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/30"
                }`}
              >
                <tab.icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            ))}
          </div>
          {notifications && onMarkRead && onMarkAllRead && onClear && (
            <NotificationCenter
              notifications={notifications}
              onMarkRead={onMarkRead}
              onMarkAllRead={onMarkAllRead}
              onClear={onClear}
            />
          )}
          <ThemeToggle />
          {onRefresh && (
            <Button variant="ghost" size="sm" onClick={onRefresh} className="text-muted-foreground hover:text-foreground h-9 w-9 p-0">
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
          {onSignOut && (
            <Button variant="ghost" size="sm" onClick={onSignOut} className="text-muted-foreground hover:text-destructive h-9 w-9 p-0">
              <LogOut className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
