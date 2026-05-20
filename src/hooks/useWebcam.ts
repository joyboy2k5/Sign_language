import { useEffect, useRef, useState } from "react";

export type CameraStatus = "idle" | "requesting" | "active" | "denied" | "error";

export function useWebcam(enabled: boolean) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<CameraStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setStatus("error");
      setError("getUserMedia not supported");
      return;
    }

    let cancelled = false;
    setStatus("requesting");
    navigator.mediaDevices
      .getUserMedia({ video: { width: 1280, height: 720 }, audio: false })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => undefined);
        }
        setStatus("active");
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message);
        setStatus(err.name === "NotAllowedError" ? "denied" : "error");
      });

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
      setStatus("idle");
    };
  }, [enabled]);

  return { videoRef, status, error };
}
