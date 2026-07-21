import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell, X, ArrowUpRight, ArrowDownLeft, Landmark, ExternalLink,
  Copy, Clock as ClockIcon,
} from "lucide-react";
import type { Transaction } from "@/lib/portal-api";
import { getChainByKey } from "@/lib/chains";
import { toast } from "sonner";
import { truncateToken } from "@/lib/utils";

export interface AppNotification {
  id: string;
  tx: Transaction;
  read: boolean;
  timestamp: number;
}

interface NotificationCenterProps {
  notifications: AppNotification[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onClear: () => void;
}

const txIcons: Record<string, typeof ArrowUpRight> = {
  send: ArrowUpRight,
  receive: ArrowDownLeft,
  fund: Landmark,
};

const txColors: Record<string, string> = {
  send: "bg-destructive/10 text-destructive",
  receive: "bg-success/10 text-success",
  fund: "bg-primary/10 text-primary",
};

const txLabels: Record<string, string> = {
  send: "Sent",
  receive: "Received",
  fund: "Funded",
};

const NotificationCenter = ({ notifications, onMarkRead, onMarkAllRead, onClear }: NotificationCenterProps) => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const unreadCount = notifications.filter((n) => !n.read).length;

  const copyTxHash = useCallback((hash: string) => {
    navigator.clipboard.writeText(hash);
    toast.success("Transaction hash copied!");
  }, []);

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative flex items-center justify-center h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-colors"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground animate-pulse">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1.5 z-50 w-80 max-h-[420px] rounded-xl border border-border/60 bg-card shadow-xl overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
              <div className="flex items-center gap-2">
                <Bell className="h-3.5 w-3.5 text-primary" />
                <span className="text-sm font-semibold text-foreground">Notifications</span>
                {unreadCount > 0 && (
                  <span className="text-[9px] bg-primary/10 text-primary rounded-full px-1.5 py-0.5 font-medium">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={onMarkAllRead}
                    className="text-[10px] text-primary hover:text-primary/80 font-medium transition-colors px-1.5 py-1"
                  >
                    Mark all read
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    onClick={onClear}
                    className="text-[10px] text-muted-foreground hover:text-foreground font-medium transition-colors px-1.5 py-1"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Notification List */}
            <div className="overflow-y-auto flex-1">
              {notifications.length === 0 ? (
                <div className="text-center py-10 px-4">
                  <Bell className="mx-auto h-6 w-6 text-muted-foreground/20 mb-2" />
                  <p className="text-xs text-muted-foreground">No notifications yet</p>
                </div>
              ) : (
                <div className="divide-y divide-border/30">
                  {notifications.map((notif) => {
                    const tx = notif.tx;
                    const chain = getChainByKey(tx.chain);
                    const Icon = txIcons[tx.tx_type] || ArrowUpRight;
                    const colorClass = txColors[tx.tx_type] || txColors.send;
                    const label = txLabels[tx.tx_type] || "Transaction";

                    return (
                      <div
                        key={notif.id}
                        onClick={() => onMarkRead(notif.id)}
                        className={`px-4 py-3 transition-colors cursor-pointer ${
                          notif.read ? "bg-transparent" : "bg-primary/[0.03]"
                        } hover:bg-secondary/20`}
                      >
                        <div className="flex items-start gap-3">
                          {/* Icon */}
                          <div className={`shrink-0 rounded-lg p-1.5 mt-0.5 ${colorClass}`}>
                            <Icon className="h-3.5 w-3.5" />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-semibold text-foreground">{label}</span>
                              <span className={`text-[9px] rounded px-1 py-0.5 ${
                                tx.status === "confirmed"
                                  ? "bg-success/10 text-success"
                                  : tx.status === "pending"
                                  ? "bg-warning/10 text-warning"
                                  : "bg-destructive/10 text-destructive"
                              }`}>
                                {tx.status}
                              </span>
                              {!notif.read && (
                                <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                              )}
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                              <span className={tx.tx_type === "send" ? "text-destructive" : "text-success"}>
                                {tx.tx_type === "send" ? "-" : "+"}{tx.amount} {truncateToken(tx.token)}
                              </span>
                              {" "}on {chain.name}
                            </p>
                            <p className="text-[10px] text-muted-foreground/60 font-mono truncate mt-0.5">
                              {tx.tx_type === "receive" ? "From" : "To"}: {tx.to_address.slice(0, 6)}…{tx.to_address.slice(-4)}
                            </p>

                            {/* Quick Actions */}
                            <div className="flex items-center gap-1 mt-2">
                              {tx.tx_hash && (
                                <>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      copyTxHash(tx.tx_hash!);
                                    }}
                                    className="flex items-center gap-1 rounded-md bg-secondary/40 px-2 py-1 text-[9px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                                  >
                                    <Copy className="h-2.5 w-2.5" />
                                    Copy Hash
                                  </button>
                                  <a
                                    href={`${chain.explorerTxUrl}${tx.tx_hash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="flex items-center gap-1 rounded-md bg-secondary/40 px-2 py-1 text-[9px] font-medium text-muted-foreground hover:text-primary transition-colors"
                                  >
                                    <ExternalLink className="h-2.5 w-2.5" />
                                    Explorer
                                  </a>
                                </>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpen(false);
                                  navigate("/activity");
                                }}
                                className="flex items-center gap-1 rounded-md bg-secondary/40 px-2 py-1 text-[9px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                              >
                                <ClockIcon className="h-2.5 w-2.5" />
                                Activity
                              </button>
                            </div>
                          </div>

                          {/* Timestamp */}
                          <span className="text-[9px] text-muted-foreground/50 shrink-0 mt-0.5">
                            {formatTimeAgo(notif.timestamp)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

function formatTimeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export default NotificationCenter;
