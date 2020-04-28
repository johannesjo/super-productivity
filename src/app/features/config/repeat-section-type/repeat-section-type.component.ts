import {ChangeDetectionStrategy, Component} from '@angular/core';
import {FieldArrayType} from '@ngx-formly/core';
import {T} from 'src/app/t.const';

@Component({
  selector: 'repeat-section-type',
  templateUrl: './repeat-section-type.component.html',
  styleUrls: ['./repeat-section-type.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RepeatSectionTypeComponent extends FieldArrayType {
  T = T;

}
