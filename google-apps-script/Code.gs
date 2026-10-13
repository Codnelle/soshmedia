/**
 * Sosh Media — contact form → Google Sheet (+ email alert)
 *
 * Setup (once):
 *  1. Open the leads sheet (SHEET_ID below).
 *  2. In the sheet: Extensions → Apps Script. Delete what's there, paste this whole file, Save.
 *  3. Deploy → New deployment → type "Web app"
 *       Execute as:      Me
 *       Who has access:  Anyone
 *     → Deploy → Authorize → copy the Web app URL (ends in /exec).
 *  4. Paste that URL into js/form.js (SHEET_URL).
 *
 * If you edit this script later: Deploy → Manage deployments → Edit (pencil) →
 * Version: "New version" → Deploy. The URL stays the same.
 */

var SHEET_ID     = '1dtID4GJPozAC52ZXJH1Kp9lcdN7c9R5EtQJ6PZ90piU';   // Sosh Media leads sheet
var SHEET_NAME   = 'Leads';
var NOTIFY_EMAIL = 'sosh.mediaa@gmail.com';   // set to '' to turn email alerts off
var CONFIRM_SUBMITTER = true;                  // send the person a "we've got it" email
var HEADERS      = ['Timestamp', 'Name', 'Email', 'Personal or brand', 'Worst social media problem', 'Page'];

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var p = (e && e.parameter) || {};

    // Bots fill the hidden "website" field; real visitors never see it.
    if (p.website) return json({ ok: true });

    var name    = clean(p.name, 200);
    var email   = clean(p.email, 200);
    var brand   = clean(p.brand, 200);
    var problem = clean(p.problem, 5000);
    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ ok: false, error: 'Name and a valid email are required.' });
    }

    var sheet = getSheet();
    sheet.appendRow([new Date(), name, email, brand, problem, clean(p.page, 300)]);

    if (NOTIFY_EMAIL) notifyTeam(name, email, brand, problem, clean(p.page, 300));
    if (CONFIRM_SUBMITTER) confirmToSubmitter(name, email, problem);
    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

