/**
 * Converter - PDF Generation Engine
 * Supports jsPDF if available + Pure Vanilla Native PDF 1.4 Writer (100% Offline)
 */

// Dimension Constants in Millimeters (mm) and Points (pt)
// 1 mm = 72 / 25.4 pt ~= 2.83465 pt
const MM_TO_PT = 72 / 25.4;

const PAGE_FORMATS = {
  a4: { name: 'A4', widthMm: 210, heightMm: 297 },
  letter: { name: 'US Letter', widthMm: 215.9, heightMm: 279.4 },
  legal: { name: 'US Legal', widthMm: 215.9, heightMm: 355.6 },
  id_sheet: { name: 'A4 (ID Card Sheet)', widthMm: 210, heightMm: 297 }
};

// Standard ID Card (CR80) dimensions
const ID_CARD_CR80 = {
  widthMm: 85.6,
  heightMm: 53.98
};

/**
 * Pure Native PDF 1.4 Binary Writer
 * Zero dependencies! Works 100% offline in any browser.
 */
class NativePdfWriter {
  constructor() {
    this.pages = []; // Array of { widthPt, heightPt, drawCommands: [], images: [] }
    this.images = []; // Array of { id, width, height, dataBytes }
  }

  addPage(widthPt, heightPt) {
    const page = {
      index: this.pages.length + 1,
      widthPt,
      heightPt,
      streamCommands: [],
      images: []
    };
    this.pages.push(page);
    return page;
  }

  // Draw JPEG image at (x, y) with (width, height) in points (PDF coordinates: origin at bottom-left)
  drawImage(page, jpegDataUrl, xPt, yPt, wPt, hPt) {
    // Extract base64
    const base64Data = jpegDataUrl.replace(/^data:image\/jpeg;base64,/, '');
    const binaryStr = atob(base64Data);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    // Determine dimensions from JPEG header if possible or fallback
    const imgId = `Im${this.images.length + 1}`;
    this.images.push({
      id: imgId,
      bytes: bytes
    });

    // In PDF, yPt is from bottom-left
    // xPt, yPt, wPt, hPt
    page.streamCommands.push(`q ${wPt.toFixed(2)} 0 0 ${hPt.toFixed(2)} ${xPt.toFixed(2)} ${yPt.toFixed(2)} cm /${imgId} Do Q`);
    page.images.push(imgId);
  }

  buildPdfBlob() {
    const parts = [];
    const offsets = [];
    let currentOffset = 0;
    const encoder = new TextEncoder();

    const write = (str) => {
      const bytes = encoder.encode(str + '\n');
      parts.push(bytes);
      currentOffset += bytes.length;
    };

    const writeBytes = (uint8) => {
      parts.push(uint8);
      currentOffset += uint8.length;
      const nl = encoder.encode('\n');
      parts.push(nl);
      currentOffset += nl.length;
    };

    // Header
    write('%PDF-1.4');
    // Binary indicator
    write('%âãÏÓ');

    // 1: Catalog
    offsets[1] = currentOffset;
    write('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj');

    // 2: Pages tree
    offsets[2] = currentOffset;
    const pageObjStart = 3;
    const kidsStr = this.pages.map((_, i) => `${pageObjStart + i * 2} 0 R`).join(' ');
    write(`2 0 obj\n<< /Type /Pages /Kids [${kidsStr}] /Count ${this.pages.length} >>\nendobj`);

    let nextObjId = pageObjStart;

    // We'll map each image to an object id
    const imageObjMap = {};
    const imgStartObjId = pageObjStart + this.pages.length * 2;
    this.images.forEach((img, i) => {
      imageObjMap[img.id] = imgStartObjId + i;
    });

    // Write Pages and Contents
    this.pages.forEach((page) => {
      const pageObjId = nextObjId++;
      const contentObjId = nextObjId++;

      // Resource dictionary with XObjects
      const xObjEntries = page.images
        .map(imgId => `/${imgId} ${imageObjMap[imgId]} 0 R`)
        .join(' ');

      offsets[pageObjId] = currentOffset;
      write(
        `${pageObjId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${page.widthPt.toFixed(2)} ${page.heightPt.toFixed(2)}] /Contents ${contentObjId} 0 R /Resources << /ProcSet [/PDF /ImageC] /XObject << ${xObjEntries} >> >> >>\nendobj`
      );

      const contentStream = page.streamCommands.join('\n');
      offsets[contentObjId] = currentOffset;
      write(
        `${contentObjId} 0 obj\n<< /Length ${encoder.encode(contentStream).length} >>\nstream\n${contentStream}\nendstream\nendobj`
      );
    });

    // Write Image XObjects
    this.images.forEach((img) => {
      const objId = imageObjMap[img.id];
      offsets[objId] = currentOffset;

      const imgHeader = `${objId} 0 obj\n<< /Type /XObject /Subtype /Image /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${img.bytes.length} >>\nstream\n`;
      write(imgHeader);
      writeBytes(img.bytes);
      write('endstream\nendobj');
    });

    // Cross-reference table (XREF)
    const xrefOffset = currentOffset;
    write('xref');
    const totalObjs = nextObjId + this.images.length;
    write(`0 ${totalObjs}`);
    write('0000000000 65535 f ');

    for (let i = 1; i < totalObjs; i++) {
      const off = offsets[i] || 0;
      write(`${String(off).padStart(10, '0')} 00000 n `);
    }

    // Trailer
    write('trailer');
    write(`<< /Size ${totalObjs} /Root 1 0 R >>`);
    write('startxref');
    write(`${xrefOffset}`);
    write('%%EOF');

    return new Blob(parts, { type: 'application/pdf' });
  }
}

