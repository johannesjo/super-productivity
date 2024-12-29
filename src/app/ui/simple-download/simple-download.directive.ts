import { Directive, ElementRef, HostListener, input } from '@angular/core';
import { download } from '../../util/download';

@Directive({
  selector: '[simpleDownload]',
  standalone: false,
})
export class SimpleDownloadDirective {
  readonly simpleDownload = input<string>();
  readonly simpleDownloadData = input<string>();

  constructor(private _el: ElementRef) {}

  @HostListener('click') onClick(): void {
    if (!this._el.nativeElement.getAttribute('download')) {
      const fileName = this.simpleDownload() as string;
      download(fileName, this.simpleDownloadData() as string);
    }
  }
}
