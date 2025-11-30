import { Directive, ElementRef, HostListener, inject, input } from '@angular/core';
import { download } from '../../util/download';
import { Log } from '../../core/log';

@Directive({ selector: '[simpleDownload]' })
export class SimpleDownloadDirective {
  private _el = inject(ElementRef);

  readonly simpleDownload = input<string>();
  readonly simpleDownloadData = input<string>();

  @HostListener('click')
  async onClick(): Promise<void> {
    if (!this._el.nativeElement.getAttribute('download')) {
      const fileName = this.simpleDownload() as string;
      try {
        await download(fileName, this.simpleDownloadData() as string);
      } catch (e) {
        Log.error(e);
      }
    }
  }
}
