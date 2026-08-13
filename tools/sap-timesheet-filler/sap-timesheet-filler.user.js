// ==UserScript==
// @name         SAP Timesheet Filler
// @namespace    https://github.com/super-productivity/super-productivity
// @version      4.0.0
// @description  Fills a day-per-row timesheet: reads the table's own columns, you say what each one should contain, it fills the days you pick in the week on screen. It only fills fields; it NEVER saves or submits.
// @match        https://YOUR-SAP-HOST.example.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

/*
 * SETUP: replace the @match line above with your real SAP host, or use the
 * bookmarklet build (node build-bookmarklet.js). See README.md.
 *
 * Nothing about the timesheet is hard-coded: the script looks for a table
 * whose rows are grouped by weekday ("Monday, August 17, 2026"), reads that
 * table's own column headers, and offers one box per fillable column. What you
 * type there is what it fills, for the days you tick, in the week on screen.
 *
 * Value syntax per column:
 *   <empty>  leave the column alone
 *   *        pick the first entry of that column's dropdown
 *   anything else — typed in, or selected if the column is a dropdown
 */

(function () {
  'use strict';

  const PANEL_ID = 'sap-timesheet-filler-panel';
  const STORE_KEY = 'sapTimesheetFiller:' + location.host;
  const FIRST_ENTRY = '*';

  const DAYS = [
    { key: 'mon', label: 'Mon', names: ['monday', 'montag'] },
    { key: 'tue', label: 'Tue', names: ['tuesday', 'dienstag'] },
    { key: 'wed', label: 'Wed', names: ['wednesday', 'mittwoch'] },
    { key: 'thu', label: 'Thu', names: ['thursday', 'donnerstag'] },
    { key: 'fri', label: 'Fri', names: ['friday', 'freitag'] },
    { key: 'sat', label: 'Sat', names: ['saturday', 'samstag'] },
    { key: 'sun', label: 'Sun', names: ['sunday', 'sonntag'] },
  ];

  // Suggestions by column name, applied only the first time a column is seen.
  // They are ordinary settings afterwards — edit or clear them freely.
  // Whole words only — an unanchored /end/ also matches "att-end-ance".
  const SUGGESTED = [
    { match: /\b(assignment|wbs|psp)\b/, value: FIRST_ENTRY },
    { match: /\b(entered|hours|stunden)\b/, value: '8' },
    { match: /\b(attendance|anwesenheit|abwesenheit)\b/, value: '0800' },
    { match: /\bstart\b/, value: '09:00' },
    { match: /\b(end|ende)\b/, value: '17:00' },
  ];

  const normalize = (s) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim();

  function loadSettings() {
    let stored = null;
    try {
      stored = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
    } catch (e) {
      stored = null;
    }
    const s = Object.assign({ days: ['mon', 'tue', 'wed', 'thu'], values: {} }, stored);
    if (!Array.isArray(s.days)) s.days = [];
    if (!s.values || typeof s.values !== 'object') s.values = {};
    return s;
  }

  let settings = loadSettings();
  const saveSettings = () => localStorage.setItem(STORE_KEY, JSON.stringify(settings));

  // ------------------------------------------------------- finding things
  const isFillable = (el) =>
    el &&
    el.tagName === 'INPUT' &&
    el.type !== 'checkbox' &&
    el.type !== 'radio' &&
    el.type !== 'hidden' &&
    !el.disabled &&
    !el.readOnly;

  // The page's timesheet is the table holding the most fillable inputs.
  function findTable() {
    let best = null;
    Array.from(document.querySelectorAll('table,[role=grid]')).forEach((t) => {
      const n = Array.from(t.querySelectorAll('input')).filter(isFillable).length;
      if (n && (!best || n > best.n)) best = { table: t, n: n };
    });
    return best && best.table;
  }

  function weekdayOf(text) {
    const t = normalize(text);
    const hit = DAYS.find((d) =>
      d.names.some((n) => new RegExp('(^|[^a-zäöüß])' + n + '($|[^a-zäöüß])').test(t)),
    );
    return hit ? hit.key : null;
  }

  // Rows grouped by the weekday heading above them: { dayKey: {title, rows} }.
  // A heading is a row that names a weekday and holds no inputs of its own.
  function dayGroups(table) {
    const out = {};
    let day = null;
    Array.from(table.querySelectorAll('tr,[role=row]')).forEach((row) => {
      const inputs = Array.from(row.querySelectorAll('input')).filter(isFillable);
      const heading = !inputs.length && weekdayOf(row.textContent);
      if (heading) {
        day = out[heading] ? null : heading;
        if (day) out[day] = { title: normalize(row.textContent), rows: [] };
      } else if (day && inputs.length) {
        out[day].rows.push(row);
      }
    });
    return out;
  }

  // A cell's column identity: the header element it points at, else its index.
  function cellKey(cell, index) {
    return cell.getAttribute('data-sap-ui-column') || 'col' + index;
  }

  const tidy = (s) => (s || '').replace(/\s+/g, ' ').trim();

  function columnName(key, index, table) {
    const byId = document.getElementById(key);
    if (byId && tidy(byId.textContent)) return tidy(byId.textContent);
    const headerRow = table.querySelector('thead tr, tr');
    const th = headerRow && headerRow.children[index];
    return (th && tidy(th.textContent)) || 'column ' + index;
  }

  const cellsOf = (row) =>
    Array.from(row.children).filter(
      (c) => c.tagName === 'TD' || c.getAttribute('role') === 'gridcell',
    );

  // { columnKey: input } for one row.
  function rowInputs(row) {
    const out = {};
    cellsOf(row).forEach((cell, i) => {
      const input = Array.from(cell.querySelectorAll('input')).filter(isFillable)[0];
      if (input) out[cellKey(cell, i)] = input;
    });
    return out;
  }

  // Every column that has a fillable input in some day row, with its name.
  function columns(table, groups) {
    const seen = {};
    const order = [];
    Object.keys(groups).forEach((day) =>
      groups[day].rows.forEach((row) =>
        cellsOf(row).forEach((cell, i) => {
          const input = Array.from(cell.querySelectorAll('input')).filter(isFillable)[0];
          if (!input) return;
          const key = cellKey(cell, i);
          if (seen[key]) return;
          seen[key] = true;
          order.push({
            key: key,
            name: columnName(key, i, table),
            isList: !!input.getAttribute('aria-haspopup') || !!ui5List(input),
          });
        }),
      ),
    );
    return order;
  }

  // ---------------------------------------------------------- UI5 bridging
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

  function ui5List(el) {
    const ctrl = ui5Control(el);
    return ctrl && typeof ctrl.setSelectedItem === 'function' ? ctrl : null;
  }

  const valueOf = (el) => (el && el.value ? el.value.trim() : '');
  const delay = (ms) => new Promise((r) => setTimeout(r, ms));

  function toNum(v) {
    const n = parseFloat(
      String(v || '')
        .replace(/\s/g, '')
        .replace(',', '.'),
    );
    return isNaN(n) ? NaN : n;
  }

  // An empty field, or one showing a numeric zero: SAP renders unbooked hours
  // as "0,00", which means nothing is entered there yet.
  const isBlank = (el) => {
    const v = valueOf(el);
    return !v || toNum(v) === 0;
  };

  const sameValue = (a, b) => {
    const na = toNum(a);
    const nb = toNum(b);
    if (!isNaN(na) && !isNaN(nb)) return na === nb;
    return normalize(a) === normalize(b);
  };

  // Typing is the most faithful simulation: the framework reads the DOM on
  // change and runs its own parsing, validation and model update.
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

  function listItems(ctrl) {
    let items = [];
    try {
      items = ctrl.getItems() || [];
    } catch (e) {
      items = [];
    }
    return items.filter((i) => itemText(i).trim() || itemKey(i).trim());
  }

  // A dropdown stores a key, not the typed text, so the entry has to be
  // selected. Returns the chosen text, or '' if nothing could be selected.
  async function selectFromList(el, wanted) {
    const ctrl = ui5List(el);
    if (!ctrl) return '';
    let items = listItems(ctrl);
    if (!items.length && typeof ctrl.open === 'function') {
      try {
        ctrl.open();
        await delay(350);
        items = listItems(ctrl);
        if (ctrl.close) ctrl.close();
      } catch (e) {
        /* opening is best-effort */
      }
    }
    const want = normalize(wanted);
    const item =
      want && want !== FIRST_ENTRY
        ? items.find(
            (i) => normalize(itemText(i)) === want || normalize(itemKey(i)) === want,
          )
        : items[0];
    if (!item) return '';
    ctrl.setSelectedItem(item);
    if (ctrl.fireChange) ctrl.fireChange({ value: itemText(item) });
    return itemText(item) || itemKey(item);
  }

  // ----------------------------------------------------------------- fill
  async function fill() {
    const table = findTable();
    if (!table) {
      setStatus('No table with fillable fields on this page.');
      return;
    }
    const groups = dayGroups(table);
    const days = settings.days.filter((d) => groups[d]);
    if (!days.length) {
      setStatus('No rows for the ticked days in the week on screen.');
      return;
    }
    const configured = Object.keys(settings.values).filter((k) =>
      String(settings.values[k]).trim(),
    );
    if (!configured.length) {
      setStatus('Nothing to fill — put a value next to at least one column.');
      return;
    }

    // Once a dropdown resolves, the rest of the week reuses that exact entry.
    const resolved = {};

    // What each column already contains elsewhere in the table — the fallback
    // for "*" when the column turns out to have no reachable dropdown.
    const existing = {};
    Object.keys(groups).forEach((k) =>
      groups[k].rows.forEach((row) => {
        const ins = rowInputs(row);
        Object.keys(ins).forEach((col) => {
          if (!existing[col] && !isBlank(ins[col])) existing[col] = valueOf(ins[col]);
        });
      }),
    );

    const lines = [];
    const done = [];

    for (let d = 0; d < days.length; d++) {
      const day = days[d];
      const label = dayLabel(day, groups[day].title);
      const row = groups[day].rows[0];
      const inputs = rowInputs(row);

      const inUse = configured.filter((k) => inputs[k] && !isBlank(inputs[k]));
      if (inUse.length) {
        lines.push(
          '• ' + label + ' already has ' + valueOf(inputs[inUse[0]]) + ' — untouched',
        );
        continue;
      }

      const filled = [];
      const failed = [];
      for (let c = 0; c < configured.length; c++) {
        const key = configured[c];
        const el = inputs[key];
        if (!el) continue;
        const wanted = resolved[key] || String(settings.values[key]).trim();
        let ok = '';
        if (wanted === FIRST_ENTRY || ui5List(el)) {
          ok = await selectFromList(el, wanted);
        }
        // No reachable dropdown: reuse whatever this column already holds.
        const literal = wanted === FIRST_ENTRY ? existing[key] : wanted;
        if (!ok && literal) {
          ok = writeField(el, literal) ? literal : '';
        }
        if (ok) resolved[key] = ok;
        if (ok) filled.push(ok);
        else failed.push(columnLabelFor(key));
      }

      lines.push(
        (failed.length ? '✗ ' : '✓ ') +
          label +
          ': ' +
          filled.join(', ') +
          (failed.length ? ' — REJECTED: ' + failed.join(', ') : ''),
      );
      if (filled.length) done.push({ label: label, inputs: inputs, keys: configured });
    }

    lines.push('Nothing is saved yet — review, then press Save.');
    setStatus(lines.join('\n'));

    // The app may re-render from its model a moment later and drop what was
    // written; saying so beats letting it look like it worked.
    if (done.length) {
      await delay(1200);
      const lost = done
        .filter((x) => !x.keys.some((k) => x.inputs[k] && !isBlank(x.inputs[k])))
        .map((x) => x.label);
      if (lost.length) {
        setStatus(
          lines.join('\n') + '\n⚠ ' + lost.join(', ') + ' went back to empty — rejected.',
        );
      }
    }
  }

  function dayLabel(key, title) {
    const short = DAYS.find((x) => x.key === key).label;
    const dom = (String(title || '').match(/\b(3[01]|[12]\d|0?[1-9])\b/) || [])[1];
    return dom ? short + ' ' + dom + '.' : short;
  }

  let columnLabels = {};
  const columnLabelFor = (key) => columnLabels[key] || key;

  // ---------------------------------------------------------------- panel
  let statusEl = null;
  let columnsEl = null;

  function setStatus(text) {
    if (statusEl) statusEl.textContent = text;
  }

  function renderColumns() {
    columnsEl.textContent = '';
    columnLabels = {};

    const table = findTable();
    const groups = table ? dayGroups(table) : {};
    const found = table ? columns(table, groups) : [];
    if (!found.length) {
      const note = document.createElement('div');
      note.textContent = table
        ? 'No day rows found — open the timesheet, then Rescan.'
        : 'No timesheet table here — open it, then Rescan.';
      note.style.cssText = 'color:#a00;font-size:11px;';
      columnsEl.appendChild(note);
      return;
    }

    found.forEach((col) => {
      columnLabels[col.key] = col.name;
      if (!(col.key in settings.values)) {
        const hit = SUGGESTED.find((s) => s.match.test(normalize(col.name)));
        settings.values[col.key] = hit ? hit.value : '';
      }
      const row = document.createElement('label');
      row.style.cssText =
        'display:flex;align-items:center;gap:6px;margin:3px 0;font-size:11px;';
      const name = document.createElement('span');
      name.textContent = col.name;
      name.title = col.name;
      name.style.cssText =
        'flex:1;color:#444;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
      const input = document.createElement('input');
      input.type = 'text';
      input.value = settings.values[col.key];
      input.placeholder = col.isList ? FIRST_ENTRY + ' = first entry' : 'leave empty';
      input.style.cssText =
        'width:104px;box-sizing:border-box;padding:2px 4px;border:1px solid #888;' +
        'border-radius:4px;font:11px/1.4 monospace;';
      input.addEventListener('input', () => {
        settings.values[col.key] = input.value.trim();
        saveSettings();
      });
      row.appendChild(name);
      row.appendChild(input);
      columnsEl.appendChild(row);
    });
    saveSettings();
  }

  function dayPicker() {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;gap:4px;flex-wrap:wrap;margin:6px 0;';
    DAYS.forEach((d) => {
      const item = document.createElement('label');
      item.style.cssText = 'display:flex;align-items:center;gap:2px;font-size:11px;';
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
      wrap.appendChild(item);
    });
    return wrap;
  }

  function button(text, onClick, primary) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = text;
    b.style.cssText =
      'padding:5px 12px;border:1px solid #888;border-radius:4px;cursor:pointer;' +
      'font:12px/1.4 sans-serif;color:#111;background:' +
      (primary ? '#e8e8e8' : '#f7f7f7') +
      ';';
    b.addEventListener('click', onClick);
    return b;
  }

  function mountPanel() {
    if (document.getElementById(PANEL_ID)) return;

    const panel = document.createElement('div');
    panel.id = PANEL_ID;
    panel.style.cssText =
      'position:fixed;right:16px;bottom:16px;z-index:2147483647;background:#fff;' +
      'color:#111;border:1px solid #888;border-radius:8px;padding:10px 12px;' +
      'box-shadow:0 2px 12px rgba(0,0,0,.25);font:12px/1.5 sans-serif;width:310px;' +
      'max-height:80vh;overflow:auto;';

    const title = document.createElement('div');
    title.textContent = 'Timesheet filler';
    title.style.cssText = 'font-weight:bold;';
    const close = document.createElement('span');
    close.textContent = '×';
    close.style.cssText = 'float:right;cursor:pointer;padding:0 2px;';
    close.addEventListener('click', () => panel.remove());
    title.appendChild(close);

    const hint = document.createElement('div');
    hint.textContent = 'Fills the week on screen. Empty column = left alone.';
    hint.style.cssText = 'font-size:11px;color:#555;margin-bottom:4px;';

    columnsEl = document.createElement('div');
    statusEl = document.createElement('div');
    statusEl.style.cssText = 'white-space:pre-line;margin:8px 0;color:#333;';

    const buttons = document.createElement('div');
    buttons.style.cssText = 'display:flex;gap:6px;';
    buttons.appendChild(
      button(
        'Fill',
        () => {
          setStatus('Filling…');
          fill().catch((e) => setStatus('Failed: ' + (e && e.message)));
        },
        true,
      ),
    );
    buttons.appendChild(
      button('Rescan', () => {
        renderColumns();
        setStatus('Columns re-read.');
      }),
    );

    panel.appendChild(title);
    panel.appendChild(hint);
    panel.appendChild(dayPicker());
    panel.appendChild(columnsEl);
    panel.appendChild(statusEl);
    panel.appendChild(buttons);
    document.body.appendChild(panel);
    renderColumns();
  }

  // ---------------------------------------------------------------- mount
  // The app renders late, and in a portal it lives in a frame — so the panel
  // goes up where the table is, and the top frame keeps one as a fallback.
  if (findTable() || window.self === window.top) {
    mountPanel();
  } else {
    let tries = 0;
    const iv = setInterval(() => {
      if (findTable()) {
        mountPanel();
        clearInterval(iv);
      } else if (++tries > 60) {
        clearInterval(iv);
      }
    }, 2000);
  }
})();
