import { Directive, ElementRef, HostListener, Input } from '@angular/core';

@Directive({
  selector: '[simpleDownload]'
})
export class SimpleDownloadDirective {
  @Input() simpleDownload: string;
  @Input() simpleDownloadData: string;

  constructor(private _el: ElementRef) {
  }

  @HostListener('click') onClick() {
    const fileName = this.simpleDownload;

    const dataStr = 'data:text/plain;charset=utf-8,' + encodeURIComponent(this.simpleDownloadData);
    this._el.nativeElement.setAttribute('href', dataStr);
    this._el.nativeElement.setAttribute('download', fileName);
  }
}
