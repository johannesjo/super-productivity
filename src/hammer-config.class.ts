import {HammerGestureConfig} from '@angular/platform-browser';

export class MyHammerConfig extends HammerGestureConfig {
  overrides = <any>{
    pan: {direction: 6},
    'pinch': {enable: false},
    'rotate': {enable: false}
  };
}
