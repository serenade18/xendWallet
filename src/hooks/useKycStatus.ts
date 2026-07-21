import { useCallback, useEffect, useRef, useState } from "react";
import { noahApi, type NoahKycStatus } from "@/lib/noah-api";

/** Tracks Noah KYC status per user with automatic refresh and approval polling. */
export function useKycStatus(enabled: boolean = true) {
  const [status, setStatus] = useState<NoahKycStatus>("not_started");
  const [hostedUrl, setHostedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(enabled);
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef<number | null>(null);
  const refreshInFlightRef = useRef(false);

  const load = useCallback(async () => {
    try {
      const res = await noahApi.getKycStatus();
      setStatus(res.status);
      setHostedUrl(res.hostedUrl || null);
      setError(null);
    } catch (e: any) {
      setError(e?.message || "Failed to load KYC status");
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    if (refreshInFlightRef.current) return status;
    refreshInFlightRef.current = true;
    try {
      const res = await noahApi.refreshKycStatus();
      setStatus(res.status);
      setError(null);
      return res.status;
    } catch (e: any) {
      setError(e?.message || "Failed to refresh KYC status");
      return status;
    } finally {
      refreshInFlightRef.current = false;
    }
  }, [status]);

  /** Start KYC — returns the hosted URL. */
  const start = useCallback(async (fiatCurrencies: string[] = ["USD"]) => {
    const res = await noahApi.initiateKyc(window.location.origin, fiatCurrencies);
    const url = res.data?.hostedUrl || null;
    setHostedUrl(url);
    setStatus(res.status || "pending");
    return url;
  }, []);

  /** Poll refresh every N seconds while pending (used after opening hosted KYC). */
  const startPolling = useCallback((intervalMs = 4000, maxMs = 5 * 60 * 1000) => {
    if (pollingRef.current) window.clearInterval(pollingRef.current);
    const startedAt = Date.now();
    pollingRef.current = window.setInterval(async () => {
      const s = await refresh();
      if (s === "approved" || s === "rejected" || Date.now() - startedAt > maxMs) {
        if (pollingRef.current) {
          window.clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
      }
    }, intervalMs) as unknown as number;
  }, [refresh]);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      window.clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    load();
  }, [enabled, load]);

  // Continuously check for approval after KYC has been started so banners/gates
  // disappear without requiring another tap or a manual page refresh.
  useEffect(() => {
    if (!enabled || loading || status === "approved") {
      stopPolling();
      return;
    }

    if (status === "pending" || hostedUrl) {
      startPolling(6000, 15 * 60 * 1000);
    }

    return () => stopPolling();
  }, [enabled, hostedUrl, loading, startPolling, status, stopPolling]);

  // Refresh on window focus (user returning from hosted KYC tab)
  useEffect(() => {
    if (!enabled) return;
    const onFocus = () => {
      if (status !== "approved") refresh();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [enabled, status, refresh]);

  useEffect(() => () => stopPolling(), [stopPolling]);

  return {
    status,
    hostedUrl,
    loading,
    error,
    isApproved: status === "approved",
    refresh,
    start,
    startPolling,
    stopPolling,
    reload: load,
  };
}
