# 📸 Converter

**Converter** is a modern, responsive, zero-backend photo and text to PDF converter application that runs 100% in your web browser. It requires **no server**, **no backend**, and **no database**—all processing happens privately on your local device.

---

## 🌐 Localhost & Quick Start

### 1. View in Browser via Local Server
- Click: **[http://localhost:3000/](http://localhost:3000/)**
- Or double-click `run-server.bat` in this directory to start the server anytime.

### 2. Standalone / Offline Use
- Double-click `run.bat` or open `index.html` directly in any web browser.
- Works 100% offline without internet!

---

## 📝 1. Text to PDF Mode

A dedicated mode for turning typed or pasted text and notes into high-quality PDFs:
- **Instant Live Pagination**: Automatically calculates page boundaries and line wraps in real-time as you type or paste.
- **Rich Typography Controls**:
  - **Font Families**: Sans-Serif (Modern), Serif (Times / Formal), Monospace (Code / Notes).
  - **Font Sizes**: 10pt, 11pt, 12pt, 14pt, 16pt, 18pt, 22pt.
  - **Styles**: Bold (**B**), Italic (*I*), Alignment (Left, Center, Right).
  - **Line Spacing**: 1.2x (Tight), 1.5x (Normal), 1.8x (Relaxed), 2.0x (Double).
- **Document Title & Headers**: Auto-formats a title on the first page with a decorative rule and running headers on following pages.
- **File Import**: Click **"📁 Import"** to load any `.txt`, `.md`, or code file directly from your computer.
- **Sample Template**: Click **"📄 Sample"** to load a formatted report template instantly.
- **Live Stats**: Word counter, character counter, and estimated page counts.

---

## 📷 2. Built-In Camera Document Scanner

Capture documents directly using your computer webcam or smartphone/tablet camera:
- **Live Video Feed**: High-resolution camera feed with device selection (switch between Front / Rear document cameras).
- **Framing Guides**:
  - **📄 Document Guide (A4)**: Helps align documents, pages, and receipts evenly.
  - **🪪 ID Card Guide**: Outlines standard physical card proportions with a center divider.
- **Fast Shutter**: Click the shutter button or press the **Spacebar** on your keyboard to snap photos!
- **Multi-Page Scanning**: Click **"Add & Snap Another"** to scan consecutive pages or both sides of an ID card in seconds without leaving the camera.

---

## ✂️ 3. DocScanner 4-Corner Crop & Image Studio

Click the **Studio (Enhance/Crop)** button on any photo card to open the advanced editing suite:

### 📐 DocScanner 4-Corner Perspective Crop (Deskew & Flatten)
- **CamScanner / DocScanner Style**: Drag the 4 corner handles to match document angles and skewed perspective (e.g. photos taken from an angle on a desk).
- **Edge Bar Handles**: Drag any edge to move both adjacent corners in sync.
- **2.5x Magnifier Loupe**: Auto-appears with targeting red crosshairs when dragging a corner so you can align with document edges down to the millimeter!
- **Pure Client-Side Reverse Homography Warping**: Uses bilinear interpolation to deskew and flatten the document into a crisp, perfectly rectangular page.
- **Reset & Inset**: Click **"✨ Reset Corners"** or **"🔍 Inset 10%"** for one-tap framing.

### 🔲 Standard Rectangle Crop
- 8-handle bounding box with fine angle slider (`-45°` to `+45°`).
- Aspect Ratio Locks: Freeform, 1:1, 4:3, 16:9, A4, US Letter, US Legal, ID Card CR80.
- 90° CCW / CW rotation and horizontal / vertical flips.

### 🎨 Scanner Presets & Fine Tuning
- **Presets**: Magic Color (CamScanner style), Document B&W threshold with slider, Grayscale, High Contrast.
- **Adjustments**: Brightness, Contrast, Saturation, Sharpness (3×3 convolution), Warmth/Temperature sliders.
- **Apply to All**: Click **"Apply to All Photos"** to batch-process all document pages at once.

---

## 📱 Native-Like Phone & Mobile Experience

The application is heavily optimized for Android and iOS mobile devices:
1. Make sure your phone is connected to the same **Wi-Fi network** as your PC.
2. Open Chrome (or any mobile browser) and navigate to:
   **`http://192.168.29.135:3000/`**
3. **Mobile Features**:
   - **Segmented View Switcher**: Quickly switch between `Photos & Edit (N)` and `Live PDF Preview` with one tap without endless scrolling.
   - **Thumb-Friendly Floating Action Bar**: Fixed at the bottom of the screen with quick **Scan**, **Add**, and **Export PDF** actions.
   - **Tap-to-Reorder**: Move photos up or down with dedicated `↑` and `↓` buttons on each card.
   - **Dual Camera Mode**: Uses in-browser camera stream or automatically opens the phone's native 50MP camera app with direct sensor resolution.
   - **Fullscreen Studio & Modals**: Modals expand to fill the entire mobile screen with maximum canvas area for DocScanner 4-corner perspective cropping.
   - **Install as PWA App**: Tap Chrome's menu (⋮) -> **"Add to Home screen"** / **"Install app"** to install Converter as an app on your phone with zero address bar!

---

## 🗂️ 4. Photo Modes

1. **📄 Document Mode (A4)**: Formatted for standard A4 paper with auto/portrait/landscape, 1, 2, or 4 photos per page, margins, and page numbers.
2. **🪪 ID Card Mode (Double-Sided)**: Combines Front and Back sides onto a single page at true CR80 physical scale (85.6 × 54 mm) with optional dashed scissor cut-out lines.
3. **✉️ Letter Mode**: Formatted for standard US Letter (8.5 × 11 in).
4. **📜 Legal Document Mode**: Formatted for standard US Legal (8.5 × 14 in).
5. **🔍 Scanner Mode**: Auto-applies document enhancement to all photos for rapid scanning.

---

## 📁 Project Structure

```
converter/
├── index.html            # Main web application entry point
├── server.js             # Lightweight zero-dependency static server
├── run-server.bat        # One-click Windows server launcher
├── run.bat               # Direct browser launcher
├── css/
│   └── style.css         # Modern responsive UI with camera, crop & text editor styles
├── js/
│   ├── app.js            # App controller, camera logic, text editor, UI events
│   ├── scanner.js        # Canvas image processing, 8-handle cropper, filters
│   └── pdf-generator.js  # Dual-engine PDF builder (jsPDF + Native PDF 1.4)
├── assets/               # Sample test images
└── README.md             # Documentation
```