/**
 * Universal PDF Engine
 */
class PdfExportEngine {
  constructor() {
    this.hasJsPdf = typeof window.jspdf !== 'undefined' && typeof window.jspdf.jsPDF !== 'undefined';
  }

  checkJsPdfAvailability() {
    this.hasJsPdf = typeof window.jspdf !== 'undefined' && typeof window.jspdf.jsPDF !== 'undefined';
    return this.hasJsPdf;
  }

  /**
   * Calculate page specifications (width, height in mm)
   */
  getPageFormat(mode, customFormat) {
    if (mode === 'document' || mode === 'scanner') return PAGE_FORMATS.a4;
    if (mode === 'idcard') return PAGE_FORMATS.id_sheet;
    if (mode === 'letter') return PAGE_FORMATS.letter;
    if (mode === 'legal') return PAGE_FORMATS.legal;
    return PAGE_FORMATS[customFormat] || PAGE_FORMATS.a4;
  }

  /**
   * Plan pages layout based on mode and settings
   */
  planPages(photos, mode, settings, textData = null) {
    if (mode === 'text') {
      return this.planTextPages(textData, settings);
    }

    const pages = [];
    const baseFormat = this.getPageFormat(mode, settings.pageFormat);

    if (mode === 'idcard') {
      // ID Card Mode: Groups photos into Front/Back pairs
      // Pair 2 photos per page (Front + Back)
      for (let i = 0; i < photos.length; i += 2) {
        const front = photos[i];
        const back = photos[i + 1] || null;
        pages.push({
          pageNumber: pages.length + 1,
          type: 'idcard',
          widthMm: baseFormat.widthMm,
          heightMm: baseFormat.heightMm,
          items: [
            { photo: front, role: 'front' },
            ...(back ? [{ photo: back, role: 'back' }] : [])
          ]
        });
      }
      if (pages.length === 0) {
        pages.push({
          pageNumber: 1,
          type: 'idcard',
          widthMm: baseFormat.widthMm,
          heightMm: baseFormat.heightMm,
          items: []
        });
      }
      return pages;
    }

    // Document / Letter / Legal / Scanner Modes
    const perPage = parseInt(settings.photosPerPage || 1, 10);
    const orientation = settings.orientation || 'auto'; // 'auto', 'portrait', 'landscape'

    for (let i = 0; i < photos.length; i += perPage) {
      const slice = photos.slice(i, i + perPage);
      let pageW = baseFormat.widthMm;
      let pageH = baseFormat.heightMm;

      if (orientation === 'landscape') {
        pageW = baseFormat.heightMm;
        pageH = baseFormat.widthMm;
      } else if (orientation === 'auto' && slice.length === 1) {
        // Auto match single photo orientation
        const p = slice[0];
        const isPhotoLandscape = (p.width || 1) > (p.height || 1);
        if (isPhotoLandscape) {
          pageW = baseFormat.heightMm;
          pageH = baseFormat.widthMm;
        }
      }

      pages.push({
        pageNumber: pages.length + 1,
        type: 'standard',
        widthMm: pageW,
        heightMm: pageH,
        items: slice.map(p => ({ photo: p }))
      });
    }

    if (pages.length === 0) {
      pages.push({
        pageNumber: 1,
        type: 'standard',
        widthMm: baseFormat.widthMm,
        heightMm: baseFormat.heightMm,
        items: []
      });
    }

    return pages;
  }

