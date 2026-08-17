import type { RefObject } from "react";

interface WebcamViewportProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  status: string;
  error: string | null;
  activeModel?: string | null;
  currentEngine?: string;
  detectedToken?: string | null;
  detectedConfidence?: number | null;
  mirrored?: boolean;
  showSkeleton?: boolean;
  onToggleSkeleton?: () => void;
  onToggleMirror?: () => void;
}

export function WebcamViewport({
  videoRef,
  canvasRef,
  status,
  error,
  activeModel,
  currentEngine = "browser",
  detectedToken,
  detectedConfidence,
  mirrored = true,
  showSkeleton = true,
  onToggleSkeleton,
  onToggleMirror,
}: WebcamViewportProps) {
  return (
    <div className="relative flex h-full flex-col bg-black">
      {/* Viewport Top Bar */}
      <div className="flex items-center justify-between border-b border-border bg-card px-3 py-1.5">
        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full ${
              status === "active" ? "bg-red-500 animate-pulse" : "bg-zinc-600"
            }`}
          />
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            LIVE.FEED // {mirrored ? "MIRRORED" : "NORMAL"} // {currentEngine.toUpperCase()}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onToggleMirror && (
            <button
              type="button"
              onClick={onToggleMirror}
              title="Toggle Flip / Mirror"
              className={`rounded-sm border border-border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider transition ${
                mirrored ? "bg-primary/20 text-primary border-primary/50" : "bg-card text-muted-foreground"
              }`}
            >
              MIRROR
            </button>
          )}

          {onToggleSkeleton && (
            <button
              type="button"
              onClick={onToggleSkeleton}
              title="Toggle Landmark Overlay"
              className={`rounded-sm border border-border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider transition ${
                showSkeleton ? "bg-primary/20 text-primary border-primary/50" : "bg-card text-muted-foreground"
              }`}
            >
              SKELETON
            </button>
          )}

          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            CAM.{status}
          </span>
        </div>
      </div>

      {/* Video & Canvas Overlay */}
      <div className="relative flex-1 overflow-hidden bg-black flex items-center justify-center">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`h-full w-full object-contain ${mirrored ? "scale-x-[-1]" : ""}`}
        />

        <canvas
          ref={canvasRef}
          className={`pointer-events-none absolute inset-0 h-full w-full object-contain ${
            mirrored ? "scale-x-[-1]" : ""
          }`}
        />

        {status !== "active" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 p-4 text-center">
            <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              {status === "requesting" && "requesting camera permission…"}
              {status === "denied" && "camera permission denied — please allow webcam access"}
              {status === "error" && (error ?? "camera unavailable")}
              {status === "idle" && "camera idle"}
            </span>
          </div>
        )}

        {/* Floating Real-Time Recognition Pill */}
        {detectedToken && detectedConfidence && detectedConfidence > 0.5 && status === "active" && (
          <div className="absolute top-3 left-3 z-10 flex items-center gap-2 rounded-sm border border-primary/60 bg-black/80 px-2.5 py-1 backdrop-blur-md">
            <span className="h-2 w-2 rounded-full bg-primary animate-ping" />
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-primary">
              {detectedToken}
            </span>
            <span className="rounded bg-primary/20 px-1 font-mono text-[10px] text-primary-foreground font-medium">
              {(detectedConfidence * 100).toFixed(0)}%
            </span>
          </div>
        )}

        {/* Model Watermark / Engine Indicator */}
        <div className="pointer-events-none absolute bottom-3 right-3 rounded bg-black/60 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-muted-foreground backdrop-blur-sm">
          {activeModel ?? "LUCID-VISION-ASL"}
        </div>

        {/* Cyberpunk HUD Corner Brackets */}
        <div className="pointer-events-none absolute inset-3">
          <div className="absolute left-0 top-0 h-3 w-3 border-l border-t border-primary/70" />
          <div className="absolute right-0 top-0 h-3 w-3 border-r border-t border-primary/70" />
          <div className="absolute bottom-0 left-0 h-3 w-3 border-b border-l border-primary/70" />
          <div className="absolute bottom-0 right-0 h-3 w-3 border-b border-r border-primary/70" />
        </div>
      </div>
    </div>
  );
}
