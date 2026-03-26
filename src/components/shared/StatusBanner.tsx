import React from 'react';
import { AlertCircle, RefreshCcw } from 'lucide-react';

export function StatusBanner({
  error,
  onDismiss,
}: {
  error: string | null;
  onDismiss(): void;
}) {
  if (!error) {
    return null;
  }

  return (
    <div className="mb-6 flex items-center justify-between rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-on-surface">
      <span className="flex items-center gap-2">
        <AlertCircle className="h-4 w-4 text-primary" />
        {error}
      </span>
      <button className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-primary" onClick={onDismiss}>
        <RefreshCcw className="h-3 w-3" />
        Clear
      </button>
    </div>
  );
}
