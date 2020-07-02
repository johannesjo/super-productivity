import { Directive, ElementRef, HostListener, Input } from '@angular/core';
import { download } from '../../util/download';

@Directive({
  selector: '[simpleDownload]'
})
export class SimpleDownloadDirective {
  @Input() simpleDownload: string;
  @Input() simpleDownloadData: string;

  constructor(private _el: ElementRef) {
  }

  @HostListener('click') onClick() {
    if (!this._el.nativeElement.getAttribute('download')) {
      const fileName = this.simpleDownload;
      download(fileName, this.simpleDownloadData);
    }
  }
}
