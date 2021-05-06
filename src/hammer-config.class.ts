import { HammerGestureConfig } from '@angular/platform-browser';
import { Injectable } from '@angular/core';
// TODO remove once https://github.com/angular/angular/issues/37907 is resolved
import 'hammerjs';

const DIRECTION_LEFT = 2;
const DIRECTION_RIGHT = 4;
// eslint-disable-next-line no-bitwise
const DIRECTION_HORIZONTAL = DIRECTION_LEFT | DIRECTION_RIGHT;

@Injectable({ providedIn: 'root' })
export class MyHammerConfig extends HammerGestureConfig {
  overrides: {
    [key: string]: Record<string, unknown>;
  } = {
    swipe: { direction: DIRECTION_HORIZONTAL },
    pan: { direction: 6 },
    pinch: { enable: false },
    rotate: { enable: false },
  };
}
