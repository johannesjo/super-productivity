import {Injectable, NgZone} from '@angular/core';
import {IS_ELECTRON} from '../../app.constants';
import {checkKeyCombo} from '../../util/check-key-combo';
import {GlobalConfigService} from '../../features/config/global-config.service';
import {ActivatedRoute, Router} from '@angular/router';
import {LayoutService} from '../layout/layout.service';
import {NoteService} from '../../features/note/note.service';
import {TaskService} from '../../features/tasks/task.service';
import {MatDialog} from '@angular/material/dialog';
import {DialogAddNoteComponent} from '../../features/note/dialog-add-note/dialog-add-note.component';
import {BookmarkService} from '../../features/bookmark/bookmark.service';
import {IPC} from '../../../../electron/ipc-events.const';
import {UiHelperService} from '../../features/ui-helper/ui-helper.service';
import {ElectronService} from '../../core/electron/electron.service';


@Injectable({
  providedIn: 'root',
})
export class ShortcutService {
  backlogPos: number;

  constructor(
    private _configService: GlobalConfigService,
    private _router: Router,
    private _electronService: ElectronService,
    private _layoutService: LayoutService,
    private _matDialog: MatDialog,
    private _noteService: NoteService,
    private _taskService: TaskService,
    private _activatedRoute: ActivatedRoute,
    private _uiHelperService: UiHelperService,
    private _bookmarkService: BookmarkService,
    private _ngZone: NgZone,
  ) {
    this._activatedRoute.queryParams
      .subscribe((params) => {
        if (params && params.backlogPos) {
          this.backlogPos = +params.backlogPos;
        }
      });

    // GLOBAL SHORTCUTS
    if (IS_ELECTRON) {
      this._electronService.ipcRenderer.on(IPC.TASK_TOGGLE_START, () => {
        this._ngZone.run(() => {
          this._taskService.toggleStartTask();
        });
      });
      this._electronService.ipcRenderer.on(IPC.ADD_TASK, () => {
        this._ngZone.run(() => {
          this._layoutService.showAddTaskBar();
        });
      });
      this._electronService.ipcRenderer.on(IPC.ADD_NOTE, () => {
        if (this._matDialog.openDialogs.length === 0) {
          this._ngZone.run(() => {
            this._matDialog.open(DialogAddNoteComponent);
          });
        }
      });
    }
  }

  handleKeyDown(ev: KeyboardEvent) {
    const cfg = this._configService.cfg;
    const keys = cfg.keyboard;
    const el = ev.target as HTMLElement;

    // don't run when inside input or text area and if no special keys are used
    if ((el && el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.getAttribute('contenteditable'))
      && !ev.ctrlKey && !ev.metaKey) {
      return;
    }

    // if (checkKeyCombo(ev, cfg.keyboard.openDistractionPanel)) {
    //   Dialogs('DISTRACTIONS', undefined, true);
    // }
    // if (checkKeyCombo(ev, cfg.keyboard.showHelp)) {
    //   Dialogs('HELP', {template: 'PAGE'}, true);
    // }
    //
    if (checkKeyCombo(ev, keys.toggleBacklog)) {
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
        queryParams: {backlogPos}
      });

    } else if (checkKeyCombo(ev, keys.goToWorkView)) {
      this._router.navigate(['/active/tasks']);

    } else if (checkKeyCombo(ev, keys.goToSettings)) {
      this._router.navigate(['/settings']);

      // } else if (checkKeyCombo(ev, keys.goToDailyAgenda)) {
      //   this._router.navigate(['/daily-agenda']);
      //
      // } else if (checkKeyCombo(ev, keys.goToFocusMode)) {
      //   this._router.navigate(['/focus-view']);

    } else if (checkKeyCombo(ev, keys.addNewTask)) {
      this._layoutService.toggleAddTaskBar();
      ev.preventDefault();

    } else if (checkKeyCombo(ev, keys.addNewNote)) {
      if (this._matDialog.openDialogs.length === 0) {
        this._matDialog.open(DialogAddNoteComponent);
        ev.preventDefault();
      }

    } else if (checkKeyCombo(ev, keys.openProjectNotes)) {
      this._layoutService.toggleNotes();
      ev.preventDefault();

    } else if (checkKeyCombo(ev, keys.toggleBookmarks)) {
      this._bookmarkService.toggleBookmarks();
      ev.preventDefault();
    }

    // special hidden dev tools combo to use them for production
    if (IS_ELECTRON) {
      if (checkKeyCombo(ev, 'Ctrl+Shift+J')) {
        this._electronService.ipcRenderer.send('TOGGLE_DEV_TOOLS');
      } else if (checkKeyCombo(ev, keys.zoomIn)) {
        this._uiHelperService.zoom(0.05);
      } else if (checkKeyCombo(ev, keys.zoomOut)) {
        this._uiHelperService.zoom(-0.05);
      } else if (checkKeyCombo(ev, keys.zoomDefault)) {
        this._uiHelperService.zoom(0);
      }
    }
  }
}
