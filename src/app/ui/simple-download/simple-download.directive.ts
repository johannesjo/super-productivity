import { Directive, ElementRef, HostListener, inject, input } from '@angular/core';
import { download } from '../../util/download';

@Directive({ selector: '[simpleDownload]' })
export class SimpleDownloadDirective {
  private _el = inject(ElementRef);

  readonly simpleDownload = input<string>();
  readonly simpleDownloadData = input<string>();

  @HostListener('click') onClick(): void {
    if (!this._el.nativeElement.getAttribute('download')) {
      const fileName = this.simpleDownload() as string;
      download(fileName, this.simpleDownloadData() as string);
    }
  }
}
