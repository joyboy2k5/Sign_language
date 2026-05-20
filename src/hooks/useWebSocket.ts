import { useEffect, useRef, useState } from "react";

export type WsStatus = "idle" | "connecting" | "open" | "closed" | "error";

export interface WsMessage {
  token: string;
  confidence?: number;
  latencyMs?: number;
  model?: string;
  type?: "token" | "meta" | "end";
  receivedAt: number;
}

export function useWebSocket(url: string, enabled: boolean) {
  const [status, setStatus] = useState<WsStatus>("idle");
  const [lastMessage, setLastMessage] = useState<WsMessage | null>(null);
  const [messageCount, setMessageCount] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) {
      setStatus("idle");
      return;
    }

    let cancelled = false;

    const connect = () => {
      if (cancelled) return;
      setStatus("connecting");
      let ws: WebSocket;
      try {
        ws = new WebSocket(url);
      } catch {
        setStatus("error");
        scheduleRetry();
        return;
      }
      wsRef.current = ws;

      ws.onopen = () => {
        if (cancelled) return;
        retryRef.current = 0;
        setStatus("open");
      };

      ws.onmessage = (ev) => {
        if (cancelled) return;
        const raw = typeof ev.data === "string" ? ev.data : "";
        let parsed: Partial<WsMessage> = {};
        try {
          const j = JSON.parse(raw);
          if (j && typeof j === "object") parsed = j;
          else parsed = { token: String(j) };
        } catch {
          parsed = { token: raw };
        }
        const msg: WsMessage = {
          token: parsed.token ?? "",
          confidence: parsed.confidence,
          latencyMs: parsed.latencyMs,
          model: parsed.model,
          type: parsed.type ?? "token",
          receivedAt: Date.now(),
        };
        setLastMessage(msg);
        setMessageCount((c) => c + 1);
      };

      ws.onerror = () => {
        if (cancelled) return;
        setStatus("error");
      };

      ws.onclose = () => {
        if (cancelled) return;
        setStatus("closed");
        scheduleRetry();
      };
    };

    const scheduleRetry = () => {
      if (cancelled) return;
      const attempt = Math.min(retryRef.current + 1, 6);
      retryRef.current = attempt;
      const wait = Math.min(1000 * 2 ** (attempt - 1), 15000);
      timerRef.current = setTimeout(connect, wait);
    };

    connect();

    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      try {
        wsRef.current?.close();
      } catch {
        /* noop */
      }
      wsRef.current = null;
    };
  }, [url, enabled]);

  return { status, lastMessage, messageCount };
}
