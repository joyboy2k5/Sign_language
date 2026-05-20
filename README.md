# Lucid Talk - Real-Time Sign Language Translator

An accessible, high-performance web interface designed to empower non-verbal and speech-impaired individuals to communicate seamlessly. This platform acts as a dedicated data dashboard frontend that streams video to a machine learning engine for real-time gesture translation.

## 🚀 Key Features

- **Real-Time Video Stream Pipeline:** Responsive, low-latency camera capture interface utilizing native browser APIs.
- **WebSocket Infrastructure:** Integrated architecture designed to stream raw video frames to a high-speed Python/OpenCV computer vision backend.
- **Live Diagnostics Dashboard:** Modern, high-utility interface displaying active prediction confidence metrics, processing latency, and system frame rates.
- **Accessible Design Tokens:** High-contrast, keyboard-driven utility interface tailored for clear visibility and rapid interaction.
- **Vocal Synthesis:** Native text-to-speech engine to convert translated character streams into natural spoken dialogue.

## 🛠️ Technical Stack

- **Frontend:** React, TypeScript, Tailwind CSS
- **Package Manager / Runtime:** Bun
- **Target Backend (In Development):** Python, OpenCV, MediaPipe, FastAPI

## 🏃‍♂️ Getting Started

### Prerequisites
Ensure you have [Bun](https://bun.sh/) installed on your machine.

### Installation
1. Clone the repository:
   ```bash
   git clone [https://github.com/joyboy2k5/Sign_language.git](https://github.com/joyboy2k5/Sign_language.git)
##HOW TO RUN
in terminal :-use npm install 
then use:- npm run dev
