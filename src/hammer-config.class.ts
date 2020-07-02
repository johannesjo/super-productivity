import { HammerGestureConfig } from '@angular/platform-browser';
import * as Hammer from 'hammerjs';
import { Injectable } from '@angular/core';

@Injectable({providedIn: 'root'})
export class MyHammerConfig extends HammerGestureConfig {
  overrides: {
    [key: string]: {};
  } = {
    swipe: {direction: Hammer.DIRECTION_HORIZONTAL},
    pan: {direction: 6},
    pinch: {enable: false},
    rotate: {enable: false}
  } as any;
}
