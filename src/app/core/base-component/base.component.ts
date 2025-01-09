import { ChangeDetectionStrategy, Component, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';

@Component({
  selector: 'base',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class BaseComponent implements OnDestroy {
  protected onDestroy$ = new Subject<void>();

  ngOnDestroy(): void {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }
}
