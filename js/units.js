/* Scale unit = layout width / design width. Uses clientWidth (not 100vw) so the
   Windows/Linux classic scrollbar never pushes the layout past the right edge.
   Three layouts, matching the original Wix breakpoints:
     phone   (≤767px, held upright)          → 390px design
     tablet  (768–1100px, held upright)      → 820px design
     desktop (everything else, incl. phones held sideways — same wide shape as a laptop) → 1440px design
   Re-runs on resize/rotation, so turning the device re-lays the page out. */
(function () {
  var root = document.documentElement;
  var PHONE = '(max-width: 767px) and (orientation: portrait)';
  var TABLET = '(min-width: 768px) and (max-width: 1100px) and (orientation: portrait)';
  function set() {
    var w = root.clientWidth || window.innerWidth;
    var h = window.innerHeight;
    var phone = window.matchMedia(PHONE).matches;
    var tablet = !phone && window.matchMedia(TABLET).matches;
    var u = phone ? w / 390 : tablet ? w / 820 : w / 1440;
    if (root.hasAttribute('data-fit')) {
      /* intro page: phones/tablets use the centred stacked intro (capped so it
         doesn't balloon on tablets); desktop fits the 1440×900 stage in the window */
      var upright = window.matchMedia('(orientation: portrait) and (max-width: 1100px)').matches;
      /* phones scale with width; upright tablets get a larger intro (up to 2×) */
      u = upright ? Math.min(w / 390, 2) : Math.min(w / 1440, h / 900);
    }
    root.style.setProperty('--u', u + 'px');
    root.style.setProperty('--vh', (h / 100) + 'px');
    root.classList.toggle('is-stacked', phone || tablet);
    root.classList.toggle('is-phone', phone);
    root.classList.toggle('is-tablet', tablet);
    /* tell the page scripts to re-measure (scroll effects, sliders, canvases, menu) */
    window.dispatchEvent(new Event('unitschange'));
  }
  set();
  /* Rotation doesn't always arrive as a 'resize', so also re-run whenever one of the
     layout media queries flips, and when the visible area (Safari's toolbar) changes. */
  window.addEventListener('resize', set);
  window.addEventListener('orientationchange', function () { set(); setTimeout(set, 300); });
  if (window.visualViewport) window.visualViewport.addEventListener('resize', set);
  [PHONE, TABLET, '(orientation: portrait)'].forEach(function (q) {
    var mq = window.matchMedia(q);
    if (mq.addEventListener) mq.addEventListener('change', set); else mq.addListener(set);
  });
  document.addEventListener('DOMContentLoaded', set);
})();
