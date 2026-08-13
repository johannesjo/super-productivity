// ==UserScript==
// @name         SAP Timesheet Filler (8h Mon–Thu)
// @namespace    https://github.com/super-productivity/super-productivity
// @version      2.0.0
// @description  Fills the current week of the SAP Fiori "Time Entry" timesheet with 8 hours on Mon–Thu, including each row's Assignment and start/end time. It only fills fields — it NEVER saves or submits.
// @match        https://YOUR-SAP-HOST.example.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

/*
 * SETUP: replace the @match line above with your real SAP host, or use the
 * bookmarklet build (node build-bookmarklet.js). See README.md.
 *
 * Scope: the Fiori "Time Entry" app only — the timesheet that lists one group
 * row per calendar day ("Monday, August 10, 2026") with Assignment, Entered,
 * Start Time and End Time as columns. On any other page the panel says so and
 * does nothing, rather than guessing at fields.
 */

(function () {
  'use strict';

  // --------------------------------------------------------------- config
  const HOURS = '8';
  const FILL_DAYS = ['mon', 'tue', 'wed', 'thu'];
  const START_TIME = '09:00';
  // 09:00–17:00 holds 8 booked hours with no break, so SAP shows "Keep the 30
  // minutes break!" — a warning to acknowledge, not a rejection. '17:30'
  // (8h work + 30min break) is the value that stops it appearing.
  const END_TIME = '17:00';

  const DAYS = [
    { key: 'mon', label: 'Mon', names: ['monday', 'montag'] },
    { key: 'tue', label: 'Tue', names: ['tuesday', 'dienstag'] },
    { key: 'wed', label: 'Wed', names: ['wednesday', 'mittwoch'] },
    { key: 'thu', label: 'Thu', names: ['thursday', 'donnerstag'] },
    { key: 'fri', label: 'Fri', names: ['friday', 'freitag'] },
    { key: 'sat', label: 'Sat', names: ['saturday', 'samstag'] },
    { key: 'sun', label: 'Sun', names: ['sunday', 'sonntag'] },
  ];

  const PANEL_ID = 'sap-timesheet-filler-panel';
  const ASSIGN_KEY = 'sapTimesheetFiller:assignment:' + location.host;

  // ------------------------------------------------------------- the week
  const pad2 = (n) => String(n).padStart(2, '0');

  const weekDates = (() => {
    const now = new Date();
    const monday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - ((now.getDay() + 6) % 7),
    );
    const map = {};
    DAYS.forEach((d, i) => {
      map[d.key] = new Date(
        monday.getFullYear(),
        monday.getMonth(),
        monday.getDate() + i,
      );
    });
    return map;
  })();

  const normalize = (s) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim();

  function hasToken(text, token) {
    return new RegExp('(^|[^0-9a-zäöüß])' + token + '($|[^0-9a-zäöüß])').test(text);
  }

  // "Monday, August 10, 2026" -> 'mon'. Both the weekday name and the day of
  // month must match, so a table showing more than one week stays unambiguous.
  function groupRowDay(text) {
    const t = normalize(text);
    const hit = DAYS.find(
      (d) =>
        d.names.some((n) => hasToken(t, n)) &&
        hasToken(t, String(weekDates[d.key].getDate())),
    );
    return hit ? hit.key : null;
  }

  const dayLabel = (key) => {
    const d = DAYS.find((x) => x.key === key);
    const date = weekDates[key];
    return d.label + ' ' + pad2(date.getDate()) + '.' + pad2(date.getMonth() + 1) + '.';
  };

  // ---------------------------------------------------------------- table
  function findGrid() {
    return (
      Array.from(document.querySelectorAll('table.sapMListTbl')).find((g) =>
        g.querySelector('.sapMGHLITitle'),
      ) || null
    );
  }

  // { dayKey -> [entry rows] }
  function dayRows(grid) {
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

  // Cells carry the id of their column header, which is how a column is named.
  function columnLabel(td) {
    const id = td.getAttribute('data-sap-ui-column');
    const th = id && document.getElementById(id);
    return th ? normalize(th.textContent) : '';
  }

  function rowFields(row) {
    const byColumn = (needle) => {
      const cell = Array.from(row.querySelectorAll('td[data-sap-ui-column]')).find(
        (td) => columnLabel(td).indexOf(needle) !== -1,
      );
      const input = cell && cell.querySelector('input');
      return input && input.type !== 'checkbox' ? input : null;
    };
    const byPlaceholder = (text) =>
      row.querySelector('input[placeholder="' + text + '"]') || null;
    return {
      assignment: row.querySelector('input[role="combobox"]') || byColumn('assignment'),
      hours: row.querySelector('input[role="spinbutton"]') || byColumn('entered'),
      attendance: byColumn('attendance'),
      start: byColumn('start time') || byPlaceholder('Start Time'),
      end: byColumn('end time') || byPlaceholder('End Time'),
    };
  }

  const valueOf = (el) => (el && el.value ? el.value.trim() : '');

  function toNum(value) {
    const n = parseFloat(
      String(value || '')
        .replace(/\s/g, '')
        .replace(',', '.'),
    );
    return isNaN(n) ? NaN : n;
  }

  // ----------------------------------------------------------- UI5 access
  function ui5Control(el) {
    const ns = window.sap;
    if (!ns || !ns.ui) return null;
    for (let node = el; node && node.nodeType === 1; node = node.parentElement) {
      if (!node.id) continue;
      try {
        const core = ns.ui.getCore && ns.ui.getCore();
        const found =
          (core && core.byId && core.byId(node.id)) ||
          (ns.ui.core &&
            ns.ui.core.Element &&
            ns.ui.core.Element.registry &&
            ns.ui.core.Element.registry.get(node.id));
        if (found) return found;
      } catch (e) {
        /* not a control id, or UI5 not ready */
      }
    }
    return null;
  }

  // Typing is the most faithful simulation: UI5 reads the DOM on change and
  // runs its own parsing, validation and model update.
  function typeInto(el, value) {
    const win = el.ownerDocument.defaultView;
    const setter = Object.getOwnPropertyDescriptor(
      win.HTMLInputElement.prototype,
      'value',
    ).set;
    el.focus();
    setter.call(el, value);
    el.dispatchEvent(new win.Event('input', { bubbles: true }));
    el.dispatchEvent(new win.Event('change', { bubbles: true }));
    el.blur();
  }

  const sameValue = (a, b) => {
    const na = toNum(a);
    const nb = toNum(b);
    if (!isNaN(na) && !isNaN(nb)) return na === nb;
    return normalize(a) === normalize(b);
  };

  // Types, then falls back to the control API if the field did not take it.
  function writeField(el, value) {
    typeInto(el, value);
    if (sameValue(valueOf(el), value)) return true;
    const ctrl = ui5Control(el);
    if (ctrl && typeof ctrl.setValue === 'function') {
      try {
        ctrl.setValue(value);
      } catch (e) {
        /* wrong value type for this control */
      }
    }
    return sameValue(valueOf(el), value);
  }

  const itemText = (i) => (i && i.getText && i.getText()) || '';
  const itemKey = (i) => (i && i.getKey && i.getKey()) || '';
  const delay = (ms) => new Promise((r) => setTimeout(r, ms));

  function comboItems(ctrl) {
    let items = [];
    try {
      items = ctrl.getItems() || [];
    } catch (e) {
      items = [];
    }
    return items.filter((i) => itemText(i).trim() || itemKey(i).trim());
  }

  // An Assignment is a ComboBox storing a key, so the entry must be selected
  // rather than typed. Default: the first entry. Returns its text, or ''.
  async function selectAssignment(el, wanted) {
    const ctrl = ui5Control(el);
    if (ctrl && typeof ctrl.setSelectedItem === 'function') {
      let items = comboItems(ctrl);
      if (!items.length && typeof ctrl.open === 'function') {
        try {
          ctrl.open();
          await delay(350);
          items = comboItems(ctrl);
          if (ctrl.close) ctrl.close();
        } catch (e) {
          /* opening is best-effort */
        }
      }
      const want = normalize(wanted);
      const item = want
        ? items.find(
            (i) => normalize(itemText(i)) === want || normalize(itemKey(i)) === want,
          )
        : items[0];
      if (item) {
        ctrl.setSelectedItem(item);
        if (ctrl.fireChange) ctrl.fireChange({ value: itemText(item) });
        return itemText(item) || itemKey(item);
      }
    }
    if (wanted) {
      writeField(el, wanted);
      return wanted;
    }
    return '';
  }

  // ----------------------------------------------------------------- fill
  async function fill() {
    const grid = findGrid();
    if (!grid) {
      setStatus(
        'No Time Entry table on this page.\nOpen the timesheet first; if it sits' +
          ' in a frame, use the panel that appears inside that frame.',
      );
      return;
    }

    const rows = dayRows(grid);
    const found = Object.keys(rows).length;
    if (!found) {
      setStatus(
        'Found the table, but no day of THIS week in it. Switch to the current week.',
      );
      return;
    }

    // Attendance Type has no dropdown to default from, so a booked day supplies
    // it — as it does for the Assignment when the dropdown can't be reached.
    let attendance = '';
    let bookedAssignment = '';
    Object.keys(rows).forEach((k) =>
      rows[k].forEach((r) => {
        const f = rowFields(r);
        if (!attendance) attendance = valueOf(f.attendance);
        if (!bookedAssignment) bookedAssignment = valueOf(f.assignment);
      }),
    );

    let assignment = assignmentBoxValue(); // empty = first dropdown entry
    const lines = [];
    const filled = [];

    for (let i = 0; i < FILL_DAYS.length; i++) {
      const day = FILL_DAYS[i];
      const row = rows[day] && rows[day][0];
      if (!row) {
        lines.push('✗ ' + dayLabel(day) + ' — no row');
        continue;
      }
      const f = rowFields(row);
      if (!f.hours) {
        lines.push('✗ ' + dayLabel(day) + ' — no hours field');
        continue;
      }
      const booked = toNum(valueOf(f.hours));
      if (booked > 0) {
        lines.push(
          '• ' + dayLabel(day) + ' already ' + valueOf(f.hours) + ' — untouched',
        );
        continue;
      }

      const done = [];
      const failed = [];

      if (f.assignment && !valueOf(f.assignment)) {
        let picked = await selectAssignment(f.assignment, assignment);
        // No reachable dropdown: fall back to the code a booked day uses.
        if (!picked && bookedAssignment && writeField(f.assignment, bookedAssignment)) {
          picked = bookedAssignment;
        }
        if (picked) {
          assignment = picked; // keep the whole week on one assignment
          done.push(picked + (valueOf(f.assignment) === picked ? '' : ' ?'));
        } else {
          failed.push('assignment');
        }
      }
      if (attendance && f.attendance && !valueOf(f.attendance)) {
        if (writeField(f.attendance, attendance)) done.push('type ' + attendance);
        else failed.push('type');
      }
      if (f.start && !valueOf(f.start)) {
        if (writeField(f.start, START_TIME)) done.push(START_TIME);
        else failed.push('start');
      }
      if (f.end && !valueOf(f.end)) {
        if (writeField(f.end, END_TIME)) done.push(END_TIME);
        else failed.push('end');
      }
      if (writeField(f.hours, HOURS)) done.push(HOURS + ' h');
      else failed.push('hours');

      lines.push(
        (failed.length ? '✗ ' : '✓ ') +
          dayLabel(day) +
          ': ' +
          done.join(', ') +
          (failed.length ? ' — REJECTED: ' + failed.join(', ') : ''),
      );
      filled.push({ day: day, hours: f.hours });
    }

    lines.push('Nothing is saved yet — review, then press Save in SAP.');
    setStatus(lines.join('\n'));

    // The app may re-render from its model a moment later and drop what was
    // written; saying so beats letting it look like it worked.
    if (filled.length) {
      await delay(1200);
      const lost = filled.filter((x) => !(toNum(valueOf(x.hours)) > 0)).map((x) => x.day);
      if (lost.length) {
        setStatus(
          lines.join('\n') +
            '\n⚠ ' +
            lost.map(dayLabel).join(', ') +
            ' went back to empty — SAP rejected the value.',
        );
      }
    }
  }

  // ---------------------------------------------------------------- panel
  let statusEl = null;
  let assignEl = null;

  const assignmentBoxValue = () =>
    assignEl ? assignEl.value.trim() : (localStorage.getItem(ASSIGN_KEY) || '').trim();

  function setStatus(text) {
    if (statusEl) statusEl.textContent = text;
  }

  function mountPanel() {
    if (document.getElementById(PANEL_ID)) return;

    const panel = document.createElement('div');
    panel.id = PANEL_ID;
    panel.style.cssText =
      'position:fixed;right:16px;bottom:16px;z-index:2147483647;background:#fff;' +
      'color:#111;border:1px solid #888;border-radius:8px;padding:10px 12px;' +
      'box-shadow:0 2px 12px rgba(0,0,0,.25);font:12px/1.5 sans-serif;width:290px;';

    const title = document.createElement('div');
    title.textContent = 'SAP timesheet filler';
    title.style.cssText = 'font-weight:bold;margin-bottom:6px;';
    const close = document.createElement('span');
    close.textContent = '×';
    close.style.cssText = 'float:right;cursor:pointer;padding:0 2px;';
    close.addEventListener('click', () => panel.remove());
    title.appendChild(close);

    statusEl = document.createElement('div');
    statusEl.style.cssText = 'white-space:pre-line;margin:6px 0;color:#333;';
    statusEl.textContent =
      HOURS + 'h on Mon–Thu of this week, ' + START_TIME + '–' + END_TIME + '.';

    const label = document.createElement('label');
    label.style.cssText = 'display:block;margin:6px 0;';
    label.appendChild(document.createTextNode('Assignment'));
    assignEl = document.createElement('input');
    assignEl.type = 'text';
    assignEl.value = localStorage.getItem(ASSIGN_KEY) || '';
    assignEl.placeholder = 'empty = first dropdown entry';
    assignEl.style.cssText =
      'width:100%;box-sizing:border-box;margin-top:2px;padding:3px 5px;' +
      'border:1px solid #888;border-radius:4px;font:12px/1.4 monospace;';
    assignEl.addEventListener('input', () =>
      localStorage.setItem(ASSIGN_KEY, assignEl.value.trim()),
    );
    label.appendChild(assignEl);

    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Fill ' + HOURS + 'h Mon–Thu';
    button.style.cssText =
      'padding:5px 12px;border:1px solid #888;border-radius:4px;background:#f5f5f5;' +
      'color:#111;cursor:pointer;font:12px/1.4 sans-serif;';
    button.addEventListener('click', () => {
      setStatus('Filling…');
      fill().catch((e) => setStatus('Failed: ' + (e && e.message)));
    });

    panel.appendChild(title);
    panel.appendChild(statusEl);
    panel.appendChild(label);
    panel.appendChild(button);
    document.body.appendChild(panel);
  }

  // ---------------------------------------------------------------- mount
  // The app renders late, and in a portal it lives in a frame — so the panel
  // goes up where the table is, and the top frame keeps one as a fallback.
  if (findGrid() || window.self === window.top) {
    mountPanel();
  } else {
    let tries = 0;
    const iv = setInterval(() => {
      if (findGrid()) {
        mountPanel();
        clearInterval(iv);
      } else if (++tries > 60) {
        clearInterval(iv);
      }
    }, 2000);
  }
})();
