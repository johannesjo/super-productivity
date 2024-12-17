import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FieldArrayType } from '@ngx-formly/core';
import { T } from 'src/app/t.const';
import { standardListAnimation } from '../../../ui/animations/standard-list.ani';

@Component({
  selector: 'repeat-section-type',
  templateUrl: './repeat-section-type.component.html',
  styleUrls: ['./repeat-section-type.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [standardListAnimation],
  standalone: false,
})
export class RepeatSectionTypeComponent extends FieldArrayType {
  T: typeof T = T;

  constructor() {
    super();
  }

  removeItem(i: number): void {
    super.remove(i, { markAsDirty: true });
  }

  addItem(): void {
    const fn = this.field?.templateOptions?.getInitialValue;
    const initialValue =
      this.field?.templateOptions?.defaultValue || (fn && fn(this.field));

    super.add(undefined, initialValue);
  }

  trackByFn(i: number, item: any): number | string {
    return item ? item.id : i;
  }
}
