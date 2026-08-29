import {
  ApplicationRef,
  EnvironmentInjector,
  signal,
  Signal,
  WritableSignal,
} from '@angular/core';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { type WorkContextThemeCfg } from '../../features/work-context/work-context.model';
import {
  GlobalThemeService,
  GlobalWallpaperCfg,
  resolveBackground,
  resolveSystemSurfaceColor,
} from './global-theme.service';
import { CustomThemeRef } from './custom-theme.service';
import { KeyboardInfo, KeyboardPlugin } from '@capacitor/keyboard';
import { PluginListenerHandle } from '@capacitor/core';
import { BodyClass } from '../../app.constants';

interface GlobalThemeInitHarness {
  init(): void;
  darkMode: WritableSignal<'system' | 'dark' | 'light'>;
  _hasInitialized: boolean;
  _environmentInjector: EnvironmentInjector;
  _customThemeService: { activeRef: Signal<CustomThemeRef> };
  _setBackgroundTint(value: boolean): void;
  _initIcons(): void;
  _initHandlersForInitialBodyClasses(): void;
  _initThemeWatchers(): void;
}

describe('resolveSystemSurfaceColor()', () => {
  it('uses an opaque theme-supplied hex color', () => {
    expect(resolveSystemSurfaceColor('  #ece5d4  ', false)).toBe('#ece5d4');
    expect(resolveSystemSurfaceColor('#abc', false)).toBe('#aabbcc');
  });

  it('normalizes an opaque CSS rgb color for Android', () => {
    expect(resolveSystemSurfaceColor('rgb(26, 24, 22)', true)).toBe('#1a1816');
  });

  it('falls back to the current mode when the token is empty or not a solid color', () => {
    expect(resolveSystemSurfaceColor('', false)).toBe('#f8f8f7');
    expect(resolveSystemSurfaceColor('linear-gradient(red, blue)', true)).toBe('#131314');
    expect(resolveSystemSurfaceColor('rgb(256, 0, 0)', true)).toBe('#131314');
  });

  it('accepts a computed theme token that resolves through another custom property', () => {
    try {
      document.body.style.setProperty('--test-system-surface', '#abc');
      document.body.style.setProperty('--system-surface', 'var(--test-system-surface)');

      const computedColor = getComputedStyle(document.body).getPropertyValue(
        '--system-surface',
      );

      expect(resolveSystemSurfaceColor(computedColor, false)).toBe('#aabbcc');
    } finally {
      document.body.style.removeProperty('--system-surface');
      document.body.style.removeProperty('--test-system-surface');
    }
  });
});

describe('GlobalThemeService fixed-mode initialization', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  for (const testCase of [
    { themeId: 'arc', initial: 'light' as const, expected: 'dark' as const },
    {
      themeId: 'nord-snow-storm',
      initial: 'dark' as const,
      expected: 'light' as const,
    },
  ]) {
    it(`forces ${testCase.themeId} to ${testCase.expected} during init`, () => {
      const activeRef = signal<CustomThemeRef>({
        kind: 'builtin',
        id: testCase.themeId,
      });
      const service = Object.create(
        GlobalThemeService.prototype,
      ) as GlobalThemeInitHarness;
      service.darkMode = signal<'system' | 'dark' | 'light'>(testCase.initial);
      service._hasInitialized = false;
      service._environmentInjector = TestBed.inject(EnvironmentInjector);
      service._customThemeService = { activeRef: activeRef.asReadonly() };
      service._setBackgroundTint = (): void => undefined;
      service._initIcons = (): void => undefined;
      service._initHandlersForInitialBodyClasses = (): void => undefined;
      service._initThemeWatchers = (): void => undefined;

      service.init();

      expect(service.darkMode()).toBe(testCase.expected);
    });
  }
});

