/*
 * Builds sap-timesheet-filler.bookmarklet.txt from the userscript.
 *
 * Usage: node build-bookmarklet.js
 * Re-run after changing HOURS / FILL_DAYS in the userscript.
 *
 * A bookmarklet only executes in the top frame, while Tampermonkey injects the
 * userscript into every matching frame. To keep iframe-embedded timesheets
 * working (common in SAP portals), the userscript's IIFE is re-parameterized
 * over (window, document, location, localStorage) and invoked once per
 * reachable same-origin frame. Cross-origin frames can't be reached from a
 * bookmarklet at all — that case needs the userscript.
 *
 * Minification uses `npx terser` (downloaded on first run, never added as a
 * project dependency); if that fails, the unminified body is used — it still
 * works, the bookmark is just longer.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const SRC = path.join(__dirname, 'sap-timesheet-filler.user.js');
const OUT = path.join(__dirname, 'sap-timesheet-filler.bookmarklet.txt');

const OPEN = '(function () {';
const CLOSE = '})();';

let src = fs.readFileSync(SRC, 'utf8');
const start = src.indexOf(OPEN);
const end = src.lastIndexOf(CLOSE);
if (start === -1 || end === -1 || end < start) {
  throw new Error('could not locate the userscript IIFE — was the file restructured?');
}

// '(function () { … })' with the globals turned into parameters, so the same
// body can run against any same-origin frame's document.
const bodyFn =
  '(function (window, document, location, localStorage) {' +
  src.slice(start + OPEN.length, end) +
  '})';

const code =
  '(function () {\n' +
  '  var run = ' +
  bodyFn +
  ';\n' +
  '  var wins = [];\n' +
  '  (function collect(w) {\n' +
  '    wins.push(w);\n' +
  '    for (var i = 0; i < w.frames.length; i++) {\n' +
  '      try {\n' +
  '        if (w.frames[i].document) collect(w.frames[i]);\n' +
  '      } catch (e) {} // cross-origin frame — a bookmarklet cannot reach it\n' +
  '    }\n' +
  '  })(window);\n' +
  '  wins.forEach(function (w) {\n' +
  '    try {\n' +
  '      run(w, w.document, w.location, w.localStorage);\n' +
  '    } catch (e) {}\n' +
  '  });\n' +
  '})();';

let minified = code;
try {
  minified = execFileSync('npx', ['-y', 'terser', '--compress', '--mangle'], {
    input: code,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'inherit'],
  }).trim();
} catch (e) {
  console.warn('terser unavailable — emitting unminified bookmarklet:', e.message);
}

const bookmarklet = 'javascript:' + encodeURIComponent(minified + ';void 0');
if (
  decodeURIComponent(bookmarklet.slice('javascript:'.length)) !==
  minified + ';void 0'
) {
  throw new Error('encoding round-trip failed');
}

fs.writeFileSync(OUT, bookmarklet + '\n');
console.log('wrote ' + path.basename(OUT) + ' (' + bookmarklet.length + ' chars)');
