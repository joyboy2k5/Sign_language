import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TopBar } from "./TopBar";
import { StatusBar } from "./StatusBar";
import { WebcamViewport } from "./WebcamViewport";
import { TranslationBuffer } from "./TranslationBuffer";
import { ActionControls } from "./ActionControls";
import { SessionHistory } from "./SessionHistory";
import { DiagnosticsPanel } from "./DiagnosticsPanel";
import { SignReferenceModal } from "./SignReferenceModal";
import { SettingsModal, DEFAULT_SETTINGS, type AppSettings } from "./SettingsModal";
import { useWebcam } from "@/hooks/useWebcam";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import { db } from "@/lib/db/localDb";
import {
  getBrowserHandLandmarker,
  processVideoFrame,
  renderNeonSkeleton,
} from "@/lib/sign-engine/browserVision";
import { GestureDebouncer } from "@/lib/sign-engine/gestureClassifier";
import type { HandDetection, ClassificationResult } from "@/lib/sign-engine/types";

const WS_URL = "ws://localhost:8000/ws";
const SETTINGS_STORAGE_KEY = "lucidtalk.settings.v1";

export function Dashboard() {
  // Settings
  const [settings, setSettings] = useState<AppSettings>(() => {
    if (typeof window === "undefined") return DEFAULT_SETTINGS;
    try {
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const handleSaveSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    if (typeof window !== "undefined") {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
    }
  };

  // Modals
  const [isReferenceOpen, setIsReferenceOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Camera & Canvas
  const { videoRef, status: cameraStatus, error: cameraError } = useWebcam(true);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // WebSocket Backend
  const { status: wsStatus, lastMessage, messageCount } = useWebSocket(WS_URL, true);

  // Active Engine Determination
  const activeEngine = useMemo<"websocket" | "browser">(() => {
    if (settings.engineMode === "websocket") return "websocket";
    if (settings.engineMode === "browser") return "browser";
    return wsStatus === "open" ? "websocket" : "browser";
  }, [settings.engineMode, wsStatus]);

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

  // Translation buffer & diagnostics state
  const [buffer, setBuffer] = useState("");
  const [tokenCount, setTokenCount] = useState(0);
  const [confidenceHistory, setConfidenceHistory] = useState<number[]>([]);
  const [confidenceSum, setConfidenceSum] = useState(0);
  const [confidenceN, setConfidenceN] = useState(0);
  const [model, setModel] = useState<string | null>(null);
  const arrivalsRef = useRef<number[]>([]);
  const [fps, setFps] = useState(0);
  const [lastArrival, setLastArrival] = useState<number | null>(null);
  const [lastLatency, setLastLatency] = useState<number | null>(null);
  const [handsDetected, setHandsDetected] = useState(0);

  // Real-time detection state for live HUD badge
  const [liveToken, setLiveToken] = useState<string | null>(null);
  const [liveConfidence, setLiveConfidence] = useState<number | null>(null);

  // In-Browser Gesture Debouncer
  const debouncerRef = useRef<GestureDebouncer>(
    new GestureDebouncer({
      debounceWindow: 5,
      minConfidence: settings.confidenceThreshold,
      cooldownMs: settings.debounceDelayMs,
    }),
  );

  useEffect(() => {
    debouncerRef.current.updateConfig({
      minConfidence: settings.confidenceThreshold,
      cooldownMs: settings.debounceDelayMs,
    });
  }, [settings.confidenceThreshold, settings.debounceDelayMs]);

  // TTS
  const speech = useSpeechSynthesis();

  // Helper to append token cleanly
  const appendToken = useCallback((tok: string, conf?: number) => {
    if (!tok) return;
    setBuffer((b) => {
      if (!b) return tok;
      const needsSpace = tok.length > 1 && !/^[.,!?;:]/.test(tok);
      return needsSpace ? `${b} ${tok}` : `${b}${tok}`;
    });
    setTokenCount((c) => c + 1);

    if (typeof conf === "number") {
      const c = Math.max(0, Math.min(1, conf));
      setConfidenceHistory((h) => [...h, c].slice(-10));
      setConfidenceSum((s) => s + c);
      setConfidenceN((n) => n + 1);
    }
  }, []);

  // In-Browser Vision Processing Loop
  const browserActiveRef = useRef(activeEngine === "browser");
  browserActiveRef.current = activeEngine === "browser";

  useEffect(() => {
    let animId: number;
    let landmarkerReady = false;
    let lastVideoTime = -1;
    let frameCount = 0;
    let lastFpsCalcTime = performance.now();

    const runVisionLoop = async () => {
      const landmarker = await getBrowserHandLandmarker();
      if (!landmarker) {
        console.warn("MediaPipe Landmarker not initialized");
        return;
      }
      landmarkerReady = true;
      setModel("MediaPipe-Browser-ASL-v2.0");

      const processLoop = () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;

        if (
          video &&
          video.readyState >= 2 &&
          !video.paused &&
          browserActiveRef.current
        ) {
          if (video.currentTime !== lastVideoTime) {
            lastVideoTime = video.currentTime;
            const now = performance.now();

            // Resize canvas to match video dimensions
            if (canvas) {
              if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
                canvas.width = video.videoWidth || 640;
                canvas.height = video.videoHeight || 480;
              }
            }

            const { detections, bestClassification, latencyMs } = processVideoFrame(
              landmarker,
              video,
              now,
            );

            setHandsDetected(detections.length);
            setLastLatency(latencyMs);
            setLastArrival(Date.now());

            if (bestClassification.token && bestClassification.confidence > 0.4) {
              setLiveToken(bestClassification.token);
              setLiveConfidence(bestClassification.confidence);
            } else {
              setLiveToken(null);
              setLiveConfidence(null);
            }

            // Render skeleton
            if (canvas) {
              const ctx = canvas.getContext("2d");
              if (ctx) {
                renderNeonSkeleton(
                  ctx,
                  canvas.width,
                  canvas.height,
                  detections,
                  bestClassification,
                  settings.showSkeleton,
                );
              }
            }

            // Debounce and emit confirmed gesture
            const confirmedToken = debouncerRef.current.process(bestClassification);
            if (confirmedToken) {
              appendToken(confirmedToken, bestClassification.confidence);
            }

            // FPS Calculation
            frameCount++;
            if (now - lastFpsCalcTime >= 1000) {
              setFps(Math.round((frameCount * 1000) / (now - lastFpsCalcTime)));
              frameCount = 0;
              lastFpsCalcTime = now;
            }
          }
        } else if (canvas && !browserActiveRef.current) {
          // Clear canvas if not in browser mode
          const ctx = canvas.getContext("2d");
          if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
        }

        animId = requestAnimationFrame(processLoop);
      };

      processLoop();
    };

    if (cameraStatus === "active") {
      void runVisionLoop();
    }

    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [cameraStatus, appendToken, settings.showSkeleton]);

  // Handle incoming WS messages from Python Backend
  const processedIdRef = useRef<number>(0);
  useEffect(() => {
    if (activeEngine !== "websocket" || !lastMessage) return;
    if (processedIdRef.current === messageCount) return;
    processedIdRef.current = messageCount;

    const m = lastMessage;
    setLastArrival(m.receivedAt);
    if (m.latencyMs) setLastLatency(m.latencyMs);

    if (m.type === "meta") {
      if (m.model) setModel(m.model);
      return;
    }

    if (m.type === "end" || m.token === "<END>") {
      void commitSentence();
      return;
    }

    if (m.token) {
      setLiveToken(m.token);
      setLiveConfidence(m.confidence ?? 0.9);
      appendToken(m.token, m.confidence);
    }

    // FPS calculation over rolling window
    const arrivals = arrivalsRef.current;
    arrivals.push(m.receivedAt);
    if (arrivals.length > 10) arrivals.shift();
    if (arrivals.length >= 2) {
      const seconds = (arrivals[arrivals.length - 1] - arrivals[0]) / 1000;
      setFps(seconds > 0 ? (arrivals.length - 1) / seconds : 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messageCount, activeEngine, appendToken]);

  // ML State Indicator
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const mlState = useMemo(() => {
    if (activeEngine === "websocket") {
      if (wsStatus !== "open") return "connecting ws backend";
      if (lastArrival && now - lastArrival < 2000) return "streaming";
      return lastArrival ? "idle" : "awaiting stream";
    }
    if (cameraStatus === "active") {
      return handsDetected > 0 ? "tracking" : "scanning";
    }
    return "idle";
  }, [activeEngine, wsStatus, lastArrival, now, cameraStatus, handsDetected]);

  // Actions
  async function commitSentence() {
    const text = buffer.trim();
    if (!text || !sessionId) {
      setBuffer("");
      setTokenCount(0);
      return;
    }
    const avg = confidenceN > 0 ? confidenceSum / confidenceN : 0.9;
    await db.translations.insert({
      session_id: sessionId,
      text,
      confidence: avg,
    });

    if (settings.autoSpeak) {
      speech.speak(text, {
        voice: settings.ttsVoice,
        rate: settings.ttsRate,
        pitch: settings.ttsPitch,
      });
    }

    setBuffer("");
    setTokenCount(0);
    setConfidenceSum(0);
    setConfidenceN(0);
    setHistoryRefresh((k) => k + 1);
  }

  const handleSpeak = () => {
    speech.speak(buffer, {
      voice: settings.ttsVoice,
      rate: settings.ttsRate,
      pitch: settings.ttsPitch,
    });
  };

  const handleClear = () => {
    setBuffer("");
    setTokenCount(0);
    debouncerRef.current.reset();
  };

  const handleBackspace = () => {
    setBuffer((b) => {
      const trimmed = b.trimEnd();
      const lastSpace = trimmed.lastIndexOf(" ");
      if (lastSpace === -1) return "";
      return trimmed.slice(0, lastSpace);
    });
    setTokenCount((c) => Math.max(0, c - 1));
  };

  const handleAddSpace = () => {
    setBuffer((b) => (b ? `${b} ` : ""));
  };

  const handleSelectHistory = (text: string) => {
    setBuffer(text);
    setTokenCount(text.split(/\s+/).filter(Boolean).length);
  };

  const handleInjectToken = (token: string) => {
    appendToken(token, 0.95);
    setLiveToken(token);
    setLiveConfidence(0.95);
  };

  const lastConfidence =
    confidenceHistory.length > 0
      ? confidenceHistory[confidenceHistory.length - 1]
      : liveConfidence ?? null;

  return (
    <div className="grid h-screen w-full grid-rows-[auto_1fr_auto] bg-background text-foreground select-none">
      {/* Top Navigation */}
      <TopBar
        wsUrl={WS_URL}
        wsStatus={wsStatus}
        engineMode={settings.engineMode}
        activeEngine={activeEngine}
        onOpenReference={() => setIsReferenceOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main 3-Column Layout */}
      <main className="grid min-h-0 grid-cols-[280px_1fr_320px]">
        {/* Left: Session History */}
        <SessionHistory refreshKey={historyRefresh} onSelect={handleSelectHistory} />

        {/* Center: Live Camera Feed + Overlay + Buffer + Actions */}
        <section className="flex min-h-0 flex-col">
          <div className="min-h-0 flex-1">
            <WebcamViewport
              videoRef={videoRef}
              canvasRef={canvasRef}
              status={cameraStatus}
              error={cameraError}
              activeModel={model}
              currentEngine={activeEngine}
              detectedToken={liveToken}
              detectedConfidence={liveConfidence}
              mirrored={settings.mirrored}
              showSkeleton={settings.showSkeleton}
              onToggleSkeleton={() =>
                handleSaveSettings({ ...settings, showSkeleton: !settings.showSkeleton })
              }
              onToggleMirror={() =>
                handleSaveSettings({ ...settings, mirrored: !settings.mirrored })
              }
            />
          </div>

          <TranslationBuffer buffer={buffer} tokenCount={tokenCount} />

          <ActionControls
            buffer={buffer}
            speaking={speech.speaking}
            speechSupported={speech.supported}
            onSpeak={handleSpeak}
            onClear={handleClear}
            onCommit={() => void commitSentence()}
            onBackspace={handleBackspace}
            onAddSpace={handleAddSpace}
            onInjectToken={handleInjectToken}
          />
        </section>

        {/* Right: Real-Time Model Diagnostics */}
        <DiagnosticsPanel
          confidence={lastConfidence}
          latencyMs={lastLatency}
          fps={fps}
          model={model ?? (activeEngine === "websocket" ? "OpenCV-MediaPipe-ASL-v2.0" : "Browser-Vision-ASL")}
          confidenceHistory={confidenceHistory}
          messagesSeen={tokenCount || messageCount}
        />
      </main>

      {/* Bottom Status Bar */}
      <StatusBar
        dbConnected={dbConnected}
        mlState={mlState}
        cameraState={cameraStatus}
        fps={fps}
        bufferLength={buffer.length}
        activeEngine={activeEngine}
        handsDetected={handsDetected}
      />

      {/* Interactive Modals */}
      <SignReferenceModal
        isOpen={isReferenceOpen}
        onClose={() => setIsReferenceOpen(false)}
        onInjectSign={handleInjectToken}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSave={handleSaveSettings}
      />
    </div>
  );
}
