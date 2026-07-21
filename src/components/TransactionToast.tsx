import {
  ArrowDownLeft,
  ArrowUpRight,
  Landmark,
  CheckCircle,
  Clock,
  Ban,
  XCircle,
} from "lucide-react";
import { truncateToken } from "@/lib/utils";

interface Props {
  type: "receive" | "fund" | "send";
  status: string;
  amount: string;
  token: string;
  chainName: string;
}

export function TransactionToast({
  type,
  status,
  amount,
  token,
  chainName,
}: Props) {
  const TypeIcon =
    type === "receive"
      ? ArrowDownLeft
      : type === "fund"
      ? Landmark
      : ArrowUpRight;

  const StatusIcon =
    status === "confirmed"
      ? CheckCircle
      : status === "pending"
      ? Clock
      : status === "blocked"
      ? Ban
      : XCircle;

  const typeLabel =
    type === "receive"
      ? "Received"
      : type === "fund"
      ? "Funded"
      : "Sent";

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <TypeIcon className="h-4 w-4" />
        <span>
          {typeLabel} {amount} {truncateToken(token)}
        </span>
      </div>
      <div className="flex items-center gap-2 text-sm opacity-80">
        <StatusIcon className="h-4 w-4" />
        <span>
          {status} on {chainName}
        </span>
      </div>
    </div>
  );
}
