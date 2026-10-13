/* Scroll-driven flying "o" from the Sosh logo (follows the original site's plane path) */
(function () {
  var w = window, d = document;
  var HIDE_AT = 0.82;
  var FADE_LEN = 0.10;

  var plane = d.createElement('div');
  plane.id = 'spp-obj';
  plane.innerHTML = '<img src="assets/img/logo-o.png" alt="" aria-hidden="true" draggable="false">';
  d.body.appendChild(plane);

  var x = w.innerWidth * .14;
  var y = w.innerHeight * .22;
  var lastX = x, lastY = y;
  var rotation = 0;
  var lastTime = performance.now();

  /* zig-zag flight path, in viewport fractions */
  var points = [
    [.12,.20],[.46,.10],[.86,.27],[.67,.55],[.20,.78],[.47,.47],[.88,.72],[.70,.16],
    [.34,.38],[.84,.88],[.52,.64],[.12,.43],[.72,.08],[.91,.52],[.29,.89],[.53,.47]
  ];

  function ease(t) { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  function getFlight(progress) {
    var max = points.length - 1;
    var scaled = progress * max;
    var i = Math.floor(scaled);
    if (i >= max) return { x: points[max][0], y: points[max][1] };
    var t = ease(scaled - i);
    return { x: lerp(points[i][0], points[i + 1][0], t), y: lerp(points[i][1], points[i + 1][1], t) };
  }

  function resize() {
    var width = w.innerWidth <= 767 ? 30 : Math.max(44, Math.min(68, w.innerWidth * .042));
    plane.style.width = width + 'px';
    plane.style.height = width + 'px';
  }

  function animate(now) {
    var dt = Math.min(2, (now - lastTime) / 16.67);
    lastTime = now;

    var maxScroll = Math.max(1, d.documentElement.scrollHeight - w.innerHeight);
    var progress = Math.max(0, Math.min(1, w.scrollY / maxScroll));

    var target = getFlight(progress);
    var mx = Math.min(70, w.innerWidth * .07);
    var my = Math.min(70, w.innerHeight * .07);
    var targetX = mx + target.x * (w.innerWidth - mx * 2);
    var targetY = my + target.y * (w.innerHeight - my * 2);

    var smoothing = 1 - Math.pow(.88, dt);
    x += (targetX - x) * smoothing;
    y += (targetY - y) * smoothing;

    /* roll like a wheel: spin by the distance travelled, direction follows horizontal motion */
    var dx = x - lastX, dy = y - lastY;
    var dist = Math.sqrt(dx * dx + dy * dy);
    rotation += (dx >= 0 ? 1 : -1) * dist / (plane.offsetWidth / 2 || 1) * 180 / Math.PI;
    lastX = x; lastY = y;

    var f = 1 - (progress - (HIDE_AT - FADE_LEN)) / FADE_LEN;
    f = Math.max(0, Math.min(1, f));
    var opacity = f;
    var scale = .65 + f * .35;
    var header = d.getElementById('header');
    if (d.documentElement.classList.contains('is-stacked') && header && header.classList.contains('open')) opacity = 0;

    plane.style.opacity = String(opacity);
    plane.style.transform =
      'translate3d(' + (x - plane.offsetWidth / 2) + 'px,' + (y - plane.offsetHeight / 2) + 'px,0) ' +
      'rotate(' + rotation + 'deg) scale(' + scale + ')';
    requestAnimationFrame(animate);
  }

  resize();
  w.addEventListener('resize', resize, { passive: true });
  w.addEventListener('unitschange', resize);
  setTimeout(function () { requestAnimationFrame(animate); }, 700);
})();
