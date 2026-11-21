import { Flame } from 'lucide-react';

export default function Loading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex-1 min-h-[60dvh] flex flex-col items-center justify-center gap-3 text-center"
    >
      <span
        className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-200 text-orange-600 inline-flex items-center justify-center"
        aria-hidden="true"
      >
        <Flame className="w-6 h-6" strokeWidth={2.2} />
      </span>
      <p className="text-xs font-semibold text-slate-600">Memuat halaman...</p>
      <div className="w-32 h-1.5 rounded-full bg-slate-200 overflow-hidden" aria-hidden="true">
        <div className="lh-splash-bar h-full rounded-full bg-orange-600" />
      </div>
    </div>
  );
}
