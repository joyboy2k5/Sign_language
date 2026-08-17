import type { ClassificationResult, LandmarkPoint } from "./types";

function dist(p1: LandmarkPoint, p2: LandmarkPoint): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  const dz = (p1.z ?? 0) - (p2.z ?? 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function calcAngle(a: LandmarkPoint, b: LandmarkPoint, c: LandmarkPoint): number {
  const v1 = [a.x - b.x, a.y - b.y, (a.z ?? 0) - (b.z ?? 0)];
  const v2 = [c.x - b.x, c.y - b.y, (c.z ?? 0) - (b.z ?? 0)];
  const dot = v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2];
  const mag1 = Math.sqrt(v1[0] * v1[0] + v1[1] * v1[1] + v1[2] * v1[2]);
  const mag2 = Math.sqrt(v2[0] * v2[0] + v2[1] * v2[1] + v2[2] * v2[2]);
  if (mag1 === 0 || mag2 === 0) return 0;
  const cosTheta = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
  return (Math.acos(cosTheta) * 180) / Math.PI;
}

function isFingerExtended(
  landmarks: LandmarkPoint[],
  tipIdx: number,
  pipIdx: number,
  mcpIdx: number,
  wristIdx = 0,
): boolean {
  const tip = landmarks[tipIdx];
  const pip = landmarks[pipIdx];
  const mcp = landmarks[mcpIdx];
  const wrist = landmarks[wristIdx];

  const dTip = dist(wrist, tip);
  const dPip = dist(wrist, pip);
  const dMcp = dist(wrist, mcp);
  const angle = calcAngle(mcp, pip, tip);

  return dTip > dPip && dPip > dMcp && angle > 135;
}

function isThumbExtended(landmarks: LandmarkPoint[], handedness: "Left" | "Right" = "Right"): boolean {
  const thumbTip = landmarks[4];
  const thumbIp = landmarks[3];
  const thumbMcp = landmarks[2];
  const indexMcp = landmarks[5];
  const wrist = landmarks[0];

  const dThumbIndex = dist(thumbTip, indexMcp);
  const dThumbWrist = dist(thumbTip, wrist);
  const dMcpWrist = dist(thumbMcp, wrist);
  const angle = calcAngle(thumbMcp, thumbIp, thumbTip);

  return (dThumbIndex > 0.14 || dThumbWrist > dMcpWrist * 1.15) && angle > 125;
}