describe('resolveBackground()', () => {
  const contextTheme: WorkContextThemeCfg = {
    backgroundImageDark: 'ctx-dark.jpg',
    backgroundImageLight: 'ctx-light.jpg',
    backgroundOverlayOpacity: 50,
    backgroundImageBlur: 8,
  };
  const contextThemeWithoutImage: WorkContextThemeCfg = {
    backgroundImageDark: null,
    backgroundImageLight: null,
    backgroundOverlayOpacity: 50,
    backgroundImageBlur: 8,
  };
  const globalCfg: GlobalWallpaperCfg = {
    backgroundImageDark: 'global-dark.jpg',
    backgroundImageLight: 'global-light.jpg',
    backgroundOverlayOpacity: 30,
    backgroundImageBlur: 4,
  };
  const globalCfgEmpty: GlobalWallpaperCfg = {
    backgroundImageDark: null,
    backgroundImageLight: null,
  };

  describe('before initial navigation resolves (empty url)', () => {
    it('shows no background when no global wallpaper is set', () => {
      expect(
        resolveBackground(contextTheme, globalCfgEmpty, false, '').imageUrl,
      ).toBeNull();
    });

    it('shows the global wallpaper when set (never the sticky context image)', () => {
      const res = resolveBackground(contextTheme, globalCfg, false, '');
      expect(res.imageUrl).toBe('global-light.jpg');
      // global styling, not the sticky context's
      expect(res.overlayOpacity).toBe(0.3);
      expect(res.blur).toBe(4);
    });
  });

  ['/planner', '/schedule', '/boards', '/config'].forEach((url) => {
    it(`never uses the active context image on non-context route ${url}`, () => {
      expect(
        resolveBackground(contextTheme, globalCfgEmpty, false, url).imageUrl,
      ).toBeNull();
    });

    it(`shows the global wallpaper + global styling on ${url}`, () => {
      const light = resolveBackground(contextTheme, globalCfg, false, url);
      expect(light.imageUrl).toBe('global-light.jpg');
      expect(light.overlayOpacity).toBe(0.3);
      expect(light.blur).toBe(4);

      const dark = resolveBackground(contextTheme, globalCfg, true, url);
      expect(dark.imageUrl).toBe('global-dark.jpg');
    });
  });

  ['/tag/TODAY/tasks', '/project/project-1/tasks'].forEach((url) => {
    it(`uses the context image + context styling on ${url}`, () => {
      const res = resolveBackground(contextTheme, globalCfg, false, url);
      expect(res.imageUrl).toBe('ctx-light.jpg');
      // styling must come from the context that owns the image
      expect(res.overlayOpacity).toBe(0.5);
      expect(res.blur).toBe(8);
    });

    it(`falls back to the global wallpaper + global styling on ${url} when the context has no image`, () => {
      const res = resolveBackground(contextThemeWithoutImage, globalCfg, false, url);
      expect(res.imageUrl).toBe('global-light.jpg');
      expect(res.overlayOpacity).toBe(0.3);
      expect(res.blur).toBe(4);
    });

    it(`treats a cleared (empty-string) context image as unset and falls back to global on ${url}`, () => {
      const cleared: WorkContextThemeCfg = {
        backgroundImageLight: '   ',
        backgroundImageDark: '',
      };
      expect(resolveBackground(cleared, globalCfg, false, url).imageUrl).toBe(
        'global-light.jpg',
      );
    });
  });

  it('does not misclassify a non-context route that mentions /tag/ in its query', () => {
    // regex is anchored to the path start
    expect(
      resolveBackground(contextTheme, globalCfgEmpty, false, '/planner?ref=/tag/TODAY')
        .imageUrl,
    ).toBeNull();
  });

  it('uses the dark context image in dark mode', () => {
    expect(
      resolveBackground(contextTheme, globalCfgEmpty, true, '/tag/TODAY/tasks').imageUrl,
    ).toBe('ctx-dark.jpg');
  });

  describe('overlay-opacity + blur math (migrated from app.component helpers)', () => {
    it('defaults to 20% overlay / 0 blur when the winning source sets neither', () => {
      const res = resolveBackground(
        {},
        { backgroundImageLight: 'g.jpg' },
        false,
        '/planner',
      );
      expect(res.overlayOpacity).toBe(0.2);
      expect(res.blur).toBe(0);
    });

    it('converts overlay opacity to a CSS alpha and clamps blur', () => {
      const highOpacity = resolveBackground(
        { backgroundImageLight: 'c.jpg', backgroundOverlayOpacity: 65 },
        globalCfgEmpty,
        false,
        '/tag/TODAY/tasks',
      );
      expect(highOpacity.overlayOpacity).toBe(0.65);

      const negativeBlur = resolveBackground(
        { backgroundImageLight: 'c.jpg', backgroundImageBlur: -5 },
        globalCfgEmpty,
        false,
        '/tag/TODAY/tasks',
      );
      expect(negativeBlur.blur).toBe(0);
    });
  });
});

