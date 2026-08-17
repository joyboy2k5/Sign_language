interface TopBarProps {
  wsUrl: string;
  wsStatus: string;
  engineMode: string;
  activeEngine: "websocket" | "browser";
  onOpenReference: () => void;
  onOpenSettings: () => void;
}

const dotColor: Record<string, string> = {
  idle: "bg-zinc-600",
  connecting: "bg-amber-400 animate-pulse",
  open: "bg-emerald-400",
  closed: "bg-zinc-500",
  error: "bg-red-500",
};

export function TopBar({
  wsUrl,
  wsStatus,
  engineMode,
  activeEngine,
  onOpenReference,
  onOpenSettings,
}: TopBarProps) {
  return (
    <header className="flex items-center justify-between border-b border-border bg-sidebar px-4 py-2.5">
      <div className="flex items-center gap-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-sm bg-primary text-primary-foreground shadow-sm">
          <span className="font-mono text-xs font-bold tracking-tight">LT</span>
        </div>
        <div className="flex items-baseline gap-2">
          <h1 className="text-sm font-semibold tracking-tight text-foreground">
            Lucid Talk
          </h1>
          <span className="hidden sm:inline font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            sign-translation://realtime
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Active Engine Badge */}
        <div className="flex items-center gap-1.5 rounded-sm border border-border bg-card px-2 py-1">
          <span
            className={`h-2 w-2 rounded-full ${
              activeEngine === "websocket"
                ? dotColor[wsStatus] ?? "bg-zinc-500"
                : "bg-emerald-400 animate-pulse"
            }`}
          />
          <span className="font-mono text-[10px] uppercase tracking-widest text-foreground font-medium">
            {activeEngine === "websocket" ? `PY-BACKEND (${wsStatus})` : "BROWSER-AI"}
          </span>
        </div>

        <code className="hidden lg:inline font-mono text-[10px] text-muted-foreground">
          {wsUrl}
        </code>

        {/* Buttons for Reference & Settings */}
        <button
          type="button"
          onClick={onOpenReference}
          className="flex items-center gap-1.5 rounded-sm border border-border bg-card px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-foreground transition hover:border-primary/50 hover:bg-muted"
        >
          <span>📖</span>
          <span className="hidden sm:inline">Sign Guide</span>
        </button>

        <button
          type="button"
          onClick={onOpenSettings}
          className="flex items-center gap-1.5 rounded-sm border border-border bg-card px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-foreground transition hover:border-primary/50 hover:bg-muted"
        >
          <span>⚙</span>
          <span className="hidden sm:inline">Config</span>
        </button>
      </div>
    </header>
  );
}
