import { ConfidenceGraph } from "./ConfidenceGraph";

interface DiagnosticsPanelProps {
  confidence: number | null;
  latencyMs: number | null;
  fps: number;
  model: string | null;
  confidenceHistory: number[];
  messagesSeen: number;
}

function Metric({
  label,
  value,
  unit,
  tone = "neutral",
}: {
  label: string;
  value: string;
  unit?: string;
  tone?: "neutral" | "accent" | "muted";
}) {
  const color =
    tone === "accent"
      ? "text-primary"
      : tone === "muted"
        ? "text-muted-foreground"
        : "text-foreground";
  return (
    <div className="border border-border bg-card p-3">
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div className={`mt-1 font-mono text-xl tabular-nums ${color}`}>
        {value}
        {unit && (
          <span className="ml-1 text-[10px] uppercase tracking-widest text-muted-foreground">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}

export function DiagnosticsPanel({
  confidence,
  latencyMs,
  fps,
  model,
  confidenceHistory,
  messagesSeen,
}: DiagnosticsPanelProps) {
  return (
    <aside className="flex h-full flex-col border-l border-border bg-sidebar">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          model.diagnostics
        </span>
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          msgs: {messagesSeen}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-px bg-border">
        <Metric
          label="confidence"
          value={confidence != null ? (confidence * 100).toFixed(1) : "—"}
          unit="%"
          tone={confidence != null ? "accent" : "muted"}
        />
        <Metric
          label="latency"
          value={latencyMs != null ? latencyMs.toFixed(0) : "—"}
          unit="ms"
          tone={latencyMs != null ? "neutral" : "muted"}
        />
        <Metric
          label="frame rate"
          value={fps > 0 ? fps.toFixed(1) : "—"}
          unit="fps"
          tone={fps > 0 ? "neutral" : "muted"}
        />
        <Metric
          label="model"
          value={model ?? "HandSign-LSTM-v2.1"}
          tone={model ? "neutral" : "muted"}
        />
      </div>

      <div className="border-t border-border p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            confidence.history[−10:]
          </span>
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            n={confidenceHistory.length}
          </span>
        </div>
        <div className="border border-border bg-card p-2">
          <ConfidenceGraph history={confidenceHistory} />
        </div>
      </div>

      <div className="mt-auto border-t border-border p-3">
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          pipeline.notes
        </div>
        <ul className="mt-2 space-y-1 font-mono text-[11px] text-muted-foreground">
          <li>· input: 1 × rgb webcam @ 30fps</li>
          <li>· preproc: mediapipe → 21·landmark vec</li>
          <li>· decoder: bi-lstm + ctc</li>
          <li>· transport: ws json frames</li>
        </ul>
      </div>
    </aside>
  );
}
