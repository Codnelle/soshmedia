(function () {
  var w = window, d = document;
  var isMobile = function () { return d.documentElement.classList.contains('is-stacked'); };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var vw = function (n) { return n * w.innerWidth / 100; };

  /* cubic-bezier easing, used for the Wix "easeInOutSine"/"easeInSine" curves */
  function bezier(x1, y1, x2, y2) {
    return function (t) {
      var lo = 0, hi = 1, m;
      for (var i = 0; i < 20; i++) {
        m = (lo + hi) / 2;
        var x = 3 * (1 - m) * (1 - m) * m * x1 + 3 * (1 - m) * m * m * x2 + m * m * m;
        if (x < t) lo = m; else hi = m;
      }
      m = (lo + hi) / 2;
      return 3 * (1 - m) * (1 - m) * m * y1 + 3 * (1 - m) * m * m * y2 + m * m * m;
    };
  }
  var easeInOutSine = bezier(.445, .05, .55, .95);
  var easeInSine = bezier(.47, 0, .745, .715);

  /* ───────── HEADER: solid once scrolled, hides on scroll down, returns on scroll up ───────── */
  var header = d.getElementById('header');
  var lastY = w.scrollY;
  function onHeader() {
    var y = w.scrollY;
    header.classList.toggle('solid', y > 10);
    if (header.classList.contains('open')) { lastY = y; return; }
    if (y > lastY + 4 && y > header.offsetHeight) header.classList.add('hide');
    else if (y < lastY - 4 || y <= header.offsetHeight) header.classList.remove('hide');
    lastY = y;
  }
  /* ───────── SMOOTH SCROLL (Lenis) — eases mouse wheel, trackpad and touch on every device ───────── */
  var lenis = null;
  if (w.Lenis && !w.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    lenis = new w.Lenis({
      lerp: 0.075,                 /* lower = heavier, silkier glide */
      wheelMultiplier: 0.9,
      smoothWheel: true,
      syncTouch: true,             /* same glide on phones and iPads */
      syncTouchLerp: 0.085,
      touchInertiaMultiplier: 28,
      touchMultiplier: 1
    });
    (function raf(time) { lenis.raf(time); requestAnimationFrame(raf); })(performance.now());
  }
  d.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var target = d.querySelector(a.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(target, { duration: 1.4, force: true }); else target.scrollIntoView({ behavior: 'smooth' });
      history.replaceState(null, '', a.getAttribute('href'));
    });
  });

  /* full-screen menu */
  var menu = d.getElementById('mmenu');
  var burger = d.querySelector('.burger');
  function setMenu(open) {
    menu.classList.toggle('open', open);
    header.classList.toggle('open', open);          /* plane.js hides the plane while open */
    d.documentElement.classList.toggle('menu-open', open);
    menu.setAttribute('aria-hidden', String(!open));
    burger.setAttribute('aria-expanded', String(open));
    if (open) menu.querySelector('.mmenu-close').focus(); else burger.focus({ preventScroll: true });
    if (lenis) open ? lenis.stop() : lenis.start();
  }
  burger.addEventListener('click', function () { setMenu(true); });
  menu.querySelector('.mmenu-close').addEventListener('click', function () { setMenu(false); });
  menu.querySelectorAll('.mmenu-nav a').forEach(function (a) {
    a.addEventListener('click', function () { setMenu(false); });
  });
  d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menu.classList.contains('open')) setMenu(false); });
  function closeIfDesktop() { if (!isMobile() && menu.classList.contains('open')) setMenu(false); }
  w.addEventListener('resize', closeIfDesktop);
  w.addEventListener('unitschange', closeIfDesktop);

  /* ───────── NAV: underline the link of the section you're in ───────── */
  var navLinks = [].slice.call(d.querySelectorAll('#header .nav a'));
  function markActive() {
    var mid = w.innerHeight * .4, current = null;
    navLinks.forEach(function (a) {
      var sec = d.querySelector(a.getAttribute('href'));
      if (!sec) return;
      var r = sec.getBoundingClientRect();
      if (r.top <= mid && r.bottom > mid) current = a;
    });
    navLinks.forEach(function (a) { a.classList.toggle('active', a === current); });
  }

  /* ───────── SCROLL-SCRUBBED EFFECTS (Wix "view progress" / cover ranges) ───────── */
  function pageTop(el) {
    var t = 0;
    while (el) { t += el.offsetTop; el = el.offsetParent; }
    return t;
  }
  /* progress of `subject` through the viewport: 0 when its top enters the bottom edge,
     1 when its bottom leaves the top edge — mapped into the [a,b] sub-range */
  function cover(subject, a, b) {
    var top = subject._top, h = subject.offsetHeight, vh = w.innerHeight;
    var p = (w.scrollY + vh - top) / (vh + h);
    return clamp((p - a) / (b - a), 0, 1);
  }
  /* desktop: cards drift apart (original Wix keyframes).
     phone: cards fly in from the sides and settle into the 2×2 grid. */
  function stat(dx, dy, a, b, m) {
    return function (el) {
      if (d.documentElement.classList.contains('is-stacked')) {   /* phones + upright tablets: fly into the 2×2 grid */
        var e = easeInOutSine(cover(el, 0, .42)), r = 1 - e;
        el.style.transform = 'translate(' + vw(m[0] * r) + 'px,' + vw(m[1] * r) + 'px) rotate(' + (m[2] * r) + 'deg)';
        el.style.opacity = .25 + .75 * e;
        return;
      }
      var t = cover(el, a, b);
      el.style.opacity = '';
      el.style.transform = 'translate(' + vw(dx * t) + 'px,' + vw(dy * t) + 'px)';
    };
  }
  var services = d.querySelector('.services');
  var effects = {
    statA: stat(62, 26, .39, .89, [-70, 18, -14]),
    statB: stat(38, 15, .40, .86, [60, -10, 9]),
    statC: stat(15, 26, .40, .90, [70, 22, 12]),
    statD: stat(3, 37, .39, .89, [-55, 30, -8]),
    fadeIn: function (el) { el.style.opacity = cover(el, 0, .5); },
    fadeOut: function (el) { el.style.opacity = 1 - cover(el, .23, 1); },
    servicesBg: function (el) { el.style.opacity = easeInSine(cover(services, 0, 1)); },
    servicesFade: function (el) { el.style.opacity = 1 - cover(services, .23, 1); },
    card: function (el) {
      /* gentle, uniform entrance: rises, un-tilts and fades in as it enters */
      var e = easeInOutSine(cover(el, 0, .42)), r = 1 - e, side = el.classList.contains('r') ? 1 : -1;
      el.style.transform = 'perspective(900px) translateY(' + (vw(4) * r) + 'px) rotateX(' + (-14 * r) + 'deg) rotate(' + (side * 3 * r) + 'deg) scale(' + (.94 + .06 * e) + ')';
      el.style.opacity = .35 + .65 * e;
    },
    slideUp: function (el) { el.style.transform = 'translateY(' + vw(30 * (1 - cover(el, 0, .24))) + 'px)'; }
  };
  var scrubs = [].slice.call(d.querySelectorAll('[data-scrub]'));
  function measure() {
    scrubs.forEach(function (el) { el._top = pageTop(el); });
    services._top = pageTop(services);
  }
  /* "What best we do" rides a little high while the services panel scrolls in, then
     settles to dead-centre exactly as the panel pins — so it appears sooner, less empty gap */
  var servicesPin = d.querySelector('.services-pin');
  var servicesCenter = d.querySelector('.services-center');
  var statsCopy = d.querySelector('.stats-copy'), servicesWhat = d.querySelector('.services-what');
  function servicesEnter() {
    var top = servicesPin.getBoundingClientRect().top, vh = w.innerHeight;
    var t = clamp(top / vh, 0, 1);                    /* 1 = panel just entering, 0 = pinned */
    var e = t * t * (3 - 2 * t);                      /* smooth start/end */
    var lift = 0.55 * vh * e;
    /* never ride up into the stats copy/badge above (phones have little room between them) */
    if (statsCopy && servicesWhat && lift > 0) {
      var cur = servicesCenter._lift || 0;
      var room = (servicesWhat.getBoundingClientRect().top + cur) - (statsCopy.getBoundingClientRect().bottom + 0.06 * vh);
      lift = Math.max(0, Math.min(lift, room));
    }
    servicesCenter._lift = lift;
    servicesCenter.style.transform = 'translate3d(0,' + (-lift).toFixed(1) + 'px,0)';
  }
  function runScrubs() {
    servicesEnter();
    scrubs.forEach(function (el) { effects[el.dataset.scrub](el); });
  }

  /* ───────── CLIENT LOGO SLIDER (continuous drift + arrows that step one logo) ─────────
     Order starts Bellavita, Kathaa, … so those two are the first in view. Two copies
     of the set sit side by side; `pos` drifts right and wraps after one full set. */
  var track = d.querySelector('.logo-track');
  var N = 21;
  for (var c = 0; c < 2; c++) {
    for (var i = 1; i <= N; i++) {
      var img = new Image();
      img.src = 'assets/img/client-' + (i < 10 ? '0' + i : i) + '.png';
      img.alt = ''; img.loading = 'eager'; img.draggable = false;
      img.onload = function () { measureTrack(); };
      track.appendChild(img);
    }
  }
  var imgs = track.children;
  var pos = 0, setW = 0, offsets = [], lastT = performance.now();
  var anim = null;                       /* {from, to, start} while an arrow step runs */
  var started = false;
  function measureTrack() {
    var first = imgs[0].offsetLeft;
    setW = imgs[N].offsetLeft - first;   /* exact width of one set incl. its gaps */
    offsets = [];
    for (var k = 0; k < N; k++) offsets.push(imgs[k].offsetLeft - first);
    /* start with Bellavita just clear of the left arrow */
    if (!started && setW) { started = true; pos = anchor(); }
  }
  /* logos line up just right of the left arrow (where Bellavita starts) */
  function anchor() { var pr = d.querySelector('.arrow.prev'); return pr.offsetLeft + pr.offsetWidth + 14; }
  function step(dir) {                    /* dir +1 = next (logos move left), -1 = prev (move right) */
    if (!setW) return;
    var base = anim ? anim.to : pos;
    var pm = ((base % setW) + setW) % setW;
    var x0 = (((anchor() - pm) % setW) + setW) % setW;   /* set-coordinate sitting at the anchor */
    var cands = offsets.map(function (o) { return o; })
      .concat(offsets.map(function (o) { return o + setW; }), offsets.map(function (o) { return o - setW; }));
    /* skip the logo already sitting at the arrow, so every tap moves a whole logo
       even though the row keeps drifting between taps */
    var slots = offsets.map(function (o, k) { return (k < N - 1 ? offsets[k + 1] : setW) - o; });
    var T = 0.35 * Math.min.apply(null, slots);
    var target;
    if (dir > 0) target = Math.min.apply(null, cands.filter(function (o) { return o > x0 + T; }));
    else target = Math.max.apply(null, cands.filter(function (o) { return o < x0 - T; }));
    anim = { from: pos, to: base - (target - x0), start: performance.now() };
  }
  d.querySelector('.arrow.prev').addEventListener('click', function () { step(-1); });
  d.querySelector('.arrow.next').addEventListener('click', function () { step(1); });
  function slide(now) {
    var dt = Math.min(64, now - lastT); lastT = now;
    if (anim) {
      var t = Math.min(1, (now - anim.start) / 450), e = 1 - Math.pow(1 - t, 3);
      pos = anim.from + (anim.to - anim.from) * e;
      if (t >= 1) anim = null;
    } else {
      pos += dt * 0.045 * (w.innerWidth / 1440);   /* gentle drift to the right */
    }
    if (setW) track.style.transform = 'translateX(' + (((pos % setW) + setW) % setW - setW) + 'px)';
    requestAnimationFrame(slide);
  }
  requestAnimationFrame(slide);

  /* ───────── "STOP" VIDEO WITH ALPHA (top half = colour, bottom half = mask) ───────── */
  /* ───────── SAFARI-SAFE AUTOPLAY ─────────
     Safari only autoplays video that is muted + inline, and Low Power Mode blocks autoplay
     entirely. So: force those flags, retry once data arrives, and on the first tap/touch
     start any on-screen video that was blocked. */
  var wantPlay = [];
  function prepVideo(v) {
    v.muted = true; v.defaultMuted = true;
    v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.setAttribute('webkit-playsinline', '');
    v.playsInline = true;
    v.addEventListener('canplay', function () { if (v._want && v.paused) tryPlay(v); });
  }
  function tryPlay(v) {
    v._want = true;
    if (wantPlay.indexOf(v) < 0) wantPlay.push(v);
    var p = v.play();
    if (p && p.catch) p.catch(function () {});
  }
  function stopPlay(v) { v._want = false; v.pause(); }
  function unlock() {
    wantPlay.forEach(function (v) { if (v._want && v.paused) tryPlay(v); });
  }
  ['touchstart', 'touchend', 'pointerup', 'click', 'keydown'].forEach(function (ev) { d.addEventListener(ev, unlock, { passive: true }); });

  (function alphaVideo() {
    var box = d.querySelector('.stop-video');
    var video = box.querySelector('video');
    var canvas = box.querySelector('canvas');
    prepVideo(video);
    var gl = canvas.getContext('webgl', { premultipliedAlpha: false, alpha: true });
    if (!gl) return;
    var vs = 'attribute vec2 p;varying vec2 uv;void main(){uv=vec2((p.x+1.)/2.,(1.-p.y)/2.);gl_Position=vec4(p,0.,1.);}';
    var fs = 'precision mediump float;varying vec2 uv;uniform sampler2D t;void main(){vec3 c=texture2D(t,vec2(uv.x,uv.y*.5)).rgb;float a=texture2D(t,vec2(uv.x,.5+uv.y*.5)).r;gl_FragColor=vec4(c,a);}';
    function sh(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; }
    var prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, vs));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(prog); gl.useProgram(prog);
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    var tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T].forEach(function (k) { gl.texParameteri(gl.TEXTURE_2D, k, gl.CLAMP_TO_EDGE); });
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    var visible = false, ok = true;
    function size() {
      var r = box.getBoundingClientRect(), dpr = Math.min(2, w.devicePixelRatio || 1);
      canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
    }
    function draw() {
      if (!ok) return;
      if (visible && video.readyState >= 2) {
        try {
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
          gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
          gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
          box.classList.add('gl');
        } catch (e) { ok = false; box.classList.remove('gl'); return; }   /* e.g. opened over file:// */
      }
      requestAnimationFrame(draw);
    }
    new IntersectionObserver(function (es) {
      visible = es[0].isIntersecting;
      if (visible) tryPlay(video); else stopPlay(video);
    }, { rootMargin: '200px' }).observe(box);
    size(); w.addEventListener('resize', size); w.addEventListener('unitschange', size);
    requestAnimationFrame(draw);
  })();

  /* ───────── BACKGROUND / PHONE VIDEOS: play only while on screen ───────── */
  d.querySelectorAll('.hero-video, .phone video').forEach(function (v) {
    prepVideo(v);              /* starts muted; the speaker button on the reels unmutes */
    new IntersectionObserver(function (es) {
      if (es[0].isIntersecting) tryPlay(v); else stopPlay(v);
    }, { rootMargin: '150px' }).observe(v);
  });

  /* ───────── REEL SOUND: tap the speaker to unmute; only one reel plays sound at a time ───────── */
  var soundBtns = d.querySelectorAll('.reel-sound');
  function setSound(btn, on) {
    var v = btn.parentNode.querySelector('video');
    v.muted = !on;
    btn.setAttribute('aria-pressed', String(on));
    btn.setAttribute('aria-label', on ? 'Mute' : 'Turn sound on');
    if (on) v.play().catch(function () {});
  }
  soundBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var on = btn.getAttribute('aria-pressed') !== 'true';
      soundBtns.forEach(function (b) { if (b !== btn) setSound(b, false); });
      setSound(btn, on);
    });
    /* mute when scrolled away so sound never plays from off screen */
    new IntersectionObserver(function (es) {
      if (!es[0].isIntersecting && btn.getAttribute('aria-pressed') === 'true') setSound(btn, false);
    }).observe(btn.parentNode);
  });

  /* ───────── STICKY NOTE — 81-frame image sequence scrubbed by scroll ───────── */
  var note = { el: d.querySelector('.note-scroll'), canvas: d.getElementById('noteCanvas'), frames: [], shown: -1, drawn: -1, raf: 0 };
  note.ctx = note.canvas.getContext('2d');
  for (var f = 0; f < 81; f++) {
    var im = new Image();
    im.decoding = 'async';
    im.src = 'assets/seq/' + (f < 10 ? '00' : '0') + f + '.jpg';
    im.onload = function () { note.drawn = -1; kickNote(); };
    note.frames.push(im);
  }
  function ready(img) { return img && img.complete && img.naturalWidth; }
  /* nearest loaded frame, so a slow download never shows a blank canvas */
  function frameNear(i) {
    for (var k = 0; k < note.frames.length; k++) {
      if (ready(note.frames[i - k])) return note.frames[i - k];
      if (ready(note.frames[i + k])) return note.frames[i + k];
    }
    return null;
  }
  /* Resizing a canvas wipes it, so only do it when the size really changed
     (iPad/iPhone toolbars fire resize while scrolling) and repaint straight away. */
  function sizeNote() {
    var r = note.canvas.getBoundingClientRect(), dpr = Math.min(2, w.devicePixelRatio || 1);
    var cw = Math.round(r.width * dpr), ch = Math.round(r.height * dpr);
    if (cw === note.canvas.width && ch === note.canvas.height) return;
    note.canvas.width = cw; note.canvas.height = ch;
    note.drawn = -1;
    paintNote();
  }
  function noteTarget() {
    var stickyTop = parseFloat(getComputedStyle(note.canvas.parentNode).top) || 0;
    var length = isMobile() ? 700 : 1000;
    var p = clamp((w.scrollY - (note.el._top - stickyTop)) / length, 0, 1);
    return p * (note.frames.length - 1);
  }
  function blit(img, alpha) {
    var c = note.canvas, cw = c.width, ch = c.height;
    var s = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
    var iw = img.naturalWidth * s, ih = img.naturalHeight * s;
    note.ctx.globalAlpha = alpha;
    note.ctx.drawImage(img, (cw - iw) / 2, (ch - ih) / 2, iw, ih);
  }
  /* draws the in-between position by blending the two neighbouring frames */
  function paintNote() {
    if (note.shown < 0) return;
    var pos = note.shown, i = Math.floor(pos), t = pos - i;
    var a = frameNear(i), b = t > .01 ? frameNear(Math.min(i + 1, note.frames.length - 1)) : null;
    if (!a) return;
    blit(a, 1);
    if (b && b !== a) blit(b, t);
    note.ctx.globalAlpha = 1;
    note.drawn = pos;
  }
  /* eases the shown frame toward the scroll position, so fast flicks and jumpy touch scrolling still play smoothly */
  var noteLast = 0;
  function stepNote(now) {
    note.raf = 0;
    var target = noteTarget();
    var dt = noteLast ? Math.min(3, (now - noteLast) / 16.67) : 1;
    noteLast = now;
    if (note.shown < 0) note.shown = target;
    else note.shown += (target - note.shown) * (1 - Math.pow(.78, dt));
    if (Math.abs(target - note.shown) < .01) note.shown = target;
    if (Math.abs(note.shown - note.drawn) > .004) paintNote();
    if (note.shown !== target) note.raf = requestAnimationFrame(stepNote); else noteLast = 0;
  }
  function kickNote() { if (!note.raf) note.raf = requestAnimationFrame(stepNote); }
  function drawNote() {
    var r = note.el.getBoundingClientRect();
    if (r.bottom < -200 || r.top > w.innerHeight + 200) { if (note.shown < 0 && note.el._top != null) { note.shown = noteTarget(); paintNote(); } return; }
    kickNote();
  }

  /* ───────── LOOP ───────── */
  var ticking = false;
  function frame() {
    ticking = false;
    onHeader();
    markActive();
    runScrubs();
    drawNote();
  }
  function request() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }
  function layout() {
    measure();
    note.el._top = pageTop(note.el);
    measureTrack();
    sizeNote();
    request();
  }
  w.addEventListener('scroll', request, { passive: true });
  w.addEventListener('resize', layout);
  w.addEventListener('unitschange', layout);
  w.addEventListener('load', layout);
  if (d.fonts && d.fonts.ready) d.fonts.ready.then(layout);
  layout();
})();
