import React, { useEffect, useRef } from 'react';
import { AlertCircle, X } from 'lucide-react';

export function StatusBanner({
  error,
  onDismiss,
  layout = 'default',
}: {
  error: { id: number; message: string } | null;
  onDismiss(): void;
  layout?: 'default' | 'focus';
}) {
  const dismissTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!error) {
      return;
    }

    dismissTimeoutRef.current = window.setTimeout(onDismiss, 1650);

    return () => {
      if (dismissTimeoutRef.current) {
        window.clearTimeout(dismissTimeoutRef.current);
      }
    };
  }, [error?.id, onDismiss]);

  function handleDismiss() {
    if (dismissTimeoutRef.current) {
      window.clearTimeout(dismissTimeoutRef.current);
    }

    onDismiss();
  }

  if (!error) {
    return null;
  }

  return (
    <div
      className={`pointer-events-none fixed left-4 right-4 top-5 z-50 sm:left-6 sm:right-6 sm:top-6 ${
        layout === 'focus'
          ? 'xl:left-[calc(18rem+2.5rem)] xl:right-[calc(30rem+4rem)]'
          : 'xl:left-[calc(18rem+2.5rem)] xl:right-10'
      }`}
    >
      <div
        className="toast-enter pointer-events-auto mx-auto flex min-w-[280px] max-w-sm items-start gap-3 rounded-2xl border border-primary/20 bg-[rgba(45,40,39,0.92)] px-4 py-3 text-sm text-on-surface backdrop-blur-xl shadow-[0_24px_60px_rgba(0,0,0,0.42),0_8px_24px_rgba(255,87,34,0.12)]"
      >
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <span className="flex-1 leading-6">{error.message}</span>
        <button className="shrink-0 cursor-pointer text-primary/80 transition hover:text-primary" onClick={handleDismiss} aria-label="Dismiss error" type="button">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
