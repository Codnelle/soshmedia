/* Contact form → Google Sheet (via the Apps Script in google-apps-script/Code.gs) */
(function () {
  /* Paste your Apps Script Web app URL here (it ends in /exec). */
  var SHEET_URL = 'https://script.google.com/macros/s/AKfycbyeIqxYxszw1IZ7kNsfvgtypSLu1u_9dGjgINhg9JNkmeo5USpCvfpMArSyffH44k4V-A/exec';

  var form = document.getElementById('contactForm');
  if (!form) return;
  var button = form.querySelector('button[type="submit"]');
  var label = button.textContent;
  var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function setButton(text, disabled) {
    button.textContent = text;
    button.disabled = !!disabled;
  }

  function valid() {
    var ok = true;
    [form.elements.name, form.elements.email].forEach(function (el) {
      var bad = el.name === 'email' ? !emailRe.test(el.value.trim()) : !el.value.trim();
      el.classList.toggle('invalid', bad);
      if (bad && ok) { el.focus(); ok = false; }
    });
    return ok;
  }

  form.addEventListener('input', function (e) { e.target.classList.remove('invalid'); });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (button.disabled || !valid()) return;

    if (!SHEET_URL) {
      console.warn('Contact form: SHEET_URL is not set in js/form.js — submission not sent.');
      setButton('NOT CONNECTED YET', true);
      setTimeout(function () { setButton(label, false); }, 2500);
      return;
    }

    var data = new URLSearchParams();
    ['name', 'email', 'brand', 'problem', 'website'].forEach(function (k) {
      data.append(k, (form.elements[k] && form.elements[k].value || '').trim());
    });
    data.append('page', location.href);

    setButton('SENDING…', true);
    /* no-cors: Apps Script accepts the POST; the response is opaque, so a network
       failure is the only error we can see. */
    fetch(SHEET_URL, { method: 'POST', mode: 'no-cors', body: data })
      .then(function () {
        form.reset();
        setButton('Got it, we’ll take it from here.', true);
        setTimeout(function () { setButton(label, false); }, 5000);
      })
      .catch(function () {
        setButton('SOMETHING WENT WRONG — TRY AGAIN', false);
        setTimeout(function () { setButton(label, false); }, 4000);
      });
  });
})();
