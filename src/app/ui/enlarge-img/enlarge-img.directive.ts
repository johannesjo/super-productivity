import { Directive, ElementRef, HostListener, Input, Renderer2 } from '@angular/core';
import { getCoords } from './get-coords';

const LARGE_IMG_ID = 'enlarged-img';

@Directive({
  selector: '[enlargeImg]'
})
export class EnlargeImgDirective {
  imageEl: HTMLElement;
  newImageEl: HTMLElement;
  lightboxParentEl: HTMLElement = document.body;
  enlargedImgWrapperEl: HTMLElement;
  isImg: boolean;
  zoomMode: number = 0;
  zoomMoveHandler: () => void;

  @Input() enlargeImg: string;

  constructor(
    private _renderer: Renderer2,
    private _el: ElementRef
  ) {
    this.imageEl = _el.nativeElement;
  }

  @HostListener('click', ['$event']) onClick(ev: MouseEvent) {
    this.isImg = (this.imageEl.tagName.toLowerCase() === 'img');

    if (this.isImg || this.enlargeImg) {
      this._showImg();
    }
  }

  private _hideImg() {
    this._setOriginCoordsForImageAni();
    this._renderer.addClass(this.enlargedImgWrapperEl, 'ani-remove');
    this._renderer.removeClass(this.enlargedImgWrapperEl, 'ani-enter');

    this.enlargedImgWrapperEl.addEventListener('transitionend', () => {
      this.enlargedImgWrapperEl.remove();
    });
  }

  private _setOriginCoordsForImageAni() {
    const origImgCoords = getCoords(this.imageEl);
    const newImageCoords = getCoords(this.newImageEl);
    const scale = this.imageEl.offsetWidth / this.newImageEl.offsetWidth || 0.01;
    const startLeft = origImgCoords.left - newImageCoords.left;
    const startTop = origImgCoords.top - newImageCoords.top;

    this._renderer.setStyle(this.newImageEl, 'transform', `translate3d(${startLeft}px, ${startTop}px, 0) scale(${scale})`);
  }

  private _showImg() {
    const src = this.enlargeImg || this.imageEl.getAttribute('src');

    const img = new Image();
    img.src = src;
    img.onload = () => {
      this._setOriginCoordsForImageAni();
      this._waitForImgRender().then(() => {
        this._renderer.addClass(this.enlargedImgWrapperEl, 'ani-enter');
        this._renderer.setStyle(this.newImageEl, 'transform', `translate3d(0, 0, 0) scale(1)`);
      });
    };
    img.onerror = () => {
      this._hideImg();
    };

    this.enlargedImgWrapperEl = this._htmlToElement(`<div class="enlarged-image-wrapper"></div>`);
    this.newImageEl = this._htmlToElement(`<img src="${src}" class="enlarged-image" id=${LARGE_IMG_ID}>`);
    this._renderer.appendChild(this.enlargedImgWrapperEl, this.newImageEl);
    this._renderer.appendChild(this.lightboxParentEl, this.enlargedImgWrapperEl);
    this.zoomMode = 0;
    this.enlargedImgWrapperEl.addEventListener('click', () => {
      if (this.zoomMode === 0) {
        this._hideImg();
      } else {
        this.newImageEl.addEventListener('transitionend', () => {
          setTimeout(() => {
            this._hideImg();
          });
        });
        this._zoomOutImg();
      }
    });
    this.newImageEl.addEventListener('click', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      if (this.zoomMode === 0) {
        this._zoomImg();
      } else {
        this.newImageEl.addEventListener('transitionend', () => {
          setTimeout(() => {
            this._hideImg();
          });
        });
        this._zoomOutImg();
      }
      this.zoomMode++;
    });
  }

  private _zoomImg() {
    this._renderer.addClass(this.enlargedImgWrapperEl, 'isZoomed');
    this._renderer.setStyle(this.newImageEl, 'transform', `scale(2) translate3d(-25%, -25%, 0)`);
    this.zoomMoveHandler = this._zoom.bind(this);
    this.enlargedImgWrapperEl.addEventListener('mousemove', this.zoomMoveHandler);
  }

  private _zoomOutImg() {
    this.enlargedImgWrapperEl.removeEventListener('mousemove', this.zoomMoveHandler);
    this._renderer.removeClass(this.enlargedImgWrapperEl, 'isZoomed');
    this._renderer.setStyle(this.newImageEl, 'transform', `scale(1) translate3d(0, 0, 0)`);
  }

  private _htmlToElement(html: string): HTMLElement {
    const template = document.createElement('template');
    html = html.trim(); // Never return a text node of whitespace as the result
    template.innerHTML = html;
    return template.content.firstChild as HTMLElement;
  }

  private _zoom(e: MouseEvent) {
    const offsetX = e.clientX;
    const offsetY = e.clientY;
    const zoomer = this.enlargedImgWrapperEl;
    const extra = 1.1;
    const magicSpace = 5;
    const x = (offsetX / zoomer.offsetWidth * 100 - magicSpace) * -0.5 * extra;
    const y = (offsetY / zoomer.offsetHeight * 100 - magicSpace) * -0.5 * extra;
    this._renderer.setStyle(this.newImageEl, 'transform', `scale(2) translate3d(${x}%, ${y}%, 0)`);
  }

  private _waitForImgRender() {
    function rafAsync() {
      return new Promise(resolve => {
        requestAnimationFrame(resolve);
      });
    }

    function checkElement(id: string) {
      const el = document.getElementById(id);
      if (el === null || !(el.offsetHeight > 1)) {
        return rafAsync().then(() => checkElement(id));
      } else {
        return Promise.resolve(true);
      }
    }

    return checkElement(LARGE_IMG_ID);
  }
}
