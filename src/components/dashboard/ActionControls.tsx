import { useState } from "react";

interface ActionControlsProps {
  buffer: string;
  speaking: boolean;
  speechSupported: boolean;
  onSpeak: () => void;
  onClear: () => void;
  onCommit: () => void;
  onBackspace?: () => void;
  onAddSpace?: () => void;
  onInjectToken?: (token: string) => void;
}

export function ActionControls({
  buffer,
  speaking,
  speechSupported,
  onSpeak,
  onClear,
  onCommit,
  onBackspace,
  onAddSpace,
  onInjectToken,
}: ActionControlsProps) {
  const hasText = buffer.trim().length > 0;
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!hasText) return;
    try {
      await navigator.clipboard.writeText(buffer);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  const quickSigns = ["HELLO", "THANK YOU", "I LOVE YOU", "YES", "NO", "PEACE", "OK", "L", "A", "B"];

  return (
    <div className="flex flex-col border-t border-border bg-sidebar">
      {/* Quick Sign Simulator Strip */}
      {onInjectToken && (
        <div className="flex items-center gap-1.5 overflow-x-auto border-b border-border/70 px-3 py-1.5 bg-card/60 scrollbar-none">
          <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground whitespace-nowrap">
            SIMULATE:
          </span>
          {quickSigns.map((sign) => (
            <button
              key={sign}
              type="button"
              onClick={() => onInjectToken(sign)}
              className="rounded-sm border border-border bg-card px-2 py-0.5 font-mono text-[10px] text-foreground transition hover:border-primary/60 hover:text-primary whitespace-nowrap"
            >
              +{sign}
            </button>
          ))}
        </div>
      )}

      {/* Main Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onSpeak}
            disabled={!hasText || !speechSupported}
            className="rounded-sm border border-border bg-primary px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-widest text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
          >
            {speaking ? "▶ speaking…" : "▶ speak (tts)"}
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
            onClick={handleCopy}
            disabled={!hasText}
            className="rounded-sm border border-border bg-card px-3 py-1.5 font-mono text-[11px] uppercase tracking-widest text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:text-muted-foreground"
          >
            {copied ? "✓ copied!" : "⎘ copy text"}
          </button>

          {onAddSpace && (
            <button
              type="button"
              onClick={onAddSpace}
              disabled={!hasText}
              className="rounded-sm border border-border bg-card px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-widest text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:text-muted-foreground"
              title="Add space"
            >
              ␣ space
            </button>
          )}

          {onBackspace && (
            <button
              type="button"
              onClick={onBackspace}
              disabled={!hasText}
              className="rounded-sm border border-border bg-card px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-widest text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:text-muted-foreground"
              title="Backspace last word/letter"
            >
              ⌫ delete
            </button>
          )}

          <button
            type="button"
            onClick={onClear}
            disabled={!hasText}
            className="rounded-sm border border-border bg-card px-3 py-1.5 font-mono text-[11px] uppercase tracking-widest text-foreground transition hover:bg-destructive hover:text-destructive-foreground disabled:cursor-not-allowed disabled:text-muted-foreground"
          >
            ✕ clear
          </button>
        </div>

        {!speechSupported && (
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            tts unsupported
          </span>
        )}
      </div>
    </div>
  );
}
