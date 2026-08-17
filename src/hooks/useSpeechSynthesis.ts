import { useCallback, useEffect, useState } from "react";

export interface SpeakOptions {
  voice?: string;
  rate?: number;
  pitch?: number;
}

export function useSpeechSynthesis() {
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window);
  }, []);

  const speak = useCallback(
    (text: string, options?: SpeakOptions) => {
      if (!supported || !text.trim()) return;
      window.speechSynthesis.cancel();

      const u = new SpeechSynthesisUtterance(text);
      if (options?.rate != null) u.rate = options.rate;
      if (options?.pitch != null) u.pitch = options.pitch;

      if (options?.voice) {
        const voices = window.speechSynthesis.getVoices();
        const matched = voices.find((v) => v.name === options.voice);
        if (matched) u.voice = matched;
      }

      u.onstart = () => setSpeaking(true);
      u.onend = () => setSpeaking(false);
      u.onerror = () => setSpeaking(false);

      window.speechSynthesis.speak(u);
    },
    [supported],
  );

  const cancel = useCallback(() => {
    if (supported) window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [supported]);

  return { supported, speaking, speak, cancel };
}