describe('GlobalThemeService.registerSvgIconFromContent()', () => {
  interface IconRegistrationHarness {
    registerSvgIconFromContent(iconName: string, svgContent: string): void;
    _registeredPluginIcons: Set<string>;
    _matIconRegistry: { addSvgIconLiteral: jasmine.Spy };
    _domSanitizer: { bypassSecurityTrustHtml: (value: string) => string };
  }

  let harness: IconRegistrationHarness;

  beforeEach(() => {
    harness = Object.create(GlobalThemeService.prototype) as IconRegistrationHarness;
    harness._registeredPluginIcons = new Set<string>();
    harness._matIconRegistry = {
      addSvgIconLiteral: jasmine.createSpy('addSvgIconLiteral'),
    };
    harness._domSanitizer = { bypassSecurityTrustHtml: (value: string) => value };
  });

  /** MatIconRegistry parses the registered literal with `div.innerHTML`. */
  const renderRegisteredLiteral = (): HTMLDivElement => {
    const div = document.createElement('div');
    div.innerHTML = harness._matIconRegistry.addSvgIconLiteral.calls.mostRecent()
      .args[1] as string;
    return div;
  };

  it('registers a benign plugin icon', () => {
    harness.registerSvgIconFromContent(
      'plugin-a-icon',
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M1 2"></path></svg>',
    );

    expect(harness._matIconRegistry.addSvgIconLiteral).toHaveBeenCalledTimes(1);
    expect(renderRegisteredLiteral().querySelector('path')?.getAttribute('d')).toBe(
      'M1 2',
    );
    expect(harness._registeredPluginIcons.has('plugin-a-icon')).toBe(true);
  });

  it('does not register content that is not an SVG', () => {
    harness.registerSvgIconFromContent('plugin-b-icon', '<div>nope</div>');

    expect(harness._matIconRegistry.addSvgIconLiteral).not.toHaveBeenCalled();
    expect(harness._registeredPluginIcons.has('plugin-b-icon')).toBe(false);
  });

  it('registers no live markup for a plugin icon that smuggles CDATA', () => {
    harness.registerSvgIconFromContent(
      'plugin-c-icon',
      '<svg xmlns="http://www.w3.org/2000/svg"><desc><![CDATA[><img src=x onerror="window.alert(1)">]]></desc><circle r="4"></circle></svg>',
    );

    expect(harness._matIconRegistry.addSvgIconLiteral).toHaveBeenCalledTimes(1);
    const rendered = renderRegisteredLiteral();
    expect(rendered.querySelector('img')).toBeNull();
    expect(rendered.querySelector('[onerror]')).toBeNull();
    expect(rendered.querySelector('circle')?.getAttribute('r')).toBe('4');
  });

  it('does not register an icon whose content is entirely stripped', () => {
    harness.registerSvgIconFromContent(
      'plugin-e-icon',
      '<svg xmlns="http://www.w3.org/2000/svg"><desc><![CDATA[><img src=x onerror="window.alert(1)">]]></desc></svg>',
    );

    // Registering an empty literal would make `hasPluginIcon()` true, so callers would pick
    // this icon name over their own fallback and render nothing.
    expect(harness._matIconRegistry.addSvgIconLiteral).not.toHaveBeenCalled();
    expect(harness._registeredPluginIcons.has('plugin-e-icon')).toBe(false);
  });

  it('strips an event handler from a plugin icon before registering it', () => {
    harness.registerSvgIconFromContent(
      'plugin-d-icon',
      '<svg xmlns="http://www.w3.org/2000/svg" onload="window.alert(1)"><circle r="4"></circle></svg>',
    );

    const rendered = renderRegisteredLiteral();
    expect(rendered.querySelector('svg')?.getAttribute('onload')).toBeNull();
    expect(rendered.querySelector('circle')?.getAttribute('r')).toBe('4');
  });
});

