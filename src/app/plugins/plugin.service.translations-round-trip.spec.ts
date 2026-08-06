import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { Store } from '@ngrx/store';
import { TranslateService } from '@ngx-translate/core';
import { strToU8, zipSync } from 'fflate';
import { of } from 'rxjs';
import { GlobalConfigService } from '../features/config/global-config.service';
import { GlobalThemeService } from '../core/theme/global-theme.service';
import { SnackService } from '../core/snack/snack.service';
import { IssueSyncAdapterRegistryService } from '../features/issue/two-way-sync/issue-sync-adapter-registry.service';
import { PluginCacheService } from './plugin-cache.service';
import { PluginCleanupService } from './plugin-cleanup.service';
import { PluginHooksService } from './plugin-hooks';
import { PluginI18nService } from './plugin-i18n.service';
import { PluginIssueProviderRegistryService } from './issue-provider/plugin-issue-provider-registry.service';
import { PluginLoaderService } from './plugin-loader.service';
import { PluginManifest } from './plugin-api.model';
import { PluginBridgeService } from './plugin-bridge.service';
import { PluginMetaPersistenceService } from './plugin-meta-persistence.service';
import { PluginRunner } from './plugin-runner';
import { PluginSecurityService } from './plugin-security';
import { PluginService } from './plugin.service';
import { PluginUserPersistenceService } from './plugin-user-persistence.service';

/**
 * #9459: an uploaded plugin's translations reached IndexedDB but never came back,
 * so `pluginApi.translate()` silently returned keys. Every other plugin spec mocks
 * PluginCacheService, which means the write-then-read that actually broke is only
 * ever asserted as "storePlugin was called with X".
 *
 * This spec deliberately uses the REAL cache, loader and i18n service against the
 * browser's own IndexedDB, so the whole chain is executed:
 *   loadPluginFromZip -> IndexedDB -> loadUploadedPluginAssets -> translate()
 */
