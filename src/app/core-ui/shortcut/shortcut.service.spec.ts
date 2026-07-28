import { TestBed } from '@angular/core/testing';
import { ShortcutService } from './shortcut.service';
import { GlobalConfigService } from '../../features/config/global-config.service';
import { Router } from '@angular/router';
import { LayoutService } from '../layout/layout.service';
import { MatDialog } from '@angular/material/dialog';
import { TaskService } from '../../features/tasks/task.service';
import { WorkContextService } from '../../features/work-context/work-context.service';
import { ActivatedRoute } from '@angular/router';
import { UiHelperService } from '../../features/ui-helper/ui-helper.service';
import { SyncWrapperService } from '../../imex/sync/sync-wrapper.service';
import { Store } from '@ngrx/store';
import { PluginBridgeService } from '../../plugins/plugin-bridge.service';
import { TaskShortcutService } from '../../features/tasks/task-shortcut.service';
import { OverlayContainer } from '@angular/cdk/overlay';
import { signal } from '@angular/core';
import { of } from 'rxjs';

describe('ShortcutService', () => {
  let service: ShortcutService;
  let mockTaskShortcutService: any;
  let mockRouter: any;
  let mockConfigService: any;
  let mockMatDialog: any;

  beforeEach(() => {
    mockMatDialog = {
      openDialogs: [],
      open: jasmine.createSpy('open'),
    };
    mockTaskShortcutService = {
      handleTaskShortcuts: jasmine
        .createSpy('handleTaskShortcuts')
        .and.returnValue(false),
      handleTogglePlayFallback: jasmine
        .createSpy('handleTogglePlayFallback')
        .and.returnValue(false),
    };
    mockRouter = {
      navigate: jasmine.createSpy('navigate'),
      url: '/',
    };
    mockConfigService = {
      cfg: signal({
        keyboard: {
          goToScheduledView: 'Shift+S',
          showHelp: '?',
        },
      }),
      appFeatures: signal({
        isFocusModeEnabled: true,
      }),
    };

    TestBed.configureTestingModule({
      providers: [
        ShortcutService,
        { provide: TaskShortcutService, useValue: mockTaskShortcutService },
        { provide: Router, useValue: mockRouter },
        { provide: GlobalConfigService, useValue: mockConfigService },
        { provide: LayoutService, useValue: { isNavOpen: signal(false) } },
        { provide: MatDialog, useValue: mockMatDialog },
        { provide: TaskService, useValue: { currentTaskId: signal(null) } },
        { provide: WorkContextService, useValue: { activeWorkContext$: signal({}) } },
        { provide: ActivatedRoute, useValue: { queryParams: of({}) } },
        { provide: UiHelperService, useValue: {} },
        { provide: SyncWrapperService, useValue: {} },
        { provide: Store, useValue: { dispatch: jasmine.createSpy('dispatch') } },
        { provide: PluginBridgeService, useValue: { shortcuts: signal([]) } },
        {
          provide: OverlayContainer,
          useValue: {
            getContainerElement: () => ({
              querySelector: () => null,
              children: [],
            }),
          },
        },
      ],
    });

    service = TestBed.inject(ShortcutService);
  });

  describe('handleKeyDown', () => {
    it('should NOT navigate to schedule if TaskShortcutService handled Shift+S', () => {
      mockTaskShortcutService.handleTaskShortcuts.and.returnValue(true);
      const ev = new KeyboardEvent('keydown', {
        code: 'KeyS',
        shiftKey: true,
      });
      Object.defineProperty(ev, 'target', { value: document.body });

      service.handleKeyDown(ev);

      expect(mockTaskShortcutService.handleTaskShortcuts).toHaveBeenCalledWith(ev);
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });

    it('should navigate to schedule if TaskShortcutService did NOT handle Shift+S', () => {
      mockTaskShortcutService.handleTaskShortcuts.and.returnValue(false);
      const ev = new KeyboardEvent('keydown', {
        code: 'KeyS',
        shiftKey: true,
      });
      Object.defineProperty(ev, 'target', { value: document.body });

      service.handleKeyDown(ev);

      expect(mockTaskShortcutService.handleTaskShortcuts).toHaveBeenCalledWith(ev);
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/schedule']);
    });

    it('should open the shortcut cheat sheet on "?"', async () => {
      const ev = new KeyboardEvent('keydown', {
        key: '?',
        code: 'Slash',
        shiftKey: true,
      });
      Object.defineProperty(ev, 'target', { value: document.body });

      await service.handleKeyDown(ev);

      expect(mockMatDialog.open).toHaveBeenCalled();
    });

    it('should NOT open the shortcut cheat sheet when a modifier is held', async () => {
      const ev = new KeyboardEvent('keydown', {
        key: '?',
        code: 'Slash',
        shiftKey: true,
        metaKey: true,
      });
      Object.defineProperty(ev, 'target', { value: document.body });

      await service.handleKeyDown(ev);

      expect(mockMatDialog.open).not.toHaveBeenCalled();
    });

    it('should open the shortcut cheat sheet for "?" produced via AltGr', async () => {
      const ev = new KeyboardEvent('keydown', {
        key: '?',
        code: 'Digit3',
        ctrlKey: true,
        altKey: true,
      });
      Object.defineProperty(ev, 'target', { value: document.body });

      await service.handleKeyDown(ev);

      expect(mockMatDialog.open).toHaveBeenCalled();
    });

    it('should NOT open the shortcut cheat sheet when showHelp is unbound', async () => {
      mockConfigService.cfg.set({
        keyboard: { goToScheduledView: 'Shift+S', showHelp: null },
      });
      const ev = new KeyboardEvent('keydown', {
        key: '?',
        code: 'Slash',
        shiftKey: true,
      });
      Object.defineProperty(ev, 'target', { value: document.body });

      await service.handleKeyDown(ev);

      expect(mockMatDialog.open).not.toHaveBeenCalled();
    });

    it('should open the shortcut cheat sheet for a custom showHelp combo', async () => {
      mockConfigService.cfg.set({
        keyboard: { goToScheduledView: 'Shift+S', showHelp: 'Ctrl+K' },
      });
      const ev = new KeyboardEvent('keydown', {
        key: 'k',
        code: 'KeyK',
        ctrlKey: true,
      });
      Object.defineProperty(ev, 'target', { value: document.body });

      await service.handleKeyDown(ev);

      expect(mockMatDialog.open).toHaveBeenCalled();
    });

    it('should only open one cheat sheet for rapid repeated presses', async () => {
      mockMatDialog.open.and.callFake(() => {
        mockMatDialog.openDialogs.push({});
        return { afterClosed: () => of(undefined) };
      });
      const createEv = (): KeyboardEvent => {
        const ev = new KeyboardEvent('keydown', {
          key: '?',
          code: 'Slash',
          shiftKey: true,
        });
        Object.defineProperty(ev, 'target', { value: document.body });
        return ev;
      };

      await Promise.all([
        service.handleKeyDown(createEv()),
        service.handleKeyDown(createEv()),
        service.handleKeyDown(createEv()),
      ]);

      expect(mockMatDialog.open).toHaveBeenCalledTimes(1);
    });
  });
});
