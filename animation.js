(() => {
  'use strict';

  const $ = selector => document.querySelector(selector);
  const escapeHtml = str => str.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  
  const scene = $('#scene') || $('.scene');
  const masterVideo = $('#master-video') || $('.master-cinematic-video');
  const isAuthentic = Boolean(scene && scene.classList.contains('authentic-mode') && masterVideo);
  let TOTAL_DURATION = 10000;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const embedded = window.parent !== window && (window.ANTIGRAVITY_EXTERNAL || window.AEMEATH_EXTERNAL || new URLSearchParams(location.search).has('embedded'));

  const defaultAssets = {
    artwork: 'assets/hsin-artwork.jpg',
    avatar: 'assets/avatar.jpg',
    characterGif: 'assets/elaina-transparent.gif',
    video: 'assets/hsin-start-edited.mp4'
  };
  const assets = window.ANTIGRAVITY_ASSETS || window.AEMEATH_ASSETS || defaultAssets;

  if (embedded) document.body.classList.add('embedded');

  // DOM Elements
  const stage = $('#character-stage') || $('.character-stage');
  const video = $('.character-video');
  const artwork = $('.character-artwork');
  const canvas = $('.character-canvas');
  const scanline = $('.scanline-laser');
  const orbitalSystem = $('.orbital-system');
  const meteorsLayer = $('.meteors-layer');
  const codeStream = $('#code-stream');
  const ambientGlow = $('.ambient-glow');
  const ratioText = $('#ratio');
  const syncBar = $('#sync-bar');
  const bottomProgress = $('#bottom-progress');
  const syncStatus = $('#sync-status');
  const timecode = $('#timecode');
  const flash = $('.transition-flash');
  const shutter = $('.shutter-line');
  const bootCurtain = $('#boot-curtain') || $('.boot-curtain');
  const bootGif = $('#boot-gif') || $('.boot-character-gif');
  if (bootGif && (!bootGif.getAttribute('src') || bootGif.getAttribute('src') === '')) {
    bootGif.src = assets.characterGif || 'assets/elaina-transparent.gif';
  }
  const slider = $('#timeline');
  const pauseBtn = $('#pause');
  const replayBtn = $('#replay');
  const elapsedOut = $('#elapsed');
  const dialog = $('#settings-dialog');
  const wallpaperSlider = $('#wallpaper-strength');
  const wallpaperValue = $('#wallpaper-value');
  const themeSelect = $('#theme-preset');
  const editorOpacitySlider = $('#editor-opacity');
  const editorOpacityValue = $('#editor-opacity-value');

  // Ensure default media paths are populated immediately (vital for embedded iframe mode)
  if (masterVideo) {
    masterVideo.muted = true;
    masterVideo.defaultMuted = true;
    masterVideo.playsInline = true;
    masterVideo.autoplay = true;
    if (!masterVideo.getAttribute('src') || masterVideo.getAttribute('src') === '') {
      masterVideo.src = assets.video;
    }
  }
  if (video) {
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.autoplay = true;
    if (!video.getAttribute('src') || video.getAttribute('src') === '') {
      video.src = assets.video;
    }
    video.addEventListener('error', () => {
      console.warn('[Antigravity] Video load notice, keeping artwork visible');
      if (artwork) {
        artwork.style.opacity = '1';
        artwork.style.filter = 'none';
      }
    });
  }
  if (artwork && (!artwork.getAttribute('src') || artwork.getAttribute('src') === '')) {
    artwork.src = assets.artwork;
  }

  if (slider) slider.max = String(TOTAL_DURATION / 1000);

  // Math Helpers
  const clamp = n => Math.max(0, Math.min(1, n));
  const smooth = n => { const t = clamp(n); return t * t * (3 - 2 * t); };

  // Playback State
  let playing = false;
  let elapsed = 0;
  let origin = 0;
  let frame = 0;
  let completed = false;
  let userConfig = null;
  let wallpaperStrength = 40;
  let editorOpacity = 82;
  let currentThemePreset = 'elaina';
  let autoPalette = null;

  const send = (action, details = {}) => {
    const data = { type: 'antigravity-boot', action, ...details };
    if (window.ANTIGRAVITY_SEND) {
      window.ANTIGRAVITY_SEND(data);
    } else if (window.AEMEATH_SEND) {
      window.AEMEATH_SEND(data);
    } else if (embedded) {
      window.parent.postMessage(data, '*');
    }
  };

  // 49 sci-fi script lines for the adapted startup animation
  const CODE_LINES = [
    { text: "// Initializing neural core · Starlight online", type: "comment" },
    { text: "const seed = 'ocean://memory';", type: "code", tokens: [
      { t: "keyword", v: "const " }, { t: "ident", v: "seed" }, { t: "op", v: " = " }, { t: "string", v: "'ocean://memory'" }, { t: "op", v: ";" }
    ]},
    { text: "await boot(seed); // neural matrix online", type: "code", tokens: [
      { t: "keyword", v: "await " }, { t: "fn", v: "boot" }, { t: "op", v: "(" }, { t: "ident", v: "seed" }, { t: "op", v: "); " }, { t: "comment", v: "// neural matrix online" }
    ]},
    { text: "const clock = sync('neural');", type: "code", tokens: [
      { t: "keyword", v: "const " }, { t: "ident", v: "clock" }, { t: "op", v: " = " }, { t: "fn", v: "sync" }, { t: "op", v: "(" }, { t: "string", v: "'neural'" }, { t: "op", v: ");" }
    ]},
    { text: "clock.rate = 60; // synchronize light particles", type: "code", tokens: [
      { t: "ident", v: "clock" }, { t: "op", v: "." }, { t: "prop", v: "rate" }, { t: "op", v: " = " }, { t: "number", v: "60" }, { t: "op", v: "; " }, { t: "comment", v: "// synchronize light particles" }
    ]},
    { text: "// Photon array · Signal link connected", type: "comment" },
    { text: "const photons = collect('cyan');", type: "code", tokens: [
      { t: "keyword", v: "const " }, { t: "ident", v: "photons" }, { t: "op", v: " = " }, { t: "fn", v: "collect" }, { t: "op", v: "(" }, { t: "string", v: "'cyan'" }, { t: "op", v: ");" }
    ]},
    { text: "photons.spread(0.72);", type: "code", tokens: [
      { t: "ident", v: "photons" }, { t: "op", v: "." }, { t: "fn", v: "spread" }, { t: "op", v: "(" }, { t: "number", v: "0.72" }, { t: "op", v: ");" }
    ]},
    { text: "await photons.align(); // spectrum calibrated", type: "code", tokens: [
      { t: "keyword", v: "await " }, { t: "ident", v: "photons" }, { t: "op", v: "." }, { t: "fn", v: "align" }, { t: "op", v: "(); " }, { t: "comment", v: "// spectrum calibrated" }
    ]},
    { text: "// Collecting luminescence · Rebuilding strands", type: "comment" },
    { text: "const light = scan('hair');", type: "code", tokens: [
      { t: "keyword", v: "const " }, { t: "ident", v: "light" }, { t: "op", v: " = " }, { t: "fn", v: "scan" }, { t: "op", v: "(" }, { t: "string", v: "'hair'" }, { t: "op", v: ");" }
    ]},
    { text: "await light.trace(); // luminous strands rebuilt", type: "code", tokens: [
      { t: "keyword", v: "await " }, { t: "ident", v: "light" }, { t: "op", v: "." }, { t: "fn", v: "trace" }, { t: "op", v: "(); " }, { t: "comment", v: "// luminous strands rebuilt" }
    ]},
    { text: "light.edge = 0.85;", type: "code", tokens: [
      { t: "ident", v: "light" }, { t: "op", v: "." }, { t: "prop", v: "edge" }, { t: "op", v: " = " }, { t: "number", v: "0.85" }, { t: "op", v: ";" }
    ]},
    { text: "light.tint = ['cyan', 'violet', 'ice'];", type: "code", tokens: [
      { t: "ident", v: "light" }, { t: "op", v: "." }, { t: "prop", v: "tint" }, { t: "op", v: " = [" }, { t: "string", v: "'cyan'" }, { t: "op", v: ", " }, { t: "string", v: "'violet'" }, { t: "op", v: ", " }, { t: "string", v: "'ice'" }, { t: "op", v: "];" }
    ]},
    { text: "// Deep-space link · Establishing socket", type: "comment" },
    { text: "const link = connect('deep-space');", type: "code", tokens: [
      { t: "keyword", v: "const " }, { t: "ident", v: "link" }, { t: "op", v: " = " }, { t: "fn", v: "connect" }, { t: "op", v: "(" }, { t: "string", v: "'deep-space'" }, { t: "op", v: ");" }
    ]},
    { text: "await link.listen();", type: "code", tokens: [
      { t: "keyword", v: "await " }, { t: "ident", v: "link" }, { t: "op", v: "." }, { t: "fn", v: "listen" }, { t: "op", v: "();" }
    ]},
    { text: "link.signal = 1.0;", type: "code", tokens: [
      { t: "ident", v: "link" }, { t: "op", v: "." }, { t: "prop", v: "signal" }, { t: "op", v: " = " }, { t: "number", v: "1.0" }, { t: "op", v: ";" }
    ]},
    { text: "// Decoding memory graph · Topology sync", type: "comment" },
    { text: "const face = await decode(); // resolve topology", type: "code", tokens: [
      { t: "keyword", v: "const " }, { t: "ident", v: "face" }, { t: "op", v: " = " }, { t: "keyword", v: "await " }, { t: "fn", v: "decode" }, { t: "op", v: "(); " }, { t: "comment", v: "// resolve topology" }
    ]},
    { text: "face.align({ precision: 'high' });", type: "code", tokens: [
      { t: "ident", v: "face" }, { t: "op", v: "." }, { t: "fn", v: "align" }, { t: "op", v: "({ " }, { t: "prop", v: "precision" }, { t: "op", v: ": " }, { t: "string", v: "'high'" }, { t: "op", v: " });" }
    ]},
    { text: "face.resolve();", type: "code", tokens: [
      { t: "ident", v: "face" }, { t: "op", v: "." }, { t: "fn", v: "resolve" }, { t: "op", v: "();" }
    ]},
    { text: "// Vector contours · Progressive laser reveal", type: "comment" },
    { text: "const contour = trace('silhouette');", type: "code", tokens: [
      { t: "keyword", v: "const " }, { t: "ident", v: "contour" }, { t: "op", v: " = " }, { t: "fn", v: "trace" }, { t: "op", v: "(" }, { t: "string", v: "'silhouette'" }, { t: "op", v: ");" }
    ]},
    { text: "contour.smooth(0.92); // preserve silhouette", type: "code", tokens: [
      { t: "ident", v: "contour" }, { t: "op", v: "." }, { t: "fn", v: "smooth" }, { t: "op", v: "(" }, { t: "number", v: "0.92" }, { t: "op", v: "); " }, { t: "comment", v: "// preserve silhouette" }
    ]},
    { text: "await contour.reveal();", type: "code", tokens: [
      { t: "keyword", v: "await " }, { t: "ident", v: "contour" }, { t: "op", v: "." }, { t: "fn", v: "reveal" }, { t: "op", v: "();" }
    ]},
    { text: "// Stardust emission · Kinetic particle burst", type: "comment" },
    { text: "const trails = emit('stardust');", type: "code", tokens: [
      { t: "keyword", v: "const " }, { t: "ident", v: "trails" }, { t: "op", v: " = " }, { t: "fn", v: "emit" }, { t: "op", v: "(" }, { t: "string", v: "'stardust'" }, { t: "op", v: ");" }
    ]},
    { text: "trails.velocity = 0.86;", type: "code", tokens: [
      { t: "ident", v: "trails" }, { t: "op", v: "." }, { t: "prop", v: "velocity" }, { t: "op", v: " = " }, { t: "number", v: "0.86" }, { t: "op", v: ";" }
    ]},
    { text: "trails.palette = light.tint;", type: "code", tokens: [
      { t: "ident", v: "trails" }, { t: "op", v: "." }, { t: "prop", v: "palette" }, { t: "op", v: " = " }, { t: "ident", v: "light" }, { t: "op", v: "." }, { t: "prop", v: "tint" }, { t: "op", v: ";" }
    ]},
    { text: "await trails.cross();", type: "code", tokens: [
      { t: "keyword", v: "await " }, { t: "ident", v: "trails" }, { t: "op", v: "." }, { t: "fn", v: "cross" }, { t: "op", v: "();" }
    ]},
    { text: "// Iris awakening · Synchronizing ocular aperture", type: "comment" },
    { text: "await eyes.open(0.85); // iris aperture synchronized", type: "code", tokens: [
      { t: "keyword", v: "await " }, { t: "ident", v: "eyes" }, { t: "op", v: "." }, { t: "fn", v: "open" }, { t: "op", v: "(" }, { t: "number", v: "0.85" }, { t: "op", v: "); " }, { t: "comment", v: "// iris aperture synchronized" }
    ]},
    { text: "const pulse = connect('iris');", type: "code", tokens: [
      { t: "keyword", v: "const " }, { t: "ident", v: "pulse" }, { t: "op", v: " = " }, { t: "fn", v: "connect" }, { t: "op", v: "(" }, { t: "string", v: "'iris'" }, { t: "op", v: ");" }
    ]},
    { text: "pulse.glow('cyan');", type: "code", tokens: [
      { t: "ident", v: "pulse" }, { t: "op", v: "." }, { t: "fn", v: "glow" }, { t: "op", v: "(" }, { t: "string", v: "'cyan'" }, { t: "op", v: ");" }
    ]},
    { text: "// Focal stabilization · Iris bloom lock", type: "comment" },
    { text: "pulse.phase = clock.phase;", type: "code", tokens: [
      { t: "ident", v: "pulse" }, { t: "op", v: "." }, { t: "prop", v: "phase" }, { t: "op", v: " = " }, { t: "ident", v: "clock" }, { t: "op", v: "." }, { t: "prop", v: "phase" }, { t: "op", v: ";" }
    ]},
    { text: "pulse.bloom(0.72);", type: "code", tokens: [
      { t: "ident", v: "pulse" }, { t: "op", v: "." }, { t: "fn", v: "bloom" }, { t: "op", v: "(" }, { t: "number", v: "0.72" }, { t: "op", v: ");" }
    ]},
    { text: "await pulse.stabilize();", type: "code", tokens: [
      { t: "keyword", v: "await " }, { t: "ident", v: "pulse" }, { t: "op", v: "." }, { t: "fn", v: "stabilize" }, { t: "op", v: "();" }
    ]},
    { text: "// Meditation complete · Attaching subject to viewport", type: "comment" },
    { text: "scene.attach(face);", type: "code", tokens: [
      { t: "ident", v: "scene" }, { t: "op", v: "." }, { t: "fn", v: "attach" }, { t: "op", v: "(" }, { t: "ident", v: "face" }, { t: "op", v: ");" }
    ]},
    { text: "scene.depth = 'quiet';", type: "code", tokens: [
      { t: "ident", v: "scene" }, { t: "op", v: "." }, { t: "prop", v: "depth" }, { t: "op", v: " = " }, { t: "string", v: "'quiet'" }, { t: "op", v: ";" }
    ]},
    { text: "scene.focus = eyes.center;", type: "code", tokens: [
      { t: "ident", v: "scene" }, { t: "op", v: "." }, { t: "prop", v: "focus" }, { t: "op", v: " = " }, { t: "ident", v: "eyes" }, { t: "op", v: "." }, { t: "prop", v: "center" }, { t: "op", v: ";" }
    ]},
    { text: "// Camera zoom out to 1.0x · Initiating live stream", type: "comment" },
    { text: "await scene.zoomOut({ duration: 'normal', scale: 1.0 });", type: "code", tokens: [
      { t: "keyword", v: "await " }, { t: "ident", v: "scene" }, { t: "op", v: "." }, { t: "fn", v: "zoomOut" }, { t: "op", v: "({ " }, { t: "prop", v: "duration" }, { t: "op", v: ": " }, { t: "string", v: "'normal'" }, { t: "op", v: ", " }, { t: "prop", v: "scale" }, { t: "op", v: ": " }, { t: "number", v: "1.0" }, { t: "op", v: " });" }
    ]},
    { text: "await scene.playVideo();", type: "code", tokens: [
      { t: "keyword", v: "await " }, { t: "ident", v: "scene" }, { t: "op", v: "." }, { t: "fn", v: "playVideo" }, { t: "op", v: "();" }
    ]},
    { text: "trails.release();", type: "code", tokens: [
      { t: "ident", v: "trails" }, { t: "op", v: "." }, { t: "fn", v: "release" }, { t: "op", v: "();" }
    ]},
    { text: "await sync('consciousness');", type: "code", tokens: [
      { t: "keyword", v: "await " }, { t: "fn", v: "sync" }, { t: "op", v: "(" }, { t: "string", v: "'consciousness'" }, { t: "op", v: ");" }
    ]},
    { text: "await scene.ready(); // consciousness online", type: "code", tokens: [
      { t: "keyword", v: "await " }, { t: "ident", v: "scene" }, { t: "op", v: "." }, { t: "fn", v: "ready" }, { t: "op", v: "(); " }, { t: "comment", v: "// consciousness online" }
    ]}
  ];

  function renderLineToElement(el, line, charCount, isTyping) {
    const nodes = [];
    if (line.type === 'comment') {
      const span = document.createElement('span');
      span.className = 'tok-comment';
      span.textContent = line.text.slice(0, charCount);
      nodes.push(span);
    } else {
      let remaining = charCount;
      for (const token of line.tokens) {
        if (remaining <= 0) break;
        const chunk = token.v.slice(0, remaining);
        remaining -= chunk.length;
        let cls = 'tok-ident';
        if (token.t === 'keyword') cls = 'tok-keyword';
        else if (token.t === 'fn') cls = 'tok-fn';
        else if (token.t === 'string') cls = 'tok-string';
        else if (token.t === 'number') cls = 'tok-number';
        else if (token.t === 'prop') cls = 'tok-prop';
        else if (token.t === 'op') cls = 'tok-op';
        else if (token.t === 'comment') cls = 'tok-comment';
        const span = document.createElement('span');
        span.className = cls;
        span.textContent = chunk;
        nodes.push(span);
      }
    }
    if (isTyping) {
      const cursor = document.createElement('span');
      cursor.className = 'tok-cursor';
      nodes.push(cursor);
    }
    el.replaceChildren(...nodes);
  }

  // ========================================================
  // CHARACTER OUTLINE & NEURAL AWAKENING ENGINE
  // ========================================================
  let preparedPaths = [];
  let totalContourLength = 0;
  let contourGradient = null;

  function initContours(rawPaths) {
    if (!Array.isArray(rawPaths)) return;
    totalContourLength = 0;

    preparedPaths = rawPaths.map(points => {
      if (!points || points.length < 2) return null;
      let len = 0;
      let minY = 9999;
      for (let i = 1; i < points.length; i++) {
        len += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
        if (points[i][1] < minY) minY = points[i][1];
      }
      totalContourLength += len;
      const path2d = new Path2D();
      if (points.length < 3) {
        points.forEach((p, idx) => idx ? path2d.lineTo(p[0], p[1]) : path2d.moveTo(p[0], p[1]));
      } else {
        path2d.moveTo(points[0][0], points[0][1]);
        for (let i = 1; i < points.length - 1; i++) {
          const xc = (points[i][0] + points[i + 1][0]) / 2;
          const yc = (points[i][1] + points[i + 1][1]) / 2;
          path2d.quadraticCurveTo(points[i][0], points[i][1], xc, yc);
        }
        path2d.lineTo(points[points.length - 1][0], points[points.length - 1][1]);
      }
      const isMain = len >= 160;
      return { points, total: len, minY, path2d, isMain };
    }).filter(Boolean);
  }

  if (window.CONTOUR_PATHS) {
    initContours(window.CONTOUR_PATHS);
  }


  // Draw Neon Contours with Progressive Scanline Reveal (Samsung Wonderland Edge Style)
  const ctx = canvas?.getContext('2d');
  let lastContourDrawAt = -Infinity;



  // Draw Neon Contours with Organic Spline Reveal (Wonderland Edge Style - No Harsh Scanners)
  function drawNeonContours(t) {
    if (!ctx || !preparedPaths.length) return;

    if (t >= 3600) {
      return;
    }

    // The outline is decorative; redraw it at 30 Hz while the video keeps its
    // own playback cadence. This avoids spending a full canvas draw every RAF.
    if (t - lastContourDrawAt < 1000 / 30) return;
    lastContourDrawAt = t;

    if (canvas && canvas.style.display === 'none') {
      canvas.style.display = 'block';
    }

    ctx.clearRect(0, 0, 1920, 1080);

    if (scanline) {
      scanline.style.opacity = '0';
      scanline.style.display = 'none';
    }

    if (!contourGradient) {
      contourGradient = ctx.createLinearGradient(0, 40, 0, 1060);
      contourGradient.addColorStop(0.00, '#fde047'); // Bright golden yellow (cowlick & top hair)
      contourGradient.addColorStop(0.18, '#fb923c'); // Warm sunset orange
      contourGradient.addColorStop(0.36, '#f472b6'); // Rose pink / magenta
      contourGradient.addColorStop(0.58, '#c084fc'); // Electric purple / violet
      contourGradient.addColorStop(0.80, '#38bdf8'); // Sky neon cyan
      contourGradient.addColorStop(1.00, '#22d3ee'); // Bright electric teal
    }

    const contourStart = 1200;
    const contourEnd = 4400;
    const rawRatio = t < contourStart ? 0 : clamp((t - contourStart) / (contourEnd - contourStart));
    const drawRatio = smooth(rawRatio);
    const targetLen = drawRatio * totalContourLength;

    // Smooth soft fadeout as video blooms into full focus (4.4s - 4.8s)
    const contourFade = t < contourEnd ? 1.0 : Math.max(0, 1.0 - (t - contourEnd) / 400);

    // Dynamic Shimmer Pulse
    const edgePulse = 0.94 + 0.06 * Math.sin(t * 0.007);
    const alpha1 = edgePulse * contourFade;

    // A single fine gradient stroke keeps the contour smooth without the harsh
    // doubled white core that made edges look jagged and over-bright.
    ctx.save();
    ctx.strokeStyle = contourGradient;
    ctx.globalAlpha = alpha1 * 0.78;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.miterLimit = 2;

    let accum1 = 0;
    for (const p of preparedPaths) {
      if (accum1 >= targetLen) break;
      ctx.lineWidth = p.isMain ? 0.72 : 0.42;
      const avail = targetLen - accum1;
      if (avail >= p.total) {
        ctx.setLineDash([]);
        ctx.stroke(p.path2d);
        accum1 += p.total;
      } else {
        ctx.setLineDash([avail, p.total]);
        ctx.stroke(p.path2d);
        accum1 += avail;
        break;
      }
    }
    ctx.restore();

  }

  // Master Timeline Render Loop
  let lastLineIndex = -1;
  let lastCharCount = -1;

  function render(t) {
    // 0. Boot Initializing Screen (0.0s – 0.65s; pre-curtain already displayed during IDE boot)
    if (bootCurtain) {
      if (t < 350) {
        bootCurtain.style.opacity = '1';
        bootCurtain.style.display = 'flex';
      } else if (t < 650) {
        const fade = smooth((650 - t) / 300);
        bootCurtain.style.opacity = String(fade);
        bootCurtain.style.display = 'flex';
      } else {
        bootCurtain.style.opacity = '0';
        bootCurtain.style.display = 'none';
      }
    }

    // 1. Timecode & Progress Ratio
    const sec = Math.floor(t / 1000);
    const cs = Math.floor((t % 1000) / 10);
    if (timecode) timecode.textContent = `00:${String(sec).padStart(2, '0')}:${String(cs).padStart(2, '0')}`;
    if (elapsedOut) {
      const span = document.createElement('span');
      span.textContent = `/ ${(TOTAL_DURATION / 1000).toFixed(1)}s`;
      elapsedOut.replaceChildren(document.createTextNode(`${(t / 1000).toFixed(1)} `), span);
    }
    if (slider && !slider.matches(':active')) slider.value = String(t / 1000);

    const progressRatio = clamp(t / (TOTAL_DURATION - 800));
    const pct = (progressRatio * 100).toFixed(2);
    if (ratioText) ratioText.textContent = `${pct}%`;
    if (syncBar) syncBar.style.transform = `scaleX(${progressRatio})`;
    if (bottomProgress) bottomProgress.style.transform = `scaleX(${progressRatio})`;

    // 2. Status Text
    if (syncStatus) {
      if (t < 1400) syncStatus.textContent = 'INITIALIZING NEURAL LINK';
      else if (t < 4400) syncStatus.textContent = 'PHOTON MATRIX CALIBRATION';
      else if (t < 7200) syncStatus.textContent = 'OCULAR APERTURE AWAKENING';
      else if (t < 8800) syncStatus.textContent = 'SYNCHRONIZING CONSCIOUSNESS';
      else syncStatus.textContent = 'SYSTEM ONLINE // AWAKENING COMPLETE';
    }

    // 3. Authentic Full-Screen GPU Video Mode (Directly matching TikTok original link)
    if (isAuthentic && masterVideo) {
      if (playing && masterVideo.paused) {
        masterVideo.muted = true;
        masterVideo.play().catch(() => {});
      }
      const targetSec = t / 1000;
      if (Math.abs(masterVideo.currentTime - targetSec) > 2.0) {
        masterVideo.currentTime = targetSec;
      }

      // Clean Transition into Antigravity (NO PINK FLASH, NO CENTER LINE)
      if (shutter) {
        shutter.style.opacity = '0';
        shutter.style.display = 'none';
      }
      if (flash) {
        flash.style.opacity = '0';
        flash.style.display = 'none';
      }

      // Completion Check
      if (t >= TOTAL_DURATION && !completed) {
        completed = true;
        send('complete', { videoTime: masterVideo ? masterVideo.currentTime : 0 });
        if (!embedded) {
          pause();
        }
      }
      return;
    }

    // 4. Static Stage Framing (no character zoom-in)
    if (stage) {
      stage.style.transform = 'scale(1) translate(0%, 0%)';
    }

    // 5. Hide static artwork & neon contours (code streaming + startup video only)
    if (artwork) {
      artwork.style.opacity = '0';
      artwork.style.display = 'none';
    }

    // Celestial FX (Orbital rings, meteors & ambient glow)
    if (t < 650) {
      if (orbitalSystem) orbitalSystem.style.opacity = '0';
      if (meteorsLayer) meteorsLayer.style.opacity = '0';
      if (ambientGlow) ambientGlow.style.opacity = '0';
    } else {
      const bloom = smooth((t - 650) / 1000);
      if (orbitalSystem) orbitalSystem.style.opacity = String(0.65 + 0.35 * bloom);
      if (meteorsLayer) meteorsLayer.style.opacity = String(0.75 + 0.25 * bloom);
      if (ambientGlow) ambientGlow.style.opacity = String(0.20 + 0.25 * bloom);
    }

    if (canvas && canvas.style.display !== 'none') {
      canvas.style.opacity = '0';
      canvas.style.display = 'none';
      if (ctx) ctx.clearRect(0, 0, 1920, 1080);
    }
    if (scanline && scanline.style.display !== 'none') {
      scanline.style.opacity = '0';
      scanline.style.display = 'none';
    }

    // 6. Startup Video Playback (plays smoothly alongside code streaming)
    if (video) {
      if (t < 350) {
        video.style.opacity = '0';
      } else {
        const videoFade = smooth((t - 350) / 650);
        video.style.opacity = String(videoFade);
        if (playing && video.paused) {
          video.play().catch(() => {});
        }
      }
    }

    // 6. Live Code Terminal Typewriter (Flows all the way down full vertical screen)
    if (codeStream) {
      const codeStart = 60;
      const codeEnd = TOTAL_DURATION - 1200;
      const totalLines = CODE_LINES.length;

      let currentLineIdx = -1;
      let currentCharCount = 0;

      if (t >= codeStart) {
        const lineFraction = clamp((t - codeStart) / (codeEnd - codeStart)) * totalLines;
        currentLineIdx = Math.min(totalLines - 1, Math.floor(lineFraction));
        const withinLineProgress = clamp(lineFraction - currentLineIdx);
        const activeLineObj = CODE_LINES[currentLineIdx];
        currentCharCount = Math.floor(withinLineProgress * activeLineObj.text.length);
      }

      if (currentLineIdx !== lastLineIndex || currentCharCount !== lastCharCount) {
        if (currentLineIdx < lastLineIndex || lastLineIndex === -1) {
          codeStream.replaceChildren();
          for (let i = 0; i <= currentLineIdx; i++) {
            const l = CODE_LINES[i];
            const isCurrent = i === currentLineIdx;
            const chars = isCurrent ? currentCharCount : l.text.length;
            const div = document.createElement('div');
            div.className = 'code-line';
            renderLineToElement(div, l, chars, isCurrent);
            codeStream.appendChild(div);
          }
        } else {
          while (codeStream.children.length < currentLineIdx) {
            const idx = codeStream.children.length;
            const l = CODE_LINES[idx];
            const div = document.createElement('div');
            div.className = 'code-line';
            renderLineToElement(div, l, l.text.length, false);
            codeStream.appendChild(div);
          }
          if (lastLineIndex >= 0 && lastLineIndex < currentLineIdx && codeStream.children[lastLineIndex]) {
            const prevL = CODE_LINES[lastLineIndex];
            renderLineToElement(codeStream.children[lastLineIndex], prevL, prevL.text.length, false);
          }
          if (!codeStream.children[currentLineIdx] && currentLineIdx >= 0) {
            const div = document.createElement('div');
            div.className = 'code-line';
            codeStream.appendChild(div);
          }
          if (codeStream.children[currentLineIdx]) {
            const curL = CODE_LINES[currentLineIdx];
            renderLineToElement(codeStream.children[currentLineIdx], curL, currentCharCount, true);
          }
        }
        lastLineIndex = currentLineIdx;
        lastCharCount = currentCharCount;
        codeStream.scrollTop = codeStream.scrollHeight;
      }

      // Dim left code stream smoothly as character awakes to draw full focus
      if (t >= 6000) {
        const dimFade = smooth((t - 6000) / 1500);
        codeStream.style.opacity = String(1.0 - 0.15 * dimFade);
      } else {
        codeStream.style.opacity = '1';
      }
    }

    // 8. Clean Direct Transition into Antigravity (NO PINK FLASH, NO CENTER LINE)
    if (shutter) {
      shutter.style.opacity = '0';
      shutter.style.display = 'none';
    }
    if (flash) {
      flash.style.opacity = '0';
      flash.style.display = 'none';
    }

    // 9. Completion Check
    if (t >= TOTAL_DURATION && !completed) {
      completed = true;
      send('complete', { videoTime: video ? video.currentTime : 0 });
      if (!embedded) {
        pause();
      }
    }
  }

  function tick(timestamp) {
    if (!playing) return;
    elapsed = timestamp - origin;
    if (elapsed > TOTAL_DURATION) elapsed = TOTAL_DURATION;
    render(elapsed);
    if (elapsed < TOTAL_DURATION) {
      frame = requestAnimationFrame(tick);
    }
  }

  function play() {
    if (completed && elapsed >= TOTAL_DURATION) {
      elapsed = 0;
      completed = false;
      lastLineIndex = -1;
      if (canvas) {
        canvas.style.display = 'block';
        canvas.style.opacity = '1';
      }
    }
    playing = true;
    origin = performance.now() - elapsed;
    if (pauseBtn) pauseBtn.textContent = 'Tạm dừng';
    if (isAuthentic && masterVideo) {
      masterVideo.muted = true;
      masterVideo.play().catch(() => {});
    }
    if (video) {
      if (elapsed >= 3500) {
        video.play().catch(() => {});
      } else {
        video.pause();
        video.currentTime = 0;
      }
    }
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(tick);
  }

  function pause() {
    playing = false;
    cancelAnimationFrame(frame);
    if (pauseBtn) pauseBtn.textContent = 'Tiếp tục';
    if (isAuthentic && masterVideo) masterVideo.pause();
    if (video) video.pause();
  }

  function seek(targetMs) {
    elapsed = Math.max(0, Math.min(TOTAL_DURATION, targetMs));
    origin = performance.now() - elapsed;
    lastLineIndex = -1;
    if (elapsed < 3500 && canvas) {
      canvas.style.display = 'block';
      canvas.style.opacity = '1';
    }
    render(elapsed);
    if (isAuthentic && masterVideo && masterVideo.duration) {
      masterVideo.currentTime = Math.min(masterVideo.duration, elapsed / 1000);
    }
    if (video && video.duration) {
      video.currentTime = elapsed < 3500 ? 0 : Math.min(video.duration, (elapsed - 3500) / 1000);
    }
  }

  function restart() {
    pause();
    completed = false;
    lastLineIndex = -1;
    if (video) {
      try { video.currentTime = 0; } catch (_) {}
    }
    seek(0);
    play();
  }

  function getActivePalette() {
    if (currentThemePreset === 'auto') {
      if (autoPalette) return autoPalette;
      if (window.imageSettings?.extractPalette && video && video.readyState >= 2) {
        autoPalette = window.imageSettings.extractPalette(video);
        return autoPalette;
      }
      if (window.imageSettings?.extractPalette && artwork && artwork.complete) {
        autoPalette = window.imageSettings.extractPalette(artwork);
        return autoPalette;
      }
    }
    const presets = window.imageSettings?.THEME_PRESETS;
    if (presets && presets[currentThemePreset]) {
      return presets[currentThemePreset];
    }
    return {
      base: '10 14 26',
      tint: '56 189 248',
      violet: '192 132 252'
    };
  }

  function isCustomVideoSrc(src) {
    return typeof src === 'string' && src.length > 0 &&
      !src.includes('/startup-video.mp4') &&
      !src.includes('/wallpaper-tiktok.mp4') &&
      !src.startsWith('http://127.0.0.1:') &&
      !src.startsWith('http://localhost:');
  }

  function applyWallpaperSettings() {
    const pal = getActivePalette();
    const hasCustomWallpaper = isCustomVideoSrc(userConfig?.video);
    const hasCustomStartup = isCustomVideoSrc(userConfig?.startupVideo);
    send('background', {
      strength: wallpaperStrength,
      editorOpacity: editorOpacity,
      themePreset: currentThemePreset,
      palette: pal,
      isVideo: true,
      video: (hasCustomWallpaper ? userConfig.video : null) || assets.wallpaperVideo || assets.video,
      startupVideo: hasCustomStartup ? userConfig.startupVideo : undefined,
      image: userConfig?.artwork || userConfig?.image || assets.artwork,
      artwork: userConfig?.artwork || userConfig?.image || assets.artwork
    });
  }

  async function loadUserConfig() {
    try {
      if (window.imageSettings) {
        userConfig = await window.imageSettings.load();
        const hasCustomStartup = isCustomVideoSrc(userConfig?.startupVideo);
        const hasCustomWallpaper = isCustomVideoSrc(userConfig?.video);
        const activeIntroVideoSrc = (hasCustomStartup ? userConfig.startupVideo : null) || assets.video || '';
        const activeWallpaperVideoSrc = (hasCustomWallpaper ? userConfig.video : null) || assets.wallpaperVideo || assets.video || '';
        if (video && activeIntroVideoSrc) {
          video.src = activeIntroVideoSrc;
        }
        const previewStartup = $('#startup-video-preview');
        if (previewStartup && activeIntroVideoSrc) {
          previewStartup.src = activeIntroVideoSrc;
        }
        const previewV = $('#video-settings-preview');
        if (previewV && activeWallpaperVideoSrc) {
          previewV.src = activeWallpaperVideoSrc;
        }
        const activeArtworkSrc = userConfig.artwork || userConfig.image || assets.artwork || '';
        if (artwork && activeArtworkSrc) {
          artwork.src = activeArtworkSrc;
        }
        const previewArt = $('#artwork-preview');
        if (previewArt && activeArtworkSrc) {
          previewArt.src = activeArtworkSrc;
        }
        if (userConfig.contours) {
          initContours(userConfig.contours);
        }
        if (typeof userConfig.strength === 'number') {
          wallpaperStrength = userConfig.strength;
          if (wallpaperSlider) wallpaperSlider.value = String(wallpaperStrength);
          if (wallpaperValue) wallpaperValue.textContent = `${wallpaperStrength}%`;
        }
        if (typeof userConfig.editorOpacity === 'number') {
          editorOpacity = userConfig.editorOpacity;
          if (editorOpacitySlider) editorOpacitySlider.value = String(editorOpacity);
          if (editorOpacityValue) editorOpacityValue.textContent = `${editorOpacity}%`;
        }
        if (userConfig.themePreset) {
          currentThemePreset = userConfig.themePreset;
          if (themeSelect) themeSelect.value = currentThemePreset;
        }
      }
    } catch (_) {}

    applyWallpaperSettings();
  }

  function setupEvents() {
    // Playback Buttons
    pauseBtn?.addEventListener('click', () => (playing ? pause() : play()));
    replayBtn?.addEventListener('click', restart);

    // Timeline Slider
    slider?.addEventListener('input', e => {
      seek(Number(e.target.value) * 1000);
    });

    // Skip Buttons
    const skip = () => {
      completed = true;
      send('complete', { videoTime: video ? video.currentTime : 0 });
      if (!embedded) {
        seek(TOTAL_DURATION);
      }
    };

    $('.skip')?.addEventListener('click', skip);
    window.addEventListener('keydown', e => {
      if (e.key === 'Escape') skip();
      else if (e.code === 'Space' && e.target.tagName !== 'BUTTON' && e.target.tagName !== 'INPUT') {
        e.preventDefault();
        playing ? pause() : play();
      }
    });

    // Settings Modal
    $('#image-settings')?.addEventListener('click', () => openSettings());
    $('#settings-dialog form')?.addEventListener('submit', () => send('settings-close'));

    themeSelect?.addEventListener('change', e => {
      currentThemePreset = e.target.value;
      autoPalette = null;
      applyWallpaperSettings();
    });

    editorOpacitySlider?.addEventListener('input', e => {
      editorOpacity = Number(e.target.value);
      if (editorOpacityValue) editorOpacityValue.textContent = `${editorOpacity}%`;
      applyWallpaperSettings();
    });

    wallpaperSlider?.addEventListener('input', e => {
      wallpaperStrength = Number(e.target.value);
      if (wallpaperValue) wallpaperValue.textContent = `${wallpaperStrength}%`;
      applyWallpaperSettings();
    });

    $('#startup-video-file')?.addEventListener('change', async e => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        $('#settings-status').textContent = 'Đang nạp Video Startup...';
        const res = await window.imageSettings.importVideo(file);
        userConfig = { ...userConfig, startupVideo: res.video };
        if (video) video.src = res.video;
        const previewStartup = $('#startup-video-preview');
        if (previewStartup) previewStartup.src = res.video;
        applyWallpaperSettings();
        $('#settings-status').textContent = 'Đã nạp Video Startup thành công!';
      } catch (err) {
        $('#settings-status').textContent = err.message;
      }
    });

    $('#video-file')?.addEventListener('change', async e => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        $('#settings-status').textContent = 'Đang nạp Wallpaper MP4 động...';
        const res = await window.imageSettings.importVideo(file);
        userConfig = { ...userConfig, video: res.video };
        const previewV = $('#video-settings-preview');
        if (previewV) previewV.src = res.video;
        autoPalette = null;
        applyWallpaperSettings();
        $('#settings-status').textContent = 'Đã nạp Wallpaper MP4 động thành công!';
      } catch (err) {
        $('#settings-status').textContent = err.message;
      }
    });

    $('#artwork-file')?.addEventListener('change', async e => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        $('#settings-status').textContent = 'Đang trích xuất nét vẽ Neon từ ảnh...';
        const res = await window.imageSettings.importImage(file, 'artwork');
        userConfig = { ...userConfig, artwork: res.artwork, contours: res.contours };
        if (artwork) artwork.src = res.artwork;
        const previewArt = $('#artwork-preview');
        if (previewArt) previewArt.src = res.artwork;
        initContours(res.contours);
        autoPalette = null;
        applyWallpaperSettings();
        $('#settings-status').textContent = 'Đã trích xuất nét vẽ thành công!';
      } catch (err) {
        $('#settings-status').textContent = err.message;
      }
    });

    dialog?.addEventListener('close', () => send('settings-close'));

    $('#replay-startup')?.addEventListener('click', () => {
      dialog?.close();
      send('settings-close');
      restart();
    });

    $('#preview-images')?.addEventListener('click', async () => {
      try {
        await window.imageSettings.save({
          ...userConfig,
          strength: wallpaperStrength,
          editorOpacity: editorOpacity,
          themePreset: currentThemePreset
        });
        applyWallpaperSettings();
        $('#settings-status').textContent = 'Đã lưu cài đặt và áp dụng theme thành công!';
        dialog?.close();
        send('settings-close');
        if (!embedded) {
          restart();
        }
      } catch (err) {
        $('#settings-status').textContent = err.message;
      }
    });

    $('#reset-images')?.addEventListener('click', async () => {
      try {
        await window.imageSettings.save({});
        $('#settings-status').textContent = 'Đã đặt lại về mặc định.';
        location.reload();
      } catch (_) {}
    });
  }

  function openSettings() {
    if (!dialog) return;
    dialog.showModal();
    send('settings-open');
  }

  async function init() {
    setupEvents();
    await loadUserConfig();

    if (window.ANTIGRAVITY_OPEN_SETTINGS || window.AEMEATH_OPEN_SETTINGS) {
      openSettings();
      send('ready');
      return;
    }

    send('ready');
    const seekParam = new URLSearchParams(location.search).get('seek');
    if (seekParam) {
      const targetS = Number(seekParam);
      seek(targetS * 1000);
      pause();
      if (masterVideo) {
        masterVideo.currentTime = targetS;
        masterVideo.addEventListener('loadedmetadata', () => {
          masterVideo.currentTime = targetS;
        }, { once: true });
      }
      if (video) {
        const vidTime = targetS < 4.4 ? 0 : (targetS - 4.4);
        if (video.duration && isFinite(video.duration)) {
          video.currentTime = Math.min(video.duration, vidTime);
        } else {
          video.addEventListener('loadedmetadata', () => {
            video.currentTime = Math.min(video.duration, vidTime);
          }, { once: true });
        }
      }
    } else {
      const startAt = Math.max(0, Math.min(TOTAL_DURATION - 200, Number(window.ANTIGRAVITY_START_AT) || 0));
      if (startAt > 0) {
        pause();
        completed = false;
        lastLineIndex = -1;
        seek(startAt);
        if (video && startAt >= 4400) {
          const vidTime = (startAt - 4400) / 1000;
          const applyTime = () => { try { video.currentTime = Math.min(video.duration || vidTime, vidTime); } catch (_) {} };
          if (video.readyState >= 1) applyTime();
          else video.addEventListener('loadedmetadata', applyTime, { once: true });
        }
        play();
      } else {
        restart();
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  window.antigravityLauncherUI = {
    openSettings,
    restart,
    seek,
    play,
    pause
  };
})();