  /**
   * Plan and paginate text into clean multi-page layout
   */
  planTextPages(textData, settings) {
    const formatKey = settings.textPageFormat || 'a4';
    const baseFormat = PAGE_FORMATS[formatKey] || PAGE_FORMATS.a4;
    const pageW = baseFormat.widthMm;
    const pageH = baseFormat.heightMm;
    const marginMm = parseFloat(settings.textMarginMm || 20);

    const dpi = 150;
    const pxPerMm = dpi / 25.4;
    const cWidth = Math.round(pageW * pxPerMm);
    const cHeight = Math.round(pageH * pxPerMm);
    const marginPx = marginMm * pxPerMm;

    const usableW = cWidth - marginPx * 2;
    const headerH = textData && textData.title ? 35 * pxPerMm : 10 * pxPerMm;
    const footerH = 20 * pxPerMm;
    const usableH = cHeight - marginPx * 2 - headerH - footerH;

    // Use offscreen canvas to measure lines
    const mCanvas = document.createElement('canvas');
    const mCtx = mCanvas.getContext('2d');
    const fontSizePt = (textData && textData.fontSize) || 12;
    const fontSizePx = Math.round(fontSizePt * (dpi / 72));
    const fontFam = (textData && textData.fontFamily) || 'sans-serif';
    const isBold = textData && textData.isBold;
    const isItalic = textData && textData.isItalic;
    const fontStyle = `${isItalic ? 'italic ' : ''}${isBold ? 'bold ' : ''}${fontSizePx}px ${fontFam}`;
    mCtx.font = fontStyle;

    const lineSpacing = parseFloat((textData && textData.lineSpacing) || 1.5);
    const lineHeightPx = Math.round(fontSizePx * lineSpacing);
    const linesPerPage = Math.max(1, Math.floor(usableH / lineHeightPx));

    const content = (textData && textData.content) || '';
    const paragraphs = content.split('\n');
    const allLines = [];

    paragraphs.forEach((para) => {
      if (para.trim() === '') {
        allLines.push({ text: '', isBlank: true });
        return;
      }
      const words = para.split(' ');
      let currentLine = '';

      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const metrics = mCtx.measureText(testLine);
        if (metrics.width > usableW && currentLine) {
          allLines.push({ text: currentLine, isBlank: false });
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) {
        allLines.push({ text: currentLine, isBlank: false });
      }
    });

    const pages = [];
    for (let i = 0; i < allLines.length; i += linesPerPage) {
      const pageLines = allLines.slice(i, i + linesPerPage);
      pages.push({
        pageNumber: pages.length + 1,
        type: 'text',
        widthMm: pageW,
        heightMm: pageH,
        textData: {
          ...textData,
          lines: pageLines,
          fontSizePx,
          fontStyle,
          lineHeightPx,
          headerH,
          footerH,
          marginPx,
          usableW
        }
      });
    }

    if (pages.length === 0) {
      pages.push({
        pageNumber: 1,
        type: 'text',
        widthMm: pageW,
        heightMm: pageH,
        textData: {
          ...textData,
          lines: [],
          fontSizePx,
          fontStyle,
          lineHeightPx,
          headerH,
          footerH,
          marginPx,
          usableW
        }
      });
    }

    return pages;
  }

