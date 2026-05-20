import type { RefObject } from "react";

interface WebcamViewportProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  status: string;
  error: string | null;
}

export function WebcamViewport({ videoRef, status, error }: WebcamViewportProps) {
  return (
    <div className="relative flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border bg-card px-3 py-1.5">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            cam.feed / mirrored / 1280×720
          </span>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          status: {status}
        </span>
      </div>
      <div className="relative flex-1 overflow-hidden bg-black">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="h-full w-full scale-x-[-1] object-cover"
        />
        {status !== "active" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 p-4 text-center">
            <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              {status === "requesting" && "requesting camera permission…"}
              {status === "denied" && "camera permission denied"}
              {status === "error" && (error ?? "camera unavailable")}
              {status === "idle" && "camera idle"}
            </span>
          </div>
        )}
        {/* corner brackets */}
        <div className="pointer-events-none absolute inset-3">
          <div className="absolute left-0 top-0 h-3 w-3 border-l border-t border-primary" />
          <div className="absolute right-0 top-0 h-3 w-3 border-r border-t border-primary" />
          <div className="absolute bottom-0 left-0 h-3 w-3 border-b border-l border-primary" />
          <div className="absolute bottom-0 right-0 h-3 w-3 border-b border-r border-primary" />
        </div>
      </div>
    </div>
  );
}
