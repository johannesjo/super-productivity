import {HammerGestureConfig} from '@angular/platform-browser';
import {Injectable} from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class MyHammerConfig extends HammerGestureConfig {
  overrides = {
    pan: {direction: 6},
    pinch: {enable: false},
    rotate: {enable: false}
  } as any;
}
