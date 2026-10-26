# ✏️ Sketch-pad

> An interactive 3D WebGL pencil and responsive canvas sketchpad built with **Three.js** and **HTML5 Canvas 2D**. Features subpixel-accurate perspective projection, dynamic hand tilt physics, soft raytraced-style shadows, and full **Mac Trackpad & Force Touch** optimization.

![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)
![WebGL](https://img.shields.io/badge/WebGL-3D%20Rendering-orange.svg)
![Three.js](https://img.shields.io/badge/Three.js-r77-brightgreen.svg)
![Canvas](https://img.shields.io/badge/HTML5-Canvas%202D-yellow.svg)
![Trackpad](https://img.shields.io/badge/Trackpad-Force%20Touch%20Ready-purple.svg)

---

## 🌟 Overview

**Sketch-pad** bridges 3D graphics and digital sketching. As you move your cursor or trackpad, an anatomically-proportioned 3D graphite pencil follows your hand with natural perspective tilting. When you click or hold the spacebar to draw, the pencil physically lowers onto the paper plane (`z = 0`), its graphite tip leaves smooth calligraphic strokes on the sketchbook, and its dynamic shadow sharpens and deepens.

---

## ✨ Features

- **Procedural 3D HB Pencil**: Fully rendered in real-time WebGL with a faceted hexagonal yellow shaft, carved cedar wood collar, graphite lead tip, metallic brass ferrule with crimp rings, and a pink rubber eraser.
- **Subpixel-Accurate Ray Unprojection**: The pencil's graphite tip is mapped directly to the mouse/finger coordinates via perspective camera raycasting on the ground plane, ensuring zero offset or parallax lag.
- **Dynamic Physics & Hand Tilt**: The pencil automatically tilts across X, Y, and Z axes as you traverse different quadrants of the sketchbook, mimicking how an artist holds a pencil over paper.
- **Dynamic Ground Shadow**: A soft, realistic shadow that deepens and snaps close to the tip when drawing, and softens and expands when the pencil is lifted.
- **Smooth 2D Canvas Engine**: Native hardware-accelerated HTML5 Canvas 2D engine with real-time quadratic curve smoothing for butter-smooth sketches at 120 FPS.
- **Mac Trackpad & Force Touch Optimized**:
  - **Spacebar Glide Mode**: Hold <kbd>Space</kbd> and effortlessly glide your finger across the trackpad without needing to keep a physical click pressed down.
  - **Apple Force Touch Pressure**: Press deeper on a Mac trackpad to dynamically lay down broader, richer graphite strokes.
- **Artist Dock & Palette**:
  - **Color Palette**: Switch between Graphite (HB #2), Ink Blue, Crimson Red, Emerald Green, and Amber Gold. The 3D pencil's graphite tip dynamically changes color to match your active swatch!
  - **Stroke Widths**: Fine (2px), Medium (5px), and Broad (12px) stroke sizes.
  - **Undo**: History stack with quick <kbd>⌘ Cmd</kbd> + <kbd>Z</kbd> shortcut.
  - **Clear**: Reset the sketchpad with one click.
  - **Export to PNG**: Download your finished artwork complete with authentic paper texture, dot grid, and sketchbook watermark.

---

## 🕹️ Controls & Shortcuts

| Action | Trackpad | Mouse | Keyboard |
| :--- | :--- | :--- | :--- |
| **Move / Tilt Pencil** | Glide finger on trackpad | Move mouse | — |
| **Draw (Standard)** | Click & drag finger | Click & drag left button | — |
| **Draw (Glide Mode)** | Hold <kbd>Space</kbd> + slide finger | Hold <kbd>Space</kbd> + move | <kbd>Spacebar</kbd> (Hold) |
| **Pressure Sensitivity** | Press harder (Force Touch) | Pointer pressure (Stylus) | — |
| **Undo Last Stroke** | Click `Undo` in toolbar | Click `Undo` in toolbar | <kbd>⌘ Cmd</kbd> + <kbd>Z</kbd> / <kbd>Ctrl</kbd> + <kbd>Z</kbd> |
| **Clear Canvas** | Click `Clear` in toolbar | Click `Clear` in toolbar | — |
| **Export PNG Image** | Click `Export` in toolbar | Click `Export` in toolbar | — |

---

## 🚀 Quick Start (Run Locally)

### 1. Clone the repository
```bash
git clone https://github.com/pabitralenka07/Sketch-pad.git
cd Sketch-pad
```

### 2. Launch the Application

#### Option A: Live Reload Server (Recommended)
Automatically opens in your default browser with instant hot-reload on code edits:
```bash
npm run live
# Serves at http://127.0.0.1:8080
```

#### Option B: Standard Server
```bash
npm run start
# Serves at http://localhost:8000
```

---

## 📂 Project Structure

```plaintext
Sketch-pad/
├── dist/                   # Production distribution bundle
│   ├── index.html          # Main HTML structure & UI dock
│   ├── style.css           # Glassmorphic UI styles & responsive canvas layout
│   └── script.js           # Three.js 3D pencil engine & Canvas 2D drawing logic
├── src/                    # Source files
│   ├── index.html
│   ├── style.css
│   └── script.js
├── package.json            # Project scripts and metadata
├── .gitignore              # Git ignore rules
└── README.md               # Project documentation
```

---

## 🛠️ Built With

- **[Three.js (r77)](https://threejs.org/)** — 3D procedural geometries, perspective camera, ambient & directional lighting, materials, and WebGL rendering.
- **[HTML5 Canvas 2D](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D)** — High-frequency vector stroke rendering with quadratic bezier curve interpolation.
- **[GSAP (TweenMax)](https://greensock.com/)** — Smooth animation interpolation.
- **Vanilla CSS3** — Glassmorphism dock, radial studio backgrounds, responsive paper textures, and typography via Google Fonts (Outfit).

---

## 👤 Author

**Pabitra Lenka**
- GitHub: [@pabitralenka07](https://github.com/pabitralenka07)

---

## 📄 License

This project is licensed under the [MIT License](LICENSE). Feel free to use, modify, and distribute it in your own creative projects.
