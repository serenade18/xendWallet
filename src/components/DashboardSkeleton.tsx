import { Skeleton } from "@/components/ui/skeleton";
import BottomNav from "@/components/BottomNav";

export const DashboardSkeleton = () => (
  <div className="min-h-[100dvh] bg-background pb-20 md:pb-0">
    {/* Header skeleton */}
    <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
      <Skeleton className="h-8 w-24 rounded-lg" />
      <div className="flex gap-2">
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
    </div>

    <main className="mx-auto max-w-lg px-4 pt-6 pb-8 space-y-4">
      {/* Balance */}
      <div className="flex flex-col items-center gap-2 py-2">
        <Skeleton className="h-3 w-32 rounded" />
        <Skeleton className="h-14 w-48 rounded-lg" />
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <Skeleton className="flex-1 h-14 rounded-2xl" />
        <Skeleton className="flex-1 h-14 rounded-2xl" />
      </div>

      {/* Card promo */}
      <Skeleton className="h-32 w-full rounded-2xl" />

      {/* Two tiles */}
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
      </div>

      {/* Transactions */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-28 rounded" />
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-3 py-3">
            <Skeleton className="h-10 w-10 rounded-full shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-24 rounded" />
              <Skeleton className="h-3 w-16 rounded" />
            </div>
            <Skeleton className="h-4 w-16 rounded" />
          </div>
        ))}
      </div>
    </main>
    <BottomNav />
  </div>
);

export const ActivitySkeleton = () => (
  <div className="min-h-[100dvh] bg-background pb-20 md:pb-8">
    <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
      <Skeleton className="h-8 w-24 rounded-lg" />
      <div className="flex gap-2">
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
    </div>
    <main className="mx-auto max-w-lg px-4 py-4 space-y-2">
      <Skeleton className="h-5 w-32 rounded mb-3" />
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="flex items-center gap-3 py-3">
          <Skeleton className="h-10 w-10 rounded-full shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-28 rounded" />
            <Skeleton className="h-3 w-20 rounded" />
          </div>
          <Skeleton className="h-4 w-16 rounded" />
        </div>
      ))}
    </main>
    <BottomNav />
  </div>
);

export const ContactsSkeleton = () => (
  <div className="min-h-[100dvh] bg-background pb-20 md:pb-8">
    <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
      <Skeleton className="h-8 w-24 rounded-lg" />
    </div>
    <main className="mx-auto max-w-lg px-4 py-4 space-y-4">
      <div className="flex gap-2">
        <Skeleton className="flex-1 h-10 rounded-lg" />
        <Skeleton className="h-10 w-10 rounded-lg" />
      </div>
      <div className="rounded-2xl border border-border/60 overflow-hidden divide-y divide-border/30">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <Skeleton className="h-10 w-10 rounded-full shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-24 rounded" />
              <Skeleton className="h-3 w-32 rounded" />
            </div>
          </div>
        ))}
      </div>
    </main>
    <BottomNav />
  </div>
);

export const ProfileSkeleton = () => (
  <div className="min-h-[100dvh] bg-background pb-20 md:pb-8">
    <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
      <Skeleton className="h-8 w-24 rounded-lg" />
    </div>
    <main className="mx-auto max-w-lg px-4 py-6 space-y-5">
      <div className="flex flex-col items-center gap-3">
        <Skeleton className="h-20 w-20 rounded-full" />
        <Skeleton className="h-5 w-28 rounded" />
        <Skeleton className="h-3.5 w-40 rounded" />
      </div>
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-14 w-full rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-40 w-full rounded-xl" />
      <Skeleton className="h-11 w-full rounded-xl" />
    </main>
    <BottomNav />
  </div>
);
