import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FieldArrayType } from '@ngx-formly/core';
import { T } from 'src/app/t.const';
import { EMPTY_SIMPLE_COUNTER } from '../../simple-counter/simple-counter.const';
import * as shortid from 'shortid';
import { standardListAnimation } from '../../../ui/animations/standard-list.ani';

@Component({
  selector: 'repeat-section-type',
  templateUrl: './repeat-section-type.component.html',
  styleUrls: ['./repeat-section-type.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [standardListAnimation],
})
export class RepeatSectionTypeComponent extends FieldArrayType {
  T: typeof T = T;

  constructor() {
    super();
  }

  removeItem(i: number) {
    super.remove(i);
  }

  addItem() {
    // if we need this later we can use defaultOptions for configuring this
    super.add(undefined, {
      ...EMPTY_SIMPLE_COUNTER,
      id: shortid(),
      isEnabled: true,
    });
  }

  trackByFn(i: number, item: any) {
    return item
      ? item.id
      : i;
  }
}
