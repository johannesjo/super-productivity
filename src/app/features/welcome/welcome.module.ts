import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiModule } from '../../ui/ui.module';
import { DialogWelcomeComponent } from './dialog-welcome/dialog-welcome.component';
import { MatDialog } from '@angular/material/dialog';
import { LS_HAS_WELCOME_DIALOG_BEEN_SHOWN } from '../../core/persistence/ls-keys.const';
import { Store } from '@ngrx/store';
import { ProjectService } from '../project/project.service';
import { DataInitService } from '../../core/data-init/data-init.service';
import { concatMap, first, switchMap } from 'rxjs/operators';
import { EMPTY } from 'rxjs';

@NgModule({
  declarations: [DialogWelcomeComponent],
  imports: [CommonModule, UiModule],
  exports: [DialogWelcomeComponent],
})
export class WelcomeModule {
  constructor(
    private _matDialog: MatDialog,
    private _store: Store,
    private _projectService: ProjectService,
    private _dataInitService: DataInitService,
  ) {
    if (
      !localStorage.getItem(LS_HAS_WELCOME_DIALOG_BEEN_SHOWN) &&
      navigator.userAgent !== 'NIGHTWATCH'
    ) {
      this._dataInitService.isAllDataLoadedInitially$
        .pipe(
          concatMap(() => this._projectService.list$.pipe(first())),
          switchMap((projectList) => {
            if (projectList.length <= 2) {
              return this._matDialog
                .open(DialogWelcomeComponent, { autoFocus: false })
                .afterClosed();
            } else {
              localStorage.setItem(LS_HAS_WELCOME_DIALOG_BEEN_SHOWN, 'true');
              return EMPTY;
            }
          }),
        )
        .subscribe((dialogRes) => {
          if (dialogRes === true) {
            localStorage.setItem(LS_HAS_WELCOME_DIALOG_BEEN_SHOWN, 'true');
          }
        });
    }
  }
}
