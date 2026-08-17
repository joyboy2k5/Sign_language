import { FilesetResolver, HandLandmarker, type HandLandmarkerResult } from "@mediapipe/tasks-vision";
import type { HandDetection, LandmarkPoint, ClassificationResult } from "./types";
import { classifyHandLandmarks } from "./gestureClassifier";

export const HAND_CONNECTIONS = [
  // Thumb
  [0, 1], [1, 2], [2, 3], [3, 4],
  // Index
  [0, 5], [5, 6], [6, 7], [7, 8],
  // Middle
  [0, 9], [9, 10], [10, 11], [11, 12],
  // Ring
  [0, 13], [13, 14], [14, 15], [15, 16],
  // Pinky
  [0, 17], [17, 18], [18, 19], [19, 20],
  // Palm Base
  [5, 9], [9, 13], [13, 17],
];

let handLandmarkerInstance: HandLandmarker | null = null;
let isInitializing = false;
let initPromise: Promise<HandLandmarker | null> | null = null;

export async function getBrowserHandLandmarker(): Promise<HandLandmarker | null> {
  if (handLandmarkerInstance) return handLandmarkerInstance;
  if (initPromise) return initPromise;

  isInitializing = true;
  initPromise = (async () => {
    try {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm",
      );
      const landmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numHands: 2,
        minHandDetectionConfidence: 0.6,
        minHandPresenceConfidence: 0.6,
        minTrackingConfidence: 0.5,
      });
      handLandmarkerInstance = landmarker;
      isInitializing = false;
      return landmarker;
    } catch (err) {
      console.warn("GPU delegate failed, attempting CPU fallback...", err);
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm",
        );
        const landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
            delegate: "CPU",
          },
          runningMode: "VIDEO",
          numHands: 2,
          minHandDetectionConfidence: 0.6,
          minHandPresenceConfidence: 0.6,
          minTrackingConfidence: 0.5,
        });
        handLandmarkerInstance = landmarker;
        isInitializing = false;
        return landmarker;
      } catch (fallbackErr) {
        console.error("Failed to initialize MediaPipe HandLandmarker:", fallbackErr);
        isInitializing = false;
        return null;
      }
    }
  })();

  return initPromise;
}

export interface FrameProcessingResult {
  detections: HandDetection[];
  bestClassification: ClassificationResult;
  latencyMs: number;
}

export function processVideoFrame(
  landmarker: HandLandmarker,
  video: HTMLVideoElement,
  timestamp: number,
): FrameProcessingResult {
  const startTime = performance.now();
  let result: HandLandmarkerResult;

  try {
    result = landmarker.detectForVideo(video, timestamp);
  } catch {
    return {
      detections: [],
      bestClassification: { token: "", confidence: 0, category: "None" },
      latencyMs: 0,
    };
  }

  const detections: HandDetection[] = [];
  let bestClassification: ClassificationResult = { token: "", confidence: 0, category: "None" };

  if (result.landmarks && result.landmarks.length > 0) {
    for (let i = 0; i < result.landmarks.length; i++) {
      const rawLms = result.landmarks[i];
      const handednessStr =
        result.handednesses && result.handednesses[i]?.[0]?.categoryName === "Left"
          ? "Left"
          : "Right";
      const score = result.handednesses?.[i]?.[0]?.score ?? 0.9;

      const landmarks: LandmarkPoint[] = rawLms.map((lm) => ({
        x: lm.x,
        y: lm.y,
        z: lm.z,
      }));

      detections.push({
        landmarks,
        handedness: handednessStr,
        score,
      });

      const classification = classifyHandLandmarks(landmarks, handednessStr);
      if (classification.confidence > bestClassification.confidence) {
        bestClassification = classification;
      }
    }
  }

  const latencyMs = Math.round(performance.now() - startTime);

  return {
    detections,
    bestClassification,
    latencyMs,
  };
}

