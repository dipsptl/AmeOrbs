# 🌌 AmeOrbs — Hands-First WebXR Sanctuary

**AmeOrbs** is a serene, controller-free, seated Virtual Reality wellness experience. Designed around a *"Bioluminescent Midnight Zen"* aesthetic, it transforms any space—even a seated airplane or desk chair—into an instant sanctuary for breathwork, stress relief, and deep focus.

🚀 **Live WebXR App:** https://ame-orbs.vercel.app/ 
🎥 **Video Demo:**  https://youtu.be/m-JWyxgmmT0

---

## ✨ Core Highlights

* **👐 Hands-First Interaction:** Powered by native WebXR Hand Tracking (`XRHand`). Navigate menus, guide breathing orbs, pop stress bubbles, and control timers using natural pinch and palm gestures—no controllers required.
* **🪑 Seated "Airplane Seat" Ergonomics:** Every interactive element stays comfortably within a **0.5m to 1.2m** reach zone at eye level (`Y = 1.2m – 1.4m`). Zero walking or room-scale setup needed.
* **⚡ Instant Load & Smooth Performance:** Built with **zero external 3D models or audio files**. All geometries, glow materials, particle systems, and harmonic sounds are generated procedurally in real time for 72fps+ performance.
* **🎵 Procedural Web Audio Soundscape:** Synthesizes a warm, low-pass ambient drone pad alongside real-time pentatonic crystal chimes triggered by user interactions.
* **🖥️ Desktop Emulator Ready:** Includes full mouse-raycast and keyboard fallback support for instant testing in desktop WebXR emulators.

---

## 🧘 Three Interactive Modes

Switch seamlessly between modes by turning your **left palm upward toward your face** to summon a floating holographic wrist menu (or use the ergonomic chest-level quick dock):

### 1. 🌬️ Hand-Guided Breathing (Default)
* A translucent bioluminescent sphere floats `0.8m` ahead, guiding a **4-4-4 box breathing cycle** (*Inhale 4s → Hold 4s → Exhale 4s*).
* Tracks the vertical height of your hands in real time: raising your hands expands the orb and shifts its hue from **calm cyan (`#00F5D4`)** to **warm gold (`#FFD166`)**.

### 2. 🫧 Pinch-to-Pop Stress Orbs
* Soft pastel orbs (lavender, cyan, and amber) drift gently within arm's reach.
* Pinching (`thumb + index tip < 2.5cm`) or touching an orb bursts it into golden particles with a harmonic chime and updates a floating **Calm Counter**.

### 3. ⏳ 5-Minute Ame Focus Timer
* A minimalist 3D glowing ring timer depletes over 5 minutes while fireflies orbit gently around it.
* Pinching the center orb pauses or resumes your focus session.

---

## 🔌 Browser & Hardware APIs Used

Because **AmeOrbs** runs entirely client-side with zero external assets, it relies on native browser APIs rather than backend REST endpoints:

| API / Interface | Purpose in AmeOrbs |
| :--- | :--- |
| **WebXR Device API** (`navigator.xr`) | Initializes immersive VR sessions (`immersive-vr`) and manages spatial frame loops. |
| **WebXR Hand Input API** (`XRHand`) | Tracks 25 hand joints in real time to detect pinch distances (`< 2.5cm`), palm orientation, and vertical hand height. |
| **Web Audio API** (`AudioContext`) | Procedurally generates ambient low-pass synth drones (`OscillatorNode`, `BiquadFilterNode`) and pentatonic chimes without audio files. |
| **WebGL 2 / Three.js** | Renders real-time custom shaders, glowing orb materials, and particle bursts at 72fps+. |
| **Permissions Policy API** | Uses `Permissions-Policy: xr-spatial-tracking=(self)` on Vercel to enable spatial tracking over HTTPS. |

---

## 🛠️ Tech Stack

* **3D & WebXR Engine:** Three.js (`XRHandModelFactory`, `WebXRManager`)
* **Audio Synthesis:** Native Web Audio API (Procedural oscillators & filters)
* **Build Tool:** Vite
* **Deployment:** Vercel (https://ame-orbs.vercel.app/) — Configured with `Permissions-Policy: xr-spatial-tracking=(self)`

---

## 🚀 Quick Start (Local Development)

1. **Clone the repository:**
   ```bash
   git clone https://github.com/dipsptl/ameorbs
   cd ameorbs
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Test in Browser or VR Headset:**
   * **Live Hosted Demo:** Open https://ame-orbs.vercel.app/ directly in your Meta Quest Browser or desktop WebXR emulator.
   * **Local Desktop:** Open `http://localhost:5173` with a WebXR browser emulator extension. Press `M` to toggle the left palm-up wrist menu, or click to simulate pinches.

---

## 📄 License

MIT License
