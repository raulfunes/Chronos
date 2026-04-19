import React from 'react';
import { ChevronDown, CircleOff, Sparkles, Trash2 } from 'lucide-react';
import {
  CustomScheduleBlock,
  FOCUS_SESSION_TYPES,
  SESSION_BADGE_CLASSES,
  SESSION_LABELS,
  formatDurationLabel,
  getCustomBlockHeadline,
} from '../../lib/focus-session-shared';
import { SessionType } from '../../types';

interface CustomScheduleBuilderProps {
  blocks: CustomScheduleBlock[];
  totalMinutes: number;
  hasRecoverableSession: boolean;
  onInsertBlock(insertIndex: number, type: SessionType): void;
  onReorderBlock(blockId: number, insertIndex: number): void;
  onUpdateBlock(id: number, patch: Partial<Pick<CustomScheduleBlock, 'type' | 'durationMinutes'>>): void;
  onDeleteBlock(id: number): void;
  onLoadClassicPomodoro(): void;
  onStartFlow(): void | Promise<void>;
}

function InsertControls({
  insertIndex,
  isDragging,
  isDropTarget,
  onInsertBlock,
  onDragOver,
  onDrop,
}: {
  insertIndex: number;
  isDragging: boolean;
  isDropTarget: boolean;
  onInsertBlock(insertIndex: number, type: SessionType): void;
  onDragOver(insertIndex: number, event: React.DragEvent<HTMLDivElement>): void;
  onDrop(insertIndex: number, event: React.DragEvent<HTMLDivElement>): void;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-full py-1 transition ${
        isDropTarget ? 'bg-primary/8 px-3' : ''
      }`}
      onDragOver={(event) => onDragOver(insertIndex, event)}
      onDrop={(event) => onDrop(insertIndex, event)}
    >
      <div className={`h-px flex-1 transition ${isDropTarget ? 'bg-primary/35' : 'bg-outline/12'}`} />
      <div className={`flex flex-wrap items-center justify-center gap-2 ${isDragging ? 'pointer-events-none' : ''}`}>
        {FOCUS_SESSION_TYPES.map((type) => (
          <button
            key={`${insertIndex}-${type}`}
            type="button"
            className="cursor-pointer rounded-full border border-outline/12 bg-surface px-3 py-2 text-[10px] font-bold uppercase tracking-[0.22em] text-on-surface transition hover:-translate-y-px hover:border-primary/25 hover:bg-primary/8 hover:text-primary"
            onClick={() => onInsertBlock(insertIndex, type)}
          >
            + {SESSION_LABELS[type]}
          </button>
        ))}
      </div>
      <div className={`h-px flex-1 transition ${isDropTarget ? 'bg-primary/35' : 'bg-outline/12'}`} />
    </div>
  );
}

function CustomScheduleBlockCard({
  block,
  index,
  isDragging,
  onUpdateBlock,
  onDeleteBlock,
  onDragStart,
  onDragEnd,
}: {
  block: CustomScheduleBlock;
  index: number;
  isDragging: boolean;
  onUpdateBlock(id: number, patch: Partial<Pick<CustomScheduleBlock, 'type' | 'durationMinutes'>>): void;
  onDeleteBlock(id: number): void;
  onDragStart(blockId: number, event: React.DragEvent<HTMLButtonElement>): void;
  onDragEnd(): void;
}) {
  return (
    <div className={`grid gap-5 rounded-[1.8rem] border border-outline/10 bg-surface/90 px-5 py-5 transition xl:grid-cols-[92px_minmax(0,1fr)_minmax(0,340px)] ${
      isDragging ? 'scale-[0.985] border-primary/25 opacity-45' : ''
    }`}>
      <div className="flex items-center gap-3 xl:flex-col xl:items-start xl:justify-center">
        <button
          type="button"
          draggable
          className="flex h-12 w-12 cursor-grab items-center justify-center rounded-2xl border border-outline/10 bg-background text-sm font-bold text-on-surface transition hover:border-primary/25 hover:text-primary active:cursor-grabbing"
          onDragStart={(event) => onDragStart(block.id, event)}
          onDragEnd={onDragEnd}
          aria-label={`Drag step ${index + 1} to reorder`}
          title="Drag to reorder"
        >
          {index + 1}
        </button>
        <span className="text-[10px] uppercase tracking-[0.22em] text-on-surface-variant">Ready</span>
      </div>

      <div>
        <div className="flex flex-wrap items-center gap-3">
          <span className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em] ${SESSION_BADGE_CLASSES[block.type]}`}>
            {SESSION_LABELS[block.type]}
          </span>
          <span className="text-[10px] uppercase tracking-[0.24em] text-on-surface-variant">
            {block.durationMinutes} min
          </span>
        </div>
        <p className="mt-3 font-headline text-3xl font-extrabold tracking-tight">
          {getCustomBlockHeadline(block.type)}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_120px_auto] xl:self-center">
        <label className="rounded-[1.25rem] border border-outline/10 bg-surface px-4 py-3">
          <span className="block text-[10px] uppercase tracking-[0.24em] text-on-surface-variant">Type</span>
          <select
            className="dark-select mt-3 w-full bg-transparent text-sm outline-none"
            value={block.type}
            onChange={(event) => onUpdateBlock(block.id, { type: event.target.value as SessionType })}
          >
            {FOCUS_SESSION_TYPES.map((type) => (
              <option key={type} value={type}>{SESSION_LABELS[type]}</option>
            ))}
          </select>
        </label>

        <label className="rounded-[1.25rem] border border-outline/10 bg-surface px-4 py-3">
          <span className="block text-[10px] uppercase tracking-[0.24em] text-on-surface-variant">Minutes</span>
          <input
            type="number"
            min={1}
            className="mt-3 w-full bg-transparent text-sm outline-none"
            value={block.durationMinutes}
            onChange={(event) => onUpdateBlock(block.id, { durationMinutes: Number(event.target.value) })}
          />
        </label>

        <button
          type="button"
          className="flex h-full cursor-pointer items-center justify-center rounded-[1.25rem] border border-outline/10 bg-surface px-4 text-on-surface-variant transition hover:border-primary/30 hover:bg-primary/8 hover:text-primary"
          onClick={() => onDeleteBlock(block.id)}
          aria-label={`Delete step ${index + 1}`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function CustomScheduleBuilder({
  blocks,
  totalMinutes,
  hasRecoverableSession,
  onInsertBlock,
  onReorderBlock,
  onUpdateBlock,
  onDeleteBlock,
  onLoadClassicPomodoro,
  onStartFlow,
}: CustomScheduleBuilderProps) {
  const [draggedBlockId, setDraggedBlockId] = React.useState<number | null>(null);
  const [dropInsertIndex, setDropInsertIndex] = React.useState<number | null>(null);

  function handleDragStart(blockId: number, event: React.DragEvent<HTMLButtonElement>) {
    setDraggedBlockId(blockId);
    setDropInsertIndex(null);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(blockId));
  }

  function handleDragEnd() {
    setDraggedBlockId(null);
    setDropInsertIndex(null);
  }

  function handleDragOver(insertIndex: number, event: React.DragEvent<HTMLDivElement>) {
    if (draggedBlockId === null) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    if (dropInsertIndex !== insertIndex) {
      setDropInsertIndex(insertIndex);
    }
  }

  function handleDrop(insertIndex: number, event: React.DragEvent<HTMLDivElement>) {
    if (draggedBlockId === null) {
      return;
    }

    event.preventDefault();
    onReorderBlock(draggedBlockId, insertIndex);
    setDraggedBlockId(null);
    setDropInsertIndex(null);
  }

  return (
    <div className="mt-6 flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.5rem] border border-outline/10 bg-background/45 px-4 py-4">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.24em] text-primary transition hover:-translate-y-px hover:border-primary/35 hover:bg-primary/14 hover:shadow-[0_10px_28px_rgba(255,87,34,0.14)]"
            onClick={onLoadClassicPomodoro}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Classic pomodoro
          </button>
          <span className="rounded-full border border-outline/10 bg-surface px-3 py-2 text-[10px] uppercase tracking-[0.24em] text-on-surface-variant">
            {formatDurationLabel(totalMinutes)}
          </span>
          <span className="rounded-full border border-outline/10 bg-surface px-3 py-2 text-[10px] uppercase tracking-[0.24em] text-on-surface-variant">
            {String(blocks.length).padStart(2, '0')} blocks
          </span>
        </div>

        <button
          type="button"
          disabled={blocks.length === 0 || hasRecoverableSession}
          className="cursor-pointer rounded-[1.2rem] bg-linear-to-r from-primary to-primary-container px-5 py-3 text-sm font-bold uppercase tracking-[0.22em] text-background shadow-[0_20px_40px_rgba(255,87,34,0.22)] transition hover:-translate-y-px hover:brightness-105 hover:shadow-[0_24px_48px_rgba(255,87,34,0.28)] disabled:cursor-not-allowed disabled:opacity-40"
          onClick={() => void onStartFlow()}
        >
          Start flow
        </button>
      </div>

      <div className="custom-scrollbar mt-4 min-h-0 flex-1 overflow-y-auto pr-2">
        {blocks.length === 0 ? (
          <div className="flex h-full min-h-[360px] flex-col items-center justify-center rounded-[2rem] border border-dashed border-outline/18 bg-background/40 px-8 text-center">
            <CircleOff className="h-10 w-10 text-primary/70" />
            <p className="mt-5 font-headline text-3xl font-bold tracking-tight">Build your first custom flow</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {FOCUS_SESSION_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  className="cursor-pointer rounded-full border border-outline/12 bg-surface px-4 py-3 text-xs font-bold uppercase tracking-[0.22em] text-on-surface transition hover:-translate-y-px hover:border-primary/25 hover:bg-primary/8 hover:text-primary"
                  onClick={() => onInsertBlock(0, type)}
                >
                  Add {SESSION_LABELS[type]}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4 pb-2">
            {blocks.map((block, index) => (
              <React.Fragment key={block.id}>
                <InsertControls
                  insertIndex={index}
                  isDragging={draggedBlockId !== null}
                  isDropTarget={dropInsertIndex === index}
                  onInsertBlock={onInsertBlock}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                />
                <CustomScheduleBlockCard
                  block={block}
                  index={index}
                  isDragging={draggedBlockId === block.id}
                  onUpdateBlock={onUpdateBlock}
                  onDeleteBlock={onDeleteBlock}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                />
              </React.Fragment>
            ))}

            <div className="flex h-14 w-14 items-center justify-center self-center rounded-full border border-outline/15 bg-background text-on-surface-variant">
              <ChevronDown className="h-5 w-5" />
            </div>
            <InsertControls
              insertIndex={blocks.length}
              isDragging={draggedBlockId !== null}
              isDropTarget={dropInsertIndex === blocks.length}
              onInsertBlock={onInsertBlock}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            />
          </div>
        )}
      </div>
    </div>
  );
}
