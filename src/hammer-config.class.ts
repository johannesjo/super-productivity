import { HammerGestureConfig } from '@angular/platform-browser';

export class MyHammerConfig extends HammerGestureConfig {
  overrides = <any>{
    'pinch': {enabled: false},
    'rotate': {enabled: false}
  };
}
