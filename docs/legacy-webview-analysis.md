# Supporting Older Android WebViews

## Current Guard

- The app currently blocks WebViews that report Chrome `<110` via a UA check in `src/index.html`. That avoids runtime crashes but is brittle because UA formats change and the guard hides the app even when the missing capability is just a polyfillable API.
- A capability probe (e.g. checking for `Promise`, `Intl`, module support) loaded before Angular boots would let borderline engines attempt to start while still presenting an upgrade banner when an essential feature is absent.

## Cost of a Legacy Build

- Angular CLI 20 scaffolds projects with `target: "ES2022"` and `module: "preserve"` at the workspace level, which means new builds assume modern syntax by default.[^1]
- Official CLI tooling removed differential loading entirely—there is no longer an option to generate ES5 bundles for older browsers because Angular no longer supports engines that require them.[^2]
- Chrome only gained native module support in version 61, so WebViews earlier than that cannot parse the `<script type="module">` output we ship today.[^3]
- Down-levelling would require a parallel toolchain (Babel/SWC transforms, legacy HTML entry point, SystemJS or similar) plus heavy polyfills for modern APIs (`Promise.allSettled`, `Intl`, Clipboard). Maintenance costs and bundle size would increase for all users.

## Platform Reality

- Android 5.0 (Chromium M37) was the first release to decouple the WebView layer so it could be updated through Google Play.[^4] Devices on older OS versions are permanently stuck with their factory WebView; no app-side change can modernize them.
- Even for Android 5–8 devices, the shipped WebView versions tend to lag security and feature updates, so we would be committing to ongoing QA on engines that the Android ecosystem no longer exercises.

## Practical Alternatives

1. **Frozen Legacy APK**: Host a known-good pre-upgrade build that still targets ES5, clearly label it as unsupported, and link it from the compatibility warning for data access.
2. **Native Guard Screen**: Move the compatibility warning into the Capacitor/Electron bootstrap so the user sees instructions (update WebView, sideload legacy build, export data) before Angular starts.
3. **Data Escape Hatch**: Promote export and sync options so users on dead-end devices can migrate their data to newer hardware rather than waiting for app-side fixes.

This path keeps the mainline app focused on the officially supported Baseline browsers while still offering reasonable options to users with stuck WebViews.

[^1]: Angular CLI workspace template sets `target: "ES2022"` and `module: "preserve"` by default, underscoring the modern baseline. Source: [`angular/angular-cli`, `packages/schematics/angular/workspace/files/tsconfig.json.template`](https://raw.githubusercontent.com/angular/angular-cli/main/packages/schematics/angular/workspace/files/tsconfig.json.template).

[^2]: Angular CLI changelog entry: “Differential loading support has been removed … there are now no browsers officially supported by Angular that require ES5 code.” Source: [`angular/angular-cli`, `CHANGELOG.md`](https://raw.githubusercontent.com/angular/angular-cli/main/CHANGELOG.md#L6926).

[^3]: MDN browser-compat data lists Chrome/Chrome Android 61 as the first releases supporting `<script type="module">`. Source: [`mdn/browser-compat-data`, `html/elements/script.json`](https://raw.githubusercontent.com/mdn/browser-compat-data/main/html/elements/script.json).

[^4]: Android 5.0 release notes introduced a Google Play–updatable WebView layer. Source: [Android Developers—Android 5.0 behavior changes](https://developer.android.com/about/versions/lollipop#webview).
