/**
 * Converter - Main Application Controller
 * Handles UI interactions, state management, drag-and-drop, camera scanning,
 * text-to-pdf editing, and high-fidelity PDF generation
 */

document.addEventListener('DOMContentLoaded', () => {
  // Application State
  const state = {
    photos: [], // Array of photo objects
    currentMode: 'document', // 'document', 'idcard', 'letter', 'legal', 'scanner', 'text'
    settings: {
      pageFormat: 'a4',
      orientation: 'auto',
      marginMm: 10,
      photosPerPage: 1,
      fitMode: 'contain',
      quality: 0.85,
      pageNumbers: 'none',
      idCardLayout: 'vertical',
      idCardSize: 'standard',
      idCardScale: 100,
      showCutLines: true,
      showLabels: true,
      textPageFormat: 'a4',
      textMarginMm: 20,
      pdfFileName: 'document_scan.pdf'
    },
    textData: {
      title: '',
      content: '',
      fontFamily: 'sans-serif',
      fontSize: 12,
      isBold: false,
      isItalic: false,
      align: 'left',
      lineSpacing: 1.5,
      color: '#0f172a'
    },
    preview: {
      currentPage: 1,
      totalPages: 1,
      plannedPages: []
    },
    activeScannerPhotoId: null,
    theme: localStorage.getItem('converter_theme') || 'dark'
  };

  // Engines
  const scannerEngine = new ImageScannerEngine();
  const pdfEngine = new PdfExportEngine();

  // DOM Elements
  const leftPanelTitle = document.getElementById('leftPanelTitle');
  const photosView = document.getElementById('photosView');
  const textView = document.getElementById('textView');
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('fileInput');
  const browsePhotosBtn = document.getElementById('browsePhotosBtn');
  const dropzoneCameraBtn = document.getElementById('dropzoneCameraBtn');
  const openCameraBtn = document.getElementById('openCameraBtn');
  const photosListContainer = document.getElementById('photosListContainer');
  const photoCountBadge = document.getElementById('photoCountBadge');
  const modeButtons = document.querySelectorAll('.mode-btn');
  const modeInfoBanner = document.getElementById('modeInfoBanner');
  const modeDescription = document.getElementById('modeDescription');
  
  // Settings DOM
  const orientationSelect = document.getElementById('orientationSelect');
  const marginSelect = document.getElementById('marginSelect');
  const perPageSelect = document.getElementById('perPageSelect');
  const qualitySelect = document.getElementById('qualitySelect');
  const pageNumbersSelect = document.getElementById('pageNumbersSelect');
  const pdfFileNameInput = document.getElementById('pdfFileNameInput');
  const idCardSettingsGroup = document.getElementById('idCardSettingsGroup');
  const idCardLayoutSelect = document.getElementById('idCardLayoutSelect');
  const idCardSizeSelect = document.getElementById('idCardSizeSelect');
  const idCardCutLinesCheck = document.getElementById('idCardCutLinesCheck');

  // Text Settings DOM
  const textSettingsGroup = document.getElementById('textSettingsGroup');
  const textPageFormatSelect = document.getElementById('textPageFormatSelect');
  const textMarginSelect = document.getElementById('textMarginSelect');
  const textColorSelect = document.getElementById('textColorSelect');

  // Text Editor DOM
  const textDocTitle = document.getElementById('textDocTitle');
  const textFontFamilySelect = document.getElementById('textFontFamilySelect');
  const textFontSizeSelect = document.getElementById('textFontSizeSelect');
  const textBoldBtn = document.getElementById('textBoldBtn');
  const textItalicBtn = document.getElementById('textItalicBtn');
  const textAlignBtns = document.querySelectorAll('.format-btn[data-align]');
  const textLineSpacingSelect = document.getElementById('textLineSpacingSelect');
  const importTextFileBtn = document.getElementById('importTextFileBtn');
  const textFileImportInput = document.getElementById('textFileImportInput');
  const insertSampleTextBtn = document.getElementById('insertSampleTextBtn');
  const clearTextBtn = document.getElementById('clearTextBtn');
  const textContentArea = document.getElementById('textContentArea');
  const textStatsWords = document.getElementById('textStatsWords');
  const textStatsPages = document.getElementById('textStatsPages');

  // Preview DOM
  const previewCanvas = document.getElementById('pdfPreviewCanvas');
  const pageIndicator = document.getElementById('pageIndicator');
  const prevPageBtn = document.getElementById('prevPageBtn');
  const nextPageBtn = document.getElementById('nextPageBtn');
  const exportPdfBtn = document.getElementById('exportPdfBtn');

  // Scanner Modal DOM
  const scannerModal = document.getElementById('scannerModal');
  const scannerCanvas = document.getElementById('scannerCanvas');
  const closeScannerBtn = document.getElementById('closeScannerBtn');
  const closeScannerFooterBtn = document.getElementById('closeScannerFooterBtn');
  const saveScannerBtn = document.getElementById('saveScannerBtn');
  const applyAllScannerBtn = document.getElementById('applyAllScannerBtn');
  const brightnessSlider = document.getElementById('brightnessSlider');
  const contrastSlider = document.getElementById('contrastSlider');
  const saturationSlider = document.getElementById('saturationSlider');
  const sharpnessSlider = document.getElementById('sharpnessSlider');
  const warmthSlider = document.getElementById('warmthSlider');
  const thresholdSlider = document.getElementById('thresholdSlider');
  const fineAngleSlider = document.getElementById('fineAngleSlider');
  const brightnessVal = document.getElementById('brightnessVal');
  const contrastVal = document.getElementById('contrastVal');
  const saturationVal = document.getElementById('saturationVal');
  const sharpnessVal = document.getElementById('sharpnessVal');
  const warmthVal = document.getElementById('warmthVal');
  const thresholdVal = document.getElementById('thresholdVal');
  const fineAngleVal = document.getElementById('fineAngleVal');
  const filterPresetBtns = document.querySelectorAll('.filter-preset-btn');
  const cropToggleBtn = document.getElementById('cropToggleBtn');
  const applyCropBtn = document.getElementById('applyCropBtn');
  const resetCropBtn = document.getElementById('resetCropBtn');
  const resetAdjustmentsBtn = document.getElementById('resetAdjustmentsBtn');
  const modalTabBtns = document.querySelectorAll('.modal-tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');
  const aspectPills = document.querySelectorAll('.pill-btn[data-aspect]');
  const cropModePerspectiveBtn = document.getElementById('cropModePerspectiveBtn');
  const cropModeRectBtn = document.getElementById('cropModeRectBtn');
  const perspectiveCropControls = document.getElementById('perspectiveCropControls');
  const rectangleCropControls = document.getElementById('rectangleCropControls');
  const autoFitCornersBtn = document.getElementById('autoFitCornersBtn');
  const tightFitCornersBtn = document.getElementById('tightFitCornersBtn');
  const applyPerspectiveCropBtn = document.getElementById('applyPerspectiveCropBtn');
  const applyRectangleCropBtn = document.getElementById('applyRectangleCropBtn');

  // Camera Modal DOM
  const cameraModal = document.getElementById('cameraModal');
  const cameraVideo = document.getElementById('cameraVideo');
  const cameraReviewCanvas = document.getElementById('cameraReviewCanvas');
  const cameraFlash = document.getElementById('cameraFlash');
  const cameraDeviceSelect = document.getElementById('cameraDeviceSelect');
  const closeCameraBtn = document.getElementById('closeCameraBtn');
  const switchCameraBtn = document.getElementById('switchCameraBtn');
  const shutterBtn = document.getElementById('shutterBtn');
  const cameraLiveControls = document.getElementById('cameraLiveControls');
  const cameraReviewControls = document.getElementById('cameraReviewControls');
  const retakeBtn = document.getElementById('retakeBtn');
  const addAndSnapAnotherBtn = document.getElementById('addAndSnapAnotherBtn');
  const confirmAddPhotoBtn = document.getElementById('confirmAddPhotoBtn');
  const guidePills = document.querySelectorAll('.pill-btn[data-guide]');
  const guideBox = document.getElementById('guideBox');
  const cameraGuide = document.getElementById('cameraGuide');

  // Mobile DOM Elements
  const mobileTabEditorBtn = document.getElementById('mobileTabEditorBtn');
  const mobileTabPreviewBtn = document.getElementById('mobileTabPreviewBtn');
  const mobilePhotoCountBadge = document.getElementById('mobilePhotoCountBadge');
  const mobilePageCountBadge = document.getElementById('mobilePageCountBadge');
  const mobileTabEditorLabel = document.getElementById('mobileTabEditorLabel');
  const mobileCameraFabBtn = document.getElementById('mobileCameraFabBtn');
  const mobileGalleryFabBtn = document.getElementById('mobileGalleryFabBtn');
  const mobilePreviewToggleFabBtn = document.getElementById('mobilePreviewToggleFabBtn');
  const mobileExportLabel = document.getElementById('mobileExportLabel');
  const mobileCameraCaptureInput = document.getElementById('mobileCameraCaptureInput');
  let currentMobileView = 'editor';

  // Theme Toggle
  const themeToggleBtn = document.getElementById('themeToggleBtn');

  // Initialize Engines & Theme
  document.documentElement.setAttribute('data-theme', state.theme);
  scannerEngine.init(scannerCanvas);

  // Camera State
  let cameraStream = null;
  let currentFacingMode = 'environment';
  let capturedCameraDataUrl = null;
  let isCameraReviewing = false;

  // Text preview debounce timer
  let textDebounceTimer = null;

  // Mode Info Descriptions
  const MODE_DETAILS = {
    document: {
      desc: 'Standard A4 Document Mode. Converts photos into high-res A4 document pages with adjustable margins and orientation.',
      filename: 'my_document.pdf'
    },
    idcard: {
      desc: 'ID Card Mode (Double-Sided). Combines Front & Back onto a single page at true CR80 scale (85.6x54mm) with cut lines.',
      filename: 'id_card_scan.pdf'
    },
    letter: {
      desc: 'US Letter Mode (8.5 x 11 in). Formats your photos for standard North American Letter printing with multi-photo grid options.',
      filename: 'letter_document.pdf'
    },
    legal: {
      desc: 'US Legal Document Mode (8.5 x 14 in). Ideal for legal agreements, contracts, certificates, and deed records.',
      filename: 'legal_document.pdf'
    },
    scanner: {
      desc: 'Smart Scanner Mode. CamScanner-style enhancement with Magic Color background whitening, ink sharpening, and B&W filters.',
      filename: 'scanned_pages.pdf'
    },
    text: {
      desc: 'Text to PDF Mode. Type, paste, or import text notes and documents with instant auto-pagination, clean typography, headers, and footers.',
      filename: 'text_document.pdf'
    }
  };

  /* ==========================================================================
     Theme & Mobile Modal Switcher
     ========================================================================== */
  themeToggleBtn.addEventListener('click', () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', state.theme);
    localStorage.setItem('converter_theme', state.theme);
    showToast(`Switched to ${state.theme} theme`, 'info');
  });

  /* ==========================================================================
     Mode Switching
     ========================================================================== */
  modeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetMode = btn.dataset.mode;
      switchMode(targetMode);
    });
  });

  function switchMode(newMode) {
    state.currentMode = newMode;
    modeButtons.forEach(b => b.classList.toggle('active', b.dataset.mode === newMode));

    const info = MODE_DETAILS[newMode] || MODE_DETAILS.document;
    modeDescription.textContent = info.desc;
    state.settings.pdfFileName = info.filename;
    pdfFileNameInput.value = info.filename;

    if (newMode === 'text') {
      photosView.style.display = 'none';
      textView.style.display = 'flex';
      leftPanelTitle.textContent = 'Text Document Editor';
      photoCountBadge.style.display = 'none';
      if (mobileTabEditorLabel) mobileTabEditorLabel.textContent = 'Text Editor';
      if (mobilePhotoCountBadge) mobilePhotoCountBadge.style.display = 'none';

      idCardSettingsGroup.style.display = 'none';
      textSettingsGroup.style.display = 'grid';
      orientationSelect.parentElement.style.display = 'none';
      perPageSelect.parentElement.style.display = 'none';
      marginSelect.parentElement.style.display = 'none';
      qualitySelect.parentElement.style.display = 'none';

      updateTextStats();
    } else {
      photosView.style.display = 'flex';
      textView.style.display = 'none';
      leftPanelTitle.textContent = 'Photos & Arrangement';
      photoCountBadge.style.display = 'inline-block';
      if (mobileTabEditorLabel) mobileTabEditorLabel.textContent = 'Photos & Edit';
      if (mobilePhotoCountBadge) mobilePhotoCountBadge.style.display = 'inline-block';

      textSettingsGroup.style.display = 'none';
      qualitySelect.parentElement.style.display = 'flex';

      if (newMode === 'idcard') {
        idCardSettingsGroup.style.display = 'grid';
        orientationSelect.parentElement.style.display = 'none';
        perPageSelect.parentElement.style.display = 'none';
        marginSelect.parentElement.style.display = 'none';
      } else {
        idCardSettingsGroup.style.display = 'none';
        orientationSelect.parentElement.style.display = 'flex';
        perPageSelect.parentElement.style.display = 'flex';
        marginSelect.parentElement.style.display = 'flex';
      }

      if (newMode === 'scanner') {
        batchApplyPreset('magic', false);
      }
      renderPhotosList();
    }

    updatePreview(1);
    showToast(`Switched to ${newMode.toUpperCase()} Mode`, 'info');
  }

  /* ==========================================================================
     Text Editor Handlers
     ========================================================================== */
  textDocTitle.addEventListener('input', (e) => {
    state.textData.title = e.target.value;
    triggerTextDebounce();
  });

  textContentArea.addEventListener('input', (e) => {
    state.textData.content = e.target.value;
    updateTextStats();
    triggerTextDebounce();
  });

  function triggerTextDebounce() {
    clearTimeout(textDebounceTimer);
    textDebounceTimer = setTimeout(() => {
      updatePreview(state.preview.currentPage);
    }, 150);
  }

  function updateTextStats() {
    const text = state.textData.content || '';
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const chars = text.length;
    textStatsWords.textContent = `${words} word${words === 1 ? '' : 's'} • ${chars} character${chars === 1 ? '' : 's'}`;

    if (state.currentMode === 'text') {
      exportPdfBtn.disabled = !text.trim();
    }
  }

  textFontFamilySelect.addEventListener('change', (e) => {
    state.textData.fontFamily = e.target.value;
    textContentArea.style.fontFamily = e.target.value;
    updatePreview(state.preview.currentPage);
  });

  textFontSizeSelect.addEventListener('change', (e) => {
    state.textData.fontSize = parseInt(e.target.value, 10);
    updatePreview(state.preview.currentPage);
  });

  textBoldBtn.addEventListener('click', () => {
    state.textData.isBold = !state.textData.isBold;
    textBoldBtn.classList.toggle('active', state.textData.isBold);
    updatePreview(state.preview.currentPage);
  });

  textItalicBtn.addEventListener('click', () => {
    state.textData.isItalic = !state.textData.isItalic;
    textItalicBtn.classList.toggle('active', state.textData.isItalic);
    updatePreview(state.preview.currentPage);
  });

  textAlignBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      textAlignBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.textData.align = btn.dataset.align;
      textContentArea.style.textAlign = btn.dataset.align;
      updatePreview(state.preview.currentPage);
    });
  });

  textLineSpacingSelect.addEventListener('change', (e) => {
    state.textData.lineSpacing = parseFloat(e.target.value);
    textContentArea.style.lineHeight = e.target.value;
    updatePreview(state.preview.currentPage);
  });

  // Text Settings
  textPageFormatSelect.addEventListener('change', (e) => {
    state.settings.textPageFormat = e.target.value;
    updatePreview(1);
  });

  textMarginSelect.addEventListener('change', (e) => {
    state.settings.textMarginMm = parseFloat(e.target.value);
    updatePreview(state.preview.currentPage);
  });

  textColorSelect.addEventListener('change', (e) => {
    state.textData.color = e.target.value;
    updatePreview(state.preview.currentPage);
  });

  // Import Text File (.txt, .md, etc.)
  importTextFileBtn.addEventListener('click', () => textFileImportInput.click());
  textFileImportInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      textContentArea.value = event.target.result;
      state.textData.content = event.target.result;
      if (!state.textData.title) {
        const titleWithoutExt = file.name.replace(/\.[^/.]+$/, "");
        textDocTitle.value = titleWithoutExt;
        state.textData.title = titleWithoutExt;
      }
      updateTextStats();
      updatePreview(1);
      showToast(`Imported ${file.name} successfully!`, 'success');
      textFileImportInput.value = '';
    };
    reader.readAsText(file);
  });

  // Sample Text Template
  insertSampleTextBtn.addEventListener('click', () => {
    const sample = `PROJECT PROPOSAL & SUMMARY REPORT
Date: November 17, 2026
Prepared for: Antigravity Innovation Lab

1. EXECUTIVE SUMMARY
This project introduces Converter, a high-performance, client-side PDF document solution designed for zero-backend architecture. By running 100% in modern web browsers, user documents remain private and protected without third-party server exposure.

2. KEY OBJECTIVES
- High-Precision Multi-Photo Arrangement: Support effortless drag-and-drop sequencing, individual rotation, and multi-format grid arrangements.
- Specialized Presets: Tailored modes for A4 Documents, Double-Sided ID Cards (CR80 standard), US Letter, US Legal, and Smart Document Scanner mode.
- Dual-Engine PDF Generation: Seamless client-side PDF production using jsPDF and a built-in native PDF 1.4 binary encoder that functions completely offline.
- Text to PDF Engine: Automatic line-wrapping, pagination, font scaling, and running headers/footers for written notes and formal proposals.

3. SECURITY & PERFORMANCE ADVANTAGES
All image manipulation, canvas filtering, perspective adjustments, and PDF serialization are performed entirely within client memory. No telemetry, database logging, or external cloud transmission occurs at any point.

4. CONCLUSION
The architecture demonstrates superior responsiveness, offline reliability, and an intuitive user interface for everyday personal and enterprise documentation tasks.`;

    textDocTitle.value = "Converter Project Proposal";
    state.textData.title = textDocTitle.value;
    textContentArea.value = sample;
    state.textData.content = sample;
    updateTextStats();
    updatePreview(1);
    showToast('Sample template inserted!', 'info');
  });

  clearTextBtn.addEventListener('click', () => {
    if (!textContentArea.value) return;
    if (confirm('Clear document title and text content?')) {
      textDocTitle.value = '';
      state.textData.title = '';
      textContentArea.value = '';
      state.textData.content = '';
      updateTextStats();
      updatePreview(1);
      showToast('Text cleared', 'info');
    }
  });

  /* ==========================================================================
     Photo Upload, Drag-and-Drop & Clipboard Paste
     ========================================================================== */
  dropzone.addEventListener('click', () => fileInput.click());
  if (browsePhotosBtn) browsePhotosBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.click();
  });

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });

  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('dragover');
  });

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
      fileInput.value = '';
    }
  });

  window.addEventListener('dragover', (e) => e.preventDefault());
  window.addEventListener('drop', (e) => {
    if (!e.target.closest('#dropzone')) {
      e.preventDefault();
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    }
  });

  window.addEventListener('paste', (e) => {
    if (state.currentMode === 'text') return; // let normal text paste happen in textarea
    const items = (e.clipboardData || e.originalEvent.clipboardData).items;
    const pastedFiles = [];
    for (const item of items) {
      if (item.type.indexOf('image') !== -1) {
        const blob = item.getAsFile();
        pastedFiles.push(blob);
      }
    }
    if (pastedFiles.length > 0) {
      handleFiles(pastedFiles);
      showToast(`Pasted ${pastedFiles.length} image(s) from clipboard!`, 'success');
    }
  });

  async function handleFiles(fileList) {
    let addedCount = 0;
    const loadPromises = Array.from(fileList).map(file => {
      if (!file.type.startsWith('image/')) return null;
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const img = new Image();
          img.onload = () => {
            const isBack = (state.photos.length % 2 === 1) && state.currentMode === 'idcard';
            const photoObj = {
              id: 'p_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
              name: file.name || `Photo_${state.photos.length + 1}.jpg`,
              originalDataUrl: event.target.result,
              processedDataUrl: event.target.result,
              width: img.naturalWidth,
              height: img.naturalHeight,
              role: isBack ? 'back' : 'front',
              scannerSettings: {
                preset: state.currentMode === 'scanner' ? 'magic' : 'original',
                brightness: state.currentMode === 'scanner' ? 15 : 0,
                contrast: state.currentMode === 'scanner' ? 25 : 0,
                saturation: state.currentMode === 'scanner' ? 20 : 0,
                sharpness: state.currentMode === 'scanner' ? 25 : 0,
                warmth: 0,
                threshold: 128,
                rotation: 0,
                fineAngle: 0,
                flipH: false,
                flipV: false
              }
            };

            if (state.currentMode === 'scanner') {
              ImageScannerEngine.processOffline(photoObj.originalDataUrl, photoObj.scannerSettings)
                .then(processedUrl => {
                  photoObj.processedDataUrl = processedUrl;
                  resolve(photoObj);
                })
                .catch(() => resolve(photoObj));
            } else {
              resolve(photoObj);
            }
          };
          img.src = event.target.result;
        };
        reader.readAsDataURL(file);
      });
    }).filter(Boolean);

    const loadedPhotos = await Promise.all(loadPromises);
    loadedPhotos.forEach(p => {
      if (p) {
        state.photos.push(p);
        addedCount++;
      }
    });

    if (addedCount > 0) {
      showToast(`Added ${addedCount} photo(s)`, 'success');
      renderPhotosList();
      updatePreview(state.preview.currentPage);
    }
  }

  /* ==========================================================================
     Photos List Rendering & Drag-to-Reorder
     ========================================================================== */
  function renderPhotosList() {
    photoCountBadge.textContent = `${state.photos.length} photo${state.photos.length === 1 ? '' : 's'}`;
    if (mobilePhotoCountBadge) mobilePhotoCountBadge.textContent = state.photos.length;
    photosListContainer.innerHTML = '';

    if (state.photos.length === 0) {
      photosListContainer.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
          <p>No photos added yet</p>
          <span style="font-size:0.75rem;">Drop files above, paste with Ctrl+V, or snap with Camera</span>
        </div>
      `;
      if (state.currentMode !== 'text') {
        exportPdfBtn.disabled = true;
      }
      return;
    }

    if (state.currentMode !== 'text') {
      exportPdfBtn.disabled = false;
    }

    state.photos.forEach((photo, idx) => {
      const card = document.createElement('div');
      card.className = 'photo-card';
      card.draggable = true;
      card.dataset.id = photo.id;
      card.dataset.index = idx;

      let idBadgeHtml = '';
      if (state.currentMode === 'idcard') {
        const isFront = photo.role === 'front';
        idBadgeHtml = `
          <span class="id-badge ${isFront ? 'front' : 'back'}" title="Click to toggle Front/Back">
            ${isFront ? '● FRONT' : '● BACK'}
          </span>
        `;
      }

      card.innerHTML = `
        <div class="drag-handle" title="Drag to reorder">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="9" cy="6" r="1"/><circle cx="15" cy="6" r="1"/>
            <circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/>
            <circle cx="9" cy="18" r="1"/><circle cx="15" cy="18" r="1"/>
          </svg>
        </div>
        <div class="photo-thumb-wrapper">
          <img class="photo-thumb" src="${photo.processedDataUrl}" alt="${photo.name}" />
        </div>
        <div class="photo-info">
          <div class="photo-title" title="${photo.name}">#${idx + 1} ${photo.name}</div>
          <div class="photo-meta">
            ${photo.width} × ${photo.height}
            ${idBadgeHtml}
          </div>
        </div>
        <div class="card-actions">
          <button class="icon-btn" data-action="move-up" title="Move Up" ${idx === 0 ? 'disabled style="opacity:0.35;"' : ''}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="18 15 12 9 6 15"/>
            </svg>
          </button>
          <button class="icon-btn" data-action="move-down" title="Move Down" ${idx === state.photos.length - 1 ? 'disabled style="opacity:0.35;"' : ''}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
          <button class="icon-btn" data-action="rotate-left" title="Rotate 90° Left">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M2.5 2v6h6M2.66 15.57a10 10 0 1 0 .57-8.38l-2.73 2.81"/>
            </svg>
          </button>
          <button class="icon-btn" data-action="rotate-right" title="Rotate 90° Right">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l2.73 2.81"/>
            </svg>
          </button>
          <button class="icon-btn accent" data-action="scanner" title="Crop & Adjust Studio">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/>
              <rect x="7" y="7" width="10" height="10" rx="1"/>
            </svg>
          </button>
          <button class="icon-btn danger" data-action="delete" title="Delete Photo">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>
        </div>
      `;

      card.querySelector('[data-action="move-up"]').addEventListener('click', () => movePhoto(photo.id, -1));
      card.querySelector('[data-action="move-down"]').addEventListener('click', () => movePhoto(photo.id, 1));
      card.querySelector('[data-action="rotate-left"]').addEventListener('click', () => rotatePhoto(photo.id, -90));
      card.querySelector('[data-action="rotate-right"]').addEventListener('click', () => rotatePhoto(photo.id, 90));
      card.querySelector('[data-action="scanner"]').addEventListener('click', () => openScannerModal(photo.id));
      card.querySelector('[data-action="delete"]').addEventListener('click', () => deletePhoto(photo.id));

      const idBadge = card.querySelector('.id-badge');
      if (idBadge) {
        idBadge.addEventListener('click', () => {
          photo.role = photo.role === 'front' ? 'back' : 'front';
          renderPhotosList();
          updatePreview(state.preview.currentPage);
        });
      }

      setupCardDrag(card, idx);
      photosListContainer.appendChild(card);
    });
  }

  // HTML5 Drag and Drop Card Reordering
  let draggedIdx = null;

  function setupCardDrag(card, idx) {
    card.addEventListener('dragstart', (e) => {
      draggedIdx = idx;
      card.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', idx);
    });

    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      draggedIdx = null;
    });

    card.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    });

    card.addEventListener('drop', (e) => {
      e.preventDefault();
      const targetIdx = idx;
      if (draggedIdx !== null && draggedIdx !== targetIdx) {
        const movedItem = state.photos.splice(draggedIdx, 1)[0];
        state.photos.splice(targetIdx, 0, movedItem);
        renderPhotosList();
        updatePreview(state.preview.currentPage);
      }
    });
  }

  /* ==========================================================================
     Photo Actions
     ========================================================================== */
  async function rotatePhoto(photoId, deg) {
    const photo = state.photos.find(p => p.id === photoId);
    if (!photo) return;

    photo.scannerSettings.rotation = (photo.scannerSettings.rotation + deg + 360) % 360;
    const processed = await ImageScannerEngine.processOffline(photo.originalDataUrl, photo.scannerSettings);
    photo.processedDataUrl = processed;

    if (Math.abs(deg) === 90) {
      const tmp = photo.width;
      photo.width = photo.height;
      photo.height = tmp;
    }

    renderPhotosList();
    updatePreview(state.preview.currentPage);
  }

  function deletePhoto(photoId) {
    state.photos = state.photos.filter(p => p.id !== photoId);
    renderPhotosList();
    updatePreview(1);
    showToast('Photo removed', 'info');
  }

  function movePhoto(photoId, direction) {
    const idx = state.photos.findIndex(p => p.id === photoId);
    if (idx === -1) return;
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= state.photos.length) return;
    const temp = state.photos[idx];
    state.photos[idx] = state.photos[targetIdx];
    state.photos[targetIdx] = temp;
    renderPhotosList();
    updatePreview(state.preview.currentPage);
  }

  // Toolbar Actions: Add More, Clear All, Rotate All
  document.getElementById('addMoreBtn').addEventListener('click', () => fileInput.click());
  document.getElementById('clearAllBtn').addEventListener('click', () => {
    if (state.photos.length === 0) return;
    if (confirm('Are you sure you want to remove all photos?')) {
      state.photos = [];
      renderPhotosList();
      updatePreview(1);
      showToast('All photos cleared', 'info');
    }
  });

  document.getElementById('rotateAllBtn').addEventListener('click', async () => {
    if (state.photos.length === 0) return;
    for (const p of state.photos) {
      p.scannerSettings.rotation = (p.scannerSettings.rotation + 90) % 360;
      p.processedDataUrl = await ImageScannerEngine.processOffline(p.originalDataUrl, p.scannerSettings);
      const tmp = p.width;
      p.width = p.height;
      p.height = tmp;
    }
    renderPhotosList();
    updatePreview(state.preview.currentPage);
    showToast('Rotated all photos 90°', 'success');
  });

  document.getElementById('autoEnhanceAllBtn').addEventListener('click', () => {
    batchApplyPreset('magic', true);
  });

  async function batchApplyPreset(presetName, notify = true) {
    if (state.photos.length === 0) return;
    for (const p of state.photos) {
      p.scannerSettings.preset = presetName;
      p.scannerSettings.brightness = presetName === 'magic' ? 15 : 0;
      p.scannerSettings.contrast = presetName === 'magic' ? 25 : 0;
      p.scannerSettings.saturation = presetName === 'magic' ? 20 : 0;
      p.scannerSettings.sharpness = presetName === 'magic' ? 25 : 0;
      p.processedDataUrl = await ImageScannerEngine.processOffline(p.originalDataUrl, p.scannerSettings);
    }
    renderPhotosList();
    updatePreview(state.preview.currentPage);
    if (notify) showToast(`Applied ${presetName.toUpperCase()} to all photos!`, 'success');
  }

  /* ==========================================================================
     Crop, Adjust & Scanner Studio Modal
     ========================================================================== */
  function openScannerModal(photoId) {
    const photo = state.photos.find(p => p.id === photoId);
    if (!photo) return;
    state.activeScannerPhotoId = photoId;

    scannerModal.classList.add('active');

    brightnessSlider.value = photo.scannerSettings.brightness || 0;
    contrastSlider.value = photo.scannerSettings.contrast || 0;
    saturationSlider.value = photo.scannerSettings.saturation || 0;
    sharpnessSlider.value = photo.scannerSettings.sharpness || 0;
    warmthSlider.value = photo.scannerSettings.warmth || 0;
    thresholdSlider.value = photo.scannerSettings.threshold || 128;
    fineAngleSlider.value = photo.scannerSettings.fineAngle || 0;

    brightnessVal.textContent = brightnessSlider.value;
    contrastVal.textContent = contrastSlider.value;
    saturationVal.textContent = saturationSlider.value;
    sharpnessVal.textContent = sharpnessSlider.value;
    warmthVal.textContent = warmthSlider.value;
    thresholdVal.textContent = thresholdSlider.value;
    fineAngleVal.textContent = `${fineAngleSlider.value}°`;

    filterPresetBtns.forEach(b => {
      b.classList.toggle('active', b.dataset.filter === photo.scannerSettings.preset);
    });

    aspectPills.forEach(p => p.classList.toggle('active', p.dataset.aspect === 'free'));

    // Default to DocScanner 4-Corner perspective warping
    setCropMode('perspective');
    switchModalTab('tab-crop');

    scannerEngine.loadImage(photo.originalDataUrl, photo.scannerSettings).then(() => {
      scannerEngine.toggleCropper(true, 'perspective');
      updateCropToggleUI(true);
    });
  }

  function setCropMode(mode) {
    if (cropModePerspectiveBtn) cropModePerspectiveBtn.classList.toggle('active', mode === 'perspective');
    if (cropModeRectBtn) cropModeRectBtn.classList.toggle('active', mode === 'rectangle');
    if (perspectiveCropControls) perspectiveCropControls.style.display = mode === 'perspective' ? 'flex' : 'none';
    if (rectangleCropControls) rectangleCropControls.style.display = mode === 'rectangle' ? 'flex' : 'none';

    scannerEngine.setCropMode(mode);
    if (!scannerEngine.cropperActive) {
      scannerEngine.toggleCropper(true, mode);
      updateCropToggleUI(true);
    }
  }

  function updateCropToggleUI(isActive) {
    if (!cropToggleBtn) return;
    cropToggleBtn.classList.toggle('active', isActive);
    cropToggleBtn.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M6 2v14a2 2 0 0 0 2 2h14"/><path d="M18 22V8a2 2 0 0 0-2-2H2"/>
      </svg>
      Crop Handles: ${isActive ? 'ON' : 'OFF'}
    `;
  }

  function switchModalTab(tabId) {
    modalTabBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tabId));
    tabPanes.forEach(pane => pane.classList.toggle('active', pane.id === tabId));

    if (tabId === 'tab-crop') {
      scannerEngine.cropperActive = true;
      updateCropToggleUI(true);
      scannerEngine.renderPreview();
    } else {
      scannerEngine.cropperActive = false;
      updateCropToggleUI(false);
      scannerEngine.renderPreview();
    }
  }

  modalTabBtns.forEach(btn => {
    btn.addEventListener('click', () => switchModalTab(btn.dataset.tab));
  });

  closeScannerBtn.addEventListener('click', closeScanner);
  if (closeScannerFooterBtn) closeScannerFooterBtn.addEventListener('click', closeScanner);

  function closeScanner() {
    scannerModal.classList.remove('active');
    state.activeScannerPhotoId = null;
  }

  saveScannerBtn.addEventListener('click', () => {
    if (!state.activeScannerPhotoId) return;
    const photo = state.photos.find(p => p.id === state.activeScannerPhotoId);
    if (!photo) return;

    // Automatically commit crop / homography warp if cropper is active
    if (scannerEngine.cropperActive) {
      scannerEngine.applyCrop();
    }

    photo.scannerSettings = { ...scannerEngine.state };
    photo.processedDataUrl = scannerEngine.exportProcessedDataUrl(0.92);

    closeScanner();
    renderPhotosList();
    updatePreview(state.preview.currentPage);
    showToast('Adjustments & Crop saved successfully!', 'success');
  });

  applyAllScannerBtn.addEventListener('click', async () => {
    const currentSettings = { ...scannerEngine.state };
    for (const p of state.photos) {
      p.scannerSettings = { ...currentSettings };
      p.processedDataUrl = await ImageScannerEngine.processOffline(p.originalDataUrl, currentSettings);
    }
    closeScanner();
    renderPhotosList();
    updatePreview(state.preview.currentPage);
    showToast('Applied adjustments to ALL photos!', 'success');
  });

  filterPresetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterPresetBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      scannerEngine.setPreset(btn.dataset.filter);

      brightnessSlider.value = scannerEngine.state.brightness;
      contrastSlider.value = scannerEngine.state.contrast;
      saturationSlider.value = scannerEngine.state.saturation;
      sharpnessSlider.value = scannerEngine.state.sharpness;
      warmthSlider.value = scannerEngine.state.warmth;
      thresholdSlider.value = scannerEngine.state.threshold;

      brightnessVal.textContent = brightnessSlider.value;
      contrastVal.textContent = contrastSlider.value;
      saturationVal.textContent = saturationSlider.value;
      sharpnessVal.textContent = sharpnessSlider.value;
      warmthVal.textContent = warmthSlider.value;
      thresholdVal.textContent = thresholdSlider.value;
    });
  });

  brightnessSlider.addEventListener('input', (e) => {
    brightnessVal.textContent = e.target.value;
    scannerEngine.setBrightness(e.target.value);
  });

  contrastSlider.addEventListener('input', (e) => {
    contrastVal.textContent = e.target.value;
    scannerEngine.setContrast(e.target.value);
  });

  saturationSlider.addEventListener('input', (e) => {
    saturationVal.textContent = e.target.value;
    scannerEngine.setSaturation(e.target.value);
  });

  sharpnessSlider.addEventListener('input', (e) => {
    sharpnessVal.textContent = e.target.value;
    scannerEngine.setSharpness(e.target.value);
  });

  warmthSlider.addEventListener('input', (e) => {
    warmthVal.textContent = e.target.value;
    scannerEngine.setWarmth(e.target.value);
  });

  thresholdSlider.addEventListener('input', (e) => {
    thresholdVal.textContent = e.target.value;
    scannerEngine.setThreshold(e.target.value);
  });

  fineAngleSlider.addEventListener('input', (e) => {
    fineAngleVal.textContent = `${e.target.value}°`;
    scannerEngine.setFineAngle(e.target.value);
  });

  document.getElementById('rotateLeftModalBtn').addEventListener('click', () => scannerEngine.rotate(-90));
  document.getElementById('rotateRightModalBtn').addEventListener('click', () => scannerEngine.rotate(90));
  document.getElementById('flipHModalBtn').addEventListener('click', () => scannerEngine.flip('h'));
  document.getElementById('flipVModalBtn').addEventListener('click', () => scannerEngine.flip('v'));

  if (cropModePerspectiveBtn) {
    cropModePerspectiveBtn.addEventListener('click', () => {
      setCropMode('perspective');
      showToast('DocScanner 4-Corner Warp mode active', 'info');
    });
  }

  if (cropModeRectBtn) {
    cropModeRectBtn.addEventListener('click', () => {
      setCropMode('rectangle');
      showToast('Standard Rectangle Crop mode active', 'info');
    });
  }

  if (autoFitCornersBtn) {
    autoFitCornersBtn.addEventListener('click', () => {
      scannerEngine.initPerspectiveCorners(0.04);
      showToast('Corners reset to photo boundaries', 'info');
    });
  }

  if (tightFitCornersBtn) {
    tightFitCornersBtn.addEventListener('click', () => {
      scannerEngine.initPerspectiveCorners(0.10);
      showToast('Corners inset 10%', 'info');
    });
  }

  const handleApplyCrop = () => {
    scannerEngine.applyCrop();
    updateCropToggleUI(false);
    showToast('Document deskewed & cropped!', 'success');
  };

  if (applyPerspectiveCropBtn) applyPerspectiveCropBtn.addEventListener('click', handleApplyCrop);
  if (applyRectangleCropBtn) applyRectangleCropBtn.addEventListener('click', handleApplyCrop);
  if (applyCropBtn) applyCropBtn.addEventListener('click', handleApplyCrop);

  if (cropToggleBtn) {
    cropToggleBtn.addEventListener('click', () => {
      const willBeActive = !scannerEngine.cropperActive;
      scannerEngine.toggleCropper(willBeActive, scannerEngine.cropMode);
      updateCropToggleUI(willBeActive);
    });
  }

  aspectPills.forEach(pill => {
    pill.addEventListener('click', () => {
      aspectPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      const aspect = pill.dataset.aspect;
      setCropMode('rectangle');
      scannerEngine.toggleCropper(true, 'rectangle', aspect);
      updateCropToggleUI(true);
    });
  });

  resetCropBtn.addEventListener('click', () => {
    if (!state.activeScannerPhotoId) return;
    const photo = state.photos.find(p => p.id === state.activeScannerPhotoId);
    if (!photo) return;
    scannerEngine.loadImage(photo.originalDataUrl, {
      ...photo.scannerSettings,
      rotation: 0,
      fineAngle: 0,
      flipH: false,
      flipV: false,
      crop: null
    }).then(() => {
      setCropMode('perspective');
      scannerEngine.toggleCropper(true, 'perspective');
      updateCropToggleUI(true);
    });
    fineAngleSlider.value = 0;
    fineAngleVal.textContent = '0°';
    showToast('Reverted to original photo', 'info');
  });

  resetAdjustmentsBtn.addEventListener('click', () => {
    brightnessSlider.value = 0;
    contrastSlider.value = 0;
    saturationSlider.value = 0;
    sharpnessSlider.value = 0;
    warmthSlider.value = 0;
    thresholdSlider.value = 128;

    brightnessVal.textContent = '0';
    contrastVal.textContent = '0';
    saturationVal.textContent = '0';
    sharpnessVal.textContent = '0';
    warmthVal.textContent = '0';
    thresholdVal.textContent = '128';

    scannerEngine.setBrightness(0);
    scannerEngine.setContrast(0);
    scannerEngine.setSaturation(0);
    scannerEngine.setSharpness(0);
    scannerEngine.setWarmth(0);
    scannerEngine.setThreshold(128);
    showToast('Fine adjustments reset to neutral', 'info');
  });

  /* ==========================================================================
     Camera Document Scanner Controller
     ========================================================================== */
  if (dropzoneCameraBtn) dropzoneCameraBtn.addEventListener('click', openCamera);
  if (openCameraBtn) openCameraBtn.addEventListener('click', openCamera);
  closeCameraBtn.addEventListener('click', closeCamera);

  async function openCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      if (mobileCameraCaptureInput) {
        showToast('Opening device camera...', 'info');
        mobileCameraCaptureInput.click();
        return;
      }
    }
    cameraModal.classList.add('active');
    await startCameraStream();
    populateCameraDevices();
  }

  function closeCamera() {
    if (cameraStream) {
      cameraStream.getTracks().forEach(t => t.stop());
      cameraStream = null;
    }
    cameraModal.classList.remove('active');
    resetCameraView();
  }

  async function startCameraStream(deviceId = null) {
    if (cameraStream) {
      cameraStream.getTracks().forEach(t => t.stop());
    }

    const constraints = {
      video: {
        width: { ideal: 1920 },
        height: { ideal: 1080 }
      }
    };

    if (deviceId) {
      constraints.video.deviceId = { exact: deviceId };
    } else {
      constraints.video.facingMode = currentFacingMode;
    }

    try {
      cameraStream = await navigator.mediaDevices.getUserMedia(constraints);
      cameraVideo.srcObject = cameraStream;
      await cameraVideo.play();

      const track = cameraStream.getVideoTracks()[0];
      const settings = track.getSettings ? track.getSettings() : {};
      const isUserFacing = settings.facingMode === 'user' || currentFacingMode === 'user';
      cameraVideo.classList.toggle('mirrored', isUserFacing);

      resetCameraView();
    } catch (err) {
      console.warn('Initial camera access failed, attempting basic fallback:', err);
      try {
        cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
        cameraVideo.srcObject = cameraStream;
        await cameraVideo.play();
        resetCameraView();
      } catch (fallbackErr) {
        console.warn('In-browser camera access denied or insecure context, trying native mobile camera:', fallbackErr);
        closeCamera();
        if (mobileCameraCaptureInput) {
          showToast('Opening device camera...', 'info');
          mobileCameraCaptureInput.click();
        } else {
          showToast('Unable to open camera. Please allow camera permissions in browser.', 'error');
        }
      }
    }
  }

  async function populateCameraDevices() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(d => d.kind === 'videoinput');

      cameraDeviceSelect.innerHTML = '';
      videoDevices.forEach((dev, idx) => {
        const opt = document.createElement('option');
        opt.value = dev.deviceId;
        opt.textContent = dev.label || `Camera ${idx + 1}`;
        cameraDeviceSelect.appendChild(opt);
      });
    } catch (e) {
      console.warn('Could not enumerate camera devices:', e);
    }
  }

  cameraDeviceSelect.addEventListener('change', () => {
    if (cameraDeviceSelect.value) {
      startCameraStream(cameraDeviceSelect.value);
    }
  });

  switchCameraBtn.addEventListener('click', () => {
    currentFacingMode = currentFacingMode === 'environment' ? 'user' : 'environment';
    startCameraStream();
    showToast(`Switched to ${currentFacingMode === 'user' ? 'Front' : 'Rear'} camera`, 'info');
  });

  guidePills.forEach(pill => {
    pill.addEventListener('click', () => {
      guidePills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      const guide = pill.dataset.guide;

      if (guide === 'none') {
        cameraGuide.style.display = 'none';
      } else {
        cameraGuide.style.display = 'flex';
        guideBox.className = `guide-box ${guide}`;
      }
    });
  });

  shutterBtn.addEventListener('click', takeSnapshot);

  function takeSnapshot() {
    if (!cameraStream || isCameraReviewing) return;

    cameraFlash.classList.add('flash');
    setTimeout(() => cameraFlash.classList.remove('flash'), 60);

    const vW = cameraVideo.videoWidth || 1280;
    const vH = cameraVideo.videoHeight || 720;

    const snapCanvas = document.createElement('canvas');
    snapCanvas.width = vW;
    snapCanvas.height = vH;
    const sCtx = snapCanvas.getContext('2d');

    if (cameraVideo.classList.contains('mirrored')) {
      sCtx.translate(vW, 0);
      sCtx.scale(-1, 1);
    }
    sCtx.drawImage(cameraVideo, 0, 0, vW, vH);

    capturedCameraDataUrl = snapCanvas.toDataURL('image/jpeg', 0.95);

    cameraReviewCanvas.width = vW;
    cameraReviewCanvas.height = vH;
    const rCtx = cameraReviewCanvas.getContext('2d');
    rCtx.drawImage(snapCanvas, 0, 0);

    cameraVideo.style.display = 'none';
    cameraReviewCanvas.style.display = 'block';
    cameraGuide.style.display = 'none';
    cameraLiveControls.style.display = 'none';
    cameraReviewControls.style.display = 'flex';
    isCameraReviewing = true;
  }

  function resetCameraView() {
    cameraVideo.style.display = 'block';
    cameraReviewCanvas.style.display = 'none';
    const activeGuidePill = document.querySelector('.pill-btn[data-guide].active');
    if (activeGuidePill && activeGuidePill.dataset.guide !== 'none') {
      cameraGuide.style.display = 'flex';
    } else {
      cameraGuide.style.display = 'none';
    }
    cameraLiveControls.style.display = 'flex';
    cameraReviewControls.style.display = 'none';
    capturedCameraDataUrl = null;
    isCameraReviewing = false;
  }

  retakeBtn.addEventListener('click', resetCameraView);
  addAndSnapAnotherBtn.addEventListener('click', () => confirmAddCapturedPhoto(true));
  confirmAddPhotoBtn.addEventListener('click', () => confirmAddCapturedPhoto(false));

  async function confirmAddCapturedPhoto(snapAnother = false) {
    if (!capturedCameraDataUrl) return;

    const isBack = (state.photos.length % 2 === 1) && state.currentMode === 'idcard';
    const photoObj = {
      id: 'p_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      name: `Camera_Scan_${state.photos.length + 1}.jpg`,
      originalDataUrl: capturedCameraDataUrl,
      processedDataUrl: capturedCameraDataUrl,
      width: cameraReviewCanvas.width,
      height: cameraReviewCanvas.height,
      role: isBack ? 'back' : 'front',
      scannerSettings: {
        preset: state.currentMode === 'scanner' ? 'magic' : 'original',
        brightness: state.currentMode === 'scanner' ? 15 : 0,
        contrast: state.currentMode === 'scanner' ? 25 : 0,
        saturation: state.currentMode === 'scanner' ? 20 : 0,
        sharpness: state.currentMode === 'scanner' ? 25 : 0,
        warmth: 0,
        threshold: 128,
        rotation: 0,
        fineAngle: 0,
        flipH: false,
        flipV: false
      }
    };

    if (state.currentMode === 'scanner') {
      photoObj.processedDataUrl = await ImageScannerEngine.processOffline(photoObj.originalDataUrl, photoObj.scannerSettings);
    }

    state.photos.push(photoObj);
    renderPhotosList();
    updatePreview(state.preview.totalPages);
    showToast(`Added photo #${state.photos.length} from camera!`, 'success');

    if (snapAnother) {
      resetCameraView();
    } else {
      closeCamera();
    }
  }

  // Keyboard Shortcuts
  window.addEventListener('keydown', (e) => {
    if (cameraModal.classList.contains('active')) {
      if (e.code === 'Space' && !isCameraReviewing) {
        e.preventDefault();
        takeSnapshot();
      } else if (e.key === 'Escape') {
        closeCamera();
      }
    } else if (scannerModal.classList.contains('active')) {
      if (e.key === 'Escape') {
        closeScanner();
      }
    }
  });

  /* ==========================================================================
     Settings Changes
     ========================================================================== */
  orientationSelect.addEventListener('change', (e) => {
    state.settings.orientation = e.target.value;
    updatePreview(1);
  });

  marginSelect.addEventListener('change', (e) => {
    state.settings.marginMm = parseFloat(e.target.value);
    updatePreview(state.preview.currentPage);
  });

  perPageSelect.addEventListener('change', (e) => {
    state.settings.photosPerPage = parseInt(e.target.value, 10);
    updatePreview(1);
  });

  qualitySelect.addEventListener('change', (e) => {
    state.settings.quality = parseFloat(e.target.value);
  });

  pageNumbersSelect.addEventListener('change', (e) => {
    state.settings.pageNumbers = e.target.value;
    updatePreview(state.preview.currentPage);
  });

  pdfFileNameInput.addEventListener('input', (e) => {
    state.settings.pdfFileName = e.target.value.trim() || 'document.pdf';
  });

  idCardLayoutSelect.addEventListener('change', (e) => {
    state.settings.idCardLayout = e.target.value;
    updatePreview(1);
  });

  idCardSizeSelect.addEventListener('change', (e) => {
    state.settings.idCardSize = e.target.value;
    updatePreview(1);
  });

  idCardCutLinesCheck.addEventListener('change', (e) => {
    state.settings.showCutLines = e.target.checked;
    updatePreview(state.preview.currentPage);
  });

  /* ==========================================================================
     Live Preview System
     ========================================================================== */
  async function updatePreview(pageIndex = 1) {
    const pages = pdfEngine.planPages(state.photos, state.currentMode, state.settings, state.textData);
    state.preview.plannedPages = pages;
    state.preview.totalPages = Math.max(1, pages.length);
    state.preview.currentPage = Math.min(Math.max(1, pageIndex), state.preview.totalPages);

    pageIndicator.textContent = `Page ${state.preview.currentPage} of ${state.preview.totalPages}`;
    if (mobilePageCountBadge) {
      mobilePageCountBadge.style.display = pages.length > 0 ? 'inline-block' : 'none';
      mobilePageCountBadge.textContent = `${state.preview.totalPages} p`;
    }
    prevPageBtn.disabled = state.preview.currentPage <= 1;
    nextPageBtn.disabled = state.preview.currentPage >= state.preview.totalPages;

    if (state.currentMode === 'text') {
      textStatsPages.textContent = `Estimated Pages: ${state.preview.totalPages}`;
      exportPdfBtn.disabled = !state.textData.content.trim();
    } else {
      exportPdfBtn.disabled = state.photos.length === 0;
    }

    const targetPagePlan = pages[state.preview.currentPage - 1];
    if (targetPagePlan) {
      await pdfEngine.renderPageToCanvas(targetPagePlan, previewCanvas, state.currentMode, state.settings);
    }
  }

  prevPageBtn.addEventListener('click', () => {
    if (state.preview.currentPage > 1) {
      updatePreview(state.preview.currentPage - 1);
    }
  });

  nextPageBtn.addEventListener('click', () => {
    if (state.preview.currentPage < state.preview.totalPages) {
      updatePreview(state.preview.currentPage + 1);
    }
  });

  const togglePreviewSizeBtn = document.getElementById('togglePreviewSizeBtn');
  const previewViewport = document.querySelector('.preview-viewport');
  const previewExpandIcon = document.getElementById('previewExpandIcon');

  if (togglePreviewSizeBtn && previewViewport) {
    togglePreviewSizeBtn.addEventListener('click', () => {
      const isExpanded = previewViewport.classList.toggle('expanded');
      togglePreviewSizeBtn.title = isExpanded ? 'Switch to Compact View' : 'Switch to Larger View';
      if (previewExpandIcon) {
        previewExpandIcon.innerHTML = isExpanded
          ? `<polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/>`
          : `<polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>`;
      }
      showToast(isExpanded ? 'Preview expanded' : 'Preview compact (no scrolling)', 'info');
    });
  }

  /* ==========================================================================
     Export & Download PDF
     ========================================================================== */
  async function exportPdf() {
    if (state.currentMode === 'text' && !state.textData.content.trim()) {
      showToast('Please type or import some text first!', 'error');
      return;
    }
    if (state.currentMode !== 'text' && state.photos.length === 0) {
      showToast('Please add at least one photo first!', 'error');
      return;
    }

    const originalBtnText = exportPdfBtn.innerHTML;
    exportPdfBtn.disabled = true;
    exportPdfBtn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin">
        <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
      </svg>
      Generating PDF...
    `;
    if (mobileExportLabel) mobileExportLabel.textContent = 'Generating...';

    try {
      const blob = await pdfEngine.generatePdfBlob(
        state.photos,
        state.currentMode,
        state.settings,
        state.textData,
        (current, total) => {
          exportPdfBtn.innerHTML = `Generating page ${current} of ${total}...`;
          if (mobileExportLabel) mobileExportLabel.textContent = `${current}/${total} pp...`;
        }
      );

      let fileName = state.settings.pdfFileName;
      if (!fileName.toLowerCase().endsWith('.pdf')) fileName += '.pdf';

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      const fileSizeMb = (blob.size / (1024 * 1024)).toFixed(2);
      showToast(`PDF downloaded successfully! (${fileSizeMb} MB)`, 'success');
    } catch (err) {
      console.error('PDF export failed:', err);
      showToast('Failed to generate PDF. Check console for details.', 'error');
    } finally {
      exportPdfBtn.disabled = false;
      exportPdfBtn.innerHTML = originalBtnText;
      if (mobileExportLabel) {
        mobileExportLabel.textContent = currentMobileView === 'preview' ? 'Download PDF' : 'View PDF';
      }
    }
  }

  exportPdfBtn.addEventListener('click', exportPdf);

  /* ==========================================================================
     Mobile Navigation & Floating Action Bar Controller
     ========================================================================== */
  function setMobileView(view) {
    currentMobileView = view;
    const isPreview = view === 'preview';

    if (mobileTabEditorBtn) mobileTabEditorBtn.classList.toggle('active', !isPreview);
    if (mobileTabPreviewBtn) mobileTabPreviewBtn.classList.toggle('active', isPreview);
    document.body.classList.toggle('mobile-preview-active', isPreview);

    if (mobileExportLabel) {
      mobileExportLabel.textContent = isPreview ? 'Download PDF' : 'View PDF';
    }

    if (isPreview) {
      updatePreview(state.preview.currentPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  if (mobileTabEditorBtn) {
    mobileTabEditorBtn.addEventListener('click', () => setMobileView('editor'));
  }

  if (mobileTabPreviewBtn) {
    mobileTabPreviewBtn.addEventListener('click', () => setMobileView('preview'));
  }

  if (mobileCameraFabBtn) {
    mobileCameraFabBtn.addEventListener('click', openCamera);
  }

  if (mobileGalleryFabBtn) {
    mobileGalleryFabBtn.addEventListener('click', () => fileInput.click());
  }

  if (mobilePreviewToggleFabBtn) {
    mobilePreviewToggleFabBtn.addEventListener('click', () => {
      if (currentMobileView === 'editor') {
        setMobileView('preview');
      } else {
        exportPdf();
      }
    });
  }

  if (mobileCameraCaptureInput) {
    mobileCameraCaptureInput.addEventListener('change', (e) => {
      handleFiles(e.target.files);
      mobileCameraCaptureInput.value = '';
    });
  }

  /* ==========================================================================
     Toast Notification System
     ========================================================================== */
  function showToast(message, type = 'info') {
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  // Initial render
  renderPhotosList();
  updatePreview(1);
});