/* "New submission" email to the Sosh Media inbox. Reply goes straight to the person who filled the form. */
function notifyTeam(name, email, brand, problem, page) {
  var url = 'https://docs.google.com/spreadsheets/d/' + SHEET_ID + '/edit';
  var esc = function (v) { return String(v || '—').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var row = function (label, value) {
    return '<tr><td style="padding:8px 14px 8px 0;color:#6E6E6E;font:12px monospace;text-transform:uppercase;vertical-align:top;white-space:nowrap">' + label +
           '</td><td style="padding:8px 0;color:#052416;font:15px/1.5 Helvetica,Arial,sans-serif">' + esc(value).replace(/\n/g, '<br>') + '</td></tr>';
  };
  MailApp.sendEmail({
    to: NOTIFY_EMAIL,
    replyTo: email,
    name: 'Sosh Media Website',
    subject: 'New website submission — ' + name + (brand ? ' (' + brand + ')' : ''),
    body:
      'You have received a new submission on the Sosh Media website.\n\n' +
      'Name: ' + name + '\nEmail: ' + email + '\nPersonal or brand: ' + (brand || '—') + '\n\n' +
      'Worst social media problem:\n' + (problem || '—') + '\n\n' +
      'All submissions: ' + url + '\n\nReply to this email to respond to ' + name + ' directly.',
    htmlBody:
      '<div style="background:#FFFCE4;padding:28px 24px;font-family:Helvetica,Arial,sans-serif">' +
      '<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:14px;padding:28px 28px 22px;border:1px solid #EDE8C8">' +
      '<p style="margin:0 0 4px;font:12px monospace;letter-spacing:.12em;text-transform:uppercase;color:#478B6E">Sosh Media · Website</p>' +
      '<h1 style="margin:0 0 18px;font:400 26px Georgia,serif;color:#052416">You have a new submission</h1>' +
      '<table style="border-collapse:collapse;width:100%">' +
      row('Name', name) + row('Email', email) + row('Personal / brand', brand) + row('Problem', problem) +
      '</table>' +
      '<p style="margin:22px 0 6px"><a href="' + url + '" style="display:inline-block;background:#DDE85C;color:#052416;text-decoration:none;font:13px monospace;padding:10px 18px;border-radius:100px">Open all submissions</a></p>' +
      '<p style="margin:14px 0 0;color:#6E6E6E;font-size:12px">Hit reply to answer ' + esc(name) + ' directly.</p>' +
      '</div></div>'
  });
}

/* "We've got it" email to the person who filled the form. At most one per address per hour,
   so the form can't be used to send our email to strangers in bulk. Replies go to the Sosh inbox. */
function confirmToSubmitter(name, email, problem) {
  var cache = CacheService.getScriptCache(), key = 'confirm:' + email.toLowerCase();
  if (cache.get(key)) return;
  cache.put(key, '1', 3600);
  var first = String(name).split(/\s+/)[0];
  var esc = function (v) { return String(v || '').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  MailApp.sendEmail({
    to: email,
    replyTo: NOTIFY_EMAIL,
    name: 'Sosh Media',
    subject: 'Got it, we\u2019ll take it from here \u2014 Sosh Media',
    body:
      'Hi ' + first + ',\n\n' +
      'Thanks for reaching out to Sosh Media. Got it, we\u2019ll take it from here.\n' +
      'Someone from our team will get back to you soon.\n\n' +
      (problem ? 'What you told us:\n' + problem + '\n\n' : '') +
      'Want to add anything? Just reply to this email.\n\n' +
      '\u2014 Team Sosh\nAll thinks social',
    htmlBody:
      '<div style="background:#FFFCE4;padding:28px 24px;font-family:Helvetica,Arial,sans-serif">' +
      '<div style="max-width:560px;margin:0 auto;background:#153226;border-radius:16px;padding:32px 30px 26px;color:#FFFCE4">' +
      '<p style="margin:0 0 6px;font:12px monospace;letter-spacing:.14em;text-transform:uppercase;color:#DDE85C">Sosh Media</p>' +
      '<h1 style="margin:0 0 16px;font:400 28px/1.15 Georgia,serif;color:#FFFCE4">Got it, <span style="color:#FFC4E8;font-style:italic">' + esc(first) + '</span> \u2014 we\u2019ll take it from here.</h1>' +
      '<p style="margin:0 0 14px;font:15px/1.6 Helvetica,Arial,sans-serif;color:#FFFCE4">Thanks for reaching out. Someone from our team will get back to you soon.</p>' +
      (problem ? '<div style="margin:18px 0;padding:14px 16px;border-radius:10px;background:rgba(255,252,228,.08);border:1px solid rgba(255,252,228,.15)">' +
        '<p style="margin:0 0 6px;font:11px monospace;letter-spacing:.12em;text-transform:uppercase;color:#478B6E">What you told us</p>' +
        '<p style="margin:0;font:14px/1.6 Helvetica,Arial,sans-serif;color:#FFFCE4">' + esc(problem).replace(/\n/g, '<br>') + '</p></div>' : '') +
      '<p style="margin:0 0 4px;font:14px/1.6 Helvetica,Arial,sans-serif;color:#FFFCE4">Want to add anything? Just hit reply.</p>' +
      '<p style="margin:22px 0 0;font:italic 20px Georgia,serif;color:#FFC4E8">All thinks social</p>' +
      '<p style="margin:2px 0 0;font:12px monospace;color:#C2C2C2">\u2014 Team Sosh</p>' +
      '</div></div>'
  });
}

/* Lets you open the /exec URL in a browser to check the deployment is live. */
function doGet() {
  return json({ ok: true, message: 'Sosh Media form endpoint is live.' });
}

function getSheet() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/* Trims input and stops spreadsheet formula injection (=, +, -, @ at the start). */
function clean(v, max) {
  v = String(v == null ? '' : v).trim().slice(0, max);
  return /^[=+\-@]/.test(v) ? "'" + v : v;
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
