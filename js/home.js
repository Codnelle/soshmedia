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
  var lastY = w.scrollY, run = 0;          /* run: distance scrolled in the current direction */
  var navJump = 0;                         /* timestamp until which a nav-link scroll is in progress */
  function onHeader() {
    var y = w.scrollY, dy = y - lastY;
    lastY = y;
    header.classList.toggle('solid', y > 10);
    if (header.classList.contains('open')) return;
    /* while jumping to a section from the nav, keep the header in view */
    if (performance.now() < navJump || y < 120) { header.classList.remove('hide'); run = 0; return; }
    if (!dy) return;
    /* count distance per direction, so the tiny steps of smooth scrolling (and iOS bounce)
       don't flick the header in and out */
    run = (dy > 0) === (run > 0) ? run + dy : dy;
    if (run > 80) header.classList.add('hide');
    else if (run < -40) header.classList.remove('hide');
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
      /* from the full-screen menu: close it first, then scroll — restarting smooth scroll
         while a scroll is running would cancel it */
      navJump = performance.now() + 1700;              /* header stays put and underline jumps straight there */
      header.classList.remove('hide');
      if (typeof setActive === 'function') setActive(a.getAttribute('href'));
      var fromMenu = menu && menu.classList.contains('open');
      if (fromMenu) setMenu(false);
      var go = function () {
        var dest = a.getAttribute('href') === '#about' ? 0 : target;      /* About = top of the page */
        if (lenis) lenis.scrollTo(dest, { duration: 1.4, force: true });
        else if (dest === 0) w.scrollTo({ top: 0, behavior: 'smooth' }); else target.scrollIntoView({ behavior: 'smooth' });
      };
      if (fromMenu) requestAnimationFrame(function () { requestAnimationFrame(go); }); else go();
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
  function setActive(href) {
    navLinks.forEach(function (a) { a.classList.toggle('active', !!href && a.getAttribute('href') === href); });
  }
  function markActive() {
    if (performance.now() < navJump) return;          /* don't sweep the underline across links mid-jump */
    /* the last linked section whose top has passed 40% of the screen stays active through the
       unlinked sections after it, so the underline never blinks off between sections */
    var mid = w.innerHeight * .4, current = null;
    navLinks.forEach(function (a) {
      var sec = d.querySelector(a.getAttribute('href'));
      if (sec && sec.getBoundingClientRect().top <= mid) current = a.getAttribute('href');
    });
    setActive(current);
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
  /* 0 while `el`'s top is below `from` (fraction of window height from the top),
     1 once it has risen to `to` — independent of how tall the window is */
  function settle(el, from, to) {
    var y = el.getBoundingClientRect().top / w.innerHeight;
    return clamp((from - y) / (from - to), 0, 1);
  }
  var statsSection = d.querySelector('.stats');
  /* desktop: cards drift apart (original Wix keyframes).
     phone: cards fly in from the sides and settle into the 2×2 grid. */
  function stat(fx, fy, m) {
    return function (el) {
      if (d.documentElement.classList.contains('is-stacked')) {
        /* phones + upright tablets: slide in sideways only (no tilt, no vertical offset) so every row
           stays level, and finish while the card is still in the lower part of the screen */
        var e = easeInOutSine(settle(el, 1.05, .7)), r = 1 - e;
        el.style.transform = 'translate(' + vw(m[0] * r) + 'px,0)';
        el.style.opacity = .25 + .75 * e;
        return;
      }
      /* driven by where the stats section sits on screen (not by its height), so the cards are
         fully spread before the section reaches the top — even on short laptop windows */
      var t = easeInOutSine(settle(statsSection, .8, .25));
      /* laptop: cards start in one row and settle into an aligned grid at (fx, fy) design units */
      var u = d.documentElement.clientWidth / 1440;
      el.style.opacity = '';
      el.style.transform = 'translate(' + ((fx * u - el.offsetLeft) * t) + 'px,' + ((fy * u - el.offsetTop) * t) + 'px)';
    };
  }
  var services = d.querySelector('.services');
  var effects = {
    /* laptop grid: 10K+ on top, 5+ and 50K+ side by side, 100% below — one 318u-wide column */
    statA: stat(930, 422, [-70, 18]),
    statB: stat(930, 263, [60, -10]),
    statC: stat(1100, 422, [70, 22]),
    statD: stat(930, 581, [-55, 30]),
    fadeIn: function (el) { el.style.opacity = settle(el, .95, .55); },
    fadeOut: function (el) { el.style.opacity = 1 - cover(el, .23, 1); },
    servicesBg: function (el) { el.style.opacity = easeInSine(cover(services, 0, 1)); },
    servicesFade: function (el) { el.style.opacity = 1 - cover(services, .23, 1); },
    card: function (el) {
      /* strong 3D tilt through the whole scroll: tipped back and turned in as it rises from the bottom,
         swings flat around the middle of the screen, tips forward as it leaves the top */
      var e = easeInOutSine(cover(el, 0, .42)), r = 1 - e, side = el.classList.contains('r') ? 1 : -1;
      var r0 = el.getBoundingClientRect(), vh = w.innerHeight;
      var c = clamp(((r0.top + r0.height / 2) - vh / 2) / (vh / 2 + r0.height / 2), -1, 1);   /* -1 top … 0 middle … 1 bottom */
      var k = c > 0 ? Math.pow(c, .6) : -Math.pow(-c, .6);                                       /* reach full tilt a bit sooner */
      var tiltX = 55 * k, tiltY = -side * 32 * k, lift = -110 * Math.abs(k);
      el.style.transformOrigin = '50% ' + (c > 0 ? '100%' : '0%');
      el.style.transform = 'perspective(520px) translate3d(0,' + (vw(4) * r).toFixed(1) + 'px,' + lift.toFixed(1) + 'px) rotateX(' + tiltX.toFixed(2) + 'deg) rotateY(' + tiltY.toFixed(2) + 'deg) rotate(' + (side * 3 * r).toFixed(2) + 'deg) scale(' + (.94 + .06 * e).toFixed(3) + ')';
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
      var room = (servicesWhat.getBoundingClientRect().top + cur) - (statsCopy.getBoundingClientRect().bottom + 0.12 * vh);
      lift = Math.max(0, Math.min(lift, room));
    }
    /* never let the heading rise past the top edge of its pinned panel: Safari draws the part above
       that edge as a separate layer, which showed as a green band cutting through "What" */
    if (servicesWhat && lift > 0) {
      var cur2 = servicesCenter._lift || 0;
      var edgeRoom = (servicesWhat.getBoundingClientRect().top + cur2) - servicesPin.getBoundingClientRect().top - 2;
      lift = Math.max(0, Math.min(lift, edgeRoom));
    }
    servicesCenter._lift = lift;
    servicesCenter.style.transform = 'translate3d(0,' + (-Math.round(lift)) + 'px,0)';   /* whole pixels: no half-pixel seams */
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
  /* Hold the row still until the clients section actually comes into view, then start from
     Bellavita + Kathaa (reset again each time it comes back into view), pause a beat, and drift.
     Before, it drifted from page load, so the first logos had moved on by the time you got there. */
  var inView = false, holdUntil = 0;
  new IntersectionObserver(function (es) {
    var vis = es[0].isIntersecting;
    if (vis && !inView && setW && !anim) { pos = anchor(); holdUntil = performance.now() + 1200; }
    inView = vis;
  }, { threshold: 0.25 }).observe(track.parentNode);
  d.querySelector('.arrow.prev').addEventListener('click', function () { holdUntil = 0; step(-1); });
  d.querySelector('.arrow.next').addEventListener('click', function () { holdUntil = 0; step(1); });
  function slide(now) {
    var dt = Math.min(64, now - lastT); lastT = now;
    if (anim) {
      var t = Math.min(1, (now - anim.start) / 450), e = 1 - Math.pow(1 - t, 3);
      pos = anim.from + (anim.to - anim.from) * e;
      if (t >= 1) anim = null;
    } else if (inView && now > holdUntil) {
      pos += dt * 0.045 * (isMobile() ? 1 : w.innerWidth / 1440);   /* same drift speed on iPad/phone as on a laptop */
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
    v.addEventListener('playing', function () { hidePoster(v); });
  }
  /* When iOS refuses to start a video (Low Power Mode), it draws its own play button on it,
     and CSS can't hide that on every iOS version. So hide the video and show its poster
     image in the same spot until a touch lets it play. */
  function showPoster(v) {
    if (!v.poster) return;
    if (!v._posterEl) {
      var img = new Image();
      img.src = v.poster; img.alt = ''; img.setAttribute('aria-hidden', 'true');
      img.className = (v.className ? v.className + ' ' : '') + 'video-poster';
      v.parentNode.insertBefore(img, v);
      v._posterEl = img;
    }
    v.style.visibility = 'hidden';
  }
  function hidePoster(v) {
    v.style.visibility = '';
    if (v._posterEl) { v._posterEl.remove(); v._posterEl = null; }
  }
  function tryPlay(v) {
    v._want = true;
    if (wantPlay.indexOf(v) < 0) wantPlay.push(v);
    var p = v.play();
    if (p && p.then) p.then(function () { hidePoster(v); }, function () { if (v._want) showPoster(v); });
  }
  function stopPlay(v) { v._want = false; v.pause(); }
  function unlock() {
    wantPlay.forEach(function (v) { if (v._want && v.paused) tryPlay(v); });
  }
  ['touchstart', 'touchend', 'pointerup', 'click', 'keydown'].forEach(function (ev) { d.addEventListener(ev, unlock, { passive: true }); });

  /* ───────── WORK DECK — the STOP section's statics flip onto a small stack, in the same
     order and rhythm as the original clip. Only the top three cards are kept in the page. ───────── */
  (function workDeck() {
    var box = d.querySelector('.work-deck');
    if (!box) return;
    var list = ['anuv', 'bellavita', 'tenali', 'premier', 'rings', 'evaan-bracelet', 'evaan-earrings',
                'anniversary', 'premier', 'artist', 'rings', 'sunglasses', 'prism'];
    var tilts = [-7, 5, -3, 8, -5, 3, -8, 6, -4, 7, -6, 4, -2];
    var STEP = 310, KEEP = 3, i = 0, timer = 0, visible = false;
    var pics = {};
    list.forEach(function (n) {                           /* preload once; cards are sized from these */
      if (pics[n]) return;
      var im = new Image(); im.src = 'assets/img/work/' + n + '.jpg'; pics[n] = im;
    });
    /* Every card gets an explicit size (fit inside 74% × 80% of the box, keeping its proportions),
       so it is centred from its very first frame. Before, a card's size was unknown until its
       image loaded, which briefly pushed it off-centre. */
    function fit(card, pic) {
      var bw = box.clientWidth * .74, bh = box.clientHeight * .80;
      var r = pic.naturalWidth / pic.naturalHeight;
      var cw = bw, ch = bw / r;
      if (ch > bh) { ch = bh; cw = bh * r; }
      card.style.width = Math.round(cw) + 'px';
      card.style.height = Math.round(ch) + 'px';
    }
    function ready(pic) { return pic.complete && pic.naturalWidth > 0; }
    var first = box.querySelector('.deck-card');
    first.style.setProperty('--r', tilts[0] + 'deg');
    function sizeFirst() { if (ready(pics.anuv)) fit(first, pics.anuv); }
    pics.anuv.addEventListener('load', sizeFirst); sizeFirst();
    function next() {
      var n = (i + 1) % list.length, pic = pics[list[n]];
      if (!ready(pic)) return;                            /* not loaded yet: keep the current card a beat longer */
      i = n;
      var card = d.createElement('img');
      card.className = 'deck-card enter';
      card.alt = '';
      card.src = pic.src;
      card._pic = pic;
      fit(card, pic);
      card.style.setProperty('--r', tilts[i] + 'deg');
      box.appendChild(card);
      card.getBoundingClientRect();                       /* commit the start state, then animate in */
      card.classList.remove('enter');
      var cards = box.querySelectorAll('.deck-card');
      for (var k = 0; k < cards.length - KEEP; k++) cards[k].remove();
    }
    function refit() {
      box.querySelectorAll('.deck-card').forEach(function (c) { var p = c._pic || pics.anuv; if (ready(p)) fit(c, p); });
    }
    w.addEventListener('resize', refit);
    w.addEventListener('unitschange', refit);
    function play() { if (!timer && visible) timer = setInterval(next, STEP); }
    function stop() { clearInterval(timer); timer = 0; }
    /* Windows with "Animation effects" off reports reduced motion. Still show the work, just calmer:
       cards swap without the pop animation, at a slower pace (stopping here left a single frozen card) */
    if (w.matchMedia('(prefers-reduced-motion: reduce)').matches) { box.classList.add('calm'); STEP = 900; }
    new IntersectionObserver(function (es) {
      visible = es[0].isIntersecting;
      if (visible) play(); else stop();
    }, { rootMargin: '100px' }).observe(box);
    d.addEventListener('visibilitychange', function () { if (d.hidden) stop(); else play(); });
  })();

  /* ───────── BACKGROUND / PHONE VIDEOS: play only while on screen ───────── */
  d.querySelectorAll('.hero-video, .phone video').forEach(function (v) {
    prepVideo(v);              /* starts muted; the speaker button on the reels unmutes */
    new IntersectionObserver(function (es) {
      if (es[0].isIntersecting) tryPlay(v); else stopPlay(v);
    }, { rootMargin: '150px' }).observe(v);
  });

  /* ───────── WARM-UP: once the first screen has loaded, fetch everything further down in the
     background (reels, posters, statics), so nothing is still loading when you scroll to it ───────── */
  function warmUp() {
    d.querySelectorAll('video').forEach(function (v) {
      v.preload = 'auto';
      if (v.readyState < 2) v.load();                    /* start buffering now, not when it scrolls in */
    });
    d.querySelectorAll('img').forEach(function (im) {
      if (im.loading === 'lazy') im.loading = 'eager';
    });
    ['phone1-poster.jpg', 'phone2-poster.jpg', 'founder.png', 'circle-scribble.png', 'iphone-frame.png']
      .forEach(function (f) { var im = new Image(); im.src = 'assets/img/' + f; });
  }
  if (d.readyState === 'complete') setTimeout(warmUp, 300);
  else w.addEventListener('load', function () { setTimeout(warmUp, 300); });

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
    im.src = 'assets/seq/' + (f < 10 ? '00' : '0') + f + '.jpg?v=3';   /* v=2: white-backed frames (see #noteCanvas blend) */
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
    /* frames are white-backed: multiplying by the page cream turns white into exactly the page colour,
       so the animation has no visible box (done in the canvas, not CSS, to avoid a seam in Safari) */
    var ctx = note.ctx;
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = '#FFFCE4';
    ctx.fillRect(0, 0, note.canvas.width, note.canvas.height);
    ctx.globalCompositeOperation = 'source-over';
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
