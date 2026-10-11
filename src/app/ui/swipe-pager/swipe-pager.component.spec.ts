import { Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SwipePagerComponent, SwipePagerPageDirective } from './swipe-pager.component';
import { SwipePagerDirection, MAX_CLAIM_DELAY_MS } from './swipe-pager-gesture';

@Component({
  standalone: true,
  imports: [SwipePagerComponent, SwipePagerPageDirective],
  template: `
    <swipe-pager
      style="width: 400px"
      [prev]="current() > min() ? current() - 1 : null"
      [current]="current()"
      [next]="current() + 1"
      [isEnabled]="isEnabled()"
      [(isWarm)]="isWarm"
      (navigate)="onNavigate($event)"
    >
      <ng-template
        [swipePagerPage]="current()"
        let-page
        let-isCurrent="isCurrent"
      >
        <div
          class="test-page"
          [attr.data-page]="page"
          [class.isCurrent]="isCurrent"
        >
          {{ page }}
        </div>
      </ng-template>
    </swipe-pager>
  `,
})
class HostComponent {
  readonly pager = viewChild.required(SwipePagerComponent<number>);
  readonly current = signal(5);
  readonly min = signal(0);
  readonly isEnabled = signal(true);
  readonly isWarm = signal(false);
  readonly navigations: SwipePagerDirection[] = [];

  onNavigate(direction: SwipePagerDirection): void {
    this.navigations.push(direction);
    this.current.update((c) => c + direction);
  }
}

const fireTouch = (
  el: HTMLElement,
  type: 'touchstart' | 'touchmove' | 'touchend',
  x: number,
  y = 100,
): TouchEvent => {
  const touch = new Touch({ identifier: 1, target: el, clientX: x, clientY: y });
  const ev = new TouchEvent(type, {
    bubbles: true,
    cancelable: true,
    touches: type === 'touchend' ? [] : [touch],
    changedTouches: [touch],
  });
  el.dispatchEvent(ev);
  return ev;
};

describe('SwipePagerComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  let pagerEl: HTMLElement;

  const pageNumbers = (): string[] =>
    Array.from(
      pagerEl.querySelectorAll<HTMLElement>('.test-page'),
      (el) => el.dataset.page ?? '',
    );
  const currentPage = (): string | undefined =>
    pagerEl.querySelector<HTMLElement>('.test-page.isCurrent')?.dataset.page;
  const trackTransform = (): string =>
    pagerEl.querySelector<HTMLElement>('.track')!.style.transform;

  /** Starts a touch, lets the neighbours render, then moves horizontally. */
  const pan = async (deltaX: number, deltaY = 0): Promise<void> => {
    fireTouch(pagerEl, 'touchstart', 200);
    await fixture.whenStable();
    // Past the claim threshold first, so the pan follows from there.
    const claimX = Math.sign(deltaX) * 20;
    fireTouch(pagerEl, 'touchmove', 200 + claimX, 100 + deltaY);
    fireTouch(pagerEl, 'touchmove', 200 + deltaX, 100 + deltaY);
  };

  beforeEach(async () => {
    // No settle animation: the pager finishes synchronously.
    spyOn(window, 'matchMedia').and.returnValue({
      matches: true,
    } as MediaQueryList);
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    await fixture.whenStable();
    pagerEl = fixture.nativeElement.querySelector('swipe-pager');
  });

  afterEach(() => fixture.destroy());

  it('renders only the current page until touched', async () => {
    expect(pageNumbers()).toEqual(['5']);

    fireTouch(pagerEl, 'touchstart', 200);
    await fixture.whenStable();

    expect(host.isWarm()).toBeTrue();
    expect(pageNumbers()).toEqual(['4', '5', '6']);
    const neighbours = pagerEl.querySelectorAll<HTMLElement>('.page[inert]');
    expect(neighbours.length).toBe(2);
  });

  it('pages to the next page after a long enough pan', async () => {
    await pan(-150);
    expect(trackTransform()).toContain('-130px');

    fireTouch(pagerEl, 'touchend', 50);
    await fixture.whenStable();

    expect(host.navigations).toEqual([1]);
    expect(currentPage()).toBe('6');
    expect(trackTransform()).toBe('');
  });

  it('pages back after a pan to the right', async () => {
    await pan(150);
    fireTouch(pagerEl, 'touchend', 350);
    await fixture.whenStable();

    expect(host.navigations).toEqual([-1]);
    expect(currentPage()).toBe('4');
  });

  it('snaps back after a short, slow pan', async () => {
    await pan(-60);
    // Hold still past the velocity window, so the release is not a fling.
    await new Promise((resolve) => setTimeout(resolve, 150));
    fireTouch(pagerEl, 'touchmove', 140);
    fireTouch(pagerEl, 'touchend', 140);
    await fixture.whenStable();

    expect(host.navigations).toEqual([]);
    expect(trackTransform()).toBe('');
  });

  it('leaves vertical moves to scrolling', async () => {
    fireTouch(pagerEl, 'touchstart', 200);
    await fixture.whenStable();
    const move = fireTouch(pagerEl, 'touchmove', 205, 160);
    fireTouch(pagerEl, 'touchend', 205, 160);
    await fixture.whenStable();

    expect(move.defaultPrevented).toBeFalse();
    expect(trackTransform()).toBe('');
    expect(host.navigations).toEqual([]);
  });

  it('resists and never pages towards a missing page', async () => {
    host.min.set(5);
    await fixture.whenStable();

    await pan(200);
    expect(trackTransform()).toContain('45px');
    fireTouch(pagerEl, 'touchend', 400);
    await fixture.whenStable();

    expect(host.navigations).toEqual([]);
  });

  it('leaves a move after a long press to drag and drop', async () => {
    jasmine.clock().install();
    try {
      jasmine.clock().mockDate(new Date(2026, 0, 1));
      fireTouch(pagerEl, 'touchstart', 200);
      jasmine.clock().tick(MAX_CLAIM_DELAY_MS + 50);
      fireTouch(pagerEl, 'touchmove', 50);
      fireTouch(pagerEl, 'touchend', 50);
    } finally {
      jasmine.clock().uninstall();
    }
    await fixture.whenStable();

    expect(host.navigations).toEqual([]);
  });

  it('does not pan while disabled', async () => {
    host.isEnabled.set(false);
    await fixture.whenStable();

    await pan(-150);
    fireTouch(pagerEl, 'touchend', 50);
    await fixture.whenStable();

    expect(host.navigations).toEqual([]);
    expect(host.isWarm()).toBeFalse();
  });

  it('go() renders the neighbour first and then pages to it', async () => {
    host.pager().go(1);
    await fixture.whenStable();
    await fixture.whenStable();

    expect(host.isWarm()).toBeTrue();
    expect(host.navigations).toEqual([1]);
    expect(currentPage()).toBe('6');
  });

  it('go() does nothing towards a missing page', async () => {
    host.min.set(5);
    await fixture.whenStable();

    host.pager().go(-1);
    await fixture.whenStable();
    await fixture.whenStable();

    expect(host.navigations).toEqual([]);
  });
});
