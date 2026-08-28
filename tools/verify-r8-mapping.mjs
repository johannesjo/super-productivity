#!/usr/bin/env node
/**
 * Guards the two R8 keep rules whose failure is invisible at build time.
 *
 * A minified release that drops a @JavascriptInterface method or a WorkManager
 * worker builds and installs fine — the bridge call just goes nowhere and the
 * worker never runs. Both only surface on a device, and release builds ship to
 * the Play internal track straight off master, so this reads the mapping R8
 * already produces and fails the build instead.
 *
 * Expectations come from the Kotlin sources, not a hardcoded list, so adding a
 * bridge method or a worker keeps the check honest without touching this file.
 *
 * Usage: node tools/verify-r8-mapping.mjs <mapping.txt> [androidSrcRoot]
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const [mappingPath, srcRoot = 'android/app/src/main/java'] = process.argv.slice(2);
if (!mappingPath) {
  console.error('usage: node tools/verify-r8-mapping.mjs <mapping.txt> [androidSrcRoot]');
  process.exit(2);
}

const kotlinFiles = (dir) =>
  readdirSync(dir).flatMap((entry) => {
    const p = join(dir, entry);
    return statSync(p).isDirectory() ? kotlinFiles(p) : p.endsWith('.kt') ? [p] : [];
  });

const sources = kotlinFiles(srcRoot).map((path) => ({
  path,
  text: readFileSync(path, 'utf8'),
}));

/** `com.example` + `class Foo` -> `com.example.Foo`, for the mapping's left-hand side. */
const fqcn = (text, name) => `${/^package\s+([\w.]+)/m.exec(text)?.[1] ?? ''}.${name}`;

// --- expectations from source ------------------------------------------------

const bridge = sources.find((s) => s.path.endsWith('JavaScriptInterface.kt'));
if (!bridge) throw new Error('JavaScriptInterface.kt not found under ' + srcRoot);
const bridgeClass = fqcn(bridge.text, 'JavaScriptInterface');
const bridgeMethods = [
  ...bridge.text.matchAll(/@JavascriptInterface\s+(?:[^\n]*\n[ \t]*)*?fun\s+(\w+)/g),
].map((m) => m[1]);

const workers = sources.flatMap(({ text }) =>
  [
    ...text.matchAll(
      /class\s+(\w+)\s*\([^)]*\)\s*:\s*(?:CoroutineWorker|ListenableWorker|Worker)\b/gs,
    ),
  ].map((m) => fqcn(text, m[1])),
);

// --- what R8 actually emitted ------------------------------------------------

const mapping = readFileSync(mappingPath, 'utf8').split('\n');
const classLine = (name) => mapping.find((l) => l.startsWith(`${name} ->`));

const bodyOf = (name) => {
  const i = mapping.findIndex((l) => l.startsWith(`${name} ->`));
  if (i < 0) return null;
  const out = [];
  for (const line of mapping.slice(i + 1)) {
    if (!line || line.trimStart().startsWith('#')) continue;
    if (!/^\s/.test(line)) break;
    out.push(line);
  }
  return out;
};

const errors = [];

const bridgeBody = bodyOf(bridgeClass);
if (!bridgeBody) {
  errors.push(
    `${bridgeClass} is absent from the mapping — R8 removed the WebView bridge entirely.`,
  );
} else {
  const unrenamed = new Set(
    bridgeBody
      .map((l) =>
        /^\s+(?:\d+:\d+:)?[\w.$[\]<>]+ ([\w<>$]+)\([^)]*\)(?::\d+)*\s*->\s*(\S+)$/.exec(
          l,
        ),
      )
      .filter((m) => m && m[1] === m[2])
      .map((m) => m[1]),
  );
  for (const name of bridgeMethods) {
    if (!unrenamed.has(name)) {
      errors.push(
        `@JavascriptInterface ${name}() was renamed or stripped — the JS call would go nowhere.`,
      );
    }
  }
}

for (const worker of workers) {
  const line = classLine(worker);
  if (!line)
    errors.push(
      `${worker} was stripped — WorkManager instantiates it reflectively by name.`,
    );
  else if (!line.startsWith(`${worker} -> ${worker}:`))
    errors.push(`${worker} was renamed to ${line.split('-> ')[1]}.`);
}

// --- report ------------------------------------------------------------------

if (errors.length) {
  console.error('R8 mapping check FAILED:\n' + errors.map((e) => `  - ${e}`).join('\n'));
  console.error('\nFix the keep rules in android/app/proguard-rules.pro.');
  process.exit(1);
}

if (!bridgeMethods.length || !workers.length) {
  console.error(
    `R8 mapping check FAILED: parsed ${bridgeMethods.length} bridge methods and ${workers.length} workers ` +
      'from source. Zero means this check is silently passing — fix the source parsing.',
  );
  process.exit(1);
}

console.log(
  `R8 mapping OK: ${bridgeMethods.length} bridge methods un-renamed, ${workers.length} worker(s) kept.`,
);