  /**
   * Render a planned page to an HTML5 Canvas for instant WYSIWYG preview
   */
  async renderPageToCanvas(pagePlan, canvas, mode, settings) {
    const dpi = 150; // crisp preview resolution
    const pxPerMm = (dpi / 25.4);
    const cWidth = Math.round(pagePlan.widthMm * pxPerMm);
    const cHeight = Math.round(pagePlan.heightMm * pxPerMm);

    canvas.width = cWidth;
    canvas.height = cHeight;
    const ctx = canvas.getContext('2d');

    // Fill white paper background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, cWidth, cHeight);

    if (pagePlan.type === 'text') {
      this.drawTextLayout(ctx, pagePlan, cWidth, cHeight, pxPerMm, settings);
    } else {
      if (pagePlan.items.length === 0) {
        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 24px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('No photos added yet', cWidth / 2, cHeight / 2);
        return;
      }

      if (pagePlan.type === 'idcard') {
        await this.drawIdCardLayout(ctx, pagePlan, cWidth, cHeight, pxPerMm, settings);
      } else {
        await this.drawStandardLayout(ctx, pagePlan, cWidth, cHeight, pxPerMm, settings);
      }
    }

    // Page number if enabled
    if (settings.pageNumbers && settings.pageNumbers !== 'none') {
      ctx.fillStyle = '#64748b';
      ctx.font = '14px sans-serif';
      ctx.textAlign = settings.pageNumbers === 'bottom-center' ? 'center' : 'right';
      const x = settings.pageNumbers === 'bottom-center' ? cWidth / 2 : cWidth - (15 * pxPerMm);
      const y = cHeight - (10 * pxPerMm);
      ctx.fillText(`Page ${pagePlan.pageNumber}`, x, y);
    }
  }

  /**
   * Draw text document page
   */
  drawTextLayout(ctx, pagePlan, cWidth, cHeight, pxPerMm, settings) {
    const data = pagePlan.textData;
    if (!data) return;

    const marginPx = data.marginPx;
    const align = data.align || 'left';

    // 1. Header (Title)
    if (data.title && pagePlan.pageNumber === 1) {
      ctx.save();
      ctx.fillStyle = data.color || '#0f172a';
      const titleSizePx = Math.round(data.fontSizePx * 1.5);
      ctx.font = `bold ${titleSizePx}px ${data.fontFamily || 'sans-serif'}`;
      ctx.textAlign = align;
      const titleX = align === 'center' ? cWidth / 2 : (align === 'right' ? cWidth - marginPx : marginPx);
      const titleY = marginPx + titleSizePx;
      ctx.fillText(data.title, titleX, titleY);

      // Decorative divider rule
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(marginPx, titleY + 12);
      ctx.lineTo(cWidth - marginPx, titleY + 12);
      ctx.stroke();
      ctx.restore();
    } else if (data.title) {
      // Running header on page 2+
      ctx.save();
      ctx.fillStyle = '#94a3b8';
      ctx.font = `italic 12px ${data.fontFamily || 'sans-serif'}`;
      ctx.textAlign = 'left';
      ctx.fillText(data.title, marginPx, marginPx - 8);
      ctx.restore();
    }

    // 2. Render body lines
    if (data.lines.length === 0) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Start typing or paste text to see live preview...', cWidth / 2, cHeight / 2);
      return;
    }

    ctx.save();
    ctx.font = data.fontStyle;
    ctx.fillStyle = data.color || '#0f172a';
    ctx.textAlign = align;

    const startY = marginPx + (pagePlan.pageNumber === 1 && data.title ? data.headerH : 10 * pxPerMm);

