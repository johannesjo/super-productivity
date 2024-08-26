import { Injectable, NgZone } from '@angular/core';
import { IS_ELECTRON } from '../../app.constants';
import { checkKeyCombo } from '../../util/check-key-combo';
import { GlobalConfigService } from '../../features/config/global-config.service';
import { ActivatedRoute, Router } from '@angular/router';
import { LayoutService } from '../layout/layout.service';
import { TaskService } from '../../features/tasks/task.service';
import { MatDialog } from '@angular/material/dialog';
import { DialogAddNoteComponent } from '../../features/note/dialog-add-note/dialog-add-note.component';
import { BookmarkService } from '../../features/bookmark/bookmark.service';
import { IPC } from '../../../../electron/shared-with-frontend/ipc-events.const';
import { UiHelperService } from '../../features/ui-helper/ui-helper.service';
import { WorkContextService } from '../../features/work-context/work-context.service';
import { WorkContextType } from '../../features/work-context/work-context.model';
import { SnackService } from '../../core/snack/snack.service';
import { TranslateService } from '@ngx-translate/core';
import { T } from '../../t.const';
import { Store } from '@ngrx/store';
import { showFocusOverlay } from '../../features/focus-mode/store/focus-mode.actions';
import { SyncProviderService } from '../../imex/sync/sync-provider.service';
import { first } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class ShortcutService {
  backlogPos?: number;

  constructor(
    private _configService: GlobalConfigService,
    private _router: Router,
    private _layoutService: LayoutService,
    private _matDialog: MatDialog,
    private _taskService: TaskService,
    private _workContextService: WorkContextService,
    private _snackService: SnackService,
    private _activatedRoute: ActivatedRoute,
    private _uiHelperService: UiHelperService,
    private _bookmarkService: BookmarkService,
    private _translateService: TranslateService,
    private _syncProviderService: SyncProviderService,
    private _ngZone: NgZone,
    private _store: Store,
  ) {
    this._activatedRoute.queryParams.subscribe((params) => {
      if (params && params.backlogPos) {
        this.backlogPos = +params.backlogPos;
      }
    });

    // GLOBAL SHORTCUTS
    if (IS_ELECTRON) {
      window.ea.on(IPC.TASK_TOGGLE_START, () => {
        this._ngZone.run(() => {
          this._taskService.toggleStartTask();
        });
      });
      window.ea.on(IPC.ADD_TASK, () => {
        this._ngZone.run(() => {
          this._layoutService.showAddTaskBar();
        });
      });
      window.ea.on(IPC.ADD_NOTE, () => {
        if (this._matDialog.openDialogs.length === 0) {
          this._ngZone.run(() => {
            this._matDialog.open(DialogAddNoteComponent, {
              minWidth: '100vw',
              height: '100vh',
              restoreFocus: true,
            });
          });
        }
      });
    }
  }

  async handleKeyDown(ev: KeyboardEvent): Promise<void> {
    const cfg = this._configService.cfg;
    if (!cfg) {
      throw new Error();
    }

    const keys = cfg.keyboard;
    const el = ev.target as HTMLElement;

    // don't run when inside input or text area and if no special keys are used
    if (
      ((el && el.tagName === 'INPUT') ||
        el.tagName === 'TEXTAREA' ||
        el.getAttribute('contenteditable')) &&
      !ev.ctrlKey &&
      !ev.metaKey
    ) {
      return;
    }

    if (
      checkKeyCombo(ev, keys.toggleBacklog) &&
      this._workContextService.activeWorkContextType === WorkContextType.PROJECT
    ) {
      let backlogPos = 0;
      switch (this.backlogPos) {
        case 50:
          backlogPos = 0;
          break;
        case 0:
          backlogPos = 100;
          break;
        default:
          backlogPos = 50;
      }
      this._router.navigate(['/active/tasks'], {
        queryParams: { backlogPos },
      });
    } else if (checkKeyCombo(ev, keys.goToFocusMode)) {
      this._store.dispatch(showFocusOverlay());
    } else if (checkKeyCombo(ev, keys.goToWorkView)) {
      this._router.navigate(['/active/tasks']).then(() => {
        window.setTimeout(() => {
          this._taskService.focusFirstTaskIfVisible();
        });
      });
    } else if (checkKeyCombo(ev, keys.goToTimeline)) {
      this._router.navigate(['/timeline']);
    } else if (checkKeyCombo(ev, keys.goToSettings)) {
      this._router.navigate(['/config']);
    } else if (checkKeyCombo(ev, keys.goToScheduledView)) {
      this._router.navigate(['/schedule']);

      // } else if (checkKeyCombo(ev, keys.goToDailyAgenda)) {
      //   this._router.navigate(['/daily-agenda']);
      //
      // } else if (checkKeyCombo(ev, keys.goToFocusMode)) {
      //   this._router.navigate(['/focus-view']);
    } else if (checkKeyCombo(ev, keys.showSearchBar)) {
      this._layoutService.toggleSearchBar();
      ev.preventDefault();
    } else if (checkKeyCombo(ev, keys.toggleSideNav)) {
      this._layoutService.toggleSideNav();
      ev.preventDefault();
    } else if (checkKeyCombo(ev, keys.addNewTask)) {
      this._layoutService.toggleAddTaskBar();
      ev.preventDefault();
    } else if (checkKeyCombo(ev, keys.addNewNote)) {
      if (this._matDialog.openDialogs.length === 0) {
        this._matDialog.open(DialogAddNoteComponent, {
          minWidth: '100vw',
          height: '100vh',
          restoreFocus: true,
        });
        ev.preventDefault();
      }
    } else if (checkKeyCombo(ev, keys.openProjectNotes)) {
      ev.preventDefault();
      this._layoutService.toggleNotes();
    } else if (checkKeyCombo(ev, keys.triggerSync)) {
      ev.preventDefault();
      if (await this._syncProviderService.isEnabled$.pipe(first()).toPromise()) {
        this._syncProviderService.sync();
      }
    } else if (checkKeyCombo(ev, keys.toggleBookmarks)) {
      ev.preventDefault();
      if (this._workContextService.activeWorkContextType === WorkContextType.PROJECT) {
        this._bookmarkService.toggleBookmarks();
      } else {
        this._snackService.open({
          msg: this._translateService.instant(
            T.GLOBAL_SNACK.SHORTCUT_WARN_OPEN_BOOKMARKS_FROM_TAG,
            { keyCombo: keys.toggleBookmarks },
          ),
        });
      }
    } else if (
      checkKeyCombo(ev, 'Ctrl+Shift+*') &&
      document.activeElement &&
      document.activeElement.getAttribute('routerlink') === '/procrastination'
    ) {
      throw new Error('Intentional Error Fun (dont worry)');
    }

    // special hidden dev tools combo to use them for production
    if (IS_ELECTRON) {
      if (checkKeyCombo(ev, 'Ctrl+Shift+J')) {
        window.ea.openDevTools();
      } else if (checkKeyCombo(ev, keys.zoomIn)) {
        this._uiHelperService.zoomBy(0.05);
      } else if (checkKeyCombo(ev, keys.zoomOut)) {
        this._uiHelperService.zoomBy(-0.05);
      } else if (checkKeyCombo(ev, keys.zoomDefault)) {
        this._uiHelperService.zoomTo(1);
      }
    }
  }
}
