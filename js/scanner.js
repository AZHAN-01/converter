/**
 * Converter - Enhanced Scanner & Image Processing Engine
 * Zero external dependencies - pure Canvas 2D image processing
 * Features DocScanner 4-point Perspective Warping & Magnifier Loupe
 */

class ImageScannerEngine {
  constructor() {
    this.activeImage = null; // HTMLImageElement
    this.originalCanvas = document.createElement('canvas');
    this.workingCanvas = document.createElement('canvas');
    this.previewCanvas = null; // Bound to DOM canvas in scanner modal
    
    // Processing state
    this.state = {
      preset: 'original',
      brightness: 0,    // -100 to 100
      contrast: 0,      // -100 to 100
      saturation: 0,    // -100 to 100
      sharpness: 0,     // 0 to 100
      warmth: 0,        // -50 to 50
      threshold: 128,   // 0 to 255 for B&W
      rotation: 0,      // 0, 90, 180, 270
      fineAngle: 0,     // -45 to 45 (straighten)
      flipH: false,
      flipV: false,
      crop: null        // { x, y, width, height }
    };

    // Cropper interaction state
    this.cropperActive = false;
    this.cropMode = 'perspective'; // 'perspective' (DocScanner 4-corner) or 'rectangle'
    this.cropAspect = 'free';      // 'free', '1:1', '4:3', '16:9', 'a4', 'letter', 'legal', 'id'
    this.cropBox = { x: 0, y: 0, width: 0, height: 0 };
    
    // 4 Corners: 0: TL, 1: TR, 2: BR, 3: BL
    this.corners = [
      { x: 0, y: 0 },
      { x: 0, y: 0 },
      { x: 0, y: 0 },
      { x: 0, y: 0 }
    ];

    this.dragTarget = null;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.loupe = { active: false, x: 0, y: 0, cornerIdx: -1 };
  }

  init(previewCanvasElement) {
    this.previewCanvas = previewCanvasElement;
    this.bindCropperEvents();
  }

  loadImage(imgSource, initialSettings = {}) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        this.activeImage = img;
        this.originalCanvas.width = img.naturalWidth;
        this.originalCanvas.height = img.naturalHeight;
        const ctx = this.originalCanvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        // Reset or load initial settings
        this.state = {
          preset: initialSettings.preset || 'original',
          brightness: initialSettings.brightness || 0,
          contrast: initialSettings.contrast || 0,
          saturation: initialSettings.saturation || 0,
          sharpness: initialSettings.sharpness || 0,
          warmth: initialSettings.warmth || 0,
          threshold: initialSettings.threshold || 128,
          rotation: initialSettings.rotation || 0,
          fineAngle: initialSettings.fineAngle || 0,
          flipH: initialSettings.flipH || false,
          flipV: initialSettings.flipV || false,
          crop: initialSettings.crop ? { ...initialSettings.crop } : null
        };