    data.lines.forEach((line, index) => {
      if (line.isBlank) return;
      const lineY = startY + (index * data.lineHeightPx);
      let lineX = marginPx;
      if (align === 'center') {
        lineX = cWidth / 2;
      } else if (align === 'right') {
        lineX = cWidth - marginPx;
      }
      ctx.fillText(line.text, lineX, lineY);
    });
    ctx.restore();
  }

  /**
   * Draw standard photo document layouts
   */
  async drawStandardLayout(ctx, pagePlan, cWidth, cHeight, pxPerMm, settings) {
    const marginMm = parseFloat(settings.marginMm || 10);
    const marginPx = marginMm * pxPerMm;
    const usableW = cWidth - marginPx * 2;
    const usableH = cHeight - marginPx * 2;
    const items = pagePlan.items;

    if (items.length === 1) {
      // 1 photo per page
      const p = items[0].photo;
      const img = await this.loadImage(p.processedDataUrl || p.originalDataUrl);
      this.drawFitImage(ctx, img, marginPx, marginPx, usableW, usableH, settings.fitMode === 'fill');
    } else if (items.length === 2) {
      // 2 photos per page (vertical split)
      const slotH = (usableH - marginPx) / 2;
      for (let i = 0; i < 2; i++) {
        if (!items[i]) break;
        const img = await this.loadImage(items[i].photo.processedDataUrl || items[i].photo.originalDataUrl);
        const slotY = marginPx + i * (slotH + marginPx);
        this.drawFitImage(ctx, img, marginPx, slotY, usableW, slotH, false);
      }
    } else if (items.length >= 3) {
      // 4 photos per page (2x2 grid)
      const slotW = (usableW - marginPx) / 2;
      const slotH = (usableH - marginPx) / 2;
      for (let i = 0; i < Math.min(items.length, 4); i++) {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const slotX = marginPx + col * (slotW + marginPx);
        const slotY = marginPx + row * (slotH + marginPx);
        const img = await this.loadImage(items[i].photo.processedDataUrl || items[i].photo.originalDataUrl);
        this.drawFitImage(ctx, img, slotX, slotY, slotW, slotH, false);
      }
    }
  }

  /**
   * Draw ID card dual-sided layout
   */
  async drawIdCardLayout(ctx, pagePlan, cWidth, cHeight, pxPerMm, settings) {
    const cardSize = settings.idCardSize || 'standard'; // 'standard', 'enlarged'
    let cardWidthMm = ID_CARD_CR80.widthMm;
    let cardHeightMm = ID_CARD_CR80.heightMm;

    if (cardSize === 'enlarged') {
      cardWidthMm = 110;
      cardHeightMm = 69.3;
    } else if (cardSize === 'custom' && settings.idCardScale) {
      const scale = parseFloat(settings.idCardScale) / 100;
      cardWidthMm *= scale;
      cardHeightMm *= scale;
    }

    const cardWPx = cardWidthMm * pxPerMm;
    const cardHPx = cardHeightMm * pxPerMm;
    const layout = settings.idCardLayout || 'vertical'; // 'vertical' or 'horizontal'
    const showCutLines = settings.showCutLines !== false;
    const showLabels = settings.showLabels !== false;

    const items = pagePlan.items;
    const frontItem = items.find(it => it.role === 'front') || items[0];
    const backItem = items.find(it => it.role === 'back') || items[1];

    const cardsToDraw = [];
    if (layout === 'vertical') {
      // Front on top, Back on bottom (centered)
      const gapPx = 25 * pxPerMm;
      const totalH = cardHPx * 2 + gapPx;
      const startY = (cHeight - totalH) / 2;
      const startX = (cWidth - cardWPx) / 2;

      cardsToDraw.push({
        item: frontItem,
        role: 'FRONT SIDE',
        x: startX,
        y: startY,
        w: cardWPx,
        h: cardHPx
      });
      cardsToDraw.push({
        item: backItem,
        role: 'BACK SIDE',
        x: startX,
        y: startY + cardHPx + gapPx,
        w: cardWPx,
        h: cardHPx
      });
    } else {
      // Horizontal side-by-side
      const gapPx = 20 * pxPerMm;
      const totalW = cardWPx * 2 + gapPx;
      const startX = (cWidth - totalW) / 2;
      const startY = (cHeight - cardHPx) / 2;

      cardsToDraw.push({
        item: frontItem,
        role: 'FRONT SIDE',
        x: startX,
        y: startY,
        w: cardWPx,
        h: cardHPx
      });
      cardsToDraw.push({
        item: backItem,
        role: 'BACK SIDE',
        x: startX + cardWPx + gapPx,
        y: startY,
        w: cardWPx,
        h: cardHPx
      });
    }

    for (const card of cardsToDraw) {
      // Draw Label
      if (showLabels) {
        ctx.fillStyle = '#64748b';
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(card.role, card.x + card.w / 2, card.y - 10);
      }

      // Draw Cut Lines / Card outline
      if (showCutLines) {
        ctx.save();
        ctx.setLineDash([6, 4]);
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1.5;
        this.roundRect(ctx, card.x, card.y, card.w, card.h, 8);
        ctx.stroke();
        ctx.restore();
      }

      // Draw Card Photo
      if (card.item && card.item.photo) {
        const img = await this.loadImage(card.item.photo.processedDataUrl || card.item.photo.originalDataUrl);
        ctx.save();
        this.roundRect(ctx, card.x, card.y, card.w, card.h, 6);
        ctx.clip();
        this.drawFitImage(ctx, img, card.x, card.y, card.w, card.h, true);
        ctx.restore();
      } else {
        // Placeholder
        ctx.fillStyle = '#f1f5f9';
        this.roundRect(ctx, card.x, card.y, card.w, card.h, 6);
        ctx.fill();
        ctx.fillStyle = '#94a3b8';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`Drop ${card.role.toLowerCase()} photo here`, card.x + card.w / 2, card.y + card.h / 2);
      }
    }
  }

  roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  drawFitImage(ctx, img, x, y, maxW, maxH, fill = false) {
    const imgRatio = img.naturalWidth / img.naturalHeight;
    const boxRatio = maxW / maxH;
    let drawW, drawH, drawX, drawY;

    if (fill) {
      if (imgRatio > boxRatio) {
        drawH = maxH;
        drawW = maxH * imgRatio;
      } else {
        drawW = maxW;
        drawH = maxW / imgRatio;
      }
      drawX = x + (maxW - drawW) / 2;
      drawY = y + (maxH - drawH) / 2;
    } else {
      if (imgRatio > boxRatio) {
        drawW = maxW;
        drawH = maxW / imgRatio;
      } else {
        drawH = maxH;
        drawW = maxH * imgRatio;
      }
      drawX = x + (maxW - drawW) / 2;
      drawY = y + (maxH - drawH) / 2;
    }

    ctx.drawImage(img, drawX, drawY, drawW, drawH);
  }

  loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  /**
   * Export final high-res PDF file
   * Uses jsPDF if present, otherwise NativePdfWriter
   */
  async generatePdfBlob(photos, mode, settings, textData = null, onProgress = null) {
    this.checkJsPdfAvailability();
    const plannedPages = this.planPages(photos, mode, settings, textData);
    const quality = parseFloat(settings.quality || 0.85);

    if (this.hasJsPdf) {
      return await this.generateWithJsPdf(plannedPages, mode, settings, quality, onProgress);
    } else {
      return await this.generateWithNative(plannedPages, mode, settings, quality, onProgress);
    }
  }

  async generateWithJsPdf(plannedPages, mode, settings, quality, onProgress) {
    const { jsPDF } = window.jspdf;
    let pdfDoc = null;

    for (let i = 0; i < plannedPages.length; i++) {
      const pagePlan = plannedPages[i];
      if (onProgress) onProgress(i + 1, plannedPages.length);

      const orientation = pagePlan.widthMm > pagePlan.heightMm ? 'landscape' : 'portrait';
      const pageDims = [pagePlan.widthMm, pagePlan.heightMm];

      if (i === 0) {
        pdfDoc = new jsPDF({
          orientation: orientation,
          unit: 'mm',
          format: pageDims
        });
      } else {
        pdfDoc.addPage(pageDims, orientation);
      }

      // Render page on offscreen canvas for pixel-perfect precision
      const offCanvas = document.createElement('canvas');
      await this.renderPageToCanvas(pagePlan, offCanvas, mode, settings);
      const imgJpeg = offCanvas.toDataURL('image/jpeg', quality);

      pdfDoc.addImage(imgJpeg, 'JPEG', 0, 0, pagePlan.widthMm, pagePlan.heightMm);
    }

    return pdfDoc.output('blob');
  }

  async generateWithNative(plannedPages, mode, settings, quality, onProgress) {
    const writer = new NativePdfWriter();

    for (let i = 0; i < plannedPages.length; i++) {
      const pagePlan = plannedPages[i];
      if (onProgress) onProgress(i + 1, plannedPages.length);

      const wPt = pagePlan.widthMm * MM_TO_PT;
      const hPt = pagePlan.heightMm * MM_TO_PT;
      const page = writer.addPage(wPt, hPt);

      // Render high-res page
      const offCanvas = document.createElement('canvas');
      await this.renderPageToCanvas(pagePlan, offCanvas, mode, settings);
      const imgJpeg = offCanvas.toDataURL('image/jpeg', quality);

      writer.drawImage(page, imgJpeg, 0, 0, wPt, hPt);
    }

    return writer.buildPdfBlob();
  }
}

window.PdfExportEngine = PdfExportEngine;
