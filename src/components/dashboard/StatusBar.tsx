interface StatusBarProps {
  dbConnected: boolean;
  mlState: string;
  cameraState: string;
  fps: number;
  bufferLength: number;
  activeEngine?: "websocket" | "browser";
  handsDetected?: number;
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
    <div className="flex items-center gap-1.5">
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <span className="font-mono text-[10px] uppercase tracking-widest text-foreground font-medium">
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
  activeEngine = "browser",
  handsDetected = 0,
}: StatusBarProps) {
  return (
    <footer className="flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-border bg-sidebar px-4 py-2">
      <Pill
        label="db:"
        value={dbConnected ? "connected" : "offline"}
        tone={dbConnected ? "ok" : "err"}
      />
      <Pill
        label="engine:"
        value={activeEngine === "websocket" ? `ws.backend [${mlState}]` : `browser.ai [${mlState}]`}
        tone={
          mlState === "streaming" || mlState === "tracking"
            ? "ok"
            : mlState === "idle"
              ? "warn"
              : "muted"
        }
      />
      <Pill
        label="camera:"
        value={cameraState}
        tone={
          cameraState === "active"
            ? "ok"
            : cameraState === "denied" || cameraState === "error"
              ? "err"
              : "muted"
        }
      />
      <Pill
        label="hands:"
        value={`${handsDetected} tracked`}
        tone={handsDetected > 0 ? "ok" : "muted"}
      />
      <div className="ml-auto flex items-center gap-4">
        <Pill label="fps:" value={fps.toFixed(1)} tone="muted" />
        <Pill label="buf:" value={`${bufferLength} chars`} tone="muted" />
      </div>
    </footer>
  );
}
