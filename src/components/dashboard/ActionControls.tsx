interface ActionControlsProps {
  buffer: string;
  speaking: boolean;
  speechSupported: boolean;
  onSpeak: () => void;
  onClear: () => void;
  onCommit: () => void;
}

export function ActionControls({
  buffer,
  speaking,
  speechSupported,
  onSpeak,
  onClear,
  onCommit,
}: ActionControlsProps) {
  const hasText = buffer.trim().length > 0;
  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-border bg-sidebar px-3 py-2">
      <button
        type="button"
        onClick={onSpeak}
        disabled={!hasText || !speechSupported}
        className="rounded-sm border border-border bg-primary px-3 py-1.5 font-mono text-[11px] uppercase tracking-widest text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
      >
        {speaking ? "▶ speaking…" : "▶ speak"}
      </button>
      <button
        type="button"
        onClick={onCommit}
        disabled={!hasText}
        className="rounded-sm border border-border bg-card px-3 py-1.5 font-mono text-[11px] uppercase tracking-widest text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:text-muted-foreground"
      >
        ⏎ commit sentence
      </button>
      <button
        type="button"
        onClick={onClear}
        disabled={!hasText}
        className="rounded-sm border border-border bg-card px-3 py-1.5 font-mono text-[11px] uppercase tracking-widest text-foreground transition hover:bg-destructive hover:text-destructive-foreground disabled:cursor-not-allowed disabled:text-muted-foreground"
      >
        ✕ clear buffer
      </button>
      {!speechSupported && (
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          tts unsupported in this browser
        </span>
      )}
    </div>
  );
}
