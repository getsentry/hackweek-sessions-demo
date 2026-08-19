const STORAGE_KEY = "storefront.preview";

export type StorefrontPreview = {
  discountBps: number;
  appliedAt: string;
};

const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

export function subscribeStorefrontPreview(onChange: () => void) {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

export function getStorefrontPreviewBps() {
  return readStorefrontPreview()?.discountBps ?? 0;
}

export function getServerStorefrontPreviewBps() {
  return 0;
}

export function readStorefrontPreview(): StorefrontPreview | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StorefrontPreview;
    if (!Number.isFinite(parsed.discountBps)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeStorefrontPreview(preview: StorefrontPreview) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(preview));
  notify();
}

export function clearStorefrontPreview() {
  sessionStorage.removeItem(STORAGE_KEY);
  notify();
}

export function netAmountCents(grossCents: number, discountBps: number) {
  return Math.round(grossCents * (1 - discountBps / 10000));
}
