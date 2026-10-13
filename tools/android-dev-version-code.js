'use strict';

// Computes the versionCode for a per-push Android *dev* build that
// build-android.yml publishes to the Play `internal` track on non-tag master
// pushes (see its "dev versionCode" steps).
//
// Scheme: dev code = <last stable release's versionCode> + <commits since that
// tag, first-parent>. For 18.13.1 (getAndroidVersionInfo -> 1_813_019_000) dev
// builds land in 1_813_019_001..999 — above that release, below the next
// version's base (18.13.2 -> 1_813_020_000), strictly increasing within a
// cycle, and reset to a fresh band by each release. Because real releases use
// base+9000 and pre-releases base+N, staying under the next version's base
// guarantees a dev code can never collide with a real release/pre-release code.
//
// The base is derived from the last stable *tag*, NOT the working-tree
// build.gradle: a version-bump commit that reaches master before its tag is
// pushed must not make dev codes jump ahead of the release and then regress
// once the tag appears. Anchored to the tag, dev codes stay in the previous
// release's band until the new tag is visible, then step cleanly up. Pre-release
// (`-rc`) tags are ignored for the same reason and because they never reach Play.
//
// This never fails the build: any unexpected condition degrades to skip=true
// with a warning annotation, so dev-build distribution can't break the
// release-critical build-android.yml job it lives in. The pure band math is
// isolated in computeDevVersionCode() and unit-tested (irreversible Play codes
// warrant a test); the git/IO glue in main() is thin.

const fs = require('fs');
const { execFileSync } = require('child_process');
const { getAndroidVersionInfo } = require('./release-notes');

// Reserved slots between a release code (base+9000) and the next version's base
// (base+10000): base+9001 .. base+9999. Dev codes must stay under this ceiling.
const BAND_SIZE = 1000;

/**
 * Pure band math — no git, no I/O. Returns {skip:true, reason} or
 * {skip:false, code}. Throws only on nonsensical input (caught by main()).
 */
const computeDevVersionCode = ({ baseCode, commits }) => {
  if (!Number.isInteger(baseCode) || baseCode <= 0) {
    throw new Error(`invalid baseCode: ${baseCode}`);
  }
  if (!Number.isInteger(commits) || commits < 0) {
    throw new Error(`invalid commit count: ${commits}`);
  }
  if (commits === 0) {
    // HEAD is exactly the last stable release commit; the tag build handles Play.
    return { skip: true, reason: 'HEAD is the last stable release commit' };
  }
  if (commits >= BAND_SIZE) {
    return {
      skip: true,
      reason: `${commits} commits since the last release — dev versionCode band (${BAND_SIZE - 1} slots) exhausted; cut a release to reset it`,
    };
  }
  return { skip: false, code: baseCode + commits };
};

const lastStableTag = () =>
  execFileSync('git', ['tag', '--merged', 'HEAD', '--sort=-v:refname'], {
    encoding: 'utf8',
  })
    .split('\n')
    .map((t) => t.trim())
    .find((t) => /^v\d+\.\d+\.\d+$/.test(t));

const countCommitsSince = (tag) =>
  Number(
    execFileSync('git', ['rev-list', '--count', '--first-parent', `${tag}..HEAD`], {
      encoding: 'utf8',
    }).trim(),
  );

const setOutput = (obj) => {
  const line =
    Object.entries(obj)
      .map(([k, v]) => `${k}=${v}`)
      .join('\n') + '\n';
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, line);
  }
  process.stdout.write(line);
};

const main = () => {
  try {
    const tag = lastStableTag();
    if (!tag) {
      console.log('::warning::no stable v* tag reachable from HEAD; skipping dev build');
      return setOutput({ skip: true });
    }
    const { versionCode: baseCode } = getAndroidVersionInfo(tag.replace(/^v/, ''));
    const commits = countCommitsSince(tag);
    const result = computeDevVersionCode({ baseCode, commits });
    if (result.skip) {
      console.log(`::warning::${result.reason}`);
      return setOutput({ skip: true });
    }
    const sha = (process.env.GITHUB_SHA || '').slice(0, 8);
    console.log(`dev versionCode ${result.code} <- ${tag} + ${commits} commits (${sha})`);
    return setOutput({ skip: false, code: result.code, sha });
  } catch (err) {
    // Never break the release-critical build over a dev-versioning hiccup.
    console.log(`::warning::dev versionCode computation failed: ${err.message}`);
    return setOutput({ skip: true });
  }
};

if (require.main === module) {
  main();
}

module.exports = { computeDevVersionCode, BAND_SIZE };
