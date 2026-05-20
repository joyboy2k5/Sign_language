interface TopBarProps {
  wsUrl: string;
  wsStatus: string;
}

const dotColor: Record<string, string> = {
  idle: "bg-zinc-600",
  connecting: "bg-amber-400 animate-pulse",
  open: "bg-emerald-400",
  closed: "bg-zinc-500",
  error: "bg-red-500",
};

export function TopBar({ wsUrl, wsStatus }: TopBarProps) {
  return (
    <header className="flex items-center justify-between border-b border-border bg-sidebar px-4 py-2.5">
      <div className="flex items-center gap-3">
        <div className="flex h-6 w-6 items-center justify-center rounded-sm bg-primary text-primary-foreground">
          <span className="font-mono text-[11px] font-bold">LT</span>
        </div>
        <div className="flex items-baseline gap-2">
          <h1 className="text-sm font-semibold tracking-tight">Lucid Talk</h1>
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            sign-translation://realtime
          </span>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <code className="hidden font-mono text-[11px] text-muted-foreground sm:inline">
          {wsUrl}
        </code>
        <div className="flex items-center gap-1.5 rounded-sm border border-border bg-card px-2 py-1">
          <span
            className={`h-1.5 w-1.5 rounded-full ${dotColor[wsStatus] ?? "bg-zinc-500"}`}
          />
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            ws.{wsStatus}
          </span>
        </div>
      </div>
    </header>
  );
}
