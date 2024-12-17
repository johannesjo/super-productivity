import { ChangeDetectionStrategy, Component, Inject, OnDestroy } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { T } from '../../t.const';
import { Subscription } from 'rxjs';
import { ESCAPE } from '@angular/cdk/keycodes';
import { LS } from '../../core/persistence/storage-keys.const';
import { isSmallScreen } from '../../util/is-small-screen';

type ViewMode = 'SPLIT' | 'PARSED' | 'TEXT_ONLY';
const ALL_VIEW_MODES: ['SPLIT', 'PARSED', 'TEXT_ONLY'] = ['SPLIT', 'PARSED', 'TEXT_ONLY'];

@Component({
  selector: 'dialog-fullscreen-markdown',
  templateUrl: './dialog-fullscreen-markdown.component.html',
  styleUrls: ['./dialog-fullscreen-markdown.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class DialogFullscreenMarkdownComponent implements OnDestroy {
  T: typeof T = T;
  viewMode: ViewMode = isSmallScreen() ? 'TEXT_ONLY' : 'SPLIT';

  private _subs: Subscription = new Subscription();

  constructor(
    public _matDialogRef: MatDialogRef<DialogFullscreenMarkdownComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
  ) {
    const lastViewMode = localStorage.getItem(LS.LAST_FULLSCREEN_EDIT_VIEW_MODE);
    if (
      ALL_VIEW_MODES.includes(lastViewMode as ViewMode) &&
      // empty notes should never be in preview mode
      data.content.trim().length > 0
    ) {
      this.viewMode = lastViewMode as ViewMode;

      if (this.viewMode === 'SPLIT' && isSmallScreen()) {
        this.viewMode = 'TEXT_ONLY';
      }
    }

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

  keydownHandler(ev: KeyboardEvent): void {
    if (ev.key === 'Enter' && ev.ctrlKey) {
      this.close();
    }
  }

  ngModelChange(data: string): void {}

  ngOnDestroy(): void {
    this._subs.unsubscribe();
  }

  close(isSkipSave: boolean = false): void {
    this._matDialogRef.close(isSkipSave || this.data.content);
  }

  onViewModeChange(): void {
    localStorage.setItem(LS.LAST_FULLSCREEN_EDIT_VIEW_MODE, this.viewMode);
  }
}
