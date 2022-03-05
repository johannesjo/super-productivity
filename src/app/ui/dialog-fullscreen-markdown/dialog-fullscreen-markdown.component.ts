import { ChangeDetectionStrategy, Component, Inject, OnDestroy } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { T } from '../../t.const';
import { Subscription } from 'rxjs';
import { ESCAPE } from '@angular/cdk/keycodes';

type ViewMode = 'SPLIT' | 'PARSED' | 'TEXT_ONLY';

@Component({
  selector: 'dialog-fullscreen-markdown',
  templateUrl: './dialog-fullscreen-markdown.component.html',
  styleUrls: ['./dialog-fullscreen-markdown.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogFullscreenMarkdownComponent implements OnDestroy {
  T: typeof T = T;
  // TODO load and save last from local storage
  viewMode: ViewMode = 'SPLIT';

  private _subs: Subscription = new Subscription();

  constructor(
    private _matDialogRef: MatDialogRef<DialogFullscreenMarkdownComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
  ) {
    // we want to save as default
    _matDialogRef.disableClose = true;
    this._subs.add(
      _matDialogRef.keydownEvents().subscribe((e) => {
        if ((e as any).keyCode === ESCAPE) {
          e.preventDefault();
          this.close();
        }
      }),
    );
  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
  }

  close(isSkipSave: boolean = false): void {
    this._matDialogRef.close(isSkipSave || this.data.content);
  }

  onViewModeChange(): void {
    console.log(this.viewMode);
  }
}
