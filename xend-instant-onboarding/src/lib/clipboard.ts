/**
 * Cross-browser clipboard copy that works on HTTP and HTTPS.
 * Falls back to execCommand when navigator.clipboard is unavailable (e.g. non-HTTPS).
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  // Try modern API first (requires HTTPS + secure context)
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fall through to fallback
    }
  }

  // Fallback: textarea + execCommand
  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    textarea.style.top = "-9999px";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}
