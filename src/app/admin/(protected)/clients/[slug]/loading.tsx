function SkeletonBlock({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-os-card/40 ${className ?? ""}`} />;
}

export default function ClientDetailLoading() {
  return (
    <div>
      <div className="mb-6 space-y-2">
        <div className="h-6 w-48 animate-pulse rounded bg-os-card/50" />
        <div className="h-4 w-72 animate-pulse rounded bg-os-card/30" />
      </div>
      <div className="space-y-6">
        <SkeletonBlock className="h-40" />
        <SkeletonBlock className="h-32" />
        <SkeletonBlock className="h-24" />
      </div>
    </div>
  );
}