export function classifyHandLandmarks(
  landmarks: LandmarkPoint[],
  handedness: "Left" | "Right" = "Right",
): ClassificationResult {
  if (!landmarks || landmarks.length < 21) {
    return { token: "", confidence: 0, category: "None" };
  }

  const wrist = landmarks[0];
  const thumbTip = landmarks[4];
  const indexTip = landmarks[8];
  const middleTip = landmarks[12];
  const ringTip = landmarks[16];
  const pinkyTip = landmarks[20];

  const indexExt = isFingerExtended(landmarks, 8, 6, 5);
  const middleExt = isFingerExtended(landmarks, 12, 10, 9);
  const ringExt = isFingerExtended(landmarks, 16, 14, 13);
  const pinkyExt = isFingerExtended(landmarks, 20, 18, 17);
  const thumbExt = isThumbExtended(landmarks, handedness);

  const palmScale = Math.max(0.01, dist(wrist, landmarks[9]));

  const dThumbIndexNorm = dist(thumbTip, indexTip) / palmScale;
  const dThumbMiddleNorm = dist(thumbTip, middleTip) / palmScale;
  const dIndexMiddleNorm = dist(indexTip, middleTip) / palmScale;
  const dMiddleRingNorm = dist(middleTip, ringTip) / palmScale;
  const dRingPinkyNorm = dist(ringTip, pinkyTip) / palmScale;

  const extCount = (indexExt ? 1 : 0) + (middleExt ? 1 : 0) + (ringExt ? 1 : 0) + (pinkyExt ? 1 : 0);

  // 1. "I LOVE YOU" (Thumb + Index + Pinky extended, Middle & Ring folded)
  if (thumbExt && indexExt && !middleExt && !ringExt && pinkyExt) {
    return {
      token: "I LOVE YOU",
      confidence: 0.96,
      category: "Phrases",
      description: "ASL I Love You sign",
      handedness,
    };
  }

  // 2. "HELLO" / "5" (All 5 fingers extended and spread)
  if (thumbExt && indexExt && middleExt && ringExt && pinkyExt) {
    if (dIndexMiddleNorm > 0.32) {
      return {
        token: "HELLO",
        confidence: 0.94,
        category: "Phrases",
        description: "Open hand greeting wave",
        handedness,
      };
    }
    return {
      token: "5",
      confidence: 0.91,
      category: "Numbers",
      description: "Five fingers",
      handedness,
    };
  }

  // 3. "PEACE" / "V" / "U" / "R" (Index + Middle extended)
  if (indexExt && middleExt && !ringExt && !pinkyExt) {
    if (dIndexMiddleNorm > 0.26) {
      return {
        token: "PEACE",
        confidence: 0.95,
        category: "Phrases",
        description: "Peace sign / V sign",
        handedness,
      };
    }
    const isCrossed =
      handedness === "Right" ? indexTip.x > middleTip.x : indexTip.x < middleTip.x;
    if (isCrossed) {
      return {
        token: "R",
        confidence: 0.89,
        category: "Alphabet",
        description: "Crossed fingers for R",
        handedness,
      };
    }
    return {
      token: "U",
      confidence: 0.92,
      category: "Alphabet",
      description: "Index and Middle together for U",
      handedness,
    };
  }

  // 4. "YES" / Thumbs Up (Thumb up, all 4 fingers folded, thumb tip higher than wrist)
  if (thumbExt && extCount === 0 && thumbTip.y < wrist.y) {
    return {
      token: "YES",
      confidence: 0.94,
      category: "Phrases",
      description: "Thumbs up gesture",
      handedness,
    };
  }

  // 5. "NO" / Thumbs Down (Thumb down, all 4 fingers folded, thumb tip lower than wrist)
  if (thumbExt && extCount === 0 && thumbTip.y > wrist.y) {
    return {
      token: "NO",
      confidence: 0.92,
      category: "Phrases",
      description: "Thumbs down gesture",
      handedness,
    };
  }

  // 6. "OK" / Letter "F" (Thumb & Index pinch, Middle + Ring + Pinky up)
  if (dThumbIndexNorm < 0.28 && middleExt && ringExt && pinkyExt) {
    return {
      token: "OK",
      confidence: 0.95,
      category: "Phrases",
      description: "OK gesture / ASL F",
      handedness,
    };
  }

  // 7. "THANK YOU" / "B" (Flat hand 4 fingers up and together, thumb tucked)
  if (!thumbExt && indexExt && middleExt && ringExt && pinkyExt) {
    if (dIndexMiddleNorm < 0.22 && dMiddleRingNorm < 0.22) {
      return {
        token: "THANK YOU",
        confidence: 0.91,
        category: "Phrases",
        description: "Flat hand thank you / Letter B",
        handedness,
      };
    }
    return {
      token: "4",
      confidence: 0.89,
      category: "Numbers",
      description: "Four fingers up",
      handedness,
    };
  }

  // 8. Letter "L" (Thumb and Index at 90 degrees)
  if (thumbExt && indexExt && !middleExt && !ringExt && !pinkyExt) {
    const angle = calcAngle(thumbTip, landmarks[2], indexTip);
    if (angle >= 60 && angle <= 125) {
      return {
        token: "L",
        confidence: 0.96,
        category: "Alphabet",
        description: "L shape with thumb and index",
        handedness,
      };
    }
  }

  // 9. Letter "Y" / "CALL ME" (Thumb and Pinky extended)
  if (thumbExt && !indexExt && !middleExt && !ringExt && pinkyExt) {
    return {
      token: "Y",
      confidence: 0.94,
      category: "Alphabet",
      description: "Thumb and Pinky out",
      handedness,
    };
  }

  // 10. Letter "W" / Number "3" (Index, Middle, Ring extended)
  if (indexExt && middleExt && ringExt && !pinkyExt) {
    return {
      token: "W",
      confidence: 0.93,
      category: "Alphabet",
      description: "Index, Middle, Ring up",
      handedness,
    };
  }

  // 11. Letter "D" / Number "1" (Index only extended)
  if (indexExt && !middleExt && !ringExt && !pinkyExt) {
    if (dThumbMiddleNorm < 0.32) {
      return {
        token: "D",
        confidence: 0.92,
        category: "Alphabet",
        description: "Index pointing up for D",
        handedness,
      };
    }
    return {
      token: "1",
      confidence: 0.90,
      category: "Numbers",
      description: "Number one",
      handedness,
    };
  }

  // 12. Letter "I" (Pinky only extended)
  if (pinkyExt && !indexExt && !middleExt && !ringExt && !thumbExt) {
    return {
      token: "I",
      confidence: 0.93,
      category: "Alphabet",
      description: "Pinky pointing up for I",
      handedness,
    };
  }

  // 13. Letter "C" (Curved C shape)
  if (!indexExt && !middleExt && !ringExt && !pinkyExt) {
    const avgTipDist =
      (dist(thumbTip, indexTip) +
        dist(thumbTip, middleTip) +
        dist(thumbTip, ringTip) +
        dist(thumbTip, pinkyTip)) /
      (4 * palmScale);
    if (avgTipDist >= 0.32 && avgTipDist <= 0.65) {
      return {
        token: "C",
        confidence: 0.88,
        category: "Alphabet",
        description: "C shaped curved hand",
        handedness,
      };
    }
    if (dThumbIndexNorm < 0.22 && dThumbMiddleNorm < 0.25) {
      return {
        token: "O",
        confidence: 0.90,
        category: "Alphabet",
        description: "O shaped circle with fingers",
        handedness,
      };
    }
  }

  // 14. Letter "A", "S", "E" (Fist shapes)
  if (extCount === 0) {
    if (thumbTip.y < landmarks[6].y && dThumbIndexNorm > 0.18) {
      return {
        token: "A",
        confidence: 0.90,
        category: "Alphabet",
        description: "Fist with thumb on side",
        handedness,
      };
    }
    if (dThumbMiddleNorm < 0.3 && thumbTip.y > landmarks[6].y) {
      return {
        token: "S",
        confidence: 0.88,
        category: "Alphabet",
        description: "Fist with thumb over fingers",
        handedness,
      };
    }
    if (thumbTip.y > landmarks[8].y) {
      return {
        token: "E",
        confidence: 0.85,
        category: "Alphabet",
        description: "Bent fingers on thumb",
        handedness,
      };
    }
  }

  // 15. Letter "K"
  if (indexExt && middleExt && !ringExt && !pinkyExt && thumbExt) {
    return {
      token: "K",
      confidence: 0.90,
      category: "Alphabet",
      description: "K handshape",
      handedness,
    };
  }

  return { token: "", confidence: 0, category: "None" };
}