        this.applyPipeline();
        this.initPerspectiveCorners(0.05);
        this.renderPreview();
        resolve(this.state);
      };
      img.onerror = reject;
      img.src = typeof imgSource === 'string' ? imgSource : imgSource.src;
    });
  }

  setPreset(presetName) {
    this.state.preset = presetName;
    if (presetName === 'magic') {
      this.state.brightness = 15;
      this.state.contrast = 25;
      this.state.saturation = 20;
      this.state.sharpness = 25;
      this.state.warmth = 0;
    } else if (presetName === 'bw') {
      this.state.brightness = 0;
      this.state.contrast = 30;
      this.state.saturation = 0;
      this.state.sharpness = 30;
      this.state.threshold = 128;
    } else if (presetName === 'gray') {
      this.state.brightness = 5;
      this.state.contrast = 15;
      this.state.saturation = -100;
      this.state.sharpness = 10;
    } else if (presetName === 'contrast') {
      this.state.brightness = 0;
      this.state.contrast = 45;
      this.state.saturation = 10;
      this.state.sharpness = 20;
    } else {
      this.state.brightness = 0;
      this.state.contrast = 0;
      this.state.saturation = 0;
      this.state.sharpness = 0;
      this.state.warmth = 0;
    }
    this.applyPipeline();
  }

  setBrightness(val) {
    this.state.brightness = parseInt(val, 10);
    this.applyPipeline();
  }

  setContrast(val) {
    this.state.contrast = parseInt(val, 10);
    this.applyPipeline();
  }

  setSaturation(val) {
    this.state.saturation = parseInt(val, 10);
    this.applyPipeline();
  }

  setSharpness(val) {
    this.state.sharpness = parseInt(val, 10);
    this.applyPipeline();
  }

  setWarmth(val) {
    this.state.warmth = parseInt(val, 10);
    this.applyPipeline();
  }

  setThreshold(val) {
    this.state.threshold = parseInt(val, 10);
    this.applyPipeline();
  }

  setFineAngle(val) {
    this.state.fineAngle = parseFloat(val);
    this.applyPipeline();
  }

  rotate(degrees) {
    this.state.rotation = (this.state.rotation + degrees + 360) % 360;
    this.applyPipeline();
    this.initPerspectiveCorners(0.05);
  }

  flip(direction) {
    if (direction === 'h') this.state.flipH = !this.state.flipH;
    if (direction === 'v') this.state.flipV = !this.state.flipV;
    this.applyPipeline();
    this.initPerspectiveCorners(0.05);
  }

  resetAll() {
    this.state = {
      preset: 'original',
      brightness: 0,
      contrast: 0,
      saturation: 0,
      sharpness: 0,
      warmth: 0,
      threshold: 128,
      rotation: 0,
      fineAngle: 0,
      flipH: false,
      flipV: false,
      crop: null
    };
    this.cropperActive = false;
    this.applyPipeline();
    this.initPerspectiveCorners(0.05);
  }

  /**
   * Main processing pipeline
   */
  applyPipeline() {
    if (!this.activeImage) return;

    const totalDeg = (this.state.rotation + this.state.fineAngle);
    const rad = (totalDeg * Math.PI) / 180;
    const origW = this.originalCanvas.width;
    const origH = this.originalCanvas.height;

    // Calculate bounding box for rotated canvas
    const cos = Math.abs(Math.cos(rad));
    const sin = Math.abs(Math.sin(rad));
    const destW = Math.round(origW * cos + origH * sin);
    const destH = Math.round(origW * sin + origH * cos);

    this.workingCanvas.width = destW;
    this.workingCanvas.height = destH;
    const wCtx = this.workingCanvas.getContext('2d');

    wCtx.save();
    wCtx.translate(destW / 2, destH / 2);
    wCtx.rotate(rad);
    wCtx.scale(this.state.flipH ? -1 : 1, this.state.flipV ? -1 : 1);
    wCtx.drawImage(this.originalCanvas, -origW / 2, -origH / 2);
    wCtx.restore();

    // Pixel processing
    const imgData = wCtx.getImageData(0, 0, destW, destH);
    const data = imgData.data;
    const len = data.length;

    const preset = this.state.preset;
    const br = this.state.brightness;
    const ct = this.state.contrast;
    const ctFactor = (259 * (ct + 255)) / (255 * (259 - ct));
    const sat = this.state.saturation;
    const satFactor = (sat + 100) / 100;
    const warmth = this.state.warmth;
    const th = this.state.threshold;

    for (let i = 0; i < len; i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];

      const lum = 0.299 * r + 0.587 * g + 0.114 * b;

      if (preset === 'bw') {
        const adjustedLum = Math.min(255, Math.max(0, lum + br));
        const val = adjustedLum >= th ? 255 : 0;
        data[i] = val;
        data[i + 1] = val;
        data[i + 2] = val;
        continue;
      }

      if (preset === 'gray') {
        r = lum;
        g = lum;
        b = lum;
      } else if (preset === 'magic') {
        // CamScanner Magic Color filter
        const maxC = Math.max(r, g, b);
        const minC = Math.min(r, g, b);
        const diff = maxC - minC;

        if (lum > 135 && diff < 35) {
          const boost = (lum - 135) / 120;
          r = Math.min(255, r + (255 - r) * boost * 0.95);
          g = Math.min(255, g + (255 - g) * boost * 0.95);
          b = Math.min(255, b + (255 - b) * boost * 0.95);
        } else if (lum < 115 && diff < 30) {
          r = Math.max(0, r * 0.72);
          g = Math.max(0, g * 0.72);
          b = Math.max(0, b * 0.72);
        } else if (diff >= 30) {
          const satBoost = 1.35;
          r = Math.min(255, Math.max(0, lum + (r - lum) * satBoost));
          g = Math.min(255, Math.max(0, lum + (g - lum) * satBoost));
          b = Math.min(255, Math.max(0, lum + (b - lum) * satBoost));
        }
      }

      // Saturation
      if (sat !== 0 && preset !== 'gray') {
        r = lum + (r - lum) * satFactor;
        g = lum + (g - lum) * satFactor;
        b = lum + (b - lum) * satFactor;
      }

      // Warmth
      if (warmth !== 0) {
        r += warmth * 1.2;
        b -= warmth * 1.2;
      }

      // Brightness & Contrast
      if (br !== 0) {
        r += br;
        g += br;
        b += br;
      }
      if (ct !== 0) {
        r = ctFactor * (r - 128) + 128;
        g = ctFactor * (g - 128) + 128;
        b = ctFactor * (b - 128) + 128;
      }

      data[i] = Math.min(255, Math.max(0, r));
      data[i + 1] = Math.min(255, Math.max(0, g));
      data[i + 2] = Math.min(255, Math.max(0, b));
    }

    wCtx.putImageData(imgData, 0, 0);

    // Sharpness
    if (this.state.sharpness > 0) {
      this.applySharpenKernel(wCtx, destW, destH, this.state.sharpness);
    }

    this.renderPreview();
  }

  applySharpenKernel(ctx, width, height, amount) {
    const k = (amount / 100) * 0.8;
    const kernel = [
       0, -k,  0,
      -k, 1 + 4 * k, -k,
       0, -k,  0
    ];

    const srcData = ctx.getImageData(0, 0, width, height);
    const src = srcData.data;
    const destData = ctx.createImageData(width, height);
    const dest = destData.data;

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const dstIdx = (y * width + x) * 4;

        for (let c = 0; c < 3; c++) {
          let sum = 0;
          sum += src[((y - 1) * width + x) * 4 + c] * kernel[1];
          sum += src[(y * width + (x - 1)) * 4 + c] * kernel[3];
          sum += src[(y * width + x) * 4 + c] * kernel[4];
          sum += src[(y * width + (x + 1)) * 4 + c] * kernel[5];
          sum += src[((y + 1) * width + x) * 4 + c] * kernel[7];

          dest[dstIdx + c] = Math.min(255, Math.max(0, sum));
        }
        dest[dstIdx + 3] = src[dstIdx + 3];
      }
    }

    ctx.putImageData(destData, 0, 0);
  }

  renderPreview() {
    if (!this.previewCanvas) return;
    this.previewCanvas.width = this.workingCanvas.width;
    this.previewCanvas.height = this.workingCanvas.height;
    const pCtx = this.previewCanvas.getContext('2d');
    pCtx.drawImage(this.workingCanvas, 0, 0);

    // Draw crop overlays
    if (this.cropperActive) {
      if (this.cropMode === 'perspective') {
        this.drawPerspectiveCropOverlay(pCtx);
      } else {
        this.drawRectangleCropOverlay(pCtx);
      }

      if (this.loupe.active) {
        this.drawMagnifierLoupe(pCtx);
      }
    }
  }

  // ==========================================
  // DocScanner Perspective 4-Corner Setup
  // ==========================================
  initPerspectiveCorners(inset = 0.05) {
    const w = this.workingCanvas.width || 800;
    const h = this.workingCanvas.height || 600;
    const insetX = w * inset;
    const insetY = h * inset;

    this.corners = [
      { x: insetX, y: insetY },         // 0: Top-Left (TL)
      { x: w - insetX, y: insetY },     // 1: Top-Right (TR)
      { x: w - insetX, y: h - insetY }, // 2: Bottom-Right (BR)
      { x: insetX, y: h - insetY }      // 3: Bottom-Left (BL)
    ];
    this.renderPreview();
  }

  toggleCropper(enable, mode = 'perspective', aspect = 'free') {
    this.cropperActive = enable;
    this.cropMode = mode;
    this.cropAspect = aspect;

    if (enable) {
      const w = this.workingCanvas.width;
      const h = this.workingCanvas.height;
      
      this.initPerspectiveCorners(0.06);

      let boxW = w * 0.85;
      let boxH = h * 0.85;
      const targetRatio = this.getAspectRatioValue(aspect);
      if (targetRatio) {
        if (boxW / boxH > targetRatio) boxW = boxH * targetRatio;
        else boxH = boxW / targetRatio;
      }
      this.cropBox = {
        x: (w - boxW) / 2,
        y: (h - boxH) / 2,
        width: boxW,
        height: boxH
      };
    }
    this.renderPreview();
  }

  setCropMode(mode) {
    this.cropMode = mode;
    if (mode === 'perspective') {
      this.initPerspectiveCorners(0.06);
    }
    this.renderPreview();
  }

  getAspectRatioValue(aspect) {
    switch (aspect) {
      case '1:1': return 1.0;
      case '4:3': return 4 / 3;
      case '16:9': return 16 / 9;
      case 'a4': return 1 / 1.4142;
      case 'letter': return 8.5 / 11;
      case 'legal': return 8.5 / 14;
      case 'id': return 85.6 / 53.98;
      default: return null;
    }
  }

  // ==========================================
  // DocScanner Overlay Renderer (4 Points + Magnifier)
  // ==========================================
  drawPerspectiveCropOverlay(ctx) {
    const cW = this.previewCanvas.width;
    const cH = this.previewCanvas.height;
    const [p0, p1, p2, p3] = this.corners;

    ctx.save();

    // 1. Dark semi-transparent mask outside quadrilateral
    ctx.fillStyle = 'rgba(0, 0, 0, 0.58)';
    ctx.beginPath();
    ctx.rect(0, 0, cW, cH);
    // Cutout counter-clockwise
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p3.x, p3.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.closePath();
    ctx.fill();

    // 2. Perspective 3x3 Grid inside document
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let f = 1; f <= 2; f++) {
      const frac = f / 3;
      // Vertical grid lines
      const topX = p0.x + (p1.x - p0.x) * frac;
      const topY = p0.y + (p1.y - p0.y) * frac;
      const botX = p3.x + (p2.x - p3.x) * frac;
      const botY = p3.y + (p2.y - p3.y) * frac;
      ctx.moveTo(topX, topY);
      ctx.lineTo(botX, botY);

      // Horizontal grid lines
      const leftX = p0.x + (p3.x - p0.x) * frac;
      const leftY = p0.y + (p3.y - p0.y) * frac;
      const rightX = p1.x + (p2.x - p1.x) * frac;
      const rightY = p1.y + (p2.y - p1.y) * frac;
      ctx.moveTo(leftX, leftY);
      ctx.lineTo(rightX, rightY);
    }
    ctx.stroke();

    // 3. Document Perimeter Outline
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = Math.max(3, Math.round(cW / 300));
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.lineTo(p3.x, p3.y);
    ctx.closePath();
    ctx.stroke();

    // 4. Edge Midpoint Handles (semi-transparent pills)
    const midpoints = [
      { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 },
      { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 },
      { x: (p2.x + p3.x) / 2, y: (p2.y + p3.y) / 2 },
      { x: (p3.x + p0.x) / 2, y: (p3.y + p0.y) / 2 }
    ];

    const midRadius = Math.max(6, Math.round(cW / 90));
    midpoints.forEach(m => {
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(m.x, m.y, midRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });

    // 5. 4 Corner Handles (CamScanner targeting rings)
    const cornerRadius = Math.max(12, Math.round(cW / 45));
    const labels = ['TL', 'TR', 'BR', 'BL'];

    this.corners.forEach((c, idx) => {
      // Outer glow ring
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(c.x, c.y, cornerRadius, 0, Math.PI * 2);
      ctx.stroke();

      // Filled targeting circle
      ctx.fillStyle = '#6366f1';
      ctx.beginPath();
      ctx.arc(c.x, c.y, cornerRadius - 2, 0, Math.PI * 2);
      ctx.fill();

      // Center white dot
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(c.x, c.y, 4, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();
  }

  /**
   * CamScanner-style Magnifier Loupe
   * Zooms 2.5x on the corner currently being dragged with targeting crosshairs
   */
  drawMagnifierLoupe(ctx) {
    if (!this.loupe.active) return;
    const { x, y } = this.loupe;
    const cW = this.previewCanvas.width;
    const cH = this.previewCanvas.height;

    const r = Math.max(50, Math.min(100, Math.round(cW / 8)));
    const pad = 24;
    // Position loupe in opposite top corner
    const loupeX = x < cW / 2 ? cW - r - pad : r + pad;
    const loupeY = r + pad;

    ctx.save();
    // Shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 8;

    // Circular lens cutout
    ctx.beginPath();
    ctx.arc(loupeX, loupeY, r, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.clip();

    // Draw 2.5x zoomed image
    const zoom = 2.5;
    ctx.drawImage(
      this.workingCanvas,
      x - r / zoom,
      y - r / zoom,
      (2 * r) / zoom,
      (2 * r) / zoom,
      loupeX - r,
      loupeY - r,
      2 * r,
      2 * r
    );

    // Crosshairs
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(loupeX - r, loupeY);
    ctx.lineTo(loupeX + r, loupeY);
    ctx.moveTo(loupeX, loupeY - r);
    ctx.lineTo(loupeX, loupeY + r);
    ctx.stroke();

    // Center reticle ring
    ctx.beginPath();
    ctx.arc(loupeX, loupeY, 6, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();

    // Loupe Border Ring
    ctx.save();
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(loupeX, loupeY, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // ==========================================
  // Rectangle Crop Overlay
  // ==========================================
  drawRectangleCropOverlay(ctx) {
    const { x, y, width, height } = this.cropBox;
    const cW = this.previewCanvas.width;
    const cH = this.previewCanvas.height;

    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.beginPath();
    ctx.rect(0, 0, cW, cH);
    ctx.rect(x + width, y, -width, height);
    ctx.fill();

    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = Math.max(2, Math.round(cW / 350));
    ctx.strokeRect(x, y, width, height);

    // 8 Handles
    const handleSize = Math.max(12, Math.round(cW / 55));
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#4f46e5';
    ctx.lineWidth = 2.5;

    const handles = [
      { cx: x, cy: y },
      { cx: x + width / 2, cy: y },
      { cx: x + width, cy: y },
      { cx: x + width, cy: y + height / 2 },
      { cx: x + width, cy: y + height },
      { cx: x + width / 2, cy: y + height },
      { cx: x, cy: y + height },
      { cx: x, cy: y + height / 2 }
    ];

    handles.forEach(h => {
      ctx.fillRect(h.cx - handleSize / 2, h.cy - handleSize / 2, handleSize, handleSize);
      ctx.strokeRect(h.cx - handleSize / 2, h.cy - handleSize / 2, handleSize, handleSize);
    });

    ctx.restore();
  }

  // ==========================================
  // Pointer & Touch Events
  // ==========================================
  bindCropperEvents() {
    if (!this.previewCanvas) return;

    const getCanvasPoint = (e) => {
      const rect = this.previewCanvas.getBoundingClientRect();
      const scaleX = this.previewCanvas.width / (rect.width || 1);
      const scaleY = this.previewCanvas.height / (rect.height || 1);
      const touch = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]);
      const clientX = touch ? touch.clientX : e.clientX;
      const clientY = touch ? touch.clientY : e.clientY;
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
      };
    };

    const handlePointerDown = (e) => {
      if (!this.cropperActive) return;
      const pt = getCanvasPoint(e);
      const tol = Math.max(26, this.previewCanvas.width / 28);

      if (this.cropMode === 'perspective') {
        // 1. Check 4 corners
        let hitIdx = -1;
        for (let i = 0; i < 4; i++) {
          if (Math.hypot(pt.x - this.corners[i].x, pt.y - this.corners[i].y) < tol) {
            hitIdx = i;
            break;
          }
        }

        if (hitIdx !== -1) {
          this.dragTarget = `corner_${hitIdx}`;
          this.loupe = { active: true, x: this.corners[hitIdx].x, y: this.corners[hitIdx].y, cornerIdx: hitIdx };
        } else {
          // 2. Check 4 edge midpoints
          const [p0, p1, p2, p3] = this.corners;
          const edges = [
            { id: 'edge_01', m: { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 } },
            { id: 'edge_12', m: { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 } },
            { id: 'edge_23', m: { x: (p2.x + p3.x) / 2, y: (p2.y + p3.y) / 2 } },
            { id: 'edge_30', m: { x: (p3.x + p0.x) / 2, y: (p3.y + p0.y) / 2 } }
          ];

          let hitEdge = null;
          for (const edge of edges) {
            if (Math.hypot(pt.x - edge.m.x, pt.y - edge.m.y) < tol) {
              hitEdge = edge.id;
              break;
            }
          }

          if (hitEdge) {
            this.dragTarget = hitEdge;
          } else if (this.isPointInsideQuad(pt, this.corners)) {
            this.dragTarget = 'quad_body';
          } else {
            this.dragTarget = null;
          }
        }
      } else {
        // Rectangle crop hit testing
        const b = this.cropBox;
        if (Math.hypot(pt.x - b.x, pt.y - b.y) < tol) this.dragTarget = 'nw';
        else if (Math.hypot(pt.x - (b.x + b.width), pt.y - b.y) < tol) this.dragTarget = 'ne';
        else if (Math.hypot(pt.x - b.x, pt.y - (b.y + b.height)) < tol) this.dragTarget = 'sw';
        else if (Math.hypot(pt.x - (b.x + b.width), pt.y - (b.y + b.height)) < tol) this.dragTarget = 'se';
        else if (Math.abs(pt.y - b.y) < tol && pt.x > b.x && pt.x < b.x + b.width) this.dragTarget = 'n';
        else if (Math.abs(pt.y - (b.y + b.height)) < tol && pt.x > b.x && pt.x < b.x + b.width) this.dragTarget = 's';
        else if (Math.abs(pt.x - b.x) < tol && pt.y > b.y && pt.y < b.y + b.height) this.dragTarget = 'w';
        else if (Math.abs(pt.x - (b.x + b.width)) < tol && pt.y > b.y && pt.y < b.y + b.height) this.dragTarget = 'e';
        else if (pt.x >= b.x && pt.x <= b.x + b.width && pt.y >= b.y && pt.y <= b.y + b.height) {
          this.dragTarget = 'move';
        } else {
          this.dragTarget = null;
        }
      }

      if (this.dragTarget) {
        this.dragStartX = pt.x;
        this.dragStartY = pt.y;
        e.preventDefault();
        this.renderPreview();
      }
    };

    const handlePointerMove = (e) => {
      if (!this.cropperActive || !this.dragTarget) return;
      const pt = getCanvasPoint(e);
      const dx = pt.x - this.dragStartX;
      const dy = pt.y - this.dragStartY;
      const cW = this.previewCanvas.width;
      const cH = this.previewCanvas.height;

      if (this.cropMode === 'perspective') {
        if (this.dragTarget.startsWith('corner_')) {
          const idx = parseInt(this.dragTarget.split('_')[1], 10);
          this.corners[idx].x = Math.max(0, Math.min(cW, this.corners[idx].x + dx));
          this.corners[idx].y = Math.max(0, Math.min(cH, this.corners[idx].y + dy));
          this.loupe = { active: true, x: this.corners[idx].x, y: this.corners[idx].y, cornerIdx: idx };
        } else if (this.dragTarget === 'edge_01') {
          this.moveCorner(0, dx, dy, cW, cH);
          this.moveCorner(1, dx, dy, cW, cH);
        } else if (this.dragTarget === 'edge_12') {
          this.moveCorner(1, dx, dy, cW, cH);
          this.moveCorner(2, dx, dy, cW, cH);
        } else if (this.dragTarget === 'edge_23') {
          this.moveCorner(2, dx, dy, cW, cH);
          this.moveCorner(3, dx, dy, cW, cH);
        } else if (this.dragTarget === 'edge_30') {
          this.moveCorner(3, dx, dy, cW, cH);
          this.moveCorner(0, dx, dy, cW, cH);
        } else if (this.dragTarget === 'quad_body') {
          for (let i = 0; i < 4; i++) {
            this.moveCorner(i, dx, dy, cW, cH);
          }
        }
      } else {
        // Rectangle crop dragging
        const b = this.cropBox;
        const minSize = 40;
        const ratio = this.getAspectRatioValue(this.cropAspect);

        if (this.dragTarget === 'move') {
          b.x = Math.max(0, Math.min(cW - b.width, b.x + dx));
          b.y = Math.max(0, Math.min(cH - b.height, b.y + dy));
        } else {
          let newX = b.x;
          let newY = b.y;
          let newW = b.width;
          let newH = b.height;

          if (this.dragTarget.includes('w')) {
            newX = Math.min(b.x + b.width - minSize, Math.max(0, b.x + dx));
            newW = b.width + (b.x - newX);
          }
          if (this.dragTarget.includes('e')) {
            newW = Math.max(minSize, Math.min(cW - b.x, b.width + dx));
          }
          if (this.dragTarget.includes('n')) {
            newY = Math.min(b.y + b.height - minSize, Math.max(0, b.y + dy));
            newH = b.height + (b.y - newY);
          }
          if (this.dragTarget.includes('s')) {
            newH = Math.max(minSize, Math.min(cH - b.y, b.height + dy));
          }

          if (ratio) {
            if (this.dragTarget === 'e' || this.dragTarget === 'w' || newW / newH > ratio) {
              newH = newW / ratio;
            } else {
              newW = newH * ratio;
            }
            if (newX + newW > cW) newW = cW - newX;
            if (newY + newH > cH) newH = cH - newY;
          }

          b.x = newX;
          b.y = newY;
          b.width = newW;
          b.height = newH;
        }
      }

      this.dragStartX = pt.x;
      this.dragStartY = pt.y;
      this.renderPreview();
      e.preventDefault();
    };

    const handlePointerUp = () => {
      this.dragTarget = null;
      this.loupe.active = false;
      this.renderPreview();
    };

    this.previewCanvas.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);

    this.previewCanvas.addEventListener('touchstart', handlePointerDown, { passive: false });
    window.addEventListener('touchmove', handlePointerMove, { passive: false });
    window.addEventListener('touchend', handlePointerUp);
  }

  moveCorner(idx, dx, dy, maxW, maxH) {
    this.corners[idx].x = Math.max(0, Math.min(maxW, this.corners[idx].x + dx));
    this.corners[idx].y = Math.max(0, Math.min(maxH, this.corners[idx].y + dy));
  }

  isPointInsideQuad(p, pts) {
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const xi = pts[i].x, yi = pts[i].y;
      const xj = pts[j].x, yj = pts[j].y;
      const intersect = ((yi > p.y) !== (yj > p.y)) && (p.x < (xj - xi) * (p.y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  // ==========================================
  // DocScanner Homography Warping Engine
  // ==========================================
  applyCrop() {
    if (!this.cropperActive) return;

    if (this.cropMode === 'perspective') {
      this.applyPerspectiveWarp();
    } else {
      this.applyRectangleCrop();
    }
  }

  applyPerspectiveWarp() {
    const [p0, p1, p2, p3] = this.corners;

    // Calculate destination document width & height
    const topW = Math.hypot(p1.x - p0.x, p1.y - p0.y);
    const botW = Math.hypot(p2.x - p3.x, p2.y - p3.y);
    const leftH = Math.hypot(p3.x - p0.x, p3.y - p0.y);
    const rightH = Math.hypot(p2.x - p1.x, p2.y - p1.y);

    let destW = Math.round(Math.max(topW, botW));
    let destH = Math.round(Math.max(leftH, rightH));

    if (destW < 50 || destH < 50) return;

    // Prevent extreme scale
    const maxDim = 2400;
    if (destW > maxDim || destH > maxDim) {
      const s = maxDim / Math.max(destW, destH);
      destW = Math.round(destW * s);
      destH = Math.round(destH * s);
    }

    // Compute homography matrix mapping (u, v) in [0..destW, 0..destH] -> (x, y) in source
    const Hmat = this.getHomographyMatrix(p0, p1, p2, p3, destW, destH);
    if (!Hmat) return;

    const { h00, h01, h02, h10, h11, h12, h20, h21 } = Hmat;

    const srcW = this.workingCanvas.width;
    const srcH = this.workingCanvas.height;
    const srcCtx = this.workingCanvas.getContext('2d');
    const srcData = srcCtx.getImageData(0, 0, srcW, srcH).data;

    const destCanvas = document.createElement('canvas');
    destCanvas.width = destW;
    destCanvas.height = destH;
    const destCtx = destCanvas.getContext('2d');
    const destImageData = destCtx.createImageData(destW, destH);
    const destData = destImageData.data;

    let destIdx = 0;

    // Inverse mapping with bilinear interpolation
    for (let v = 0; v < destH; v++) {
      const v_h01 = v * h01 + h02;
      const v_h11 = v * h11 + h12;
      const v_h21 = v * h21 + 1.0;

      for (let u = 0; u < destW; u++) {
        const w = u * h20 + v_h21;
        const invW = 1.0 / w;
        const x = (u * h00 + v_h01) * invW;
        const y = (u * h10 + v_h11) * invW;

        if (x >= 0 && x < srcW - 1 && y >= 0 && y < srcH - 1) {
          const x0 = x | 0;
          const y0 = y | 0;
          const x1 = x0 + 1;
          const y1 = y0 + 1;
          const dx = x - x0;
          const dy = y - y0;

          const idx00 = (y0 * srcW + x0) << 2;
          const idx10 = (y0 * srcW + x1) << 2;
          const idx01 = (y1 * srcW + x0) << 2;
          const idx11 = (y1 * srcW + x1) << 2;

          const w00 = (1 - dx) * (1 - dy);
          const w10 = dx * (1 - dy);
          const w01 = (1 - dx) * dy;
          const w11 = dx * dy;

          destData[destIdx]     = w00 * srcData[idx00]     + w10 * srcData[idx10]     + w01 * srcData[idx01]     + w11 * srcData[idx11];
          destData[destIdx + 1] = w00 * srcData[idx00 + 1] + w10 * srcData[idx10 + 1] + w01 * srcData[idx01 + 1] + w11 * srcData[idx11 + 1];
          destData[destIdx + 2] = w00 * srcData[idx00 + 2] + w10 * srcData[idx10 + 2] + w01 * srcData[idx01 + 2] + w11 * srcData[idx11 + 2];
          destData[destIdx + 3] = 255;
        } else {
          destData[destIdx + 3] = 0;
        }
        destIdx += 4;
      }
    }

    destCtx.putImageData(destImageData, 0, 0);

    // Save warped result as new base image
    this.originalCanvas.width = destW;
    this.originalCanvas.height = destH;
    const oCtx = this.originalCanvas.getContext('2d');
    oCtx.drawImage(destCanvas, 0, 0);

    this.state.rotation = 0;
    this.state.fineAngle = 0;
    this.state.flipH = false;
    this.state.flipV = false;
    this.cropperActive = false;

    this.applyPipeline();
    this.initPerspectiveCorners(0.05);
  }

  getHomographyMatrix(p0, p1, p2, p3, destW, destH) {
    const x0 = p0.x, y0 = p0.y;
    const x1 = p1.x, y1 = p1.y;
    const x2 = p2.x, y2 = p2.y;
    const x3 = p3.x, y3 = p3.y;

    const dx1 = x1 - x2, dx2 = x3 - x2;
    const sx = x0 - x1 + x2 - x3;
    const dy1 = y1 - y2, dy2 = y3 - y2;
    const sy = y0 - y1 + y2 - y3;

    let h20, h21, h00, h01, h02, h10, h11, h12;

    if (Math.abs(sx) < 1e-5 && Math.abs(sy) < 1e-5) {
      h00 = (x1 - x0) / destW;
      h01 = (x3 - x0) / destH;
      h02 = x0;
      h10 = (y1 - y0) / destW;
      h11 = (y3 - y0) / destH;
      h12 = y0;
      h20 = 0;
      h21 = 0;
    } else {
      const det = dx1 * dy2 - dx2 * dy1;
      if (Math.abs(det) < 1e-5) return null;

      h20 = (sx * dy2 - sy * dx2) / (det * destW);
      h21 = (dx1 * sy - dy1 * sx) / (det * destH);

      h00 = (x1 - x0 + h20 * destW * x1) / destW;
      h01 = (x3 - x0 + h21 * destH * x3) / destH;
      h02 = x0;

      h10 = (y1 - y0 + h20 * destW * y1) / destW;
      h11 = (y3 - y0 + h21 * destH * y3) / destH;
      h12 = y0;
    }

    return { h00, h01, h02, h10, h11, h12, h20, h21 };
  }

  applyRectangleCrop() {
    const b = this.cropBox;
    const croppedCanvas = document.createElement('canvas');
    croppedCanvas.width = Math.round(b.width);
    croppedCanvas.height = Math.round(b.height);
    const cCtx = croppedCanvas.getContext('2d');

    cCtx.drawImage(
      this.workingCanvas,
      Math.round(b.x),
      Math.round(b.y),
      Math.round(b.width),
      Math.round(b.height),
      0,
      0,
      Math.round(b.width),
      Math.round(b.height)
    );

    this.originalCanvas.width = croppedCanvas.width;
    this.originalCanvas.height = croppedCanvas.height;
    const oCtx = this.originalCanvas.getContext('2d');
    oCtx.drawImage(croppedCanvas, 0, 0);

    this.state.rotation = 0;
    this.state.fineAngle = 0;
    this.state.flipH = false;
    this.state.flipV = false;
    this.cropperActive = false;

    this.applyPipeline();
    this.initPerspectiveCorners(0.05);
  }

  /**
   * Export final processed image
   */
  exportProcessedDataUrl(quality = 0.92) {
    return this.workingCanvas.toDataURL('image/jpeg', quality);
  }

  static processOffline(imgSource, settings, quality = 0.92) {
    return new Promise((resolve, reject) => {
      const scanner = new ImageScannerEngine();
      scanner.loadImage(imgSource, settings).then(() => {
        resolve(scanner.exportProcessedDataUrl(quality));
      }).catch(reject);
    });
  }
}

window.ImageScannerEngine = ImageScannerEngine;
