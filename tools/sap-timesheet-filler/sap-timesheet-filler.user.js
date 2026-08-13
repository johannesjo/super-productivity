// ==UserScript==
// @name         SAP Timesheet Filler (8h Mon–Thu)
// @namespace    https://github.com/super-productivity/super-productivity
// @version      1.1.0
// @description  One click fills the current week's SAP timesheet with 8 hours on Mon–Thu. It only types into the fields — it NEVER saves or submits; you review and press Save in SAP yourself.
// @match        https://YOUR-SAP-HOST.example.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

/*
 * SETUP: replace the @match line above with your real SAP host, e.g.
 *   // @match https://my-company.sap-portal.example/*
 * Full instructions and troubleshooting: see README.md next to this file.
 *
 * The script adds a small panel to the page. "Fill" finds the hours field for
 * each configured day of the CURRENT week and types the hours into it. If the
 * automatic detection picks the wrong fields (every SAP install looks
 * different), use "Teach fields" once: click each day's field when prompted,
 * and the choice is remembered for that site.
 *
 * No extension available? Use the bookmarklet build (node build-bookmarklet.js,
 * see README) or paste the body below into the DevTools console.
 */

(function () {
  'use strict';

  // --------------------------------------------------------------- config
  const HOURS = '8'; // value typed into each field; use '8,00' if your SAP shows decimal commas
  const FILL_DAYS = ['mon', 'tue', 'wed', 'thu']; // days that get HOURS

  const DAY_DEFS = [
    { key: 'mon', label: 'Mon', names: ['monday', 'montag'], abbrs: ['mon', 'mo'] },
    {
      key: 'tue',
      label: 'Tue',
      names: ['tuesday', 'dienstag'],
      abbrs: ['tue', 'tu', 'di'],
    },
    {
      key: 'wed',
      label: 'Wed',
      names: ['wednesday', 'mittwoch'],
      abbrs: ['wed', 'we', 'mi'],
    },
    {
      key: 'thu',
      label: 'Thu',
      names: ['thursday', 'donnerstag'],
      abbrs: ['thu', 'th', 'do'],
    },
    { key: 'fri', label: 'Fri', names: ['friday', 'freitag'], abbrs: ['fri', 'fr'] },
    {
      key: 'sat',
      label: 'Sat',
      names: ['saturday', 'samstag', 'sonnabend'],
      abbrs: ['sat', 'sa'],
    },
    {
      key: 'sun',
      label: 'Sun',
      names: ['sunday', 'sonntag'],
      abbrs: ['sun', 'su', 'so'],
    },
  ];

  const STORE_KEY = 'sapTimesheetFiller:' + location.host;
  const PANEL_ID = 'sap-timesheet-filler-panel';

  // ----------------------------------------------------- current week dates
  const pad2 = (n) => String(n).padStart(2, '0');

  const weekDates = (() => {
    const now = new Date();
    const monday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - ((now.getDay() + 6) % 7),
    );
    const map = {};
    DAY_DEFS.forEach((d, i) => {
      map[d.key] = new Date(
        monday.getFullYear(),
        monday.getMonth(),
        monday.getDate() + i,
      );
    });
    return map;
  })();

  function dateTokens(date) {
    const d = date.getDate();
    const m = date.getMonth() + 1;
    const y = date.getFullYear();
    return Array.from(
      new Set([
        d + '.' + m,
        pad2(d) + '.' + pad2(m),
        d + '.' + m + '.' + y,
        pad2(d) + '.' + pad2(m) + '.' + y,
        d + '/' + m,
        pad2(d) + '/' + pad2(m),
        m + '/' + d,
        pad2(m) + '/' + pad2(d),
        y + '-' + pad2(m) + '-' + pad2(d),
      ]),
    );
  }

  const dayTokens = {};
  DAY_DEFS.forEach((def) => {
    dayTokens[def.key] = def.names.concat(def.abbrs, dateTokens(weekDates[def.key]));
  });

  // ------------------------------------------------------------- matching
  const normalize = (s) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim();

  function hasToken(text, token) {
    const esc = token.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
    return new RegExp('(^|[^0-9a-zäöüß])' + esc + '($|[^0-9a-zäöüß])').test(text);
  }

  // The day a text refers to — or null if it names none or several (ambiguous).
  function dayForText(text) {
    if (!text) return null;
    const matches = DAY_DEFS.filter((def) =>
      dayTokens[def.key].some((tok) => hasToken(text, tok)),
    );
    return matches.length === 1 ? matches[0].key : null;
  }

  const CANDIDATE_SEL =
    'input:not([type=hidden]):not([type=checkbox]):not([type=radio])' +
    ':not([type=button]):not([type=submit]):not([type=file]), textarea';

  function isFillable(el) {
    if (el.disabled || el.readOnly) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }

  function candidates() {
    return Array.from(document.querySelectorAll(CANDIDATE_SEL)).filter(isFillable);
  }

  // Text describing an input: its own attributes plus any aria/label references.
  function ownText(el) {
    const parts = [
      el.getAttribute('aria-label'),
      el.placeholder,
      el.title,
      el.name,
      el.id,
    ].filter(Boolean);
    const refIds =
      (el.getAttribute('aria-labelledby') || '') +
      ' ' +
      (el.getAttribute('aria-describedby') || '');
    refIds
      .split(/\s+/)
      .filter(Boolean)
      .forEach((id) => {
        const ref = document.getElementById(id);
        if (ref) parts.push(ref.textContent);
      });
    if (el.labels) {
      Array.from(el.labels).forEach((l) => parts.push(l.textContent));
    }
    return normalize(parts.join(' '));
  }

  // Column header text for an input inside an ARIA grid or a plain <table>.
  function columnHeaderText(el) {
    const gridCell = el.closest('[role=gridcell],[role=cell]');
    const colIdx = gridCell && gridCell.getAttribute('aria-colindex');
    if (colIdx) {
      const grid =
        gridCell.closest('[role=grid],[role=treegrid],[role=table]') || document;
      const header = grid.querySelector(
        '[role=columnheader][aria-colindex="' + colIdx + '"]',
      );
      if (header) return normalize(header.textContent);
    }
    const cell = el.closest('td,th');
    const table = el.closest('table');
    if (cell && table) {
      const idx = cell.cellIndex;
      const headerRow =
        (table.tHead && table.tHead.rows[0]) ||
        (table.rows.length > 1 && table.rows[0].querySelector('th')
          ? table.rows[0]
          : null);
      if (headerRow && headerRow.cells[idx]) {
        return normalize(headerRow.cells[idx].textContent);
      }
    }
    return '';
  }

  // Fallback for layouts with no useful attributes or table structure (typical
  // for SAP UI5 grids): find short text snippets naming a day of this week and
  // pair each input with the nearest such "header" above it in the same column.
  function headerAnchors() {
    const anchors = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const text = normalize(node.nodeValue);
      if (!text || text.length > 60) continue;
      const day = dayForText(text);
      if (!day) continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      const r = range.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      anchors.push({ day, x: r.left + r.width / 2, y: r.top + r.height / 2 });
    }
    return anchors;
  }

  function geometricMatch(day, inputs, anchors) {
    let best = null;
    inputs.forEach((el) => {
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      anchors
        .filter((a) => a.day === day && a.y < r.top + 2)
        .forEach((a) => {
          const dx = Math.abs(a.x - cx);
          if (dx > Math.max(40, r.width)) return;
          const score = (r.top - a.y) * 2 + dx; // prefer topmost row, then closest column
          if (!best || score < best.score) best = { el, score };
        });
    });
    return best && best.el;
  }

  // ------------------------------------------------- taught-field matching
  function loadTaught() {
    try {
      return JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
    } catch (e) {
      return null;
    }
  }

  function describeForTeaching(el, all) {
    return {
      id: el.id || '',
      name: el.name || '',
      ariaLabel: el.getAttribute('aria-label') || '',
      placeholder: el.placeholder || '',
      nth: all.indexOf(el),
    };
  }

  function matchTaught(desc, all) {
    let best = null;
    all.forEach((el, i) => {
      let score = 0;
      if (desc.id && el.id === desc.id) score += 4;
      if (desc.name && el.name === desc.name) score += 3;
      if (desc.ariaLabel && el.getAttribute('aria-label') === desc.ariaLabel) score += 2;
      if (desc.placeholder && el.placeholder === desc.placeholder) score += 2;
      if (i === desc.nth) score += 1;
      if (score > 0 && (!best || score > best.score)) best = { el, score };
    });
    return best && best.el;
  }

  // ------------------------------------------------------- field resolution
  // Returns { day → { el, how } } for the configured days.
  function resolveFields() {
    const all = candidates();
    const taught = loadTaught();
    const result = {};
    const claimed = new Set();
    const claim = (day, el, how) => {
      if (el && !claimed.has(el)) {
        result[day] = { el, how };
        claimed.add(el);
      }
    };

    if (taught) {
      FILL_DAYS.forEach((day) => {
        if (taught[day]) claim(day, matchTaught(taught[day], all), 'taught');
      });
    }

    const unresolved = () => FILL_DAYS.filter((d) => !result[d]);

    unresolved().forEach((day) => {
      const el = all.find(
        (c) =>
          !claimed.has(c) &&
          (dayForText(ownText(c)) === day || dayForText(columnHeaderText(c)) === day),
      );
      claim(day, el, 'label');
    });

    if (unresolved().length) {
      const anchors = headerAnchors();
      unresolved().forEach((day) => {
        const free = all.filter((c) => !claimed.has(c));
        claim(day, geometricMatch(day, free, anchors), 'position');
      });
    }

    return result;
  }

  // ---------------------------------------------------------------- filling
  function setFieldValue(el, value) {
    const win = el.ownerDocument.defaultView;
    const proto =
      el.tagName === 'TEXTAREA'
        ? win.HTMLTextAreaElement.prototype
        : win.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
    el.focus();
    setter.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.blur();
  }

  function labelFor(dayKey) {
    const def = DAY_DEFS.find((d) => d.key === dayKey);
    const date = weekDates[dayKey];
    return def.label + ' ' + pad2(date.getDate()) + '.' + pad2(date.getMonth() + 1) + '.';
  }

  function fillWeek() {
    const fields = resolveFields();
    const lines = FILL_DAYS.map((day) => {
      const f = fields[day];
      if (!f) return '✗ ' + labelFor(day) + ' — field not found';
      setFieldValue(f.el, HOURS);
      return '✓ ' + labelFor(day) + ' = ' + HOURS + ' (' + f.how + ')';
    });
    const found = FILL_DAYS.filter((d) => fields[d]).length;
    lines.push(
      found === FILL_DAYS.length
        ? 'Done. Nothing is saved yet — review and press Save in SAP.'
        : 'Some fields were not found. Use "Teach fields" once to fix this.',
    );
    setStatus(lines.join('\n'));
  }

  // ------------------------------------------------------------ teach mode
  let teaching = null; // { queue: [dayKey…], collected: {…} }

  function startTeaching() {
    teaching = { queue: FILL_DAYS.slice(), collected: {} };
    promptNextTeach();
    document.addEventListener('click', onTeachClick, true);
    document.addEventListener('keydown', onTeachKey, true);
  }

  function stopTeaching(message) {
    teaching = null;
    document.removeEventListener('click', onTeachClick, true);
    document.removeEventListener('keydown', onTeachKey, true);
    setStatus(message);
  }

  function promptNextTeach() {
    setStatus(
      'Teach mode: click the hours field for ' +
        labelFor(teaching.queue[0]) +
        '\n(Esc cancels)',
    );
  }

  function onTeachKey(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      stopTeaching('Teach mode cancelled.');
    }
  }

  function onTeachClick(e) {
    if (!teaching || e.target.closest('#' + PANEL_ID)) return;
    e.preventDefault();
    e.stopPropagation();
    let el = e.target.matches && e.target.matches(CANDIDATE_SEL) ? e.target : null;
    if (!el && e.target.querySelectorAll) {
      const inner = Array.from(e.target.querySelectorAll(CANDIDATE_SEL)).filter(
        isFillable,
      );
      if (inner.length === 1) el = inner[0];
    }
    if (!el) {
      setStatus('That does not look like an input — click directly inside the field.');
      return;
    }
    const day = teaching.queue.shift();
    teaching.collected[day] = describeForTeaching(el, candidates());
    if (teaching.queue.length) {
      promptNextTeach();
    } else {
      localStorage.setItem(STORE_KEY, JSON.stringify(teaching.collected));
      stopTeaching('Learned ' + FILL_DAYS.length + ' fields ✓ — now click Fill.');
    }
  }

  // ----------------------------------------------------------------- panel
  let statusEl = null;

  function setStatus(text) {
    if (statusEl) statusEl.textContent = text;
  }

  function makeButton(label, onClick) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = label;
    btn.style.cssText =
      'padding:4px 10px;border:1px solid #888;border-radius:4px;background:#f5f5f5;' +
      'color:#111;cursor:pointer;font:12px/1.4 sans-serif;';
    btn.addEventListener('click', onClick);
    return btn;
  }

  function mountPanel() {
    if (document.getElementById(PANEL_ID)) return;
    const panel = document.createElement('div');
    panel.id = PANEL_ID;
    panel.style.cssText =
      'position:fixed;right:16px;bottom:16px;z-index:2147483647;background:#fff;' +
      'color:#111;border:1px solid #888;border-radius:8px;padding:10px 12px;' +
      'box-shadow:0 2px 12px rgba(0,0,0,.25);font:12px/1.5 sans-serif;max-width:280px;';

    const title = document.createElement('div');
    title.textContent = 'SAP timesheet filler';
    title.style.cssText = 'font-weight:bold;margin-bottom:6px;';
    const close = document.createElement('span');
    close.textContent = ' ×';
    close.style.cssText = 'float:right;cursor:pointer;padding:0 2px;';
    close.addEventListener('click', () => panel.remove());
    title.appendChild(close);

    statusEl = document.createElement('div');
    statusEl.style.cssText = 'white-space:pre-line;margin:6px 0;color:#333;';

    const dayLabels = FILL_DAYS.map(
      (d) => DAY_DEFS.find((def) => def.key === d).label,
    ).join(', ');
    statusEl.textContent = 'Ready: ' + HOURS + 'h on ' + dayLabels + ' (this week).';

    const buttons = document.createElement('div');
    buttons.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;';
    buttons.appendChild(makeButton('Fill ' + HOURS + 'h', fillWeek));
    buttons.appendChild(makeButton('Teach fields', startTeaching));
    buttons.appendChild(
      makeButton('Forget taught', () => {
        localStorage.removeItem(STORE_KEY);
        setStatus('Taught fields cleared — Fill uses auto-detection again.');
      }),
    );

    panel.appendChild(title);
    panel.appendChild(statusEl);
    panel.appendChild(buttons);
    document.body.appendChild(panel);
  }

  // ----------------------------------------------------------------- mount
  // Top frame: always show the panel. Child frames (SAP portals often embed the
  // timesheet in an iframe): show it only where timesheet-like fields exist, and
  // keep checking for a while because SAP UIs render late.
  function frameLooksRelevant() {
    if (loadTaught() && candidates().length > 0) return true;
    return Object.keys(resolveFields()).length >= 2;
  }

  if (window.self === window.top) {
    mountPanel();
  } else if (frameLooksRelevant()) {
    mountPanel();
  } else {
    let tries = 0;
    const iv = setInterval(() => {
      if (frameLooksRelevant()) {
        mountPanel();
        clearInterval(iv);
      } else if (++tries > 60) {
        clearInterval(iv);
      }
    }, 2000);
  }
})();
