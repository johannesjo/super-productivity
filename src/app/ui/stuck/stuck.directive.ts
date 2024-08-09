import { AfterViewInit, Directive, ElementRef, OnDestroy } from '@angular/core';

const DEFAULT_PINNED_CLASS = 'is-stuck';

@Directive({
  selector: '[stuck]',
  standalone: true,
})
export class StuckDirective implements AfterViewInit, OnDestroy {
  private _observer?: IntersectionObserver;

  constructor(private elRef: ElementRef) {}

  ngAfterViewInit(): void {
    const el = this.elRef.nativeElement as HTMLElement;
    this._observer = new IntersectionObserver(
      // ([e]) => e.target.classList.toggle(DEFAULT_PINNED_CLASS, e.intersectionRatio < 1),
      ([e]) => {
        e.target.classList.toggle(DEFAULT_PINNED_CLASS, !e.isIntersecting);
        // console.log(e.boundingClientRect.top, e);
        // console.log('top', e.boundingClientRect.top < 0, e.isIntersecting);
        // if (e.boundingClientRect.top < 0) {
        //   e.target.classList.toggle(DEFAULT_PINNED_CLASS, e.isIntersecting);
        // }
      },
      {
        rootMargin: '0px',
        threshold: 1,
      },
    );

    this._observer.observe(el);
  }

  ngOnDestroy(): void {
    if (!this._observer) {
      throw new Error('Observer is not defined');
    }
    this._observer.unobserve(this.elRef.nativeElement as HTMLElement);
    this._observer.disconnect();
  }
}
