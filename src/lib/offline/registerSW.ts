// Guarded service-worker registration. Refuses to register in dev,
// inside an iframe, in Lovable preview hosts, or when ?sw=off is set.
// In any refused context, unregister any existing /sw.js so a stale
// worker cannot keep serving cached HTML.

const PREVIEW_HOST_PATTERNS = [
  /^id-preview--/,
  /^preview--/,
];

const PREVIEW_HOST_SUFFIXES = [
  "lovableproject.com",
  "lovableproject-dev.com",
  ".lovableproject.com",
  ".lovableproject-dev.com",
  "beta.lovable.dev",
  ".beta.lovable.dev",
];

function isRefusedContext(): boolean {
  if (typeof window === "undefined") return true;
  if (!import.meta.env.PROD) return true;
  if (window.self !== window.top) return true;

  const host = window.location.hostname;
  if (PREVIEW_HOST_PATTERNS.some((re) => re.test(host))) return true;
  if (PREVIEW_HOST_SUFFIXES.some((s) => host === s || host.endsWith(s))) return true;

  const url = new URL(window.location.href);
  if (url.searchParams.get("sw") === "off") return true;

  return false;
}

async function unregisterAppSW() {
  if (!("serviceWorker" in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    for (const reg of regs) {
      const scriptUrl = reg.active?.scriptURL || reg.installing?.scriptURL || reg.waiting?.scriptURL || "";
      if (scriptUrl.endsWith("/sw.js")) {
        await reg.unregister();
      }
    }
  } catch {
    // best-effort
  }
}

export async function registerOfflineSW(): Promise<void> {
  if (isRefusedContext()) {
    await unregisterAppSW();
    return;
  }
  if (!("serviceWorker" in navigator)) return;

  try {
    const { registerSW } = await import("virtual:pwa-register");
    registerSW({ immediate: true });

    // Request persistent storage so IndexedDB (offline encounters, audio
    // chunks, queued items) is not evicted under storage pressure.
    if ("storage" in navigator && "persist" in navigator.storage) {
      try {
        await navigator.storage.persist();
      } catch {
        // ignore
      }
    }
  } catch (err) {
    console.warn("[sw] registration failed", err);
  }
}