describe('PluginService uploaded translations round-trip (real IndexedDB)', () => {
  const PLUGIN_ID = 'i18n-round-trip';

  const manifest: PluginManifest = {
    id: PLUGIN_ID,
    name: 'Round Trip',
    manifestVersion: 1,
    version: '1.0.0',
    minSupVersion: '18.0.0',
    hooks: [],
    permissions: [],
    iFrame: true,
    i18n: { languages: ['en', 'de'] },
  };
  const EN = JSON.stringify({ GREETING: 'Hello' });
  const DE = JSON.stringify({ GREETING: 'Hallo' });

  const createZipFile = (files: Record<string, string>): File => {
    const entries: Record<string, Uint8Array> = {};
    for (const [path, content] of Object.entries(files)) {
      entries[path] = strToU8(content);
    }
    const zipBytes = zipSync(entries);
    const zipBuffer = new ArrayBuffer(zipBytes.byteLength);
    new Uint8Array(zipBuffer).set(zipBytes);
    return new File([zipBuffer], 'plugin.zip', { type: 'application/zip' });
  };

  const pluginZip = (translations: Record<string, string>): File => {
    const files: Record<string, string> = {};
    files['manifest.json'] = JSON.stringify(manifest);
    files['index.html'] = '<!doctype html><html><body>UI</body></html>';
    for (const [lang, content] of Object.entries(translations)) {
      files[`i18n/${lang}.json`] = content;
    }
    return createZipFile(files);
  };

  const configure = (): void => {
    const pluginRunner = jasmine.createSpyObj<PluginRunner>('PluginRunner', [
      'loadPlugin',
      'triggerReady',
      'unloadPlugin',
      'triggerUnload',
      'pingNodeBridge',
    ]);
    pluginRunner.loadPlugin.and.callFake(
      async (loadedManifest, _code, _cfg, isEnabled = true) => ({
        manifest: loadedManifest,
        loaded: true,
        isEnabled,
      }),
    );
    pluginRunner.triggerReady.and.resolveTo();

    const pluginSecurity = jasmine.createSpyObj<PluginSecurityService>(
      'PluginSecurityService',
      ['analyzePluginCode', 'hasElevatedPermissions'],
    );
    pluginSecurity.analyzePluginCode.and.returnValue({ warnings: [], info: [] });
    pluginSecurity.hasElevatedPermissions.and.returnValue(false);

    const pluginMetaPersistence = jasmine.createSpyObj<PluginMetaPersistenceService>(
      'PluginMetaPersistenceService',
      ['isPluginEnabled', 'setPluginEnabled'],
    );
    pluginMetaPersistence.isPluginEnabled.and.resolveTo(true);

    const translateService = jasmine.createSpyObj<TranslateService>('TranslateService', [
      'instant',
    ]);
    translateService.instant.and.callFake((key: string | string[]) =>
      Array.isArray(key) ? key.join(',') : key,
    );

    const globalConfig = jasmine.createSpyObj('GlobalConfigService', [], {
      localization: jasmine.createSpy().and.returnValue({ lng: 'en' }),
    });

    TestBed.configureTestingModule({
      providers: [
        PluginService,
        // The three under test are deliberately real.
        PluginCacheService,
        PluginLoaderService,
        PluginI18nService,
        { provide: HttpClient, useValue: { get: () => of(null) } },
        { provide: GlobalConfigService, useValue: globalConfig },
        { provide: PluginRunner, useValue: pluginRunner },
        { provide: PluginSecurityService, useValue: pluginSecurity },
        { provide: PluginMetaPersistenceService, useValue: pluginMetaPersistence },
        { provide: TranslateService, useValue: translateService },
        { provide: GlobalThemeService, useValue: { darkMode: () => 'light' } },
        {
          provide: PluginHooksService,
          useValue: jasmine.createSpyObj<PluginHooksService>('PluginHooksService', [
            'unregisterPluginHooks',
          ]),
        },
        {
          provide: PluginIssueProviderRegistryService,
          useValue: jasmine.createSpyObj<PluginIssueProviderRegistryService>(
            'PluginIssueProviderRegistryService',
            ['getRegisteredKey', 'unregister'],
          ),
        },
        {
          provide: IssueSyncAdapterRegistryService,
          useValue: jasmine.createSpyObj<IssueSyncAdapterRegistryService>(
            'IssueSyncAdapterRegistryService',
            ['unregister'],
          ),
        },
        {
          provide: PluginBridgeService,
          useValue: jasmine.createSpyObj<PluginBridgeService>('PluginBridgeService', [
            'hasNodeExecutionGrantToken',
            'requestNodeExecutionGrant',
            'setNodeExecutionGrantToken',
            'revokeNodeExecutionGrantToken',
            'revokeNodeExecutionGrant',
            'clearNodeExecutionConsent',
          ]),
        },
        { provide: PluginUserPersistenceService, useValue: {} },
        { provide: MatDialog, useValue: {} },
        { provide: PluginCleanupService, useValue: {} },
        { provide: Store, useValue: {} },
        { provide: SnackService, useValue: {} },
      ],
    });
  };

  beforeEach(async () => {
    configure();
    // Clear rather than deleteDatabase: an open connection from a prior spec would
    // block deletion, and clearCache goes through the same store this spec exercises.
    await TestBed.inject(PluginCacheService).clearCache();
  });

  afterEach(async () => {
    await TestBed.inject(PluginCacheService).clearCache();
  });

  it('translates through the real cache immediately after upload', async () => {
    await TestBed.inject(PluginService).loadPluginFromZip(pluginZip({ en: EN, de: DE }));

    const i18n = TestBed.inject(PluginI18nService);
    expect(i18n.translate(PLUGIN_ID, 'GREETING')).toBe('Hello');
    i18n.setCurrentLanguage('de');
    expect(i18n.translate(PLUGIN_ID, 'GREETING')).toBe('Hallo');
  });

  it('really persists the translations to IndexedDB', async () => {
    await TestBed.inject(PluginService).loadPluginFromZip(pluginZip({ en: EN, de: DE }));

    const cached = await TestBed.inject(PluginCacheService).getPlugin(PLUGIN_ID);

    expect(cached).not.toBeNull();
    expect(cached!.translations).toEqual({ en: EN, de: DE });
  });

  // The regression #9459 actually describes: it worked in-session but was gone
  // after a restart, because nothing had been written for the reader to find.
  it('still translates after a restart, from a fresh service graph', async () => {
    await TestBed.inject(PluginService).loadPluginFromZip(pluginZip({ en: EN, de: DE }));

    // "Restart": tear down every service instance, keep the same IndexedDB.
    TestBed.resetTestingModule();
    configure();

    const assets =
      await TestBed.inject(PluginLoaderService).loadUploadedPluginAssets(PLUGIN_ID);
    expect(assets.translations).toEqual({ en: EN, de: DE });

    const i18n = TestBed.inject(PluginI18nService);
    // Nothing is registered until the reader hands the cached content over.
    expect(i18n.translate(PLUGIN_ID, 'GREETING')).toBe('GREETING');

    i18n.loadPluginTranslationsFromContent(PLUGIN_ID, assets.translations!);
    i18n.setCurrentLanguage('de');
    expect(i18n.translate(PLUGIN_ID, 'GREETING')).toBe('Hallo');
  });

  it('never persists a language whose json cannot be parsed', async () => {
    await TestBed.inject(PluginService).loadPluginFromZip(
      pluginZip({ en: EN, de: '{ not json ' }),
    );

    const cached = await TestBed.inject(PluginCacheService).getPlugin(PLUGIN_ID);

    // Broken content in the cache would survive every restart while degrading
    // translate() to returning keys — #9459's symptom in a new disguise.
    expect(cached!.translations).toEqual({ en: EN });
    const i18n = TestBed.inject(PluginI18nService);
    i18n.setCurrentLanguage('de');
    expect(i18n.translate(PLUGIN_ID, 'GREETING')).toBe('Hello');
  });
});
