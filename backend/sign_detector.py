import math
import time
from typing import Dict, List, Optional, Tuple, Any
import cv2
import numpy as np

# Suppress protobuf warnings if any
import os
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"

try:
    import mediapipe as mp
    mp_hands = mp.solutions.hands
    mp_drawing = mp.solutions.drawing_utils
    mp_drawing_styles = mp.solutions.drawing_styles
except Exception as e:
    mp = None
    mp_hands = None


class SignLanguageDetector:
    """
    Real-time Sign Language and Gesture Detector using MediaPipe Hands + OpenCV.
    Extracts 21 3D hand landmarks and computes invariant geometric features
    including finger curl states, joint angles, inter-finger distances, and palm orientation.
    """

    def __init__(
        self,
        min_detection_confidence: float = 0.7,
        min_tracking_confidence: float = 0.6,
        debounce_frames: int = 5,
        confidence_threshold: float = 0.65,
    ):
        self.debounce_frames = debounce_frames
        self.confidence_threshold = confidence_threshold
        self.history: List[str] = []
        self.last_emitted_token: Optional[str] = None
        self.last_token_time: float = 0

        if mp_hands:
            self.hands = mp_hands.Hands(
                static_image_mode=False,
                max_num_hands=2,
                min_detection_confidence=min_detection_confidence,
                min_tracking_confidence=min_tracking_confidence,
            )
        else:
            self.hands = None

    def _calc_distance(self, p1: Any, p2: Any) -> float:
        """Euclidean distance between two landmarks (x, y, z)."""
        return math.sqrt(
            (p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2 + (getattr(p1, "z", 0) - getattr(p2, "z", 0)) ** 2
        )

    def _calc_angle(self, a: Any, b: Any, c: Any) -> float:
        """Calculates angle ABC in degrees with b as vertex."""
        v1 = np.array([a.x - b.x, a.y - b.y, getattr(a, "z", 0) - getattr(b, "z", 0)])
        v2 = np.array([c.x - b.x, c.y - b.y, getattr(c, "z", 0) - getattr(c, "z", 0)])
        norm1 = np.linalg.norm(v1)
        norm2 = np.linalg.norm(v2)
        if norm1 == 0 or norm2 == 0:
            return 0.0
        dot = np.dot(v1, v2) / (norm1 * norm2)
        dot = np.clip(dot, -1.0, 1.0)
        return float(np.degrees(np.arccos(dot)))

    def _is_finger_extended(self, landmarks: List[Any], tip_idx: int, pip_idx: int, mcp_idx: int, wrist_idx: int = 0) -> bool:
        """Determines if a finger (index, middle, ring, pinky) is extended."""
        tip = landmarks[tip_idx]
        pip = landmarks[pip_idx]
        mcp = landmarks[mcp_idx]
        wrist = landmarks[wrist_idx]

        d_tip = self._calc_distance(wrist, tip)
        d_pip = self._calc_distance(wrist, pip)
        d_mcp = self._calc_distance(wrist, mcp)

        angle = self._calc_angle(mcp, pip, tip)
        return d_tip > d_pip > d_mcp and angle > 140

    def _is_finger_curled(self, landmarks: List[Any], tip_idx: int, pip_idx: int, mcp_idx: int, wrist_idx: int = 0) -> bool:
        """Determines if a finger is curled into palm."""
        tip = landmarks[tip_idx]
        pip = landmarks[pip_idx]
        mcp = landmarks[mcp_idx]
        wrist = landmarks[wrist_idx]

        d_tip = self._calc_distance(wrist, tip)
        d_pip = self._calc_distance(wrist, pip)
        return d_tip < d_pip or (tip.y > pip.y and landmarks[mcp_idx].y < landmarks[wrist_idx].y)

    def _is_thumb_extended(self, landmarks: List[Any], handedness: str = "Right") -> bool:
        """Determines if thumb is extended away from palm."""
        thumb_tip = landmarks[4]
        thumb_ip = landmarks[3]
        thumb_mcp = landmarks[2]
        index_mcp = landmarks[5]
        wrist = landmarks[0]

        d_thumb_index = self._calc_distance(thumb_tip, index_mcp)
        d_thumb_wrist = self._calc_distance(thumb_tip, wrist)
        d_mcp_wrist = self._calc_distance(thumb_mcp, wrist)

        angle = self._calc_angle(thumb_mcp, thumb_ip, thumb_tip)
        return (d_thumb_index > 0.15 or d_thumb_wrist > d_mcp_wrist * 1.2) and angle > 130

    def classify_landmarks(self, landmarks: List[Any], handedness: str = "Right") -> Tuple[str, float]:
        """
        Classifies 21 hand landmarks into ASL letters, numbers, and common phrase signs.
        Returns: (token, confidence)
        """
        if len(landmarks) < 21:
            return ("", 0.0)

        # Extended states of 4 fingers
        index_ext = self._is_finger_extended(landmarks, 8, 6, 5)
        middle_ext = self._is_finger_extended(landmarks, 12, 10, 9)
        ring_ext = self._is_finger_extended(landmarks, 16, 14, 13)
        pinky_ext = self._is_finger_extended(landmarks, 20, 18, 17)
        thumb_ext = self._is_thumb_extended(landmarks, handedness)

        # Tips
        wrist = landmarks[0]
        thumb_tip = landmarks[4]
        index_tip = landmarks[8]
        middle_tip = landmarks[12]
        ring_tip = landmarks[16]
        pinky_tip = landmarks[20]

        # Key distances
        d_thumb_index = self._calc_distance(thumb_tip, index_tip)
        d_thumb_middle = self._calc_distance(thumb_tip, middle_tip)
        d_thumb_ring = self._calc_distance(thumb_tip, ring_tip)
        d_thumb_pinky = self._calc_distance(thumb_tip, pinky_tip)
        d_index_middle = self._calc_distance(index_tip, middle_tip)
        d_middle_ring = self._calc_distance(middle_tip, ring_tip)
        d_ring_pinky = self._calc_distance(ring_tip, pinky_tip)

        # Palm scale (wrist to middle MCP distance for scale invariance)
        palm_scale = self._calc_distance(wrist, landmarks[9])
        if palm_scale == 0:
            palm_scale = 1.0

        d_thumb_index_norm = d_thumb_index / palm_scale
        d_index_middle_norm = d_index_middle / palm_scale

        ext_count = sum([index_ext, middle_ext, ring_ext, pinky_ext])

        # --- High-level Word / Phrase Gestures ---
        # 1. "I LOVE YOU" (ASL: Thumb + Index + Pinky extended, Middle + Ring curled)
        if thumb_ext and index_ext and not middle_ext and not ring_ext and pinky_ext:
            return ("I LOVE YOU", 0.95)

        # 2. "HELLO" / Open Hand / "5" (All 5 extended and spread)
        if thumb_ext and index_ext and middle_ext and ring_ext and pinky_ext:
            if d_index_middle_norm > 0.35:
                return ("HELLO", 0.92)
            return ("5", 0.90)

        # 3. "PEACE" / "V" (Index + Middle extended and separated)
        if index_ext and middle_ext and not ring_ext and not pinky_ext:
            if d_index_middle_norm > 0.28:
                return ("PEACE", 0.94)
            # Cross fingers for 'R'
            if index_tip.x > middle_tip.x if handedness == "Right" else index_tip.x < middle_tip.x:
                return ("R", 0.88)
            # Together for 'U'
            return ("U", 0.91)

        # 4. "YES" / Thumbs Up (Thumb up, all fingers curled, thumb y < wrist y)
        if thumb_ext and ext_count == 0 and thumb_tip.y < wrist.y:
            return ("YES", 0.93)

        # 5. "NO" / Thumbs Down (Thumb pointing down, all fingers curled)
        if thumb_ext and ext_count == 0 and thumb_tip.y > wrist.y:
            return ("NO", 0.91)

        # 6. "OK" (Thumb and Index touching, Middle, Ring, Pinky extended)
        if d_thumb_index_norm < 0.25 and middle_ext and ring_ext and pinky_ext:
            return ("OK", 0.95)

        # 7. "THANK YOU" / "B" (Flat hand 4 fingers together)
        if not thumb_ext and index_ext and middle_ext and ring_ext and pinky_ext:
            if d_index_middle_norm < 0.22 and d_middle_ring / palm_scale < 0.22:
                return ("THANK YOU", 0.89)
            return ("B", 0.92)

        # --- ASL Alphabet & Numbers ---
        # Letter 'L' (Thumb and Index extended at ~90 deg, others curled)
        if thumb_ext and index_ext and not middle_ext and not ring_ext and not pinky_ext:
            angle = self._calc_angle(thumb_tip, landmarks[2], index_tip)
            if 60 <= angle <= 120:
                return ("L", 0.96)

        # Letter 'Y' / "CALL ME" (Thumb and Pinky extended, others curled)
        if thumb_ext and not index_ext and not middle_ext and not ring_ext and pinky_ext:
            return ("Y", 0.94)

        # Letter 'W' / Number '3' (Index, Middle, Ring extended, Thumb + Pinky curled)
        if index_ext and middle_ext and ring_ext and not pinky_ext:
            return ("W", 0.93)

        # Number '4' (All 4 fingers extended, thumb curled across palm)
        if not thumb_ext and index_ext and middle_ext and ring_ext and pinky_ext:
            return ("4", 0.90)

        # Letter 'D' / Number '1' (Index only extended, others curled)
        if index_ext and not middle_ext and not ring_ext and not pinky_ext:
            if d_thumb_middle / palm_scale < 0.3:
                return ("D", 0.91)
            return ("1", 0.90)

        # Letter 'I' (Pinky only extended)
        if pinky_ext and not index_ext and not middle_ext and not ring_ext and not thumb_ext:
            return ("I", 0.92)

        # Letter 'F' (Thumb + Index pinch, Middle + Ring + Pinky up)
        if d_thumb_index_norm < 0.25 and middle_ext and ring_ext and pinky_ext:
            return ("F", 0.92)

        # Letter 'C' (Curved hand, C shape)
        if not index_ext and not middle_ext and not ring_ext and not pinky_ext:
            d_tips_thumb = [self._calc_distance(thumb_tip, t) / palm_scale for t in [index_tip, middle_tip, ring_tip, pinky_tip]]
            avg_dist = sum(d_tips_thumb) / len(d_tips_thumb)
            if 0.35 <= avg_dist <= 0.65:
                return ("C", 0.88)

        # Letter 'O' (All fingertips touching thumb tip in an O)
        if not index_ext and not middle_ext and not ring_ext and not pinky_ext:
            if d_thumb_index_norm < 0.22 and d_thumb_middle / palm_scale < 0.25:
                return ("O", 0.90)

        # Letter 'A' (Fist with thumb on the side upright)
        if ext_count == 0:
            if thumb_tip.y < landmarks[6].y and d_thumb_index_norm > 0.2:
                return ("A", 0.89)
            if d_thumb_middle / palm_scale < 0.3 and thumb_tip.y > landmarks[6].y:
                return ("S", 0.88)
            if thumb_tip.y > landmarks[8].y:
                return ("E", 0.85)

        # Letter 'K' (Index extended up, Middle extended forward/up, Thumb resting on Middle PIP)
        if index_ext and middle_ext and not ring_ext and not pinky_ext and thumb_ext:
            return ("K", 0.89)

        return ("", 0.0)

    def process_frame(self, frame_bgr: np.ndarray) -> Dict[str, Any]:
        """
        Processes a single BGR OpenCV frame, extracts hands, runs classification,
        and renders skeleton visualization on the frame.
        """
        start_time = time.time()
        if self.hands is None:
            return {
                "token": "",
                "confidence": 0.0,
                "latencyMs": 0,
                "landmarks": [],
                "annotated_frame": frame_bgr,
            }

        h, w, _ = frame_bgr.shape
        rgb_frame = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
        results = self.hands.process(rgb_frame)

        annotated_frame = frame_bgr.copy()
        raw_landmarks: List[Dict[str, float]] = []
        best_token = ""
        best_confidence = 0.0
        handedness_label = "Right"

        if results.multi_hand_landmarks:
            for idx, hand_landmarks in enumerate(results.multi_hand_landmarks):
                if results.multi_handedness and len(results.multi_handedness) > idx:
                    handedness_label = results.multi_handedness[idx].classification[0].label

                if mp_drawing and mp_hands:
                    mp_drawing.draw_landmarks(
                        annotated_frame,
                        hand_landmarks,
                        mp_hands.HAND_CONNECTIONS,
                        mp_drawing_styles.get_default_hand_landmarks_style(),
                        mp_drawing_styles.get_default_hand_connections_style(),
                    )

                token, conf = self.classify_landmarks(hand_landmarks.landmark, handedness_label)
                if conf > best_confidence:
                    best_token = token
                    best_confidence = conf

                for lm in hand_landmarks.landmark:
                    raw_landmarks.append({"x": lm.x, "y": lm.y, "z": getattr(lm, "z", 0)})

                if token:
                    wrist_px = (int(hand_landmarks.landmark[0].x * w), int(hand_landmarks.landmark[0].y * h))
                    cv2.putText(
                        annotated_frame,
                        f"{token} ({int(conf * 100)}%)",
                        (max(10, wrist_px[0] - 40), max(30, wrist_px[1] - 20)),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.7,
                        (0, 255, 128),
                        2,
                        cv2.LINE_AA,
                    )

        emitted_token = ""
        if best_confidence >= self.confidence_threshold and best_token:
            self.history.append(best_token)
            if len(self.history) > self.debounce_frames:
                self.history.pop(0)

            if self.history.count(best_token) >= max(1, int(self.debounce_frames * 0.7)):
                now = time.time()
                if best_token != self.last_emitted_token or (now - self.last_token_time > 1.8):
                    emitted_token = best_token
                    self.last_emitted_token = best_token
                    self.last_token_time = now
        else:
            self.history.clear()

        latency_ms = int((time.time() - start_time) * 1000)

        return {
            "token": emitted_token or best_token,
            "raw_token": best_token,
            "confidence": round(best_confidence, 2),
            "latencyMs": latency_ms,
            "landmarks": raw_landmarks,
            "handedness": handedness_label,
            "annotated_frame": annotated_frame,
        }
