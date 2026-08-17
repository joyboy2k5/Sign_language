export interface LandmarkPoint {
  x: number;
  y: number;
  z?: number;
}

export interface HandDetection {
  landmarks: LandmarkPoint[];
  handedness: "Left" | "Right";
  score: number;
}

export interface ClassificationResult {
  token: string;
  confidence: number;
  category: "Alphabet" | "Numbers" | "Phrases" | "None";
  description?: string;
  handedness?: "Left" | "Right";
}

export interface SignDictionaryItem {
  sign: string;
  category: "Alphabet" | "Numbers" | "Phrases";
  desc: string;
  tips?: string;
  emoji?: string;
}

export type EngineMode = "auto" | "websocket" | "browser";
