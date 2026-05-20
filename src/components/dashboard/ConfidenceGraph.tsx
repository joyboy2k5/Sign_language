import { useEffect, useRef } from "react";

interface ConfidenceGraphProps {
  history: number[]; // values 0..1
}

export function ConfidenceGraph({ history }: ConfidenceGraphProps) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    // gridlines
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = (h / 4) * i + 0.5;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    if (history.length === 0) {
      ctx.fillStyle = "rgba(161,161,170,0.7)";
      ctx.font = "10px JetBrains Mono, monospace";
      ctx.fillText("// no samples", 6, h / 2 + 3);
      return;
    }

    const max = 10;
    const slice = history.slice(-max);
    const step = w / Math.max(max - 1, 1);

    // line
    ctx.strokeStyle = "oklch(0.72 0.18 145)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    slice.forEach((v, i) => {
      const x = i * step;
      const y = h - Math.max(0, Math.min(1, v)) * h;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // fill under line
    ctx.lineTo((slice.length - 1) * step, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fillStyle = "oklch(0.72 0.18 145 / 0.12)";
    ctx.fill();

    // dots
    ctx.fillStyle = "oklch(0.72 0.18 145)";
    slice.forEach((v, i) => {
      const x = i * step;
      const y = h - Math.max(0, Math.min(1, v)) * h;
      ctx.beginPath();
      ctx.arc(x, y, 1.6, 0, Math.PI * 2);
      ctx.fill();
    });
  }, [history]);

  return <canvas ref={ref} className="h-12 w-full" />;
}
