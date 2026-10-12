import { AnimationCallbackEvent } from '@angular/core';
import { ANI_STANDARD_TIMING_, TRANSITION_DURATION_M } from './animation.const';

const DURATION_MS = parseInt(TRANSITION_DURATION_M, 10);

/**
 * `(animate.enter)` / `(animate.leave)` handlers that grow or collapse a list
 * row. They run once per row after change detection, so the single height read
 * reuses the layout the frame needs anyway. The legacy `@angular/animations`
 * list trigger they replace forced extra style and layout passes for every
 * matched row, which made deleting or scheduling a task stutter on mobile.
 */
export const animateListItemEnter = (ev: AnimationCallbackEvent): void => {
  const el = ev.target as HTMLElement;
  const height = el.offsetHeight;
  el.animate(
    [
      { opacity: 0, height: 0, transform: 'scale(0)' },
      { opacity: 1, height: `${height}px`, transform: 'scale(1)' },
    ],
    { duration: DURATION_MS, easing: ANI_STANDARD_TIMING_ },
  );
  ev.animationComplete();
};

export const animateListItemLeave = (ev: AnimationCallbackEvent): void => {
  const el = ev.target as HTMLElement;
  const ani = el.animate(
    [
      { height: `${el.offsetHeight}px`, transform: 'scale(1)' },
      { height: 0, transform: 'scale(0)' },
    ],
    { duration: DURATION_MS, easing: ANI_STANDARD_TIMING_, fill: 'forwards' },
  );
  const done = (): void => ev.animationComplete();
  ani.onfinish = done;
  ani.oncancel = done;
};

export const animateExpandFadeEnter = (ev: AnimationCallbackEvent): void => {
  const el = ev.target as HTMLElement;
  el.animate(
    [
      { opacity: 0, height: 0, overflow: 'hidden' },
      { opacity: 1, height: `${el.offsetHeight}px`, overflow: 'hidden' },
    ],
    { duration: DURATION_MS, easing: ANI_STANDARD_TIMING_ },
  );
  ev.animationComplete();
};

export const animateExpandFadeLeave = (ev: AnimationCallbackEvent): void => {
  const el = ev.target as HTMLElement;
  const ani = el.animate(
    [
      { opacity: 1, height: `${el.offsetHeight}px`, overflow: 'hidden' },
      { opacity: 0, height: 0, overflow: 'hidden' },
    ],
    { duration: DURATION_MS, easing: ANI_STANDARD_TIMING_, fill: 'forwards' },
  );
  const done = (): void => ev.animationComplete();
  ani.onfinish = done;
  ani.oncancel = done;
};
