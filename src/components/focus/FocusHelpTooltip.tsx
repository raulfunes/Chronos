import React from 'react';
import { CircleHelp } from 'lucide-react';
import { CUSTOM_SCHEDULE_TOOLTIP_LINES } from '../../lib/focus-session-shared';

export function FocusHelpTooltip() {
  return (
    <div className="group relative">
      <button
        type="button"
        className="flex h-11 w-11 items-center justify-center rounded-full border border-outline/12 bg-background text-on-surface-variant transition hover:border-primary/25 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/35"
        aria-label="Custom schedule details"
      >
        <CircleHelp className="h-4.5 w-4.5" />
      </button>

      <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-3 w-80 -translate-x-1/2 rounded-[1.4rem] border border-outline/14 bg-surface/95 p-4 opacity-0 shadow-[0_22px_50px_rgba(0,0,0,0.35)] transition duration-150 ease-out group-hover:opacity-100 group-focus-within:opacity-100">
        <p className="text-[10px] uppercase tracking-[0.24em] text-primary">Custom schedule</p>
        <ul className="mt-3 space-y-2 text-sm leading-6 text-on-surface-variant">
          {CUSTOM_SCHEDULE_TOOLTIP_LINES.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
