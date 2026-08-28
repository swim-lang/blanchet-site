(() => {
  'use strict';

  const FORMATS = Object.freeze({
    square: { width: 1200, height: 1200, label: 'Square Post' },
    portrait: { width: 1080, height: 1350, label: 'Portrait Post' },
    cover: { width: 4200, height: 700, label: 'Company Cover' }
  });

  const THEMES = Object.freeze({
    ink: { background: '#0c222c', foreground: '#ffffff', muted: '#b9c5ca', line: '#56707a', accent: '#dfe7ea' },
    paper: { background: '#f4f6f7', foreground: '#0c222c', muted: '#60737d', line: '#aab8be', accent: '#314956' },
    slate: { background: '#314956', foreground: '#ffffff', muted: '#d0dadd', line: '#82949c', accent: '#e7edef' }
  });

  const LOCAL_HEADSHOTS = Object.freeze({
    'joel-a-blanchet': 'assets/headshots/01_joel-a-blanchet.jpg',
    'andrew-p-devine': 'assets/headshots/02_andrew-p-devine.jpg',
    'jaran-r-moten': 'assets/headshots/03_jaran-r-moten.jpg',
    'john-r-worth': 'assets/headshots/04_john-r-worth.jpg',
    'myles-k-bartley': 'assets/headshots/05_myles-k-bartley.jpg',
    'robert-reagan': 'assets/headshots/06_robert-reagan.jpg',
    'frank-g-dylewski': 'assets/headshots/07_frank-g-dylewski.jpg',
    'stefan-w-engelhardt': 'assets/headshots/08_stefan-w-engelhardt.jpg',
    'james-doody': 'assets/headshots/09_james-doody.jpg',
    'hannah-e-amundsen': 'assets/headshots/10_hannah-e-amundsen.jpg',
    'caroline-e-creagan': 'assets/headshots/11_caroline-e-creagan.jpg',
    'timothy-cronin': 'assets/headshots/12_timothy-cronin.jpg',
    'bridget-ruschak': 'assets/headshots/13_bridget-ruschak.jpg',
    'joshua-s-wallace': 'assets/headshots/14_joshua-s-wallace.jpg',
    'peter-a-bellacosa': 'assets/headshots/15_peter-a-bellacosa.jpg'
  });

  const LOGO_ASSETS = Object.freeze({
    lockup: 'assets/logos/Primary-Lockup-Grey.svg',
    symbolLight: 'assets/logos/Logo-White-360.png',
    symbolDark: 'assets/logos/Logo-Color.png'
  });

  const DEFAULTS = Object.freeze({
    template: 'announcement',
    format: 'square',
    theme: 'ink',
    logo: 'lockup',
    focalX: 50,
    focalY: 50
  });

  const state = {
    ...DEFAULTS,
    attorneys: [],
    images: new Map(),
    imageUrl: '',
    imageLabel: '',
    imageObjectUrl: '',
    imageOrigin: '',
    ready: false,
    renderQueued: false
  };

  const elements = {
    form: document.querySelector('#art-form'),
    canvas: document.querySelector('#art-canvas'),
    canvasStage: document.querySelector('#canvas-stage'),
    previewHeading: document.querySelector('#preview-heading'),
    previewSize: document.querySelector('#preview-size'),
    exportDimensions: document.querySelector('#export-dimensions'),
    exportStatus: document.querySelector('#export-status'),
    downloadPng: document.querySelector('#download-png'),
    downloadJpg: document.querySelector('#download-jpg'),
    reset: document.querySelector('#reset-art'),
    formatGroup: document.querySelector('#format-group'),
    imageSection: document.querySelector('#image-section'),
    imageUpload: document.querySelector('#image-upload'),
    uploadLabel: document.querySelector('#upload-label'),
    imageThumbnail: document.querySelector('#image-thumbnail'),
    removeImage: document.querySelector('#remove-image'),
    focalControls: document.querySelector('#focal-controls'),
    focalX: document.querySelector('#focal-x'),
    focalY: document.querySelector('#focal-y'),
    imageStatus: document.querySelector('#image-status'),
    attorneySelect: document.querySelector('#attorney-select'),
    coverImageSelect: document.querySelector('#cover-image-select')
  };

  const ctx = elements.canvas.getContext('2d', { alpha: false });

  function slugify(value) {
    return String(value || '')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/&/g, 'and')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  function getValue(id) {
    const input = document.getElementById(id);
    return input ? input.value.trim() : '';
  }

  function checkedValue(name) {
    return elements.form.querySelector(`input[name="${name}"]:checked`)?.value || '';
  }

  function setChecked(name, value) {
    const input = elements.form.querySelector(`input[name="${name}"][value="${value}"]`);
    if (input) input.checked = true;
  }

  function titleCase(value) {
    return String(value || '').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function loadImage(url) {
    if (!url) return Promise.resolve(null);
    if (state.images.has(url)) return state.images.get(url);

    const promise = new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(`Unable to load ${url}`));
      image.src = url;
      if (image.complete && image.naturalWidth) resolve(image);
    });
    state.images.set(url, promise);
    return promise;
  }

  async function preloadBrandAssets() {
    await Promise.all([
      document.fonts?.ready || Promise.resolve(),
      ...Object.values(LOGO_ASSETS).map((url) => loadImage(url))
    ]);
  }

  function setStatus(message, isError = false) {
    elements.exportStatus.textContent = message;
    elements.exportStatus.classList.toggle('is-error', isError);
  }

  function updateCounters() {
    document.querySelectorAll('[data-count-for]').forEach((output) => {
      const field = document.getElementById(output.dataset.countFor);
      if (!field) return;
      output.value = `${field.value.length}/${field.maxLength}`;
      output.textContent = output.value;
    });
  }

  function imagePathForAttorney(attorney) {
    const fullNameSlug = slugify(attorney.fullName || attorney.name);
    if (LOCAL_HEADSHOTS[fullNameSlug]) return LOCAL_HEADSHOTS[fullNameSlug];

    const shortSlug = slugify(attorney.name);
    const matchedKey = Object.keys(LOCAL_HEADSHOTS).find((key) => key === shortSlug || key.endsWith(`-${shortSlug}`));
    return matchedKey ? LOCAL_HEADSHOTS[matchedKey] : '';
  }

  async function loadAttorneys() {
    const response = await fetch('bios.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('Unable to load the current attorney directory.');
    const data = await response.json();
    state.attorneys = (data.bios || []).map((attorney) => ({
      ...attorney,
      fullName: attorney.fullName || attorney.name,
      localImage: imagePathForAttorney(attorney)
    }));

    elements.attorneySelect.innerHTML = state.attorneys.map((attorney) => {
      const suffix = attorney.localImage ? '' : ' — upload photo';
      return `<option value="${slugify(attorney.fullName)}">${attorney.fullName}${suffix}</option>`;
    }).join('');

    const joel = state.attorneys.find((attorney) => slugify(attorney.fullName).includes('joel-a-blanchet')) || state.attorneys[0];
    if (joel) {
      elements.attorneySelect.value = slugify(joel.fullName);
      applyAttorney(joel, false);
    }
  }

  function applyAttorney(attorney, render = true) {
    if (!attorney) return;
    document.querySelector('#attorney-name').value = attorney.fullName || attorney.name;
    document.querySelector('#attorney-title').value = titleCase(attorney.role || 'Attorney');
    const focus = Array.isArray(attorney.areasOfFocus) ? attorney.areasOfFocus.slice(0, 3).join(' · ').slice(0, 130) : '';
    document.querySelector('#attorney-focus').value = focus || 'Trial-tested judgment for complex disputes where the law, facts, and stakes are all in motion.';
    elements.focalX.value = '50';
    elements.focalY.value = '34';
    state.focalX = 50;
    state.focalY = 34;
    updateCounters();

    if (state.imageObjectUrl) URL.revokeObjectURL(state.imageObjectUrl);
    state.imageObjectUrl = '';
    setImage(attorney.localImage || '', attorney.fullName, 'attorney', render);
  }

  async function setImage(url, label = '', origin = '', render = true) {
    state.imageUrl = url;
    state.imageLabel = label;
    state.imageOrigin = origin;
    elements.removeImage.disabled = !url;
    elements.focalControls.hidden = !url;
    elements.uploadLabel.textContent = url ? 'Replace image' : 'Choose image';
    elements.imageThumbnail.classList.toggle('is-empty', !url);
    elements.imageThumbnail.style.backgroundImage = url ? `url("${url}")` : '';
    elements.imageStatus.textContent = url ? label || 'Image selected' : imageEmptyStatus();

    if (url) {
      try {
        await loadImage(url);
      } catch (error) {
        state.imageUrl = '';
        elements.imageThumbnail.style.backgroundImage = '';
        elements.imageThumbnail.classList.add('is-empty');
        elements.imageStatus.textContent = 'Image could not be loaded.';
      }
    }
    if (render) queueRender();
  }

  function imageEmptyStatus() {
    if (state.template === 'attorney') return 'No approved headshot. Upload a JPG, PNG, or WebP.';
    if (state.template === 'cover') return 'Solid-color cover';
    return 'Optional';
  }

  function syncTemplate() {
    state.template = checkedValue('template') || DEFAULTS.template;
    document.querySelectorAll('[data-fields]').forEach((group) => {
      group.hidden = group.dataset.fields !== state.template;
    });

    const isCover = state.template === 'cover';
    const isPerspective = state.template === 'perspective';
    elements.formatGroup.hidden = isCover;
    elements.downloadJpg.hidden = !isCover;
    elements.imageSection.hidden = isPerspective;

    if (isCover) {
      state.format = 'cover';
      const selected = elements.coverImageSelect.value;
      if (selected !== 'none') setImage(selected, `${elements.coverImageSelect.selectedOptions[0].text} office image`, 'cover', false);
      else setImage('', '', 'cover', false);
    } else {
      state.format = checkedValue('format') || DEFAULTS.format;
      if (state.template === 'attorney') {
        const attorney = state.attorneys.find((item) => slugify(item.fullName) === elements.attorneySelect.value);
        if (attorney && state.imageOrigin !== 'upload') applyAttorney(attorney, false);
      } else if (state.imageOrigin !== 'upload') {
        setImage('', '', state.template, false);
      }
    }

    updateImageControls();
    updateCanvasMetadata();
  }

  function updateImageControls() {
    elements.imageThumbnail.classList.toggle('is-empty', !state.imageUrl);
    elements.imageStatus.textContent = state.imageUrl ? state.imageLabel || 'Image selected' : imageEmptyStatus();
  }

  function updateCanvasMetadata() {
    const format = FORMATS[state.format];
    elements.previewHeading.textContent = format.label;
    elements.previewSize.textContent = `${format.width} × ${format.height}`;
    elements.exportDimensions.textContent = `${format.width} × ${format.height} pixels`;
    elements.canvas.width = format.width;
    elements.canvas.height = format.height;
  }

  function font(weight, size, family = 'Inter') {
    return `${weight} ${size}px "${family}", Arial, sans-serif`;
  }

  function drawCoverImage(context, image, x, y, width, height, focalX = 50, focalY = 50) {
    const imageRatio = image.naturalWidth / image.naturalHeight;
    const frameRatio = width / height;
    let sourceWidth;
    let sourceHeight;

    if (imageRatio > frameRatio) {
      sourceHeight = image.naturalHeight;
      sourceWidth = sourceHeight * frameRatio;
    } else {
      sourceWidth = image.naturalWidth;
      sourceHeight = sourceWidth / frameRatio;
    }

    const maxX = image.naturalWidth - sourceWidth;
    const maxY = image.naturalHeight - sourceHeight;
    const sourceX = maxX * (focalX / 100);
    const sourceY = maxY * (focalY / 100);
    context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
  }

  function drawRule(context, x1, y1, x2, y2, color, width = 2) {
    context.save();
    context.strokeStyle = color;
    context.lineWidth = width;
    context.beginPath();
    context.moveTo(x1, y1);
    context.lineTo(x2, y2);
    context.stroke();
    context.restore();
  }

  function wrapText(context, text, maxWidth) {
    const paragraphs = String(text || '').split(/\n/);
    const lines = [];
    paragraphs.forEach((paragraph, paragraphIndex) => {
      const words = paragraph.trim().split(/\s+/).filter(Boolean);
      let line = '';
      words.forEach((word) => {
        const test = line ? `${line} ${word}` : word;
        if (line && context.measureText(test).width > maxWidth) {
          lines.push(line);
          line = word;
        } else {
          line = test;
        }
      });
      if (line) lines.push(line);
      if (paragraphIndex < paragraphs.length - 1) lines.push('');
    });
    return lines;
  }

  function fitText(context, text, maxWidth, maxLines, startSize, minSize, weight = 650, family = 'DM Sans') {
    let size = startSize;
    let lines = [];
    while (size >= minSize) {
      context.font = font(weight, size, family);
      lines = wrapText(context, text, maxWidth);
      if (lines.length <= maxLines) break;
      size -= 2;
    }
    return { size, lines: lines.slice(0, maxLines) };
  }

  function drawLines(context, lines, x, y, lineHeight, color, align = 'left') {
    context.save();
    context.fillStyle = color;
    context.textAlign = align;
    context.textBaseline = 'alphabetic';
    lines.forEach((line, index) => context.fillText(line, x, y + index * lineHeight));
    context.restore();
  }

  function measureLinesHeight(lines, lineHeight) {
    return lines.length ? (lines.length - 1) * lineHeight : 0;
  }

  async function drawLogo(context, type, theme, x, y, maxWidth, maxHeight) {
    if (type === 'none') return;
    const isDarkAsset = theme === 'paper';
    const source = type === 'symbol'
      ? (isDarkAsset ? LOGO_ASSETS.symbolDark : LOGO_ASSETS.symbolLight)
      : LOGO_ASSETS.lockup;
    const image = await loadImage(source);
    if (!image) return;

    const ratio = image.naturalWidth / image.naturalHeight;
    let width = maxWidth;
    let height = width / ratio;
    if (height > maxHeight) {
      height = maxHeight;
      width = height * ratio;
    }

    if (type === 'lockup' && isDarkAsset) {
      const offscreen = document.createElement('canvas');
      offscreen.width = Math.max(1, Math.round(width));
      offscreen.height = Math.max(1, Math.round(height));
      const offCtx = offscreen.getContext('2d');
      offCtx.drawImage(image, 0, 0, offscreen.width, offscreen.height);
      offCtx.globalCompositeOperation = 'source-in';
      offCtx.fillStyle = THEMES.paper.foreground;
      offCtx.fillRect(0, 0, offscreen.width, offscreen.height);
      context.drawImage(offscreen, x, y, width, height);
    } else {
      context.drawImage(image, x, y, width, height);
    }
  }

  function drawBrandFooter(context, colors, width, height, padding, scale, compact = false) {
    const y = height - padding;
    drawRule(context, padding, y - 42 * scale, width - padding, y - 42 * scale, colors.line, Math.max(1, 1.5 * scale));
    context.save();
    context.fillStyle = colors.muted;
    context.font = font(650, compact ? 20 * scale : 22 * scale);
    context.textBaseline = 'bottom';
    context.fillText('BUFFALO  ·  CHICAGO  ·  NEW YORK CITY', padding, y);
    context.textAlign = 'right';
    context.fillText('BLANCHETLLP.COM', width - padding, y);
    context.restore();
  }

  async function renderAnnouncement(context, format, colors) {
    const { width, height } = format;
    const scale = width / 1200;
    const padding = 88 * scale;
    const image = state.imageUrl ? await loadImage(state.imageUrl).catch(() => null) : null;
    const landscapePhoto = image && state.format === 'square';
    const portraitPhoto = image && state.format === 'portrait';

    context.fillStyle = colors.background;
    context.fillRect(0, 0, width, height);

    if (landscapePhoto) {
      const imageX = width * 0.61;
      drawCoverImage(context, image, imageX, 0, width - imageX, height, state.focalX, state.focalY);
      const gradient = context.createLinearGradient(imageX - width * 0.09, 0, imageX + width * 0.12, 0);
      gradient.addColorStop(0, colors.background);
      gradient.addColorStop(1, 'rgba(12,34,44,0)');
      context.fillStyle = gradient;
      context.fillRect(imageX - width * 0.09, 0, width * 0.22, height);
    } else if (portraitPhoto) {
      const photoHeight = height * 0.43;
      drawCoverImage(context, image, 0, 0, width, photoHeight, state.focalX, state.focalY);
      context.fillStyle = 'rgba(12,34,44,0.22)';
      context.fillRect(0, 0, width, photoHeight);
    }

    const logoY = portraitPhoto ? height * 0.47 : padding;
    await drawLogo(context, state.logo, state.theme, padding, logoY, state.logo === 'symbol' ? 82 * scale : 310 * scale, 72 * scale);

    const contentWidth = landscapePhoto ? width * 0.49 : width - padding * 2;
    const categoryY = portraitPhoto ? height * 0.57 : height * 0.27;
    context.fillStyle = colors.muted;
    context.font = font(700, 24 * scale);
    context.fillText(getValue('announcement-category').toUpperCase(), padding, categoryY);
    drawRule(context, padding, categoryY + 28 * scale, padding + 74 * scale, categoryY + 28 * scale, colors.foreground, 4 * scale);

    const headlineY = categoryY + 116 * scale;
    const headlineFit = fitText(context, getValue('announcement-headline'), contentWidth, portraitPhoto ? 4 : 5, portraitPhoto ? 60 * scale : 68 * scale, 42 * scale, 650);
    context.font = font(650, headlineFit.size, 'DM Sans');
    drawLines(context, headlineFit.lines, padding, headlineY, headlineFit.size * 1.08, colors.foreground);

    const headlineHeight = measureLinesHeight(headlineFit.lines, headlineFit.size * 1.08);
    const detailY = headlineY + headlineHeight + 70 * scale;
    context.font = font(400, 27 * scale);
    const detailLines = wrapText(context, getValue('announcement-detail'), contentWidth).slice(0, portraitPhoto ? 4 : 3);
    drawLines(context, detailLines, padding, detailY, 39 * scale, colors.muted);

    const date = getValue('announcement-date');
    if (date) {
      context.fillStyle = colors.foreground;
      context.font = font(650, 22 * scale);
      context.fillText(date.toUpperCase(), padding, Math.min(height - 130 * scale, detailY + detailLines.length * 39 * scale + 48 * scale));
    }

    drawBrandFooter(context, colors, width, height, padding, scale);
  }

  async function renderAttorney(context, format, colors) {
    const { width, height } = format;
    const scale = width / 1200;
    const padding = 86 * scale;
    const image = state.imageUrl ? await loadImage(state.imageUrl).catch(() => null) : null;

    context.fillStyle = colors.background;
    context.fillRect(0, 0, width, height);

    if (state.format === 'square') {
      const photoX = width * 0.52;
      if (image) {
        drawCoverImage(context, image, photoX, 0, width - photoX, height, state.focalX, state.focalY);
        context.fillStyle = 'rgba(12,34,44,0.1)';
        context.fillRect(photoX, 0, width - photoX, height);
      } else {
        context.fillStyle = state.theme === 'paper' ? '#e4e9eb' : '#253d47';
        context.fillRect(photoX, 0, width - photoX, height);
        context.fillStyle = colors.muted;
        context.font = font(600, 22 * scale);
        context.textAlign = 'center';
        context.fillText('UPLOAD HEADSHOT', photoX + (width - photoX) / 2, height / 2);
        context.textAlign = 'left';
      }
      await drawLogo(context, state.logo, state.theme, padding, padding, state.logo === 'symbol' ? 80 * scale : 300 * scale, 66 * scale);
      context.fillStyle = colors.muted;
      context.font = font(700, 22 * scale);
      context.fillText('ATTORNEY SPOTLIGHT', padding, height * 0.36);
      drawRule(context, padding, height * 0.36 + 28 * scale, padding + 74 * scale, height * 0.36 + 28 * scale, colors.foreground, 4 * scale);

      const nameFit = fitText(context, getValue('attorney-name'), width * 0.4, 3, 66 * scale, 45 * scale, 650);
      context.font = font(650, nameFit.size, 'DM Sans');
      drawLines(context, nameFit.lines, padding, height * 0.49, nameFit.size * 1.06, colors.foreground);
      const nameHeight = measureLinesHeight(nameFit.lines, nameFit.size * 1.06);

      context.fillStyle = colors.foreground;
      context.font = font(700, 24 * scale);
      context.fillText(getValue('attorney-title').toUpperCase(), padding, height * 0.49 + nameHeight + 56 * scale);

      context.font = font(400, 24 * scale);
      const focusLines = wrapText(context, getValue('attorney-focus'), width * 0.4).slice(0, 4);
      drawLines(context, focusLines, padding, height * 0.49 + nameHeight + 118 * scale, 35 * scale, colors.muted);
    } else {
      const photoHeight = height * 0.53;
      if (image) {
        drawCoverImage(context, image, 0, 0, width, photoHeight, state.focalX, state.focalY);
        context.fillStyle = 'rgba(12,34,44,0.08)';
        context.fillRect(0, 0, width, photoHeight);
      } else {
        context.fillStyle = state.theme === 'paper' ? '#e4e9eb' : '#253d47';
        context.fillRect(0, 0, width, photoHeight);
      }
      await drawLogo(context, state.logo, state.theme === 'paper' ? 'ink' : state.theme, padding, 68 * scale, state.logo === 'symbol' ? 80 * scale : 300 * scale, 66 * scale);

      const startY = photoHeight + 86 * scale;
      context.fillStyle = colors.muted;
      context.font = font(700, 21 * scale);
      context.fillText('ATTORNEY SPOTLIGHT', padding, startY);
      const nameFit = fitText(context, getValue('attorney-name'), width - padding * 2, 2, 64 * scale, 46 * scale, 650);
      context.font = font(650, nameFit.size, 'DM Sans');
      drawLines(context, nameFit.lines, padding, startY + 90 * scale, nameFit.size * 1.06, colors.foreground);
      const nameHeight = measureLinesHeight(nameFit.lines, nameFit.size * 1.06);
      context.fillStyle = colors.foreground;
      context.font = font(700, 23 * scale);
      context.fillText(getValue('attorney-title').toUpperCase(), padding, startY + nameHeight + 147 * scale);
      context.font = font(400, 24 * scale);
      const focusLines = wrapText(context, getValue('attorney-focus'), width - padding * 2).slice(0, 3);
      drawLines(context, focusLines, padding, startY + nameHeight + 205 * scale, 35 * scale, colors.muted);
    }

    drawBrandFooter(context, colors, width, height, padding, scale);
  }

  async function renderPerspective(context, format, colors) {
    const { width, height } = format;
    const scale = width / 1200;
    const padding = 88 * scale;
    context.fillStyle = colors.background;
    context.fillRect(0, 0, width, height);

    await drawLogo(context, state.logo, state.theme, padding, padding, state.logo === 'symbol' ? 82 * scale : 310 * scale, 72 * scale);
    context.fillStyle = colors.muted;
    context.font = font(700, 23 * scale);
    context.fillText(getValue('perspective-topic').toUpperCase(), padding, height * 0.28);

    context.fillStyle = colors.line;
    context.font = font(500, 170 * scale, 'DM Sans');
    context.fillText('“', padding - 10 * scale, height * 0.43);

    const statementWidth = width - padding * 2;
    const statementFit = fitText(context, getValue('perspective-statement'), statementWidth, state.format === 'portrait' ? 6 : 5, 59 * scale, 40 * scale, 550);
    context.font = font(550, statementFit.size, 'DM Sans');
    drawLines(context, statementFit.lines, padding, height * 0.42, statementFit.size * 1.18, colors.foreground);
    const statementHeight = measureLinesHeight(statementFit.lines, statementFit.size * 1.18);

    const attributionY = height * 0.42 + statementHeight + 94 * scale;
    drawRule(context, padding, attributionY - 38 * scale, padding + 74 * scale, attributionY - 38 * scale, colors.foreground, 4 * scale);
    context.fillStyle = colors.foreground;
    context.font = font(650, 25 * scale);
    context.fillText(getValue('perspective-attribution'), padding, attributionY);
    const practice = getValue('perspective-practice');
    if (practice) {
      context.fillStyle = colors.muted;
      context.font = font(600, 20 * scale);
      context.fillText(practice.toUpperCase(), padding, attributionY + 43 * scale);
    }

    drawBrandFooter(context, colors, width, height, padding, scale);
  }

  async function renderCompanyCover(context, format, colors) {
    const { width, height } = format;
    const scale = height / 700;
    const paddingX = 220 * scale;
    const image = state.imageUrl ? await loadImage(state.imageUrl).catch(() => null) : null;

    context.fillStyle = colors.background;
    context.fillRect(0, 0, width, height);
    if (image) {
      drawCoverImage(context, image, 0, 0, width, height, state.focalX, state.focalY);
      context.fillStyle = state.theme === 'paper' ? 'rgba(244,246,247,0.82)' : 'rgba(12,34,44,0.76)';
      context.fillRect(0, 0, width, height);
    }

    await drawLogo(context, state.logo, state.theme, paddingX, 82 * scale, state.logo === 'symbol' ? 110 * scale : 660 * scale, 94 * scale);

    const safeLeft = width * 0.22;
    const safeRight = width * 0.78;
    const safeWidth = safeRight - safeLeft;
    context.textAlign = 'center';
    const headlineFit = fitText(context, getValue('cover-headline'), safeWidth, 2, 72 * scale, 52 * scale, 650);
    context.font = font(650, headlineFit.size, 'DM Sans');
    drawLines(context, headlineFit.lines, width / 2, 330 * scale, headlineFit.size * 1.08, colors.foreground, 'center');
    const headlineHeight = measureLinesHeight(headlineFit.lines, headlineFit.size * 1.08);
    context.font = font(400, 31 * scale);
    const detailLines = wrapText(context, getValue('cover-detail'), safeWidth).slice(0, 2);
    drawLines(context, detailLines, width / 2, 330 * scale + headlineHeight + 72 * scale, 43 * scale, colors.muted, 'center');
    context.textAlign = 'left';

    drawRule(context, paddingX, height - 90 * scale, width - paddingX, height - 90 * scale, colors.line, 2 * scale);
    context.fillStyle = colors.muted;
    context.font = font(650, 22 * scale);
    context.fillText('BUFFALO  ·  CHICAGO  ·  NEW YORK CITY', paddingX, height - 47 * scale);
    context.textAlign = 'right';
    context.fillText('BLANCHETLLP.COM', width - paddingX, height - 47 * scale);
    context.textAlign = 'left';
  }

  async function render() {
    state.renderQueued = false;
    if (!state.ready) return;

    state.theme = checkedValue('theme') || DEFAULTS.theme;
    state.logo = checkedValue('logo') || DEFAULTS.logo;
    if (state.template !== 'cover') state.format = checkedValue('format') || DEFAULTS.format;
    state.focalX = Number(elements.focalX.value);
    state.focalY = Number(elements.focalY.value);

    const format = FORMATS[state.format];
    const colors = THEMES[state.theme];
    if (elements.canvas.width !== format.width || elements.canvas.height !== format.height) updateCanvasMetadata();
    ctx.clearRect(0, 0, format.width, format.height);

    try {
      if (state.template === 'announcement') await renderAnnouncement(ctx, format, colors);
      if (state.template === 'attorney') await renderAttorney(ctx, format, colors);
      if (state.template === 'perspective') await renderPerspective(ctx, format, colors);
      if (state.template === 'cover') await renderCompanyCover(ctx, format, colors);
      elements.downloadPng.disabled = false;
      elements.downloadJpg.disabled = false;
      setStatus('Artwork ready');
    } catch (error) {
      console.error(error);
      elements.downloadPng.disabled = true;
      elements.downloadJpg.disabled = true;
      setStatus('Artwork could not be rendered. Check the selected image and try again.', true);
    }
  }

  function queueRender() {
    updateCounters();
    if (state.renderQueued) return;
    state.renderQueued = true;
    requestAnimationFrame(render);
  }

  function handleTemplateChange() {
    syncTemplate();
    queueRender();
  }

  async function handleUpload(event) {
    const [file] = event.target.files || [];
    if (!file) return;
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      elements.imageStatus.textContent = 'Choose a JPG, PNG, or WebP file.';
      event.target.value = '';
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      elements.imageStatus.textContent = 'Image must be smaller than 15 MB.';
      event.target.value = '';
      return;
    }

    if (state.imageObjectUrl) URL.revokeObjectURL(state.imageObjectUrl);
    state.imageObjectUrl = URL.createObjectURL(file);
    state.images.delete(state.imageObjectUrl);
    await setImage(state.imageObjectUrl, file.name, 'upload');
    event.target.value = '';
  }

  function removeImage() {
    if (state.imageObjectUrl) URL.revokeObjectURL(state.imageObjectUrl);
    state.imageObjectUrl = '';
    if (state.template === 'cover') elements.coverImageSelect.value = 'none';
    setImage('', '', state.template);
  }

  function handleAttorneyChange() {
    const attorney = state.attorneys.find((item) => slugify(item.fullName) === elements.attorneySelect.value);
    applyAttorney(attorney);
  }

  function handleCoverImageChange() {
    if (state.imageObjectUrl) URL.revokeObjectURL(state.imageObjectUrl);
    state.imageObjectUrl = '';
    const url = elements.coverImageSelect.value;
    const label = url === 'none' ? '' : `${elements.coverImageSelect.selectedOptions[0].text} office image`;
    setImage(url === 'none' ? '' : url, label, 'cover');
  }

  function fileDate() {
    return new Date().toISOString().slice(0, 10);
  }

  function exportFilename(extension) {
    const templateName = state.template === 'attorney' ? 'attorney-spotlight' : state.template === 'perspective' ? 'firm-perspective' : state.template === 'cover' ? 'company-cover' : 'announcement';
    const formatName = state.template === 'cover' ? 'linkedin' : state.format;
    return `blanchet-${templateName}-${formatName}-${fileDate()}.${extension}`;
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function exportCanvas(type) {
    const mime = type === 'jpg' ? 'image/jpeg' : 'image/png';
    const extension = type === 'jpg' ? 'jpg' : 'png';
    setStatus('Preparing download...');
    elements.canvas.toBlob((blob) => {
      if (!blob) {
        setStatus('Download could not be created.', true);
        return;
      }
      downloadBlob(blob, exportFilename(extension));
      setStatus(`${extension.toUpperCase()} downloaded`);
    }, mime, type === 'jpg' ? 0.92 : undefined);
  }

  function resetArt() {
    elements.form.reset();
    if (state.imageObjectUrl) URL.revokeObjectURL(state.imageObjectUrl);
    state.imageObjectUrl = '';
    Object.assign(state, { ...DEFAULTS, imageUrl: '', imageLabel: '', imageOrigin: '' });
    elements.focalX.value = '50';
    elements.focalY.value = '50';
    setChecked('template', DEFAULTS.template);
    setChecked('format', DEFAULTS.format);
    setChecked('theme', DEFAULTS.theme);
    setChecked('logo', DEFAULTS.logo);
    syncTemplate();
    updateCounters();
    queueRender();
  }

  function bindEvents() {
    elements.form.addEventListener('input', (event) => {
      if (event.target.matches('input[name="template"]')) return;
      if (event.target.matches('input[name="format"]')) updateCanvasMetadata();
      queueRender();
    });
    elements.form.addEventListener('change', (event) => {
      if (event.target.matches('input[name="template"]')) handleTemplateChange();
    });
    elements.attorneySelect.addEventListener('change', handleAttorneyChange);
    elements.coverImageSelect.addEventListener('change', handleCoverImageChange);
    elements.imageUpload.addEventListener('change', handleUpload);
    elements.removeImage.addEventListener('click', removeImage);
    elements.downloadPng.addEventListener('click', () => exportCanvas('png'));
    elements.downloadJpg.addEventListener('click', () => exportCanvas('jpg'));
    elements.reset.addEventListener('click', resetArt);
    window.addEventListener('beforeunload', () => {
      if (state.imageObjectUrl) URL.revokeObjectURL(state.imageObjectUrl);
    });
  }

  async function init() {
    try {
      elements.imageThumbnail.classList.add('is-empty');
      updateCounters();
      bindEvents();
      await Promise.all([preloadBrandAssets(), loadAttorneys()]);
      state.ready = true;
      syncTemplate();
      updateCanvasMetadata();
      await render();
    } catch (error) {
      console.error(error);
      setStatus(error.message || 'The generator could not be initialized.', true);
    }
  }

  init();
})();
