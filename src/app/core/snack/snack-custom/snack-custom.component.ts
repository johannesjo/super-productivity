import {
  ChangeDetectionStrategy,
  Component,
  Inject,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { MAT_SNACK_BAR_DATA, MatSnackBarRef } from '@angular/material/snack-bar';
import { SnackParams } from '../snack.model';
import { Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

@Component({
  selector: 'snack-custom',
  templateUrl: './snack-custom.component.html',
  styleUrls: ['./snack-custom.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SnackCustomComponent implements OnInit, OnDestroy {
  private _subs: Subscription = new Subscription();

  constructor(
    @Inject(MAT_SNACK_BAR_DATA) public data: SnackParams,
    public snackBarRef: MatSnackBarRef<SnackCustomComponent>,
  ) {}

  ngOnInit() {
    if (this.data.promise) {
      this.data.promise.finally(() => {
        this.snackBarRef.dismiss();
      });
    }
    if (this.data.showWhile$) {
      this._subs.add(
        this.data.showWhile$.pipe(debounceTime(300)).subscribe((v) => {
          if (!v) {
            this.snackBarRef.dismiss();
          }
        }),
      );
    }
  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
  }

  actionClick() {
    if (this.data.actionFn) {
      this.data.actionFn();
    }
    this.snackBarRef.dismissWithAction();
  }

  close() {
    this.snackBarRef.dismissWithAction();
  }
}
