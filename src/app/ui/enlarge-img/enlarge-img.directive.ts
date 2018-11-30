import { Directive, ElementRef, HostListener, Input, Renderer2 } from '@angular/core';
import { getCoords } from './get-coords';

@Directive({
  selector: '[enlargeImg]'
})
export class EnlargeImgDirective {
  imageEl: HTMLElement;
  newImageEl: HTMLElement;
  lightboxParentEl = document.body;
  enlargedImgWrapperEl: HTMLElement;
  isImg: boolean;
  zoomMode = 0;

  @Input() enlargeImg: string;
  @Input() isHideEl: boolean;

  constructor(
    private _renderer: Renderer2,
    private _el: ElementRef
  ) {
    this.imageEl = _el.nativeElement;
  }

  @HostListener('click', ['$event']) onClick(ev) {
    this.isImg = (this.imageEl.tagName.toLowerCase() === 'img');

    if (this.isImg || this.enlargeImg) {
      this._showImg();
    }
  }

  private _hideImg() {
    this._renderer.removeClass(this.enlargedImgWrapperEl, 'ani-enter');
    this._renderer.addClass(this.enlargedImgWrapperEl, 'ani-remove');
    this._setCoordsForImageAni();

    this.enlargedImgWrapperEl.addEventListener('transitionend', () => {
      this.enlargedImgWrapperEl.remove();
      if (this.isHideEl) {
        this.imageEl.setAttribute('style', `visibility: visible`);
      }
    });
  }

  private _setCoordsForImageAni() {
    const origImgCoords = getCoords(this.imageEl);
    const newImageCoords = getCoords(this.newImageEl);

    const scale = this.imageEl.offsetWidth / this.newImageEl.offsetWidth || 0.01;
    const startLeft = origImgCoords.left - newImageCoords.left;
    const startTop = origImgCoords.top - newImageCoords.top;

    this.newImageEl.setAttribute('style', `transform: translate3d(${startLeft}px, ${startTop}px, 0) scale(${scale})`);
  }

  private _showImg() {
    const src = this.enlargeImg || this.imageEl.getAttribute('src');

    const img = new Image();
    img.src = src;
    img.onload = () => {
      this._setCoordsForImageAni();
      setTimeout(() => {
        this._renderer.addClass(this.enlargedImgWrapperEl, 'ani-enter');
      }, 10);
    };

    this.enlargedImgWrapperEl = this._htmlToElement(`<div class="enlarged-image-wrapper"></div>`);
    this.newImageEl = this._htmlToElement(`<img src="${src}" class="enlarged-image">`);
    this._renderer.appendChild(this.enlargedImgWrapperEl, this.newImageEl);
    this._renderer.appendChild(this.lightboxParentEl, this.enlargedImgWrapperEl);
    this.zoomMode = 0;
    this.enlargedImgWrapperEl.addEventListener('click', () => {
      if (this.zoomMode === 0) {
        // this._zoomImg();
      } else {
        // this._zoomOutImg();
        this._hideImg();
      }
      this.zoomMode++;
    });
    if (this.isHideEl) {
      this.imageEl.setAttribute('style', `visibility: hidden`);
    }
  }

  private _zoomImg() {
    this._renderer.addClass(this.enlargedImgWrapperEl, 'isZoomed');
  }

  private _zoomOutImg(){
    this._renderer.removeClass(this.enlargedImgWrapperEl, 'isZoomed');
  }

  private _htmlToElement(html): HTMLElement {
    const template = document.createElement('template');
    html = html.trim(); // Never return a text node of whitespace as the result
    template.innerHTML = html;
    return template.content.firstChild as HTMLElement;
  }
}
