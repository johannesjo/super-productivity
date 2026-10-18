import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  MatDialog,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogTitle,
} from '@angular/material/dialog';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { Store } from '@ngrx/store';
import { TranslatePipe } from '@ngx-translate/core';
import { BehaviorSubject, from } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { T } from '../../../../t.const';
import { selectTaskEntities } from '../../store/task.selectors';
import { RecentlyDeletedService } from '../recently-deleted.service';
import { RecentlyDeletedEntry } from '../recently-deleted.util';
import { SnackService } from '../../../../core/snack/snack.service';
import { DialogConfirmComponent } from '../../../../ui/dialog-confirm/dialog-confirm.component';
import { DateTimeFormatService } from '../../../../core/date-time-format/date-time-format.service';
import { LocaleDatePipe } from '../../../../ui/pipes/locale-date.pipe';
import { truncate } from '../../../../util/truncate';

@Component({
  selector: 'dialog-recently-deleted',
  templateUrl: './dialog-recently-deleted.component.html',
  styleUrl: './dialog-recently-deleted.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatDialogClose,
    MatButton,
    MatIcon,
    TranslatePipe,
    LocaleDatePipe,
  ],
})
export class DialogRecentlyDeletedComponent {
  private readonly _recentlyDeletedService = inject(RecentlyDeletedService);
  private readonly _matDialog = inject(MatDialog);
  private readonly _snackService = inject(SnackService);
  private readonly _taskEntities = inject(Store).selectSignal(selectTaskEntities);
  private readonly _reload$ = new BehaviorSubject<void>(undefined);
  private readonly _storedEntries = toSignal(
    this._reload$.pipe(switchMap(() => from(this._recentlyDeletedService.getEntries()))),
  );

  readonly locale = inject(DateTimeFormatService).currentLocale;
  readonly T: typeof T = T;

  // Families that are live again (restored on another device, or recreated by
  // a concurrent edit that won over the delete) are not "deleted" any more.
  readonly entries = computed<RecentlyDeletedEntry[] | undefined>(() => {
    const stored = this._storedEntries();
    if (!stored) return undefined;
    const taskEntities = this._taskEntities();
    return stored.filter((entry) => !taskEntities[entry.id]);
  });

  async restore(entry: RecentlyDeletedEntry): Promise<void> {
    await this._recentlyDeletedService.restore(entry);
    this._snackService.open({
      type: 'SUCCESS',
      msg: T.F.TASK.D_RECENTLY_DELETED.RESTORED,
      translateParams: { title: truncate(entry.task.title) },
    });
    this._reload$.next();
  }

  emptyTrash(): void {
    this._matDialog
      .open(DialogConfirmComponent, {
        restoreFocus: true,
        data: {
          okTxt: T.F.TASK.D_RECENTLY_DELETED.EMPTY,
          message: T.F.TASK.D_RECENTLY_DELETED.CONFIRM_EMPTY,
          translateParams: { nr: this.entries()?.length ?? 0 },
        },
      })
      .afterClosed()
      .subscribe(async (isConfirm: boolean) => {
        if (isConfirm) {
          await this._recentlyDeletedService.empty();
          this._reload$.next();
        }
      });
  }
}
