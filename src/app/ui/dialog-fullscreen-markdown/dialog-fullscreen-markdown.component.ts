import { ChangeDetectionStrategy, Component, Inject, OnDestroy } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { T } from '../../t.const';
import { Subscription } from 'rxjs';
import { ESCAPE } from '@angular/cdk/keycodes';

@Component({
  selector: 'dialog-fullscreen-markdown',
  templateUrl: './dialog-fullscreen-markdown.component.html',
  styleUrls: ['./dialog-fullscreen-markdown.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DialogFullscreenMarkdownComponent implements OnDestroy {
  T: typeof T = T;

  private _subs: Subscription = new Subscription();

  constructor(
    private _matDialogRef: MatDialogRef<DialogFullscreenMarkdownComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    // we want to save as default
    _matDialogRef.disableClose = true;
    this._subs.add(_matDialogRef.keydownEvents().subscribe(e => {
      if ((e as any).keyCode === ESCAPE) {
        e.preventDefault();
        this.close();
      }
    }));
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
  }

  close(isSkipSave: boolean = false) {
    this._matDialogRef.close(isSkipSave || this.data.content);
  }
}
