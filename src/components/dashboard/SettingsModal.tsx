import { useEffect, useState } from "react";
import type { EngineMode } from "@/lib/sign-engine/types";

export interface AppSettings {
  engineMode: EngineMode;
  showSkeleton: boolean;
  mirrored: boolean;
  confidenceThreshold: number;
  debounceDelayMs: number;
  autoSpeak: boolean;
  ttsRate: number;
  ttsPitch: number;
  ttsVoice: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  engineMode: "auto",
  showSkeleton: true,
  mirrored: true,
  confidenceThreshold: 0.65,
  debounceDelayMs: 800,
  autoSpeak: false,
  ttsRate: 1.0,
  ttsPitch: 1.0,
  ttsVoice: "",
};

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSave: (newSettings: AppSettings) => void;
}

export function SettingsModal({
  isOpen,
  onClose,
  settings,
  onSave,
}: SettingsModalProps) {
  const [local, setLocal] = useState<AppSettings>(settings);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    setLocal(settings);
  }, [settings, isOpen]);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const loadVoices = () => {
      setVoices(window.speechSynthesis.getVoices());
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  if (!isOpen) return null;

  const handleSaveAndClose = () => {
    onSave(local);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="flex h-[80vh] w-full max-w-2xl flex-col border border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border bg-sidebar px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-primary" />
            <h2 className="font-mono text-sm font-semibold tracking-wide text-foreground">
              SYSTEM.CONFIG // PREFERENCES
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-sm p-1 font-mono text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            ✕ [ESC]
          </button>
        </div>

        {/* Form Body */}
        <div className="flex-1 space-y-6 overflow-y-auto p-5">
          {/* Section 1: Vision Engine */}
          <div className="space-y-3">
            <div className="font-mono text-xs font-semibold uppercase tracking-wider text-primary">
              [1] Vision & Translation Engine
            </div>
            <div className="rounded border border-border bg-sidebar/50 p-3 space-y-3">
              <label className="flex flex-col gap-1.5">
                <span className="font-mono text-xs text-foreground">
                  Engine Routing Mode
                </span>
                <select
                  value={local.engineMode}
                  onChange={(e) =>
                    setLocal((prev) => ({
                      ...prev,
                      engineMode: e.target.value as EngineMode,
                    }))
                  }
                  className="rounded border border-border bg-card px-2.5 py-1.5 font-mono text-xs text-foreground focus:outline-none focus:border-primary"
                >
                  <option value="auto">Auto (Python Backend if active, else In-Browser AI)</option>
                  <option value="websocket">Python Backend WebSocket (ws://localhost:8000/ws)</option>
                  <option value="browser">In-Browser Vision (MediaPipe Local AI)</option>
                </select>
                <span className="font-mono text-[10px] text-muted-foreground">
                  Auto dynamically switches to browser vision when backend is offline.
                </span>
              </label>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={local.showSkeleton}
                    onChange={(e) =>
                      setLocal((prev) => ({ ...prev, showSkeleton: e.target.checked }))
                    }
                    className="accent-primary"
                  />
                  <span className="font-mono text-xs text-foreground">
                    Neon Skeleton Overlay
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={local.mirrored}
                    onChange={(e) =>
                      setLocal((prev) => ({ ...prev, mirrored: e.target.checked }))
                    }
                    className="accent-primary"
                  />
                  <span className="font-mono text-xs text-foreground">
                    Mirror Camera Feed
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Section 2: Recognition Sensitivity */}
          <div className="space-y-3">
            <div className="font-mono text-xs font-semibold uppercase tracking-wider text-primary">
              [2] Recognition Sensitivity & Debounce
            </div>
            <div className="rounded border border-border bg-sidebar/50 p-3 space-y-4">
              <div>
                <div className="flex justify-between font-mono text-xs">
                  <span>Confidence Threshold</span>
                  <span className="text-primary font-bold">
                    {(local.confidenceThreshold * 100).toFixed(0)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.50"
                  max="0.95"
                  step="0.05"
                  value={local.confidenceThreshold}
                  onChange={(e) =>
                    setLocal((prev) => ({
                      ...prev,
                      confidenceThreshold: parseFloat(e.target.value),
                    }))
                  }
                  className="w-full accent-primary mt-1"
                />
                <div className="flex justify-between font-mono text-[10px] text-muted-foreground">
                  <span>50% (More Permissive)</span>
                  <span>95% (Strict ASL)</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between font-mono text-xs">
                  <span>Gesture Hold / Debounce Cooldown</span>
                  <span className="text-primary font-bold">
                    {local.debounceDelayMs}ms
                  </span>
                </div>
                <input
                  type="range"
                  min="200"
                  max="2000"
                  step="100"
                  value={local.debounceDelayMs}
                  onChange={(e) =>
                    setLocal((prev) => ({
                      ...prev,
                      debounceDelayMs: parseInt(e.target.value, 10),
                    }))
                  }
                  className="w-full accent-primary mt-1"
                />
                <div className="flex justify-between font-mono text-[10px] text-muted-foreground">
                  <span>200ms (Fast / Rapid Signing)</span>
                  <span>2000ms (Slow / Stable)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Speech Synthesis (TTS) */}
          <div className="space-y-3">
            <div className="font-mono text-xs font-semibold uppercase tracking-wider text-primary">
              [3] Voice & Text-to-Speech (TTS)
            </div>
            <div className="rounded border border-border bg-sidebar/50 p-3 space-y-3">
              <label className="flex items-center gap-2 cursor-pointer pb-1">
                <input
                  type="checkbox"
                  checked={local.autoSpeak}
                  onChange={(e) =>
                    setLocal((prev) => ({ ...prev, autoSpeak: e.target.checked }))
                  }
                  className="accent-primary"
                />
                <span className="font-mono text-xs text-foreground">
                  Auto-speak on sentence commit (⏎)
                </span>
              </label>

              {voices.length > 0 && (
                <label className="flex flex-col gap-1">
                  <span className="font-mono text-xs text-foreground">TTS Voice</span>
                  <select
                    value={local.ttsVoice}
                    onChange={(e) =>
                      setLocal((prev) => ({ ...prev, ttsVoice: e.target.value }))
                    }
                    className="rounded border border-border bg-card px-2.5 py-1.5 font-mono text-xs text-foreground focus:outline-none focus:border-primary"
                  >
                    <option value="">Default System Voice</option>
                    {voices.map((v) => (
                      <option key={v.name} value={v.name}>
                        {v.name} ({v.lang})
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <div className="grid grid-cols-2 gap-4 pt-1">
                <div>
                  <div className="flex justify-between font-mono text-xs">
                    <span>Speech Rate</span>
                    <span className="text-primary font-bold">{local.ttsRate}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={local.ttsRate}
                    onChange={(e) =>
                      setLocal((prev) => ({
                        ...prev,
                        ttsRate: parseFloat(e.target.value),
                      }))
                    }
                    className="w-full accent-primary mt-1"
                  />
                </div>

                <div>
                  <div className="flex justify-between font-mono text-xs">
                    <span>Speech Pitch</span>
                    <span className="text-primary font-bold">{local.ttsPitch}</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="1.5"
                    step="0.1"
                    value={local.ttsPitch}
                    onChange={(e) =>
                      setLocal((prev) => ({
                        ...prev,
                        ttsPitch: parseFloat(e.target.value),
                      }))
                    }
                    className="w-full accent-primary mt-1"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border bg-sidebar px-4 py-3 font-mono text-xs">
          <button
            type="button"
            onClick={() => setLocal(DEFAULT_SETTINGS)}
            className="text-muted-foreground hover:text-foreground"
          >
            Reset Defaults
          </button>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-sm border border-border bg-card px-3 py-1.5 text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveAndClose}
              className="rounded-sm bg-primary px-4 py-1.5 font-bold text-primary-foreground hover:bg-primary/90"
            >
              Save Configuration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
