interface StatusBarProps {
  dbConnected: boolean;
  mlState: string;
  cameraState: string;
  fps: number;
  bufferLength: number;
}

function Pill({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "ok" | "warn" | "err" | "muted";
}) {
  const dot =
    tone === "ok"
      ? "bg-emerald-400"
      : tone === "warn"
        ? "bg-amber-400"
        : tone === "err"
          ? "bg-red-500"
          : "bg-zinc-500";
  return (
    <div className="flex items-center gap-2">
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <span className="font-mono text-[10px] uppercase tracking-widest text-foreground">
        {value}
      </span>
    </div>
  );
}

export function StatusBar({
  dbConnected,
  mlState,
  cameraState,
  fps,
  bufferLength,
}: StatusBarProps) {
  return (
    <footer className="flex flex-wrap items-center gap-x-6 gap-y-1 border-t border-border bg-sidebar px-4 py-2">
      <Pill
        label="db connection:"
        value={dbConnected ? "connected" : "offline"}
        tone={dbConnected ? "ok" : "err"}
      />
      <Pill
        label="ml engine:"
        value={mlState}
        tone={
          mlState === "streaming" ? "ok" : mlState === "idle" ? "warn" : "muted"
        }
      />
      <Pill
        label="camera status:"
        value={cameraState}
        tone={
          cameraState === "active"
            ? "ok"
            : cameraState === "denied" || cameraState === "error"
              ? "err"
              : "muted"
        }
      />
      <div className="ml-auto flex items-center gap-4">
        <Pill label="fps:" value={fps.toFixed(1)} tone="muted" />
        <Pill label="buf:" value={`${bufferLength}c`} tone="muted" />
      </div>
    </footer>
  );
}
