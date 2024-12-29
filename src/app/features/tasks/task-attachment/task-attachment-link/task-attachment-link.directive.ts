import { Directive, HostListener, input } from '@angular/core';
import { IS_ELECTRON } from '../../../../app.constants';
import { TaskAttachmentType } from '../task-attachment.model';
import { SnackService } from '../../../../core/snack/snack.service';
import { T } from '../../../../t.const';

@Directive({
  selector: '[taskAttachmentLink]',
  standalone: false,
})
export class TaskAttachmentLinkDirective {
  readonly type = input<TaskAttachmentType>();
  readonly href = input<string>();

  constructor(private _snackService: SnackService) {}

  @HostListener('click', ['$event']) onClick(ev: Event): void {
    const href = this.href();
    if (!href) {
      throw new Error('No href');
    }

    if (ev.target) {
      const el = ev.target as HTMLElement;
      el.blur();
    }
    if (IS_ELECTRON) {
      ev.preventDefault();
      const type = this.type();
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
    } else if (this.type() === 'LINK') {
      this._openExternalUrl(href);
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
