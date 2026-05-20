import { useEffect, useMemo, useRef, useState } from "react";
import { TopBar } from "./TopBar";
import { StatusBar } from "./StatusBar";
import { WebcamViewport } from "./WebcamViewport";
import { TranslationBuffer } from "./TranslationBuffer";
import { ActionControls } from "./ActionControls";
import { SessionHistory } from "./SessionHistory";
import { DiagnosticsPanel } from "./DiagnosticsPanel";
import { useWebcam } from "@/hooks/useWebcam";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import { db } from "@/lib/db/localDb";

const WS_URL = "ws://localhost:8000/ws";

export function Dashboard() {
  // Camera
  const { videoRef, status: cameraStatus, error: cameraError } = useWebcam(true);

  // WS
  const { status: wsStatus, lastMessage, messageCount } = useWebSocket(WS_URL, true);

  // DB
  const [dbConnected, setDbConnected] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [historyRefresh, setHistoryRefresh] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      const ok = await db.ping();
      if (!alive) return;
      setDbConnected(ok);
      const s = await db.sessions.create();
      if (!alive) return;
      setSessionId(s.id);
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Translation buffer + diagnostics state — driven ONLY by ws messages.
  const [buffer, setBuffer] = useState("");
  const [tokenCount, setTokenCount] = useState(0);
  const [confidenceHistory, setConfidenceHistory] = useState<number[]>([]);
  const [confidenceSum, setConfidenceSum] = useState(0);
  const [confidenceN, setConfidenceN] = useState(0);
  const [model, setModel] = useState<string | null>(null);
  const arrivalsRef = useRef<number[]>([]);
  const [fps, setFps] = useState(0);
  const [lastArrival, setLastArrival] = useState<number | null>(null);

  const processedIdRef = useRef<number>(0);

  // Append tokens from incoming WS messages.
  useEffect(() => {
    if (!lastMessage) return;
    // dedupe — useEffect can re-fire on parent rerenders, gate by messageCount
    if (processedIdRef.current === messageCount) return;
    processedIdRef.current = messageCount;

    const m = lastMessage;
    setLastArrival(m.receivedAt);

    // model meta
    if (m.type === "meta") {
      if (m.model) setModel(m.model);
      return;
    }

    // end-of-sentence marker
    if (m.type === "end" || m.token === "<END>") {
      void commitSentence();
      return;
    }

    // token
    if (m.token) {
      setBuffer((b) => {
        // smart joining: word tokens with space, single chars without
        if (!b) return m.token;
        const needsSpace = m.token.length > 1 && !/^[.,!?;:]/.test(m.token);
        return needsSpace ? `${b} ${m.token}` : `${b}${m.token}`;
      });
      setTokenCount((c) => c + 1);
    }

    if (typeof m.confidence === "number") {
      const c = Math.max(0, Math.min(1, m.confidence));
      setConfidenceHistory((h) => [...h, c].slice(-10));
      setConfidenceSum((s) => s + c);
      setConfidenceN((n) => n + 1);
    }

    // FPS over rolling 10-message window
    const arrivals = arrivalsRef.current;
    arrivals.push(m.receivedAt);
    if (arrivals.length > 10) arrivals.shift();
    if (arrivals.length >= 2) {
      const seconds = (arrivals[arrivals.length - 1] - arrivals[0]) / 1000;
      setFps(seconds > 0 ? (arrivals.length - 1) / seconds : 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messageCount]);

  // Detect idle stream (open but quiet for >2s)
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const mlState = useMemo(() => {
    if (wsStatus !== "open") return "awaiting websocket stream";
    if (lastArrival && now - lastArrival < 2000) return "streaming";
    return lastArrival ? "idle" : "awaiting websocket stream";
  }, [wsStatus, lastArrival, now]);

  // Actions
  const speech = useSpeechSynthesis();

  async function commitSentence() {
    const text = buffer.trim();
    if (!text || !sessionId) {
      setBuffer("");
      setTokenCount(0);
      return;
    }
    const avg = confidenceN > 0 ? confidenceSum / confidenceN : 0;
    await db.translations.insert({
      session_id: sessionId,
      text,
      confidence: avg,
    });
    setBuffer("");
    setTokenCount(0);
    setConfidenceSum(0);
    setConfidenceN(0);
    setHistoryRefresh((k) => k + 1);
  }

  const handleSpeak = () => speech.speak(buffer);
  const handleClear = () => {
    setBuffer("");
    setTokenCount(0);
  };
  const handleSelectHistory = (text: string) => {
    setBuffer(text);
    setTokenCount(text.split(/\s+/).length);
  };

  const lastConfidence = confidenceHistory[confidenceHistory.length - 1] ?? null;
  const lastLatency = lastMessage?.latencyMs ?? null;

  return (
    <div className="grid h-screen w-full grid-rows-[auto_1fr_auto] bg-background text-foreground">
      <TopBar wsUrl={WS_URL} wsStatus={wsStatus} />

      <main className="grid min-h-0 grid-cols-[280px_1fr_320px]">
        <SessionHistory refreshKey={historyRefresh} onSelect={handleSelectHistory} />

        <section className="flex min-h-0 flex-col">
          <div className="min-h-0 flex-1">
            <WebcamViewport videoRef={videoRef} status={cameraStatus} error={cameraError} />
          </div>
          <TranslationBuffer buffer={buffer} tokenCount={tokenCount} />
          <ActionControls
            buffer={buffer}
            speaking={speech.speaking}
            speechSupported={speech.supported}
            onSpeak={handleSpeak}
            onClear={handleClear}
            onCommit={() => void commitSentence()}
          />
        </section>

        <DiagnosticsPanel
          confidence={lastConfidence}
          latencyMs={lastLatency}
          fps={fps}
          model={model}
          confidenceHistory={confidenceHistory}
          messagesSeen={messageCount}
        />
      </main>

      <StatusBar
        dbConnected={dbConnected}
        mlState={mlState}
        cameraState={cameraStatus}
        fps={fps}
        bufferLength={buffer.length}
      />
    </div>
  );
}
