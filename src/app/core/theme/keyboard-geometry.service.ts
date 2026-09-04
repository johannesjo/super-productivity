import { Injectable, signal } from '@angular/core';

/**
 * Keyboard-driven geometry published as signals for components to bind, rather
 * than as custom properties on `<html>`.
 *
 * A custom property on the root element invalidates the computed style of every
 * element that could inherit it, and WebKit charges that per node: one write
 * measured ~220ms against a 201-row task list, versus ~0.1ms on an element
 * nothing inherits from (#9779, harness in `e2e/measure/`). Consumers inside
 * the CDK overlay container inherit these values as CSS variables written on
 * the container itself; consumers outside it — the app shell and the global
 * add-task bar — bind the signals here onto their own host instead.
 *
 * Written by GlobalThemeService, which owns the keyboard listeners. Kept
 * separate from it so a component can read the geometry without pulling in the
 * theming engine.
 */
@Injectable({ providedIn: 'root' })
export class KeyboardGeometryService {
  /**
   * Height for the app shell while the iOS keyboard is open, as a CSS value, or
   * null to leave the sizing to the stylesheet.
   */
  readonly iosShellHeight = signal<string | null>(null);

  /** Slice of the viewport the keyboard obscures. */
  readonly keyboardHeightPx = signal(0);

  /**
   * How far the keyboard still overlays the (possibly already shrunk) WebView
   * viewport on iOS — never the full keyboard height, or fixed elements move
   * twice (#8778).
   */
  readonly keyboardOverlayOffsetPx = signal(0);
}