describe('GlobalThemeService iOS keyboard sequencing', () => {
  interface IosKeyboardHarness {
    _initIOSKeyboardHandling(keyboard: KeyboardPlugin): void;
    document: Document;
    _destroyRef: { onDestroy(cb: () => void): void };
    _keyboardListenerHandles: PluginListenerHandle[];
    _focusinListener: ((event: FocusEvent) => void) | null;
    _visualViewportResizeListener: (() => void) | null;
    _iosKeyboardHeight: number;
    _iosViewportHeightBeforeKeyboard: number;
    _iosViewportChangeRaf: number | null;
    _iosKeyboardFrameUnreliable: boolean;
    _isIosKeyboardSettled: boolean;
    _cssVarCache: Map<string, string>;
    _overlayContainer: { getContainerElement(): HTMLElement };
    _iosViewportVarTarget: HTMLElement;
    _iosKeyboardSettleTimeout: number | undefined;
    iosShellHeight: WritableSignal<string | null>;
    _scrollActiveInputIntoView(): void;
    _environmentInjector: EnvironmentInjector;
  }

  type KeyboardHandler = (info: KeyboardInfo) => void;

  const BASE_HEIGHT = 800;
  const KEYBOARD_HEIGHT = 336;

  let harness: IosKeyboardHarness;
  let root: HTMLElement;
  let body: HTMLElement;
  let overlayContainer: HTMLElement;
  let handlers: Record<string, KeyboardHandler>;
  let visualViewport: { height: number; addEventListener: jasmine.Spy };
  let setPropertySpy: jasmine.Spy;
  let overlaySetPropertySpy: jasmine.Spy;
  let resizeNotifications: number;
  let scrollIntoViewSpy: jasmine.Spy;
  let pendingFrame: FrameRequestCallback | null = null;
  let originalInnerHeight: PropertyDescriptor | undefined;
  let originalVisualViewport: PropertyDescriptor | undefined;

  /** Stubs the window geometry the service reads; restored in afterEach. */
  const setWindowHeights = (innerHeight: number, visualViewportHeight: number): void => {
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      get: () => innerHeight,
    });
    visualViewport.height = visualViewportHeight;
  };

  const rootVar = (name: string): string => root.style.getPropertyValue(name);
  /** Set on the CDK overlay container, which every overlay inherits from. */
  const overlayVar = (name: string): string =>
    overlayContainer.style.getPropertyValue(name);

  const flushFrame = (): void => {
    const frame = pendingFrame;
    pendingFrame = null;
    frame?.(0);
  };

  const varWrites = (spy: jasmine.Spy, name: string): number =>
    spy.calls.allArgs().filter((args) => args[0] === name).length;

  /** The keyboard shrank the web view, i.e. Capacitor's `resize: 'native'`. */
  const shrinkViewport = (height: number): void => {
    visualViewport.height = height;
    harness._visualViewportResizeListener?.();
  };

  beforeEach(() => {
    root = document.createElement('div');
    body = document.createElement('div');
    overlayContainer = document.createElement('div');
    handlers = {};
    resizeNotifications = 0;
    scrollIntoViewSpy = jasmine.createSpy('_scrollActiveInputIntoView');
    setPropertySpy = spyOn(root.style, 'setProperty').and.callThrough();
    overlaySetPropertySpy = spyOn(
      overlayContainer.style,
      'setProperty',
    ).and.callThrough();

    visualViewport = {
      height: BASE_HEIGHT,
      addEventListener: jasmine.createSpy('addEventListener'),
    };
    originalInnerHeight = Object.getOwnPropertyDescriptor(window, 'innerHeight');
    originalVisualViewport = Object.getOwnPropertyDescriptor(window, 'visualViewport');
    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      get: () => visualViewport,
    });
    setWindowHeights(BASE_HEIGHT, BASE_HEIGHT);

    // Hold the frame callback like the browser does — the service coalesces
    // notifications until it runs — and count the resize instead of dispatching
    // it, which would reach every listener in the karma page.
    spyOn(window, 'requestAnimationFrame').and.callFake((cb) => {
      pendingFrame = cb;
      return 1;
    });
    spyOn(window, 'dispatchEvent').and.callFake((event: Event) => {
      if (event.type === 'resize') {
        resizeNotifications++;
      }
      return true;
    });

    harness = Object.create(GlobalThemeService.prototype) as IosKeyboardHarness;
    harness.document = {
      documentElement: root,
      body,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    } as unknown as Document;
    harness._overlayContainer = { getContainerElement: () => overlayContainer };
    harness.iosShellHeight = signal<string | null>(null);
    harness._destroyRef = { onDestroy: () => undefined };
    harness._keyboardListenerHandles = [];
    harness._focusinListener = null;
    harness._visualViewportResizeListener = null;
    harness._iosKeyboardHeight = 0;
    harness._iosViewportHeightBeforeKeyboard = 0;
    harness._iosViewportChangeRaf = null;
    harness._iosKeyboardFrameUnreliable = false;
    harness._isIosKeyboardSettled = false;
    harness._cssVarCache = new Map<string, string>();
    harness._scrollActiveInputIntoView = scrollIntoViewSpy;
    harness._environmentInjector = TestBed.inject(EnvironmentInjector);

    const keyboard = {
      setAccessoryBarVisible: () => Promise.resolve(),
      addListener: (eventName: string, listenerFunc: KeyboardHandler) => {
        handlers[eventName] = listenerFunc;
        return Promise.resolve({ remove: () => Promise.resolve() });
      },
    } as unknown as KeyboardPlugin;
    harness._initIOSKeyboardHandling(keyboard);
    flushFrame();
    setPropertySpy.calls.reset();
    overlaySetPropertySpy.calls.reset();
    resizeNotifications = 0;
  });

  afterEach(() => {
    const restore = (name: string, descriptor?: PropertyDescriptor): void => {
      if (descriptor) {
        Object.defineProperty(window, name, descriptor);
      } else {
        delete (window as unknown as Record<string, unknown>)[name];
      }
    };
    restore('innerHeight', originalInnerHeight);
    restore('visualViewport', originalVisualViewport);
  });

  const willShow = (keyboardHeight = KEYBOARD_HEIGHT): void =>
    handlers['keyboardWillShow']({ keyboardHeight } as KeyboardInfo);
  const didShow = (): void => handlers['keyboardDidShow']({} as KeyboardInfo);
  const didHide = (): void => handlers['keyboardDidHide']({} as KeyboardInfo);
  /** Runs the render pass the deferred scroll waits for. */
  const flushRender = (): void => TestBed.inject(ApplicationRef).tick();
  const willHide = (): void => handlers['keyboardWillHide']({} as KeyboardInfo);

  it('registers a listener per keyboard event', () => {
    expect(Object.keys(handlers).sort()).toEqual([
      'keyboardDidHide',
      'keyboardDidShow',
      'keyboardWillHide',
      'keyboardWillShow',
    ]);
  });

  // #9779: the reported frame arrives before the web view has resized, so acting
  // on it here lifts the fixed add-task bar a keyboard height and drops it back
  // a few frames later — the jump users see.
  it('does not move anything on the reported frame alone', () => {
    willShow();

    expect(body.classList.contains(BodyClass.isKeyboardVisible)).toBe(true);
    expect(rootVar('--keyboard-height')).toBe(`${KEYBOARD_HEIGHT}px`);
    expect(rootVar('--keyboard-overlay-offset')).toBe('0px');
    expect(overlayVar('--visual-viewport-height')).toBe(`${BASE_HEIGHT}px`);
    expect(harness.iosShellHeight()).toBe(
      `calc(${BASE_HEIGHT}px - var(--safe-area-top))`,
    );
  });

  it('follows the web view once it shrinks around the keyboard', () => {
    willShow();
    shrinkViewport(BASE_HEIGHT - KEYBOARD_HEIGHT);
    didShow();

    expect(overlayVar('--visual-viewport-height')).toBe(
      `${BASE_HEIGHT - KEYBOARD_HEIGHT}px`,
    );
    expect(harness.iosShellHeight()).toBe(
      `calc(${BASE_HEIGHT - KEYBOARD_HEIGHT}px - var(--safe-area-top))`,
    );
    // The shrunken web view already ends above the keyboard; offsetting the
    // fixed bar again would move it twice (#8778).
    expect(rootVar('--keyboard-overlay-offset')).toBe('0px');
    flushRender();
    expect(scrollIntoViewSpy).toHaveBeenCalledTimes(1);
  });

  // The shell height is a signal binding now, so at didShow the shell is still
  // its pre-keyboard size. Scrolling there measures the old viewport, decides
  // the input is already visible, and leaves it under the keyboard (#9779).
  it('waits for the shell to be resized before scrolling the input into view', () => {
    willShow();
    didShow();

    expect(scrollIntoViewSpy).not.toHaveBeenCalled();

    flushRender();

    expect(scrollIntoViewSpy).toHaveBeenCalledTimes(1);
  });

  it('offsets the overlay layer for a keyboard that never resized the web view', () => {
    willShow();
    didShow();

    expect(rootVar('--keyboard-overlay-offset')).toBe(`${KEYBOARD_HEIGHT}px`);
    expect(overlayVar('--visual-viewport-height')).toBe(
      `${BASE_HEIGHT - KEYBOARD_HEIGHT}px`,
    );
  });

  // Switching to the emoji panel or a taller keyboard re-fires willShow while the
  // keyboard is already up. Nothing is appearing from zero here, so dropping the
  // offset until didShow arrives would flick the bar down behind the keyboard.
  it('keeps the overlay offset when the keyboard changes height while visible', () => {
    willShow();
    didShow();
    setWindowHeights(BASE_HEIGHT, BASE_HEIGHT);

    willShow(KEYBOARD_HEIGHT + 100);

    expect(rootVar('--keyboard-overlay-offset')).toBe(`${KEYBOARD_HEIGHT + 100}px`);
    expect(overlayVar('--visual-viewport-height')).toBe(
      `${BASE_HEIGHT - KEYBOARD_HEIGHT - 100}px`,
    );
  });

  it('measures the pre-keyboard height only while the keyboard is hidden', () => {
    willShow();
    // iOS reports the shrunken window once the keyboard is up; re-capturing it
    // as the base height would subtract the keyboard twice.
    setWindowHeights(BASE_HEIGHT - KEYBOARD_HEIGHT, BASE_HEIGHT - KEYBOARD_HEIGHT);
    willShow();
    didShow();

    expect(harness._iosViewportHeightBeforeKeyboard).toBe(BASE_HEIGHT);
    expect(overlayVar('--visual-viewport-height')).toBe(
      `${BASE_HEIGHT - KEYBOARD_HEIGHT}px`,
    );
  });

  it('restores the full viewport when the keyboard hides', () => {
    willShow();
    shrinkViewport(BASE_HEIGHT - KEYBOARD_HEIGHT);
    didShow();

    willHide();
    shrinkViewport(BASE_HEIGHT);

    expect(body.classList.contains(BodyClass.isKeyboardVisible)).toBe(false);
    expect(rootVar('--keyboard-height')).toBe('0px');
    expect(rootVar('--keyboard-overlay-offset')).toBe('0px');
    expect(overlayVar('--visual-viewport-height')).toBe(`${BASE_HEIGHT}px`);
    // Handed back to the stylesheet, which sizes the shell without a keyboard.
    expect(harness.iosShellHeight()).toBeNull();
  });

  // The show animation fires a burst of visualViewport resizes, most of them on
  // a height already written. Each write costs a document-wide style recalc and
  // each notification re-measures every autosizing textarea and CDK overlay.
  it('writes and notifies only for values that actually changed', () => {
    willShow();
    flushFrame();
    const writesAfterShow = varWrites(overlaySetPropertySpy, '--visual-viewport-height');
    const notificationsAfterShow = resizeNotifications;

    for (let i = 0; i < 3; i++) {
      shrinkViewport(BASE_HEIGHT - KEYBOARD_HEIGHT);
      flushFrame();
    }

    expect(varWrites(overlaySetPropertySpy, '--visual-viewport-height')).toBe(
      writesAfterShow + 1,
    );
    expect(resizeNotifications).toBe(notificationsAfterShow + 1);
  });

  it('corrects a bogus keyboard frame to the measured obscured area (#8778)', () => {
    willShow(BASE_HEIGHT - 10);
    shrinkViewport(BASE_HEIGHT - KEYBOARD_HEIGHT);

    // Mid-shrink the clamped frame stands. --keyboard-height has non-overlay
    // consumers so it has to live on <html>, and the obscured area moves every
    // frame — correcting here would be a root write per frame (#9779).
    expect(rootVar('--keyboard-height')).toBe(`${BASE_HEIGHT * 0.6}px`);

    didShow();

    expect(rootVar('--keyboard-height')).toBe(`${KEYBOARD_HEIGHT}px`);
    expect(rootVar('--keyboard-overlay-offset')).toBe('0px');
  });

  it('does not write <html> per frame for a bogus keyboard frame either', () => {
    willShow(BASE_HEIGHT - 10);
    const writesAfterShow = varWrites(setPropertySpy, '--keyboard-height');

    for (let step = 60; step <= 300; step += 60) {
      shrinkViewport(BASE_HEIGHT - step);
      flushFrame();
    }

    expect(varWrites(setPropertySpy, '--keyboard-height')).toBe(writesAfterShow);
  });

  describe('when iOS drops keyboardDidShow', () => {
    // Everything frame-derived waits for didShow, so without a fallback the
    // fixed bar stays behind the keyboard for the rest of the session (#9779).
    it('settles on a timer instead', fakeAsync(() => {
      willShow();

      expect(rootVar('--keyboard-overlay-offset')).toBe('0px');

      tick(400);
      flushRender();

      expect(rootVar('--keyboard-overlay-offset')).toBe(`${KEYBOARD_HEIGHT}px`);
      expect(scrollIntoViewSpy).toHaveBeenCalledTimes(1);
    }));

    it('does not settle twice when didShow does arrive', fakeAsync(() => {
      willShow();
      didShow();
      flushRender();
      tick(400);
      flushRender();

      expect(scrollIntoViewSpy).toHaveBeenCalledTimes(1);
    }));

    it('drops the pending timer when the keyboard hides again', fakeAsync(() => {
      willShow();
      willHide();
      tick(400);
      flushRender();

      expect(harness._isIosKeyboardSettled).toBe(false);
      expect(scrollIntoViewSpy).not.toHaveBeenCalled();
    }));
  });

  // Moving between two fields fires willHide then willShow while the web view is
  // still shrunken; re-measuring there subtracts the keyboard twice.
  it('keeps the pre-keyboard baseline when focus moves to another field', () => {
    willShow();
    didShow();
    willHide();
    // The web view has not grown back yet — this is what iOS reports meanwhile.
    setWindowHeights(BASE_HEIGHT - KEYBOARD_HEIGHT, BASE_HEIGHT - KEYBOARD_HEIGHT);
    willShow();
    didShow();

    // Re-measuring at the second willShow would clamp the keyboard against the
    // already-shrunken 464px and shrink the shell to 185.6px.
    expect(rootVar('--keyboard-height')).toBe(`${KEYBOARD_HEIGHT}px`);
    expect(harness.iosShellHeight()).toBe(
      `calc(${BASE_HEIGHT - KEYBOARD_HEIGHT}px - var(--safe-area-top))`,
    );
  });

  it('takes a fresh baseline once the web view has grown back', () => {
    willShow();
    didShow();
    willHide();
    didHide();
    // A rotation while the keyboard was down: the old baseline must not survive.
    setWindowHeights(600, 600);
    willShow();
    didShow();

    expect(harness.iosShellHeight()).toBe(
      `calc(${600 - KEYBOARD_HEIGHT}px - var(--safe-area-top))`,
    );
  });

  // The point of the split: <html> carries only variables that change once per
  // open/close, never the one the animation drives frame by frame (#9779).
  it('never writes the per-frame viewport height on <html>', () => {
    willShow();
    for (let step = 60; step <= 300; step += 60) {
      shrinkViewport(BASE_HEIGHT - step);
      flushFrame();
    }
    didShow();
    willHide();
    shrinkViewport(BASE_HEIGHT);

    expect(varWrites(setPropertySpy, '--visual-viewport-height')).toBe(0);
    // One per distinct height: the five shrinks plus the restore on hide.
    expect(varWrites(overlaySetPropertySpy, '--visual-viewport-height')).toBe(6);
    expect(varWrites(setPropertySpy, '--keyboard-height')).toBe(2);
  });
});

