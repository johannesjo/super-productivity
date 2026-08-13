// ==UserScript==
// @name         SAP Timesheet Filler
// @namespace    https://github.com/super-productivity/super-productivity
// @version      3.0.0
// @description  Fills the SAP Fiori "Time Entry" week on screen — hours, Assignment and start/end time per day. Everything is set in its panel. It only fills fields; it NEVER saves or submits.
// @match        https://YOUR-SAP-HOST.example.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

/*
 * SETUP: replace the @match line above with your real SAP host, or use the
 * bookmarklet build (node build-bookmarklet.js). See README.md.
 *
 * Scope: the Fiori "Time Entry" app — the timesheet listing one group row per
 * calendar day ("Monday, August 17, 2026") with Assignment, Entered, Start
 * Time and End Time as columns. It fills WHATEVER WEEK IS ON SCREEN, so it
 * works on next week as well as this one. On any other page it says so and
 * does nothing, rather than guessing at fields.
 */

(function () {
  'use strict';

  const PANEL_ID = 'sap-timesheet-filler-panel';
  const STORE_KEY = 'sapTimesheetFiller:' + location.host;

  const DAYS = [
    { key: 'mon', label: 'Mon', names: ['monday', 'montag'] },
    { key: 'tue', label: 'Tue', names: ['tuesday', 'dienstag'] },
    { key: 'wed', label: 'Wed', names: ['wednesday', 'mittwoch'] },
    { key: 'thu', label: 'Thu', names: ['thursday', 'donnerstag'] },
    { key: 'fri', label: 'Fri', names: ['friday', 'freitag'] },
    { key: 'sat', label: 'Sat', names: ['saturday', 'samstag'] },
    { key: 'sun', label: 'Sun', names: ['sunday', 'sonntag'] },
  ];

  // Every one of these is editable in the panel and stored per site.
  // 09:00–17:00 holds 8 booked hours with no break, which is what makes SAP
  // show "Keep the 30 minutes break!" — a warning to acknowledge, not a
  // rejection. An end of 17:30 (8h work + 30min break) avoids it.
  const DEFAULTS = {
    hours: '8',
    days: ['mon', 'tue', 'wed', 'thu'],
    start: '09:00',
    end: '17:00',
    attendance: '0800', // only used when no booked day supplies one
    assignment: '', // empty = first entry of the row's dropdown
  };

  function loadSettings() {
    let stored = null;
    try {
      stored = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
    } catch (e) {
      stored = null;
    }
    const s = Object.assign({}, DEFAULTS, stored || {});
    if (!Array.isArray(s.days) || !s.days.length) s.days = DEFAULTS.days.slice();
    return s;
  }

  let settings = loadSettings();

  const saveSettings = () => localStorage.setItem(STORE_KEY, JSON.stringify(settings));

  const normalize = (s) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim();

  // "Monday, August 17, 2026" -> 'mon'. No comparison against today's date:
  // whatever week the table shows is the week that gets filled.
  function groupRowDay(text) {
    const t = normalize(text);
    const hit = DAYS.find((d) =>
      d.names.some((n) => new RegExp('(^|[^a-zäöüß])' + n + '($|[^a-zäöüß])').test(t)),
    );
    return hit ? hit.key : null;
  }

  // "Monday, August 17, 2026" -> "Mon 17."
  function dayLabel(key, title) {
    const short = DAYS.find((x) => x.key === key).label;
    const dom = (String(title || '').match(/\b(3[01]|[12]\d|0?[1-9])\b/) || [])[1];
    return dom ? short + ' ' + dom + '.' : short;
  }

  // ---------------------------------------------------------------- table
  function findGrid() {
    return (
      Array.from(document.querySelectorAll('table.sapMListTbl')).find((g) =>
        g.querySelector('.sapMGHLITitle'),
      ) || null
    );
  }

  // { dayKey -> { title, rows } }, first group per weekday.
  function dayGroups(grid) {
    const out = {};
    let day = null;
    Array.from(grid.querySelectorAll('tbody > tr')).forEach((tr) => {
      const title = tr.querySelector('.sapMGHLITitle');
      if (title) {
        const key = groupRowDay(title.textContent);
        day = key && !out[key] ? key : null;
        if (day) out[day] = { title: title.textContent.trim(), rows: [] };
      } else if (day && tr.classList.contains('sapMListTblRow')) {
        out[day].rows.push(tr);
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
          ' in a frame, use the panel inside that frame.',
      );
      return;
    }

    const groups = dayGroups(grid);
    const wanted = settings.days.filter((d) => groups[d]);
    if (!wanted.length) {
      setStatus('Table found, but none of the selected days are in it.');
      return;
    }

    // A booked day is the best source for the Attendance Type, and for the
    // Assignment when the dropdown cannot be reached.
    let attendance = '';
    let bookedAssignment = '';
    Object.keys(groups).forEach((k) =>
      groups[k].rows.forEach((r) => {
        const f = rowFields(r);
        if (!attendance) attendance = valueOf(f.attendance);
        if (!bookedAssignment) bookedAssignment = valueOf(f.assignment);
      }),
    );
    if (!attendance) attendance = settings.attendance;

    let assignment = settings.assignment;
    const lines = [];
    const filled = [];

    for (let i = 0; i < wanted.length; i++) {
      const day = wanted[i];
      const label = dayLabel(day, groups[day].title);
      const row = groups[day].rows[0];
      if (!row) {
        lines.push('✗ ' + label + ' — no row');
        continue;
      }
      const f = rowFields(row);
      if (!f.hours) {
        lines.push('✗ ' + label + ' — no hours field');
        continue;
      }
      const booked = toNum(valueOf(f.hours));
      if (booked > 0) {
        lines.push('• ' + label + ' already ' + valueOf(f.hours) + ' — untouched');
        continue;
      }

      const done = [];
      const failed = [];

      if (f.assignment && !valueOf(f.assignment)) {
        let picked = await selectAssignment(f.assignment, assignment);
        if (!picked && bookedAssignment && writeField(f.assignment, bookedAssignment)) {
          picked = bookedAssignment;
        }
        if (picked) {
          assignment = picked; // keep the whole week on one assignment
          done.push(picked);
        } else {
          failed.push('assignment');
        }
      }
      if (attendance && f.attendance && !valueOf(f.attendance)) {
        if (writeField(f.attendance, attendance)) done.push('type ' + attendance);
        else failed.push('type');
      }
      if (settings.start && f.start && !valueOf(f.start)) {
        if (writeField(f.start, settings.start)) done.push(settings.start);
        else failed.push('start');
      }
      if (settings.end && f.end && !valueOf(f.end)) {
        if (writeField(f.end, settings.end)) done.push(settings.end);
        else failed.push('end');
      }
      if (writeField(f.hours, settings.hours)) done.push(settings.hours + ' h');
      else failed.push('hours');

      lines.push(
        (failed.length ? '✗ ' : '✓ ') +
          label +
          ': ' +
          done.join(', ') +
          (failed.length ? ' — REJECTED: ' + failed.join(', ') : ''),
      );
      filled.push({ label: label, hours: f.hours });
    }

    lines.push('Nothing is saved yet — review, then press Save in SAP.');
    setStatus(lines.join('\n'));

    // The app may re-render from its model a moment later and drop what was
    // written; saying so beats letting it look like it worked.
    if (filled.length) {
      await delay(1200);
      const lost = filled
        .filter((x) => !(toNum(valueOf(x.hours)) > 0))
        .map((x) => x.label);
      if (lost.length) {
        setStatus(
          lines.join('\n') +
            '\n⚠ ' +
            lost.join(', ') +
            ' went back to empty — SAP rejected the value.',
        );
      }
    }
  }

  // ---------------------------------------------------------------- panel
  let statusEl = null;

  function setStatus(text) {
    if (statusEl) statusEl.textContent = text;
  }

  const INPUT_CSS =
    'box-sizing:border-box;padding:3px 5px;border:1px solid #888;' +
    'border-radius:4px;font:12px/1.4 monospace;';

  function field(labelText, key, width) {
    const wrap = document.createElement('label');
    wrap.style.cssText = 'display:inline-block;margin:4px 6px 0 0;';
    const span = document.createElement('div');
    span.textContent = labelText;
    span.style.cssText = 'font-size:11px;color:#555;';
    const input = document.createElement('input');
    input.type = 'text';
    input.value = settings[key];
    input.style.cssText = INPUT_CSS + 'width:' + width + ';';
    input.addEventListener('input', () => {
      settings[key] = input.value.trim();
      saveSettings();
    });
    wrap.appendChild(span);
    wrap.appendChild(input);
    return wrap;
  }

  function dayPicker() {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'margin:6px 0 2px;font-size:11px;color:#555;';
    const caption = document.createElement('div');
    caption.textContent = 'Days';
    wrap.appendChild(caption);
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:4px;flex-wrap:wrap;margin-top:2px;';
    DAYS.forEach((d) => {
      const item = document.createElement('label');
      item.style.cssText = 'display:flex;align-items:center;gap:2px;color:#111;';
      const box = document.createElement('input');
      box.type = 'checkbox';
      box.checked = settings.days.indexOf(d.key) !== -1;
      box.style.cssText = 'margin:0;';
      box.addEventListener('change', () => {
        settings.days = DAYS.filter((x) =>
          x.key === d.key ? box.checked : settings.days.indexOf(x.key) !== -1,
        ).map((x) => x.key);
        saveSettings();
      });
      item.appendChild(box);
      item.appendChild(document.createTextNode(d.label));
      row.appendChild(item);
    });
    wrap.appendChild(row);
    return wrap;
  }

  function mountPanel() {
    if (document.getElementById(PANEL_ID)) return;

    const panel = document.createElement('div');
    panel.id = PANEL_ID;
    panel.style.cssText =
      'position:fixed;right:16px;bottom:16px;z-index:2147483647;background:#fff;' +
      'color:#111;border:1px solid #888;border-radius:8px;padding:10px 12px;' +
      'box-shadow:0 2px 12px rgba(0,0,0,.25);font:12px/1.5 sans-serif;width:300px;';

    const title = document.createElement('div');
    title.textContent = 'SAP timesheet filler';
    title.style.cssText = 'font-weight:bold;margin-bottom:2px;';
    const close = document.createElement('span');
    close.textContent = '×';
    close.style.cssText = 'float:right;cursor:pointer;padding:0 2px;';
    close.addEventListener('click', () => panel.remove());
    title.appendChild(close);

    const hint = document.createElement('div');
    hint.textContent = 'Fills the week currently shown.';
    hint.style.cssText = 'font-size:11px;color:#555;';

    const assignment = field('Assignment (empty = 1st entry)', 'assignment', '100%');
    assignment.style.display = 'block';

    const row = document.createElement('div');
    row.appendChild(field('Hours', 'hours', '46px'));
    row.appendChild(field('Start', 'start', '58px'));
    row.appendChild(field('End', 'end', '58px'));
    row.appendChild(field('Type', 'attendance', '52px'));

    statusEl = document.createElement('div');
    statusEl.style.cssText = 'white-space:pre-line;margin:8px 0;color:#333;';

    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Fill';
    button.style.cssText =
      'padding:5px 14px;border:1px solid #888;border-radius:4px;background:#f5f5f5;' +
      'color:#111;cursor:pointer;font:12px/1.4 sans-serif;';
    button.addEventListener('click', () => {
      setStatus('Filling…');
      fill().catch((e) => setStatus('Failed: ' + (e && e.message)));
    });

    panel.appendChild(title);
    panel.appendChild(hint);
    panel.appendChild(assignment);
    panel.appendChild(row);
    panel.appendChild(dayPicker());
    panel.appendChild(statusEl);
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
