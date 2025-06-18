import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { MatDialog } from '@angular/material/dialog';
import { PluginService } from './plugin.service';
import { PluginRunner } from './plugin-runner';
import { PluginHooksService } from './plugin-hooks';
import { PluginSecurityService } from './plugin-security';
import { GlobalThemeService } from '../core/theme/global-theme.service';
import { PluginMetaPersistenceService } from './plugin-meta-persistence.service';
import { PluginUserPersistenceService } from './plugin-user-persistence.service';
import { PluginCacheService } from './plugin-cache.service';
import { PluginInstance, PluginManifest, PluginHooks } from './plugin-api.model';
import { BehaviorSubject } from 'rxjs';

describe('PluginService', () => {
  let service: PluginService;
  let httpMock: HttpTestingController;
  let mockPluginRunner: jasmine.SpyObj<PluginRunner>;
  let mockPluginHooks: jasmine.SpyObj<PluginHooksService>;
  let mockPluginSecurity: jasmine.SpyObj<PluginSecurityService>;
  let mockGlobalTheme: jasmine.SpyObj<GlobalThemeService>;
  let mockMetaPersistence: jasmine.SpyObj<PluginMetaPersistenceService>;
  let mockUserPersistence: jasmine.SpyObj<PluginUserPersistenceService>;
  let mockPluginCache: jasmine.SpyObj<PluginCacheService>;

  const mockManifest: PluginManifest = {
    id: 'test-plugin',
    name: 'Test Plugin',
    manifestVersion: 1,
    version: '1.0.0',
    minSupVersion: '1.0.0',
    description: 'Test plugin for unit testing',
    hooks: [],
    permissions: [],
    iFrame: true,
  };

  const mockPluginInstance: PluginInstance = {
    manifest: mockManifest,
    loaded: true,
    isEnabled: true,
    error: undefined,
  };

  beforeEach(() => {
    const pluginRunnerSpy = jasmine.createSpyObj('PluginRunner', [
      'loadPlugin',
      'unloadPlugin',
      'getLoadedPlugin',
      'getAllLoadedPlugins',
      'isPluginLoaded',
    ]);

    const pluginHooksSpy = jasmine.createSpyObj('PluginHooksService', [
      'dispatchHook',
      'unregisterPluginHooks',
    ]);

    const pluginSecuritySpy = jasmine.createSpyObj('PluginSecurityService', [
      'validatePluginManifest',
      'validatePluginCode',
      'requiresDangerousPermissions',
    ]);

    const globalThemeSpy = jasmine.createSpyObj('GlobalThemeService', [], {
      darkMode$: new BehaviorSubject('light'),
    });

    const metaPersistenceSpy = jasmine.createSpyObj('PluginMetaPersistenceService', [
      'isPluginEnabled',
      'setPluginEnabled',
      'getAllPluginMetadata',
      'getNodeExecutionConsent',
      'setNodeExecutionConsent',
      'removePluginMetadata',
    ]);

    const userPersistenceSpy = jasmine.createSpyObj('PluginUserPersistenceService', [
      'persistPluginUserData',
      'loadPluginUserData',
      'removePluginUserData',
    ]);

    const pluginCacheSpy = jasmine.createSpyObj('PluginCacheService', [
      'getAllPlugins',
      'getPlugin',
      'storePlugin',
      'removePlugin',
      'cleanupOldPlugins',
    ]);

    const dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        PluginService,
        { provide: PluginRunner, useValue: pluginRunnerSpy },
        { provide: PluginHooksService, useValue: pluginHooksSpy },
        { provide: PluginSecurityService, useValue: pluginSecuritySpy },
        { provide: GlobalThemeService, useValue: globalThemeSpy },
        { provide: PluginMetaPersistenceService, useValue: metaPersistenceSpy },
        { provide: PluginUserPersistenceService, useValue: userPersistenceSpy },
        { provide: PluginCacheService, useValue: pluginCacheSpy },
        { provide: MatDialog, useValue: dialogSpy },
      ],
    });

    service = TestBed.inject(PluginService);
    httpMock = TestBed.inject(HttpTestingController);
    mockPluginRunner = TestBed.inject(PluginRunner) as jasmine.SpyObj<PluginRunner>;
    mockPluginHooks = TestBed.inject(
      PluginHooksService,
    ) as jasmine.SpyObj<PluginHooksService>;
    mockPluginSecurity = TestBed.inject(
      PluginSecurityService,
    ) as jasmine.SpyObj<PluginSecurityService>;
    mockGlobalTheme = TestBed.inject(
      GlobalThemeService,
    ) as jasmine.SpyObj<GlobalThemeService>;
    mockMetaPersistence = TestBed.inject(
      PluginMetaPersistenceService,
    ) as jasmine.SpyObj<PluginMetaPersistenceService>;
    mockUserPersistence = TestBed.inject(
      PluginUserPersistenceService,
    ) as jasmine.SpyObj<PluginUserPersistenceService>;
    mockPluginCache = TestBed.inject(
      PluginCacheService,
    ) as jasmine.SpyObj<PluginCacheService>;
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('Service Creation', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should not be initialized initially', () => {
      expect(service.isInitialized()).toBeFalse();
    });

    it('should have empty active side panel plugin initially', (done) => {
      service.activeSidePanelPlugin$.subscribe((plugin) => {
        expect(plugin).toBeNull();
        done();
      });
    });
  });

  describe('Plugin Initialization', () => {
    beforeEach(() => {
      mockPluginCache.getAllPlugins.and.returnValue(Promise.resolve([]));
      mockPluginCache.cleanupOldPlugins.and.returnValue(Promise.resolve());
      mockMetaPersistence.isPluginEnabled.and.returnValue(Promise.resolve(true));
      mockPluginSecurity.validatePluginManifest.and.returnValue({
        isValid: true,
        errors: [],
      });
      mockPluginSecurity.validatePluginCode.and.returnValue({
        isValid: true,
        errors: [],
      });
      mockPluginSecurity.requiresDangerousPermissions.and.returnValue(false);
      mockPluginRunner.loadPlugin.and.returnValue(Promise.resolve(mockPluginInstance));
    });

    it('should initialize plugins successfully', async () => {
      // Mock HTTP responses for all built-in plugins
      const pluginPaths = [
        'assets/example-plugin',
        'assets/yesterday-tasks-plugin',
        'assets/markdown-list-to-task',
        'assets/test-side-panel-plugin',
      ];

      // Mock manifest and code requests for each plugin
      pluginPaths.forEach((path) => {
        const manifestReq = httpMock.expectOne(`${path}/manifest.json`);
        manifestReq.flush(mockManifest);

        const codeReq = httpMock.expectOne(`${path}/plugin.js`);
        codeReq.flush('console.log("test plugin");');
      });

      await service.initializePlugins();

      expect(service.isInitialized()).toBeTrue();
      expect(mockPluginCache.cleanupOldPlugins).toHaveBeenCalled();
    });

    it('should prevent multiple initialization', async () => {
      // First initialization
      mockPluginCache.getAllPlugins.and.returnValue(Promise.resolve([]));

      const firstInit = service.initializePlugins();
      const secondInit = service.initializePlugins(); // Should return immediately

      // Mock HTTP requests for the first initialization (built-in plugins)
      const pluginPaths = [
        'assets/example-plugin',
        'assets/yesterday-tasks-plugin',
        'assets/markdown-list-to-task',
        'assets/test-side-panel-plugin',
      ];

      pluginPaths.forEach((path) => {
        const manifestReq = httpMock.expectOne(`${path}/manifest.json`);
        manifestReq.flush(mockManifest);

        const codeReq = httpMock.expectOne(`${path}/plugin.js`);
        codeReq.flush('console.log("test plugin");');
      });

      await firstInit;
      await secondInit;

      expect(mockPluginCache.getAllPlugins).toHaveBeenCalledTimes(1);
    });

    it('should handle plugin loading failures gracefully', async () => {
      // Mock HTTP error for first plugin manifest
      const manifestReq = httpMock.expectOne('assets/example-plugin/manifest.json');
      manifestReq.error(new ErrorEvent('Network error'));

      // Mock successful responses for other plugins
      const successfulPaths = [
        'assets/yesterday-tasks-plugin',
        'assets/markdown-list-to-task',
        'assets/test-side-panel-plugin',
      ];

      successfulPaths.forEach((path) => {
        const successManifestReq = httpMock.expectOne(`${path}/manifest.json`);
        successManifestReq.flush(mockManifest);

        const codeReq = httpMock.expectOne(`${path}/plugin.js`);
        codeReq.flush('console.log("test plugin");');
      });

      await service.initializePlugins();

      expect(service.isInitialized()).toBeTrue(); // Should still initialize despite failures
    });
  });

  describe('Side Panel Plugin Management', () => {
    beforeEach(() => {
      // Setup a loaded plugin for side panel tests - directly set internal state
      (service as any)._loadedPlugins = [mockPluginInstance];
    });

    it('should set active side panel plugin', (done) => {
      service.setActiveSidePanelPlugin('test-plugin');

      service.activeSidePanelPlugin$.subscribe((plugin) => {
        expect(plugin).toBeTruthy();
        expect(plugin?.manifest.id).toBe('test-plugin');
        done();
      });
    });

    it('should clear active side panel plugin', (done) => {
      service.setActiveSidePanelPlugin('test-plugin');
      service.setActiveSidePanelPlugin(null);

      service.activeSidePanelPlugin$.subscribe((plugin) => {
        expect(plugin).toBeNull();
        done();
      });
    });

    it('should get active side panel plugin ID', () => {
      service.setActiveSidePanelPlugin('test-plugin');
      expect(service.getActiveSidePanelPluginId()).toBe('test-plugin');
    });

    it('should return null for inactive side panel', () => {
      expect(service.getActiveSidePanelPluginId()).toBeNull();
    });

    it('should handle unknown plugin ID gracefully', (done) => {
      spyOn(console, 'warn');
      service.setActiveSidePanelPlugin('unknown-plugin');

      expect(console.warn).toHaveBeenCalledWith(
        'Plugin unknown-plugin not found or not loaded',
      );

      service.activeSidePanelPlugin$.subscribe((plugin) => {
        expect(plugin).toBeNull();
        done();
      });
    });
  });

  describe('Plugin Loading from Path', () => {
    beforeEach(() => {
      mockMetaPersistence.isPluginEnabled.and.returnValue(Promise.resolve(true));
      mockPluginSecurity.validatePluginManifest.and.returnValue({
        isValid: true,
        errors: [],
      });
      mockPluginSecurity.validatePluginCode.and.returnValue({
        isValid: true,
        errors: [],
      });
      mockPluginSecurity.requiresDangerousPermissions.and.returnValue(false);
      mockPluginRunner.loadPlugin.and.returnValue(Promise.resolve(mockPluginInstance));
    });

    it('should load plugin from path successfully', async () => {
      const pluginPath = 'assets/test-plugin';

      const manifestReq = httpMock.expectOne(`${pluginPath}/manifest.json`);
      manifestReq.flush(mockManifest);

      const codeReq = httpMock.expectOne(`${pluginPath}/plugin.js`);
      codeReq.flush('console.log("test");');

      const result = await service.loadPluginFromPath(pluginPath);

      expect(result).toEqual(mockPluginInstance);
      expect(mockPluginSecurity.validatePluginManifest).toHaveBeenCalled();
      expect(mockPluginSecurity.validatePluginCode).toHaveBeenCalled();
      expect(mockPluginRunner.loadPlugin).toHaveBeenCalled();
    });

    it('should handle disabled plugins', async () => {
      mockMetaPersistence.isPluginEnabled.and.returnValue(Promise.resolve(false));
      const pluginPath = 'assets/test-plugin';

      const manifestReq = httpMock.expectOne(`${pluginPath}/manifest.json`);
      manifestReq.flush(mockManifest);

      const codeReq = httpMock.expectOne(`${pluginPath}/plugin.js`);
      codeReq.flush('console.log("test");');

      const result = await service.loadPluginFromPath(pluginPath);

      expect(result.loaded).toBeFalse();
      expect(result.isEnabled).toBeFalse();
      expect(mockPluginRunner.loadPlugin).not.toHaveBeenCalled();
    });

    it('should handle manifest validation failures', async () => {
      mockPluginSecurity.validatePluginManifest.and.returnValue({
        isValid: false,
        errors: ['Invalid manifest'],
      });

      const pluginPath = 'assets/test-plugin';

      // Expect manifest request first
      const manifestReq = httpMock.expectOne(`${pluginPath}/manifest.json`);
      manifestReq.flush(mockManifest);

      // Expect plugin code request (validation happens after loading)
      const codeReq = httpMock.expectOne(`${pluginPath}/plugin.js`);
      codeReq.flush('console.log("test");');

      try {
        await service.loadPluginFromPath(pluginPath);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('Plugin manifest validation failed');
      }
    });
  });

  describe('Plugin ZIP Loading', () => {
    beforeEach(() => {
      mockMetaPersistence.isPluginEnabled.and.returnValue(Promise.resolve(true));
      mockPluginSecurity.validatePluginManifest.and.returnValue({
        isValid: true,
        errors: [],
      });
      mockPluginSecurity.validatePluginCode.and.returnValue({
        isValid: true,
        errors: [],
      });
      mockPluginSecurity.requiresDangerousPermissions.and.returnValue(false);
      mockPluginRunner.loadPlugin.and.returnValue(Promise.resolve(mockPluginInstance));
      mockPluginCache.storePlugin.and.returnValue(Promise.resolve());
    });

    it('should handle file size validation', async () => {
      // Create a mock file that's too large (>1MB)
      const largeFile = new File(['x'.repeat(1048577)], 'test.zip', {
        type: 'application/zip',
      });

      try {
        await service.loadPluginFromZip(largeFile);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('Plugin ZIP file is too large');
      }
    });

    it('should create error instance for failed loads', async () => {
      const invalidFile = new File(['invalid zip content'], 'test.zip', {
        type: 'application/zip',
      });

      const result = await service.loadPluginFromZip(invalidFile);

      expect(result.loaded).toBeFalse();
      expect(result.isEnabled).toBeFalse();
      expect(result.error).toBeTruthy();
    });
  });

  describe('Plugin Unloading and Removal', () => {
    beforeEach(() => {
      // Setup loaded plugins - directly set internal state
      (service as any)._loadedPlugins = [mockPluginInstance];
    });

    it('should unload plugin and clear side panel if active', () => {
      service.setActiveSidePanelPlugin('test-plugin');
      mockPluginRunner.unloadPlugin.and.returnValue(true);

      const result = service.unloadPlugin('test-plugin');

      expect(result).toBeTrue();
      expect(service.getActiveSidePanelPluginId()).toBeNull();
      expect(mockPluginRunner.unloadPlugin).toHaveBeenCalledWith('test-plugin');
    });

    it('should remove uploaded plugin completely', async () => {
      service.setActiveSidePanelPlugin('test-plugin');
      mockMetaPersistence.setPluginEnabled.and.returnValue(Promise.resolve());
      mockPluginCache.removePlugin.and.returnValue(Promise.resolve());
      mockUserPersistence.removePluginUserData.and.returnValue(Promise.resolve());
      mockMetaPersistence.removePluginMetadata.and.returnValue(Promise.resolve());
      mockPluginRunner.unloadPlugin.and.returnValue(true);

      await service.removeUploadedPlugin('test-plugin');

      expect(service.getActiveSidePanelPluginId()).toBeNull();
      expect(mockPluginCache.removePlugin).toHaveBeenCalledWith('test-plugin');
      expect(mockUserPersistence.removePluginUserData).toHaveBeenCalledWith(
        'test-plugin',
      );
      expect(mockMetaPersistence.removePluginMetadata).toHaveBeenCalledWith(
        'test-plugin',
      );
    });
  });

  describe('Plugin Icons and Content', () => {
    it('should return plugin icon content', () => {
      // Access private method for testing
      (service as any)._pluginIcons.set('test-plugin', '<svg>test</svg>');

      const icon = service.getPluginIcon('test-plugin');
      expect(icon).toBe('<svg>test</svg>');
    });

    it('should return null for non-existent icon', () => {
      const icon = service.getPluginIcon('non-existent');
      expect(icon).toBeNull();
    });

    it('should return plugin index HTML content', () => {
      // Access private method for testing
      (service as any)._pluginIndexHtml.set('test-plugin', '<html>test</html>');

      const html = service.getPluginIndexHtml('test-plugin');
      expect(html).toBe('<html>test</html>');
    });

    it('should return null for non-existent HTML', () => {
      const html = service.getPluginIndexHtml('non-existent');
      expect(html).toBeNull();
    });
  });

  describe('Base Configuration', () => {
    it('should return web platform configuration', async () => {
      // Reset theme to light for this test
      mockGlobalTheme.darkMode$.next('light');

      const baseCfg = await service.getBaseCfg();

      expect(baseCfg.platform).toBe('web');
      expect(baseCfg.theme).toBe('light');
      expect(baseCfg.isDev).toBe(true); // Test environment
      expect(baseCfg.appVersion).toBeTruthy();
    });

    it('should detect dark theme', async () => {
      mockGlobalTheme.darkMode$.next('dark');

      const baseCfg = await service.getBaseCfg();

      expect(baseCfg.theme).toBe('dark');
    });
  });

  describe('Hook Dispatching', () => {
    it('should dispatch hooks when initialized', async () => {
      // Initialize service first
      mockPluginCache.getAllPlugins.and.returnValue(Promise.resolve([]));

      const initPromise = service.initializePlugins();

      // Mock HTTP requests for built-in plugins
      const pluginPaths = [
        'assets/example-plugin',
        'assets/yesterday-tasks-plugin',
        'assets/markdown-list-to-task',
        'assets/test-side-panel-plugin',
      ];

      pluginPaths.forEach((path) => {
        const manifestReq = httpMock.expectOne(`${path}/manifest.json`);
        manifestReq.flush(mockManifest);

        const codeReq = httpMock.expectOne(`${path}/plugin.js`);
        codeReq.flush('console.log("test plugin");');
      });

      await initPromise;

      mockPluginHooks.dispatchHook.and.returnValue(Promise.resolve());

      await service.dispatchHook(PluginHooks.TASK_COMPLETE, { taskId: 'test' });

      expect(mockPluginHooks.dispatchHook).toHaveBeenCalledWith(
        PluginHooks.TASK_COMPLETE,
        { taskId: 'test' },
      );
    });

    it('should skip hook dispatch when not initialized', async () => {
      spyOn(console, 'warn');

      await service.dispatchHook(PluginHooks.TASK_COMPLETE, { taskId: 'test' });

      expect(console.warn).toHaveBeenCalledWith(
        'Plugin system not initialized, skipping hook dispatch',
      );
      expect(mockPluginHooks.dispatchHook).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle initialization errors gracefully', async () => {
      mockPluginCache.getAllPlugins.and.returnValue(
        Promise.reject(new Error('Cache error')),
      );

      try {
        await service.initializePlugins();
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Cache error');
      }

      expect(service.isInitialized()).toBeFalse();
    });

    it('should handle concurrent initialization attempts', async () => {
      mockPluginCache.getAllPlugins.and.returnValue(Promise.resolve([]));
      mockPluginCache.cleanupOldPlugins.and.returnValue(Promise.resolve());

      // Start multiple initialization attempts
      const init1 = service.initializePlugins();
      const init2 = service.initializePlugins();
      const init3 = service.initializePlugins();

      // Mock HTTP requests for built-in plugins (only first init will make requests)
      const pluginPaths = [
        'assets/example-plugin',
        'assets/yesterday-tasks-plugin',
        'assets/markdown-list-to-task',
        'assets/test-side-panel-plugin',
      ];

      pluginPaths.forEach((path) => {
        const manifestReq = httpMock.expectOne(`${path}/manifest.json`);
        manifestReq.flush(mockManifest);

        const codeReq = httpMock.expectOne(`${path}/plugin.js`);
        codeReq.flush('console.log("test plugin");');
      });

      await Promise.all([init1, init2, init3]);

      expect(service.isInitialized()).toBeTrue();
      // Cache should only be called once despite multiple init attempts
      expect(mockPluginCache.getAllPlugins).toHaveBeenCalledTimes(1);
    });
  });
});
