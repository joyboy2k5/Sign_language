# 🤟 Lucid Talk — Real-Time Sign Language Translation

Lucid Talk is a real-time **Computer Vision and Deep Learning-based Sign Language Recognition and Translation system**. It uses hand-tracking and gesture recognition to convert sign language gestures into written text and audible speech.

The project combines **React, TypeScript, MediaPipe, OpenCV, Python, FastAPI, and WebSockets** to provide both browser-based and Python-powered sign recognition.

---

## ✨ Features

### 🧠 Dual Sign Recognition Engine

* **In-Browser Vision**

  * MediaPipe HandLandmarker
  * Real-time 3D hand landmark detection
  * Geometric feature extraction
  * Works directly inside the browser

* **Python OpenCV Backend**

  * OpenCV + MediaPipe
  * FastAPI WebSocket server
  * Temporal smoothing for stable predictions
  * Optional standalone camera mode

* **Automatic Engine Routing**

  * Automatically uses the Python backend when available
  * Falls back to browser-based recognition when the backend is offline

---

### 🤟 Sign & Gesture Recognition

Supports a growing vocabulary of:

* ASL alphabet signs
* Numbers
* Common conversational signs
* Gesture commands

Examples include:

`A, B, C, D, E, F, I, K, L, O, R, S, U, V, W, Y`

and:

`HELLO, THANK YOU, I LOVE YOU, YES, NO, PEACE, OK, PLEASE, STOP`

---

### 🎨 Real-Time Visualization

* 21-point hand skeleton visualization
* Hand bounding boxes
* Left / Right hand detection
* Gesture identification
* Confidence information
* Real-time camera feed
* Cyberpunk-style HUD interface

---

### 🔊 Text-to-Speech

Convert recognized signs into speech using browser Text-to-Speech.

Includes:

* Custom voice selection
* Speech rate control
* Pitch control
* Automatic speech on sentence commit

---

### 📝 Translation Buffer

Manage recognized text with:

* Append space
* Backspace
* Copy to clipboard
* Sentence commit
* Quick sign simulator

---

### 📚 Session History & Export

Keep track of previous translations using browser LocalStorage.

Features:

* Translation history
* Search and filtering
* Individual history deletion
* JSON export
* CSV export

---

### 📖 Built-In Sign Reference

Includes an interactive sign reference system containing:

* Sign categories
* Visual guides
* Hand-position information
* Sign testing / simulation

---

# 🚀 Getting Started

## 1. Clone the Repository

```bash
git clone https://github.com/joyboy2k5/Sign_language.git
cd Sign_language
```

---

## 2. Install Frontend Dependencies

```bash
npm install
```

---

## 3. Start the Frontend

```bash
npm run dev
```

Open the Vite development server in your browser.

Usually:

```text
http://localhost:5173
```

---

# 🐍 Python Backend

The Python backend provides the OpenCV + MediaPipe recognition engine.

## Install Backend Dependencies

Navigate to the backend directory and install the requirements:

```bash
cd backend
pip install -r requirements.txt
```

Return to the project root:

```bash
cd ..
```

---

## Start the WebSocket Backend

```bash
python backend/server.py
```

The backend runs on:

```text
ws://localhost:8000/ws
```

---

## Start Backend with Camera Mode

For standalone OpenCV camera processing:

```bash
python backend/server.py --camera
```

---

# ⚡ One-Click Launch

On Windows, you can start both the frontend and backend using:

```text
run_all.bat
```

or PowerShell:

```powershell
.\run_all.ps1
```

This launches:

```text
Frontend  → http://localhost:5173
Backend   → ws://localhost:8000/ws
```

---

# 📁 Project Structure

```text
Sign_language/
│
├── backend/
│   ├── server.py
│   ├── sign_detector.py
│   ├── requirements.txt
│   ├── run_backend.bat
│   └── run_backend.ps1
│
├── src/
│   ├── components/
│   │   ├── dashboard/
│   │   │   ├── ActionControls.tsx
│   │   │   ├── ConfidenceGraph.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── DiagnosticsPanel.tsx
│   │   │   ├── SessionHistory.tsx
│   │   │   ├── SettingsModal.tsx
│   │   │   ├── SignReferenceModal.tsx
│   │   │   ├── StatusBar.tsx
│   │   │   ├── TopBar.tsx
│   │   │   ├── TranslationBuffer.tsx
│   │   │   └── WebcamViewport.tsx
│   │   │
│   │   └── ui/
│   │
│   ├── hooks/
│   │   ├── useSpeechSynthesis.ts
│   │   ├── useWebcam.ts
│   │   └── useWebSocket.ts
│   │
│   └── lib/
│       ├── db/
│       └── sign-engine/
│           ├── browserVision.ts
│           ├── gestureClassifier.ts
│           ├── signDictionary.ts
│           └── types.ts
│
├── run_all.bat
├── run_all.ps1
├── package.json
└── README.md
```

---

# 🛠️ Tech Stack

### Frontend

* React
* TypeScript
* Vite
* Tailwind CSS

### Computer Vision

* MediaPipe
* OpenCV
* Hand Landmark Detection
* Geometric Gesture Classification

### Backend

* Python
* FastAPI
* WebSockets

### Browser Storage & APIs

* LocalStorage
* Web Speech API
* Clipboard API

---

# 🔄 System Architecture

```text
                ┌─────────────────┐
                │   Web Camera    │
                └────────┬────────┘
                         │
                         ▼
                ┌─────────────────┐
                │ Hand Detection  │
                │   MediaPipe     │
                └────────┬────────┘
                         │
                ┌────────▼────────┐
                │ Gesture Engine  │
                └───────┬─┬───────┘
                        │ │
             ┌──────────┘ └──────────┐
             ▼                       ▼
     Browser Vision            Python Backend
     MediaPipe + TS            OpenCV + FastAPI
             │                       │
             └──────────┬────────────┘
                        ▼
                ┌─────────────────┐
                │ Text Translation│
                └────────┬────────┘
                         │
              ┌──────────┴──────────┐
              ▼                     ▼
          Text Output          Text-to-Speech
```

---

# 🎯 Project Goal

The goal of Lucid Talk is to make communication easier between people who use sign language and people who may not understand it.

By combining real-time hand tracking, gesture recognition, text translation, and speech synthesis, the system aims to provide a practical and accessible communication interface.

---

## 👨‍💻 Project

**Lucid Talk — Sign Language Recognition & Translation**

Built using Computer Vision, Machine Learning, React, Python, OpenCV, and MediaPipe.
