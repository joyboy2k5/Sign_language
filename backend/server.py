import argparse
import asyncio
import base64
import json
import logging
import sys
import time
from typing import Set

import cv2
import numpy as np
import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from sign_detector import SignLanguageDetector

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("LucidTalkBackend")

app = FastAPI(title="Lucid Talk — Sign Language Translation Engine", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

detector = SignLanguageDetector(
    min_detection_confidence=0.7,
    min_tracking_confidence=0.6,
    debounce_frames=5,
    confidence_threshold=0.65,
)

active_websockets: Set[WebSocket] = set()

SUPPORTED_SIGNS = [
    {"sign": "HELLO", "category": "Phrases", "desc": "Open hand with 5 fingers spread, slight wave"},
    {"sign": "THANK YOU", "category": "Phrases", "desc": "Flat hand moving forward from chin/mouth"},
    {"sign": "I LOVE YOU", "category": "Phrases", "desc": "Thumb, index finger, and pinky extended"},
    {"sign": "YES", "category": "Phrases", "desc": "Fist with thumb up (Thumbs Up)"},
    {"sign": "NO", "category": "Phrases", "desc": "Fist with thumb pointing down"},
    {"sign": "PEACE", "category": "Phrases", "desc": "Index and Middle fingers in V shape"},
    {"sign": "OK", "category": "Phrases", "desc": "Thumb and Index touching in circle, 3 fingers up"},
    {"sign": "A", "category": "Alphabet", "desc": "Closed fist with thumb resting alongside index finger"},
    {"sign": "B", "category": "Alphabet", "desc": "Flat hand, 4 fingers held straight up, thumb tucked across palm"},
    {"sign": "C", "category": "Alphabet", "desc": "Hand curved in C shape"},
    {"sign": "D", "category": "Alphabet", "desc": "Index finger pointing up, thumb touching middle/ring/pinky"},
    {"sign": "E", "category": "Alphabet", "desc": "Fingers bent with tips touching thumb resting below"},
    {"sign": "F", "category": "Alphabet", "desc": "Index and thumb touching in circle, 3 fingers straight up"},
    {"sign": "I", "category": "Alphabet", "desc": "Pinky finger pointing straight up, other fingers folded"},
    {"sign": "K", "category": "Alphabet", "desc": "Index up, Middle finger angled forward, thumb tucked between"},
    {"sign": "L", "category": "Alphabet", "desc": "Index finger and thumb forming an L shape at 90 degrees"},
    {"sign": "O", "category": "Alphabet", "desc": "All fingertips and thumb touching to form an O"},
    {"sign": "R", "category": "Alphabet", "desc": "Index and Middle fingers crossed"},
    {"sign": "S", "category": "Alphabet", "desc": "Fist with thumb crossed tightly over fingers"},
    {"sign": "U", "category": "Alphabet", "desc": "Index and Middle fingers held straight up and together"},
    {"sign": "V", "category": "Alphabet", "desc": "Index and Middle fingers held straight up and apart"},
    {"sign": "W", "category": "Alphabet", "desc": "Index, Middle, and Ring fingers held straight up"},
    {"sign": "Y", "category": "Alphabet", "desc": "Thumb and Pinky extended out, middle 3 fingers curled"},
    {"sign": "1", "category": "Numbers", "desc": "Index finger pointing up"},
    {"sign": "2", "category": "Numbers", "desc": "Index and Middle fingers up"},
    {"sign": "3", "category": "Numbers", "desc": "Thumb, Index, and Middle fingers up"},
    {"sign": "4", "category": "Numbers", "desc": "Four fingers held up, thumb tucked"},
    {"sign": "5", "category": "Numbers", "desc": "All five fingers extended and spread"},
]


@app.get("/health")
async def health_check():
    return {
        "status": "online",
        "engine": "OpenCV-MediaPipe-ASL",
        "version": "2.0.0",
        "model": "OpenCV-MediaPipe-ASL-v2.0",
        "supported_signs_count": len(SUPPORTED_SIGNS),
        "clients_connected": len(active_websockets),
    }


@app.get("/api/signs")
async def list_signs():
    return {"signs": SUPPORTED_SIGNS}


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_websockets.add(websocket)
    logger.info(f"WebSocket client connected. Total clients: {len(active_websockets)}")

    # Send initial metadata
    await websocket.send_json({
        "type": "meta",
        "model": "OpenCV-MediaPipe-ASL-v2.0",
        "status": "ready",
        "receivedAt": int(time.time() * 1000),
    })

    try:
        while True:
            # Receive message from client
            message = await websocket.receive()

            if "text" in message and message["text"]:
                raw_text = message["text"]
                try:
                    payload = json.loads(raw_text)
                except Exception:
                    payload = {"action": raw_text}

                action = payload.get("action", "")

                # Handle ping/heartbeat
                if action == "ping":
                    await websocket.send_json({"type": "pong", "receivedAt": int(time.time() * 1000)})
                    continue

                # Handle client sent frame (base64 image)
                image_data = payload.get("image") or payload.get("frame")
                if image_data:
                    if "," in image_data:
                        image_data = image_data.split(",", 1)[1]
                    try:
                        img_bytes = base64.b64decode(image_data)
                        nparr = np.frombuffer(img_bytes, np.uint8)
                        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                        if frame is not None:
                            res = detector.process_frame(frame)
                            if res["raw_token"] or res["confidence"] > 0:
                                await websocket.send_json({
                                    "type": "token",
                                    "token": res["token"] or res["raw_token"],
                                    "confidence": res["confidence"],
                                    "latencyMs": res["latencyMs"],
                                    "model": "OpenCV-MediaPipe-ASL-v2.0",
                                    "landmarks": res["landmarks"],
                                    "receivedAt": int(time.time() * 1000),
                                })
                    except Exception as ex:
                        logger.debug(f"Frame processing error: {ex}")

            # Handle binary JPEG frame
            elif "bytes" in message and message["bytes"]:
                try:
                    nparr = np.frombuffer(message["bytes"], np.uint8)
                    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                    if frame is not None:
                        res = detector.process_frame(frame)
                        if res["raw_token"] or res["confidence"] > 0:
                            await websocket.send_json({
                                "type": "token",
                                "token": res["token"] or res["raw_token"],
                                "confidence": res["confidence"],
                                "latencyMs": res["latencyMs"],
                                "model": "OpenCV-MediaPipe-ASL-v2.0",
                                "landmarks": res["landmarks"],
                                "receivedAt": int(time.time() * 1000),
                            })
                except Exception as ex:
                    logger.debug(f"Binary frame processing error: {ex}")

    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected.")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        active_websockets.discard(websocket)


async def run_standalone_camera(show_window: bool = True):
    """Captures directly from default webcam and broadcasts detections over WebSocket."""
    logger.info("Starting standalone OpenCV camera capture loop...")
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        logger.error("Could not open webcam (device 0). Check camera permissions.")
        return

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                await asyncio.sleep(0.03)
                continue

            frame = cv2.flip(frame, 1)
            res = detector.process_frame(frame)

            # Broadcast to any connected frontend WebSocket clients
            if active_websockets and (res["raw_token"] or res["confidence"] > 0):
                msg = {
                    "type": "token",
                    "token": res["token"] or res["raw_token"],
                    "confidence": res["confidence"],
                    "latencyMs": res["latencyMs"],
                    "model": "OpenCV-MediaPipe-ASL-v2.0",
                    "landmarks": res["landmarks"],
                    "receivedAt": int(time.time() * 1000),
                }
                dead_sockets = set()
                for ws in active_websockets:
                    try:
                        await ws.send_json(msg)
                    except Exception:
                        dead_sockets.add(ws)
                for ws in dead_sockets:
                    active_websockets.discard(ws)

            if show_window:
                cv2.imshow("Lucid Talk - OpenCV MediaPipe Sign Detector", res["annotated_frame"])
                if cv2.waitKey(1) & 0xFF == ord("q"):
                    break

            await asyncio.sleep(0.01)
    finally:
        cap.release()
        if show_window:
            cv2.destroyAllWindows()


def main():
    parser = argparse.ArgumentParser(description="Lucid Talk Sign Language WebSocket Backend")
    parser.add_argument("--host", default="0.0.0.0", help="Host address (default: 0.0.0.0)")
    parser.add_argument("--port", type=int, default=8000, help="Port number (default: 8000)")
    parser.add_argument("--camera", action="store_true", help="Start standalone OpenCV camera capture loop")
    parser.add_argument("--test", action="store_true", help="Test detector initialization and exit")
    args = parser.parse_args()

    if args.test:
        print("[TEST] Initializing detector...")
        dummy_frame = np.zeros((480, 640, 3), dtype=np.uint8)
        res = detector.process_frame(dummy_frame)
        print(f"[TEST] Detector result: {res['confidence']}% latency={res['latencyMs']}ms")
        print("[TEST] SUCCESS! Backend is ready.")
        sys.exit(0)

    if args.camera:
        # Run uvicorn server in background and camera loop concurrently
        config = uvicorn.Config(app=app, host=args.host, port=args.port, log_level="info")
        server = uvicorn.Server(config)

        loop = asyncio.get_event_loop()
        loop.create_task(server.serve())
        loop.run_until_complete(run_standalone_camera(show_window=True))
    else:
        logger.info(f"Starting Lucid Talk WebSocket server on ws://{args.host}:{args.port}/ws")
        uvicorn.run(app, host=args.host, port=args.port)


if __name__ == "__main__":
    main()
