import { AfterViewInit, ChangeDetectionStrategy, Component } from '@angular/core';
import { ShepherdMyService } from './shepherd-my.service';
import { LS } from '../../core/persistence/storage-keys.const';

@Component({
  selector: 'shepherd',
  template: '',
  // templateUrl: './shepherd.component.html',
  // styleUrls: ['./shepherd.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShepherdComponent implements AfterViewInit {
  constructor(private shepherdMyService: ShepherdMyService) {}

  ngAfterViewInit(): void {
    if (!localStorage.getItem(LS.IS_SHOW_TOUR) && navigator.userAgent !== 'NIGHTWATCH') {
      this.shepherdMyService.init();
    }
  }
}
