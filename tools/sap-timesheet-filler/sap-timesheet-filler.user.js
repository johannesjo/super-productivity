// ==UserScript==
// @name         SAP Timesheet Filler (8h Mon–Thu)
// @namespace    https://github.com/super-productivity/super-productivity
// @version      1.3.0
// @description  One click fills the current week's SAP timesheet with 8 hours on Mon–Thu, including the row's Assignment / WBS. Knows the Fiori "Time Entry" day-per-row layout and classic day-per-column timesheets. It only types into the fields — it NEVER saves or submits; you review and press Save in SAP yourself.
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

  // The row's Assignment / WBS / PSP element. SAP rejects a row without it
  // ("WBS must not be empty"), so it is filled alongside the hours. In the
  // Fiori Time Entry app the dropdown's first entry is selected; set this (or
  // the panel box) to a code to pick that entry instead.
  const WBS_DEFAULT = '';

  // Fiori Time Entry books a start/end time per day.
  // NOTE: 09:00–17:00 is an 8-hour span holding 8 booked hours, so it leaves no
  // room for a break and SAP raises "Attention ! Keep the 30 minutes break !".
  // That message is a warning to acknowledge, not a rejection. Setting END_TIME
  // to '17:30' (8h work + 30min break) is what stops it appearing.
  const START_TIME = '09:00';
  const END_TIME = '17:00';

  const WBS_DEF = {
    key: 'wbs',
    label: 'Assignment / WBS',
    // 'psp' also matches 'PSP-Element'; the token test treats '-' as a boundary.
    names: ['wbs', 'psp', 'assignment'],
    abbrs: [],
  };

  // Targets resolved on the page: the days, plus the row's WBS field.
  const TARGET_DEFS = DAY_DEFS.concat([WBS_DEF]);

  const STORE_KEY = 'sapTimesheetFiller:' + location.host;
  const WBS_STORE_KEY = 'sapTimesheetFiller:wbs:' + location.host;
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

  const tokensByKey = {};
  TARGET_DEFS.forEach((def) => {
    tokensByKey[def.key] = def.names.concat(
      def.abbrs,
      weekDates[def.key] ? dateTokens(weekDates[def.key]) : [],
    );
  });

  // ------------------------------------------------------------- matching
  const normalize = (s) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim();

  function hasToken(text, token) {
    const esc = token.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
    return new RegExp('(^|[^0-9a-zäöüß])' + esc + '($|[^0-9a-zäöüß])').test(text);
  }

  // The target (day or WBS) a text refers to — or null if it names none or
  // several (ambiguous).
  function targetForText(text) {
    if (!text) return null;
    const matches = TARGET_DEFS.filter((def) =>
      tokensByKey[def.key].some((tok) => hasToken(text, tok)),
    );
    return matches.length === 1 ? matches[0].key : null;
  }

  // A Fiori group-row title ("Monday, August 10, 2026") names both the weekday
  // and the day of month; requiring both keeps a two-week table unambiguous.
  function groupRowDay(text) {
    const t = normalize(text);
    const hit = DAY_DEFS.find(
      (def) =>
        def.names.concat(def.abbrs).some((tok) => hasToken(t, tok)) &&
        hasToken(t, String(weekDates[def.key].getDate())),
    );
    return hit ? hit.key : null;
  }

  const CANDIDATE_SEL =
    'input:not([type=hidden]):not([type=checkbox]):not([type=radio])' +
    ':not([type=button]):not([type=submit]):not([type=file]), textarea';

  function isFillable(el) {
    if (el.disabled || el.readOnly) return false;
    if (el.closest('#' + PANEL_ID)) return false; // the panel's own WBS box
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
      const day = targetForText(text);
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
  // Returns { target → { el, how } } for the configured days plus 'wbs'.
  // Days are resolved before the WBS field so an ambiguous match never steals
  // an hours field.
  function resolveFields() {
    const all = candidates();
    const taught = loadTaught();
    const targets = FILL_DAYS.concat([WBS_DEF.key]);
    const result = {};
    const claimed = new Set();
    const claim = (key, el, how) => {
      if (el && !claimed.has(el)) {
        result[key] = { el, how };
        claimed.add(el);
      }
    };

    if (taught) {
      targets.forEach((key) => {
        if (taught[key]) claim(key, matchTaught(taught[key], all), 'taught');
      });
    }

    const unresolved = () => targets.filter((k) => !result[k]);

    unresolved().forEach((key) => {
      const el = all.find(
        (c) =>
          !claimed.has(c) &&
          (targetForText(ownText(c)) === key ||
            targetForText(columnHeaderText(c)) === key),
      );
      claim(key, el, 'label');
    });

    // Geometric matching is deliberately days-only: putting a project code in
    // the wrong field is worse than leaving it empty, so the WBS field must
    // come from a real label or from teach mode.
    const geometricPending = unresolved().filter((k) => k !== WBS_DEF.key);
    if (geometricPending.length) {
      const anchors = headerAnchors();
      geometricPending.forEach((day) => {
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

  function labelFor(key) {
    const def = TARGET_DEFS.find((d) => d.key === key);
    const date = weekDates[key];
    if (!date) return def.label;
    return def.label + ' ' + pad2(date.getDate()) + '.' + pad2(date.getMonth() + 1) + '.';
  }

  // Current WBS: the panel box while mounted, else what was stored for this site.
  function wbsValue() {
    if (wbsInputEl) return wbsInputEl.value.trim();
    return (localStorage.getItem(WBS_STORE_KEY) || WBS_DEFAULT).trim();
  }

  // ------------------------------------------------- SAP Fiori "Time Entry"
  // This app puts one *group row* per calendar day ("Monday, August 10, 2026")
  // followed by that day's entry rows; the columns are fields (Assignment,
  // Entered, Start Time, …). The day is a ROW, so the column matching used for
  // classic timesheets does not apply and this engine takes over.

  function fioriGrid() {
    const grids = Array.from(document.querySelectorAll('table.sapMListTbl'));
    return grids.find((g) => g.querySelector('.sapMGHLITitle')) || null;
  }

  // { dayKey -> [entry rows] } for the current week.
  function fioriDayRows(grid) {
    const out = {};
    let day = null;
    Array.from(grid.querySelectorAll('tbody > tr')).forEach((tr) => {
      const title = tr.querySelector('.sapMGHLITitle');
      if (title) {
        day = groupRowDay(title.textContent);
      } else if (day && tr.classList.contains('sapMListTblRow')) {
        (out[day] = out[day] || []).push(tr);
      }
    });
    return out;
  }

  // A cell's column header text — cells carry the header element's id.
  function columnLabel(td) {
    const id = td.getAttribute('data-sap-ui-column');
    const th = id && document.getElementById(id);
    return th ? normalize(th.textContent) : '';
  }

  function fioriRowFields(row) {
    const cellInput = (needle) => {
      const cell = Array.from(row.querySelectorAll('td[data-sap-ui-column]')).find(
        (td) => columnLabel(td).indexOf(needle) !== -1,
      );
      const input = cell && cell.querySelector('input');
      return input && input.type !== 'checkbox' ? input : null;
    };
    return {
      // The hours cell is a StepInput; its inner field is the row's spinbutton.
      hours: row.querySelector('input[role="spinbutton"]') || cellInput('entered'),
      assignment: row.querySelector('input[role="combobox"]') || cellInput('assignment'),
      attendance: cellInput('attendance'),
      start: cellInput('start time'),
      end: cellInput('end time'),
    };
  }

  const fieldValue = (el) => (el && el.value ? el.value.trim() : '');

  function toNum(value) {
    const n = parseFloat(
      String(value || '')
        .replace(/\s/g, '')
        .replace(',', '.'),
    );
    return isNaN(n) ? 0 : n;
  }

  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // The UI5 control owning a DOM node, when the UI5 runtime is reachable.
  function ui5Control(el) {
    const ns = window.sap;
    if (!ns || !ns.ui) return null;
    for (let node = el; node && node.nodeType === 1; node = node.parentElement) {
      if (!node.id) continue;
      try {
        const core = ns.ui.getCore && ns.ui.getCore();
        const byId = core && core.byId && core.byId(node.id);
        if (byId) return byId;
        const registry = ns.ui.core && ns.ui.core.Element && ns.ui.core.Element.registry;
        const found = registry && registry.get && registry.get(node.id);
        if (found) return found;
      } catch (e) {
        /* UI5 not ready, or this id is not a control */
      }
    }
    return null;
  }

  const itemText = (item) => (item && item.getText && item.getText()) || '';
  const itemKey = (item) => (item && item.getKey && item.getKey()) || '';

  // Entries with neither text nor key are placeholders, never a real assignment.
  function comboItems(ctrl) {
    let items = [];
    try {
      items = ctrl.getItems() || [];
    } catch (e) {
      items = [];
    }
    return items.filter((it) => itemText(it).trim() || itemKey(it).trim());
  }

  // Sets the row's Assignment. A ComboBox stores a key rather than the typed
  // text, so an entry has to be *selected*: by default the first one in the
  // dropdown, or the one matching `wanted` when a code is known. Returns
  // { label, text } describing what happened, or null if nothing was set.
  async function selectAssignment(el, wanted) {
    const ctrl = ui5Control(el);
    if (ctrl && typeof ctrl.setSelectedItem === 'function') {
      let items = comboItems(ctrl);
      // A list bound lazily is empty until the dropdown has been opened once.
      if (!items.length && typeof ctrl.open === 'function') {
        try {
          ctrl.open();
          await delay(350);
          items = comboItems(ctrl);
        } catch (e) {
          /* opening is best-effort */
        }
        try {
          if (ctrl.close) ctrl.close();
        } catch (e) {
          /* ignore */
        }
      }
      const want = normalize(wanted);
      const item = want
        ? items.find(
            (it) => normalize(itemText(it)) === want || normalize(itemKey(it)) === want,
          )
        : items[0];
      if (item) {
        ctrl.setSelectedItem(item);
        if (ctrl.fireChange) ctrl.fireChange({ value: itemText(item) });
        const text = itemText(item) || itemKey(item);
        return {
          text,
          label: 'assignment ' + text + (want ? '' : ' (1st entry)'),
        };
      }
    }
    if (wanted) {
      setFieldValue(el, wanted);
      return { text: wanted, label: 'assignment ' + wanted + ' (typed)' };
    }
    return null;
  }

  async function fillFiori(grid) {
    const dayRows = fioriDayRows(grid);
    const lines = [];
    let missing = 0;

    // Attendance Type has no dropdown to pick a default from, so a day that is
    // already booked supplies it.
    let template = null;
    Object.keys(dayRows).forEach((key) =>
      dayRows[key].forEach((row) => {
        if (template) return;
        const f = fioriRowFields(row);
        if (fieldValue(f.assignment)) template = f;
      }),
    );

    // Empty = take the dropdown's first entry. Once one day has resolved, the
    // remaining days reuse that exact code: it keeps the week consistent and
    // spares them the wait for a lazily-loaded list.
    let wanted = wbsValue();
    const fallbackAssignment = fieldValue(template && template.assignment);
    const attendance = fieldValue(template && template.attendance);

    for (let i = 0; i < FILL_DAYS.length; i++) {
      const day = FILL_DAYS[i];
      const rows = dayRows[day];
      if (!rows || !rows.length) {
        missing++;
        lines.push('✗ ' + labelFor(day) + ' — no row for this day');
        continue;
      }
      const f = fioriRowFields(rows[0]);
      if (!f.hours) {
        missing++;
        lines.push('✗ ' + labelFor(day) + ' — hours field not found');
        continue;
      }
      const booked = toNum(fieldValue(f.hours));
      if (booked > 0) {
        lines.push(
          '• ' +
            labelFor(day) +
            ' already booked ' +
            fieldValue(f.hours) +
            ' — left as is',
        );
        continue;
      }

      const done = [];
      if (f.assignment && !fieldValue(f.assignment)) {
        let picked = await selectAssignment(f.assignment, wanted);
        // No reachable dropdown: reuse the code from a day already booked.
        if (!picked && fallbackAssignment) {
          setFieldValue(f.assignment, fallbackAssignment);
          picked = {
            text: fallbackAssignment,
            label: 'assignment ' + fallbackAssignment + ' (copied)',
          };
        }
        if (!picked) {
          missing++;
          lines.push('✗ ' + labelFor(day) + ' — no assignment to select');
          continue;
        }
        wanted = picked.text;
        done.push(picked.label);
      }
      if (attendance && f.attendance && !fieldValue(f.attendance)) {
        setFieldValue(f.attendance, attendance);
        done.push('type ' + attendance);
      }
      if (f.start && f.end && !fieldValue(f.start) && !fieldValue(f.end)) {
        setFieldValue(f.start, START_TIME);
        setFieldValue(f.end, END_TIME);
        done.push(START_TIME + '–' + END_TIME);
      }
      // Hours last: it is the value that matters most, so nothing re-renders over it.
      setFieldValue(f.hours, HOURS);
      done.push(HOURS + ' h');
      lines.push('✓ ' + labelFor(day) + ': ' + done.join(', '));
    }

    if (lines.some((l) => l.indexOf('(typed)') !== -1)) {
      lines.push(
        '"(typed)" = entered as text, not picked from the dropdown. If SAP still' +
          ' says the WBS is empty, choose it once from the list yourself.',
      );
    }
    lines.push(
      missing === 0
        ? 'Nothing is saved yet — review and press Save in SAP.'
        : 'Some days could not be filled (see above).',
    );
    setStatus(lines.join('\n'));
  }

  function fillWeek() {
    const grid = fioriGrid();
    if (grid) {
      setStatus('Filling…');
      fillFiori(grid).catch((e) => setStatus('Failed: ' + (e && e.message)));
      return;
    }
    fillGeneric();
  }

  function fillGeneric() {
    const fields = resolveFields();
    let missing = 0;

    const lines = FILL_DAYS.map((day) => {
      const f = fields[day];
      if (!f) {
        missing++;
        return '✗ ' + labelFor(day) + ' — field not found';
      }
      const prev = f.el.value.trim();
      setFieldValue(f.el, HOURS);
      const wasNote = prev && prev !== HOURS ? ', was ' + prev : '';
      return '✓ ' + labelFor(day) + ' = ' + HOURS + ' (' + f.how + wasNote + ')';
    });

    const wbs = wbsValue();
    const wbsField = fields[WBS_DEF.key];
    if (!wbs) {
      lines.push('• WBS box empty — SAP will reject the row without it.');
    } else if (!wbsField) {
      missing++;
      lines.push('✗ WBS — field not found, use "Teach fields"');
    } else {
      const prev = wbsField.el.value.trim();
      if (!prev || prev === wbs) {
        setFieldValue(wbsField.el, wbs);
        lines.push('✓ WBS = ' + wbs + ' (' + wbsField.how + ')');
      } else {
        // Never clobber a different project code that is already booked.
        lines.push('• WBS already set to ' + prev + ' — left unchanged');
      }
    }

    lines.push(
      missing === 0
        ? 'Done. Nothing is saved yet — review and press Save in SAP.'
        : 'Some fields were not found. Use "Teach fields" once to fix this.',
    );
    setStatus(lines.join('\n'));
  }

  // ------------------------------------------------------------ teach mode
  let teaching = null; // { queue: [targetKey…], collected: {…} }

  function startTeaching() {
    teaching = { queue: FILL_DAYS.concat([WBS_DEF.key]), collected: {} };
    if (skipBtnEl) skipBtnEl.style.display = '';
    promptNextTeach();
    document.addEventListener('click', onTeachClick, true);
    document.addEventListener('keydown', onTeachKey, true);
  }

  function stopTeaching(message) {
    teaching = null;
    if (skipBtnEl) skipBtnEl.style.display = 'none';
    document.removeEventListener('click', onTeachClick, true);
    document.removeEventListener('keydown', onTeachKey, true);
    setStatus(message);
  }

  function promptNextTeach() {
    const key = teaching.queue[0];
    const what =
      key === WBS_DEF.key
        ? 'the WBS / PSP element field of your row'
        : 'the hours field for ' + labelFor(key);
    setStatus('Teach mode: click ' + what + '\n(Skip leaves it out, Esc cancels)');
  }

  function advanceTeaching() {
    if (teaching.queue.length) {
      promptNextTeach();
      return;
    }
    const learned = Object.keys(teaching.collected);
    if (learned.length) {
      localStorage.setItem(STORE_KEY, JSON.stringify(teaching.collected));
      stopTeaching('Learned ' + learned.length + ' fields ✓ — now click Fill.');
    } else {
      stopTeaching('Nothing learned — auto-detection stays in use.');
    }
  }

  function skipTeachField() {
    if (!teaching) return;
    teaching.queue.shift();
    advanceTeaching();
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
    const key = teaching.queue.shift();
    teaching.collected[key] = describeForTeaching(el, candidates());
    advanceTeaching();
  }

  // ----------------------------------------------------------------- panel
  let statusEl = null;
  let wbsInputEl = null;
  let skipBtnEl = null;

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

    // WBS box — SAP rejects a row without it, so it is part of every fill.
    const wbsLabel = document.createElement('label');
    wbsLabel.style.cssText = 'display:block;margin:6px 0;';
    wbsLabel.appendChild(document.createTextNode('Assignment / WBS'));
    wbsInputEl = document.createElement('input');
    wbsInputEl.type = 'text';
    wbsInputEl.value = localStorage.getItem(WBS_STORE_KEY) || WBS_DEFAULT;
    wbsInputEl.placeholder = 'empty = first dropdown entry';
    wbsInputEl.style.cssText =
      'width:100%;box-sizing:border-box;margin-top:2px;padding:3px 5px;' +
      'border:1px solid #888;border-radius:4px;font:12px/1.4 monospace;';
    wbsInputEl.addEventListener('input', () => {
      localStorage.setItem(WBS_STORE_KEY, wbsInputEl.value.trim());
    });
    wbsLabel.appendChild(wbsInputEl);

    const buttons = document.createElement('div');
    buttons.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;';
    buttons.appendChild(makeButton('Fill ' + HOURS + 'h', fillWeek));
    buttons.appendChild(makeButton('Teach fields', startTeaching));
    skipBtnEl = makeButton('Skip field', skipTeachField);
    skipBtnEl.style.display = 'none';
    buttons.appendChild(skipBtnEl);
    buttons.appendChild(
      makeButton('Forget taught', () => {
        localStorage.removeItem(STORE_KEY);
        setStatus('Taught fields cleared — Fill uses auto-detection again.');
      }),
    );

    panel.appendChild(title);
    panel.appendChild(statusEl);
    panel.appendChild(wbsLabel);
    panel.appendChild(buttons);
    document.body.appendChild(panel);
  }

  // ----------------------------------------------------------------- mount
  // Top frame: always show the panel. Child frames (SAP portals often embed the
  // timesheet in an iframe): show it only where timesheet-like fields exist, and
  // keep checking for a while because SAP UIs render late.
  function frameLooksRelevant() {
    if (fioriGrid()) return true;
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
