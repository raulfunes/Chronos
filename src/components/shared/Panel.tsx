import React from 'react';

export function Panel({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return (
    <section className={`rounded-[2rem] border border-outline/10 bg-surface p-6 shadow-[0_20px_80px_rgba(0,0,0,0.18)] ${className}`}>
      {children}
    </section>
  );
}
