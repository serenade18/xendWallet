/**
 * Noah's hosted onboarding checkout runs on a fixed set of domains. Before we
 * ever put a `hostedUrl` into an <iframe src> (or window.open it), we verify
 * it's actually an https:// URL on one of those domains — the same allowlist
 * Portal's own SDK guide recommends — so a compromised/misbehaving backend
 * response can never smuggle in an arbitrary URL to embed or navigate to.
 */
const ALLOWED_HOSTED_KYC_HOSTS = new Set([
  "checkout.noah.com",
  "checkout.sandbox.noah.com",
  "staging-checkout.noah.com",
]);

export function getValidatedHostedKycUrl(rawUrl: string | null | undefined): string | null {
  if (!rawUrl) return null;
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "https:") return null;
    if (!ALLOWED_HOSTED_KYC_HOSTS.has(url.hostname)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function isAllowedHostedKycOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    return url.protocol === "https:" && ALLOWED_HOSTED_KYC_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}