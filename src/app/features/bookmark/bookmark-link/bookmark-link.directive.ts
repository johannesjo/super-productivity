import { Directive, HostListener, input, inject } from '@angular/core';
import { IS_ELECTRON } from '../../../app.constants';
import { BookmarkType } from '../bookmark.model';
import { SnackService } from '../../../core/snack/snack.service';
import { T } from '../../../t.const';

@Directive({ selector: '[bookmarkLink]' })
export class BookmarkLinkDirective {
  private _snackService = inject(SnackService);

  readonly type = input<BookmarkType>();
  readonly href = input<BookmarkType>();

  @HostListener('click', ['$event']) onClick(ev: Event): void {
    const type = this.type();
    const href = this.href();
    if (!type || !href) {
      return;
    }

    if (ev.target) {
      const el = ev.target as HTMLElement;
      el.blur();
    }
    if (IS_ELECTRON) {
      ev.preventDefault();
      if (!type || type === 'LINK') {
        this._openExternalUrl(href);
      } else if (type === 'FILE') {
        window.ea.openPath(href);
      } else if (type === 'COMMAND') {
        this._snackService.open({
          msg: T.GLOBAL_SNACK.RUNNING_X,
          translateParams: { str: href },
          ico: 'laptop_windows',
        });
        this._exec(href);
      }
    } else if (type === 'LINK') {
      this._openExternalUrl(href);
    }
  }

  private _openExternalUrl(rawUrl: string): void {
    // try to account for jira(?) adding a second http to the url
    const url = rawUrl
      .replace('https://https://', 'https://')
      .replace('http://http://', 'http://');

    if (IS_ELECTRON) {
      window.ea.openExternalUrl(url);
    } else {
      const win = window.open(url, '_blank');
      if (win) {
        win.focus();
      }
    }
  }

  private _exec(command: string): void {
    window.ea.exec(command);
  }
}
