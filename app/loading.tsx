export default function Loading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex-1 min-h-[60dvh] flex flex-col items-center justify-center gap-3 text-center"
    >
      <img
        src="/logo-icon.png"
        width={56}
        height={56}
        alt="LaperHemat"
        className="w-14 h-14 rounded-2xl object-contain"
      />
      <p className="text-xs font-semibold text-slate-600">Memuat halaman...</p>
      <div className="w-32 h-1.5 rounded-full bg-slate-200 overflow-hidden" aria-hidden="true">
        <div className="lh-splash-bar h-full rounded-full bg-orange-600" />
      </div>
    </div>
  );
}
