'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';

export interface AuthUser {
  id: string;
  email: string;
}

export interface UserProfileSummary {
  points: number;
  isPro: boolean;
  proExpiresAt: string | null;
  dailySearchCount: number;
  quotaRemaining: number;
}

export interface SubscriptionItem {
  id: string;
  order_id: string;
  amount: number;
  status: string;
  payment_type: string | null;
  paid_at: string | null;
  created_at: string;
}

interface QuotaStorage {
  date: string;
  remaining: number;
  proUntil: number | null;
}

interface MidtransSnap {
  pay: (
    token: string,
    callbacks: {
      onSuccess?: (result: unknown) => void;
      onPending?: (result: unknown) => void;
      onError?: (result: unknown) => void;
      onClose?: () => void;
    }
  ) => void;
}

declare global {
  interface Window {
    snap?: MidtransSnap;
  }
}

interface AppContextValue {
  user: AuthUser | null;
  profile: UserProfileSummary | null;
  subscriptions: SubscriptionItem[];
  authLoaded: boolean;
  quotaRemaining: number;
  isPro: boolean;
  consumeGuestQuota: () => boolean;
  syncServerQuota: (remaining?: number) => void;
  unlockPro24h: () => void;
  refreshSession: () => Promise<void>;
  startProCheckout: () => Promise<{ error?: string }>;
  checkoutLoading: boolean;
  isPaywallOpen: boolean;
  openPaywall: () => void;
  closePaywall: () => void;
  toastMessage: string | null;
  showToast: (message: string) => void;
}

const STORAGE_KEY = 'laperhemat_quota_v1';
const DAILY_FREE_QUOTA = 2;

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function loadSnapScript(scriptUrl: string, clientKey: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.snap) {
      resolve(true);
      return;
    }
    const existing = document.getElementById('midtrans-snap-script');
    if (existing) {
      existing.addEventListener('load', () => resolve(Boolean(window.snap)), { once: true });
      existing.addEventListener('error', () => resolve(false), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.id = 'midtrans-snap-script';
    script.src = scriptUrl;
    script.async = true;
    script.setAttribute('data-client-key', clientKey);
    script.onload = () => resolve(Boolean(window.snap));
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfileSummary | null>(null);
  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>([]);
  const [authLoaded, setAuthLoaded] = useState(false);

  const [guestQuota, setGuestQuota] = useState<number>(DAILY_FREE_QUOTA);
  const [guestProUntil, setGuestProUntil] = useState<number | null>(null);

  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  }, []);

  const persistGuest = useCallback((remaining: number, nextProUntil: number | null) => {
    try {
      const payload: QuotaStorage = {
        date: getTodayKey(),
        remaining,
        proUntil: nextProUntil,
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore storage quota issues
    }
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      const res = await fetch('/api/me', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      setUser(data.user ?? null);
      setProfile(data.profile ?? null);
      setSubscriptions(data.subscriptions ?? []);
    } catch {
      // Keep current state on transient network errors
    } finally {
      setAuthLoaded(true);
    }
  }, []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as QuotaStorage;
        const today = getTodayKey();
        const activePro =
          parsed.proUntil && parsed.proUntil > Date.now() ? parsed.proUntil : null;
        setGuestProUntil(activePro);
        if (parsed.date === today && typeof parsed.remaining === 'number') {
          setGuestQuota(Math.max(0, Math.min(DAILY_FREE_QUOTA, parsed.remaining)));
        }
      }
    } catch {
      // Ignore malformed storage
    }
    void refreshSession();
  }, [refreshSession]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const isGuestPro = guestProUntil !== null && guestProUntil > Date.now();
  const isPro = user ? Boolean(profile?.isPro) : isGuestPro;
  const quotaRemaining = user ? (profile?.quotaRemaining ?? DAILY_FREE_QUOTA) : guestQuota;

  const consumeGuestQuota = useCallback(() => {
    if (user) {
      // Logged-in quota is enforced server-side in /api/optimize
      if (!profile?.isPro && (profile?.quotaRemaining ?? 0) <= 0) {
        setIsPaywallOpen(true);
        return false;
      }
      return true;
    }
    if (guestProUntil !== null && guestProUntil > Date.now()) {
      return true;
    }
    if (guestQuota <= 0) {
      setIsPaywallOpen(true);
      return false;
    }
    const next = guestQuota - 1;
    setGuestQuota(next);
    persistGuest(next, null);
    return true;
  }, [guestProUntil, guestQuota, persistGuest, profile?.isPro, profile?.quotaRemaining, user]);

  const syncServerQuota = useCallback((remaining?: number) => {
    if (typeof remaining !== 'number') return;
    setProfile((prev) => (prev ? { ...prev, quotaRemaining: remaining } : prev));
  }, []);

  const unlockPro24h = useCallback(() => {
    if (user) {
      void refreshSession();
      return;
    }
    const nextProUntil = Date.now() + 24 * 60 * 60 * 1000;
    setGuestProUntil(nextProUntil);
    persistGuest(guestQuota, nextProUntil);
  }, [guestQuota, persistGuest, refreshSession, user]);

  const startProCheckout = useCallback(async (): Promise<{ error?: string }> => {
    if (!user) {
      setIsPaywallOpen(false);
      showToast('Masuk dulu untuk mengaktifkan langganan Pro.');
      router.push('/account');
      return {};
    }

    setCheckoutLoading(true);
    try {
      const res = await fetch('/api/checkout', { method: 'POST' });
      const data = await res.json();

      if (!res.ok) {
        const msg = data.error ?? 'Gagal memulai checkout Midtrans.';
        showToast(msg);
        return { error: msg };
      }

      setIsPaywallOpen(false);
      const loaded = await loadSnapScript(data.snapScriptUrl, data.clientKey);

      if (loaded && window.snap) {
        window.snap.pay(data.snapToken, {
          onSuccess: async () => {
            showToast('Pembayaran diterima! Memverifikasi status Pro...');
            await fetch('/api/checkout/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ orderId: data.orderId }),
            });
            await refreshSession();
            showToast('LaperHemat Pro aktif selama 30 hari!');
          },
          onPending: async () => {
            await refreshSession();
            showToast('Menunggu pembayaran. Cek status di halaman Akun.');
          },
          onError: () => {
            showToast('Pembayaran gagal atau dibatalkan.');
          },
          onClose: () => {
            void refreshSession();
          },
        });
        return {};
      }

      if (data.redirectUrl) {
        window.open(data.redirectUrl, '_blank', 'noopener,noreferrer');
        showToast('Halaman pembayaran Midtrans dibuka di tab baru.');
        return {};
      }

      return { error: 'Midtrans Snap gagal dimuat.' };
    } catch {
      const msg = 'Gagal menghubungi server checkout.';
      showToast(msg);
      return { error: msg };
    } finally {
      setCheckoutLoading(false);
    }
  }, [refreshSession, router, showToast, user]);

  const openPaywall = useCallback(() => setIsPaywallOpen(true), []);
  const closePaywall = useCallback(() => setIsPaywallOpen(false), []);

  return (
    <AppContext.Provider
      value={{
        user,
        profile,
        subscriptions,
        authLoaded,
        quotaRemaining,
        isPro,
        consumeGuestQuota,
        syncServerQuota,
        unlockPro24h,
        refreshSession,
        startProCheckout,
        checkoutLoading,
        isPaywallOpen,
        openPaywall,
        closePaywall,
        toastMessage,
        showToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp harus digunakan di dalam AppProvider');
  return ctx;
}