export function renderNeonSkeleton(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  detections: HandDetection[],
  bestClassification: ClassificationResult,
  showSkeleton = true,
) {
  ctx.clearRect(0, 0, width, height);
  if (!showSkeleton || detections.length === 0) return;

  for (const detection of detections) {
    const { landmarks, handedness } = detection;
    const isRight = handedness === "Right";
    const boneColor = isRight ? "rgba(52, 211, 153, 0.85)" : "rgba(56, 189, 248, 0.85)";
    const jointColor = isRight ? "#10b981" : "#0284c7";
    const glowColor = isRight ? "rgba(16, 185, 129, 0.6)" : "rgba(2, 132, 199, 0.6)";

    // Calculate Bounding Box
    let minX = 1,
      minY = 1,
      maxX = 0,
      maxY = 0;
    for (const lm of landmarks) {
      if (lm.x < minX) minX = lm.x;
      if (lm.x > maxX) maxX = lm.x;
      if (lm.y < minY) minY = lm.y;
      if (lm.y > maxY) maxY = lm.y;
    }

    const pad = 0.04;
    const boxX = Math.max(0, (minX - pad) * width);
    const boxY = Math.max(0, (minY - pad) * height);
    const boxW = Math.min(width - boxX, (maxX - minX + pad * 2) * width);
    const boxH = Math.min(height - boxY, (maxY - minY + pad * 2) * height);

    // Draw Bounding Box with Corner Brackets
    ctx.save();
    ctx.strokeStyle = glowColor;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(boxX, boxY, boxW, boxH);

    // Bounding Box Tag
    ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
    ctx.fillRect(boxX, Math.max(0, boxY - 20), 90, 18);
    ctx.fillStyle = boneColor;
    ctx.font = "10px JetBrains Mono, monospace";
    ctx.fillText(`${handedness} [${(detection.score * 100).toFixed(0)}%]`, boxX + 4, Math.max(12, boxY - 7));
    ctx.restore();

    // Draw Skeleton Bones
    ctx.save();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = boneColor;
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 8;

    for (const [startIdx, endIdx] of HAND_CONNECTIONS) {
      const p1 = landmarks[startIdx];
      const p2 = landmarks[endIdx];
      if (!p1 || !p2) continue;

      ctx.beginPath();
      ctx.moveTo(p1.x * width, p1.y * height);
      ctx.lineTo(p2.x * width, p2.y * height);
      ctx.stroke();
    }
    ctx.restore();

    // Draw Landmark Joints
    ctx.save();
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 6;

    landmarks.forEach((lm, idx) => {
      const x = lm.x * width;
      const y = lm.y * height;
      const isFingertip = [4, 8, 12, 16, 20].includes(idx);
      const isWrist = idx === 0;

      ctx.beginPath();
      const radius = isWrist ? 5 : isFingertip ? 4.5 : 3;
      ctx.arc(x, y, radius, 0, 2 * Math.PI);
      ctx.fillStyle = isFingertip ? "#f59e0b" : jointColor;
      ctx.fill();

      // Outer ring for fingertips
      if (isFingertip) {
        ctx.strokeStyle = "rgba(245, 158, 11, 0.9)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    });
    ctx.restore();
  }

  // Draw floating active gesture badge
  if (bestClassification.token) {
    ctx.save();
    const tagText = `${bestClassification.token} (${(bestClassification.confidence * 100).toFixed(0)}%)`;
    ctx.font = "bold 14px JetBrains Mono, monospace";
    const textWidth = ctx.measureText(tagText).width;
    const badgeW = textWidth + 24;
    const badgeH = 28;
    const badgeX = (width - badgeW) / 2;
    const badgeY = 20;

    // Background pill
    ctx.fillStyle = "rgba(10, 15, 20, 0.85)";
    ctx.strokeStyle = "oklch(0.72 0.18 145)";
    ctx.lineWidth = 1.5;
    ctx.shadowColor = "oklch(0.72 0.18 145 / 0.5)";
    ctx.shadowBlur = 12;

    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 6);
    ctx.fill();
    ctx.stroke();

    // Text
    ctx.fillStyle = "oklch(0.72 0.18 145)";
    ctx.fillText(tagText, badgeX + 12, badgeY + 19);
    ctx.restore();
  }
}
