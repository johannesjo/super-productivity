import { Directive, HostListener, Input } from '@angular/core';
import { IS_ELECTRON } from '../../../../app.constants';
import { TaskAttachmentType } from '../task-attachment.model';
import { SnackService } from '../../../../core/snack/snack.service';
import { T } from '../../../../t.const';

@Directive({
  selector: '[taskAttachmentLink]',
})
export class TaskAttachmentLinkDirective {
  @Input() type?: TaskAttachmentType;
  @Input() href?: string;

  constructor(private _snackService: SnackService) {}

  @HostListener('click', ['$event']) onClick(ev: Event): void {
    if (!this.href) {
      throw new Error('No href');
    }

    if (ev.target) {
      const el = ev.target as HTMLElement;
      el.blur();
    }
    if (IS_ELECTRON) {
      ev.preventDefault();
      if (!this.type || this.type === 'LINK') {
        this._openExternalUrl(this.href);
      } else if (this.type === 'FILE') {
        window.electronAPI.openPath(this.href);
      } else if (this.type === 'COMMAND') {
        this._snackService.open({
          msg: T.GLOBAL_SNACK.RUNNING_X,
          translateParams: { str: this.href },
          ico: 'laptop_windows',
        });
        this._exec(this.href);
      }
    } else if (this.type === 'LINK') {
      this._openExternalUrl(this.href);
    }
  }

  private _openExternalUrl(rawUrl: string): void {
    if (!rawUrl) {
      return;
    }

    // try to account for jira(?) adding a second http to the url
    const url = rawUrl
      .replace('https://https://', 'https://')
      .replace('http://http://', 'http://');

    if (IS_ELECTRON) {
      window.electronAPI.openExternal(url);
    } else {
      const win = window.open(url, '_blank');
      if (win) {
        win.focus();
      }
    }
  }

  private _exec(command: string): void {
    window.electronAPI.exec(command);
  }
}