export class GestureDebouncer {
  private history: string[] = [];
  private lastEmittedToken: string | null = null;
  private lastEmitTime = 0;
  private debounceWindow: number;
  private minConfidence: number;
  private cooldownMs: number;

  constructor(options?: { debounceWindow?: number; minConfidence?: number; cooldownMs?: number }) {
    this.debounceWindow = options?.debounceWindow ?? 6;
    this.minConfidence = options?.minConfidence ?? 0.65;
    this.cooldownMs = options?.cooldownMs ?? 1400;
  }

  public updateConfig(config: { debounceWindow?: number; minConfidence?: number; cooldownMs?: number }) {
    if (config.debounceWindow != null) this.debounceWindow = config.debounceWindow;
    if (config.minConfidence != null) this.minConfidence = config.minConfidence;
    if (config.cooldownMs != null) this.cooldownMs = config.cooldownMs;
  }

  public process(result: ClassificationResult): string | null {
    if (!result.token || result.confidence < this.minConfidence) {
      this.history.length = 0;
      return null;
    }

    this.history.push(result.token);
    if (this.history.length > this.debounceWindow) {
      this.history.shift();
    }

    const matches = this.history.filter((t) => t === result.token).length;
    const threshold = Math.max(2, Math.ceil(this.debounceWindow * 0.7));

    if (matches >= threshold) {
      const now = Date.now();
      if (result.token !== this.lastEmittedToken || now - this.lastEmitTime > this.cooldownMs) {
        this.lastEmittedToken = result.token;
        this.lastEmitTime = now;
        return result.token;
      }
    }

    return null;
  }

  public reset() {
    this.history = [];
    this.lastEmittedToken = null;
    this.lastEmitTime = 0;
  }
}