/**
 * The guard on `_scrollActiveInputIntoView`, which runs on every iOS
 * `keyboardDidShow`. Real elements in the document, because the decision reads
 * computed styles and scroll geometry.
 */
describe('GlobalThemeService scroll-into-view guard', () => {
  interface ScrollGuardHarness {
    document: Document;
    _canScrollIntoView(el: HTMLElement): boolean;
    _scrollActiveInputIntoView(): void;
  }

  let harness: ScrollGuardHarness;
  let root: HTMLElement;

  const build = (html: string): HTMLElement => {
    root.innerHTML = html;
    return root.querySelector('input') as HTMLElement;
  };

  /**
   * Focuses the input for real and stubs the scroll call on it, so the assertion
   * covers `_scrollActiveInputIntoView` end to end rather than the predicate
   * alone — deleting the guard's call site has to fail a test.
   */
  const focusAndWatch = (input: HTMLElement): jasmine.Spy => {
    const spy = jasmine.createSpy('scrollIntoViewIfNeeded');
    // An own property, so the branch is taken on any browser karma runs in.
    (input as unknown as Record<string, unknown>).scrollIntoViewIfNeeded = spy;
    input.focus();
    expect(document.activeElement).toBe(input);
    return spy;
  };

  beforeEach(() => {
    harness = Object.create(GlobalThemeService.prototype) as ScrollGuardHarness;
    harness.document = document;
    root = document.createElement('div');
    document.body.appendChild(root);
  });

  afterEach(() => root.remove());

  it('scrolls an input that sits in a scrollable container', () => {
    const input = build(`
      <div style="height: 40px; overflow-y: auto">
        <div style="height: 400px"><input /></div>
      </div>
    `);

    expect(harness._canScrollIntoView(input)).toBe(true);
  });

  // The global add-task bar: scrolling it into view scrolls the list behind it
  // instead, which is what made the page jump while the keyboard opened (#9779).
  it('leaves an input in a fixed bar alone', () => {
    const input = build(`
      <div style="position: fixed; bottom: 0"><input /></div>
    `);

    expect(harness._canScrollIntoView(input)).toBe(false);
  });

  // #7388: a fullscreen dialog is fixed, but its body scrolls, so an input near
  // the bottom still has to be brought above the keyboard.
  it('scrolls an input in a scrollable region inside a fixed dialog', () => {
    const input = build(`
      <div style="position: fixed; inset: 0">
        <div style="height: 40px; overflow-y: auto">
          <div style="height: 400px"><input /></div>
        </div>
      </div>
    `);

    expect(harness._canScrollIntoView(input)).toBe(true);
  });

  it('scrolls an input with nothing special above it', () => {
    const input = build('<div><input /></div>');

    expect(harness._canScrollIntoView(input)).toBe(true);
  });

  describe('applied to the focused input', () => {
    it('does not scroll for an input in a fixed bar', () => {
      const spy = focusAndWatch(
        build('<div style="position: fixed; bottom: 0"><input /></div>'),
      );

      harness._scrollActiveInputIntoView();

      expect(spy).not.toHaveBeenCalled();
    });

    it('scrolls for an input inside a scrollable container', () => {
      const spy = focusAndWatch(
        build(`
          <div style="height: 40px; overflow-y: auto">
            <div style="height: 400px"><input /></div>
          </div>
        `),
      );

      harness._scrollActiveInputIntoView();

      expect(spy).toHaveBeenCalledWith(true);
    });
  });
});
