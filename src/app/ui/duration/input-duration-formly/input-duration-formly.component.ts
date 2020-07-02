import { ChangeDetectionStrategy, Component, ViewChild } from '@angular/core';
import { MatInput } from '@angular/material/input';
import { FieldType } from '@ngx-formly/material';

@Component({
  selector: 'input-duration-formly',
  templateUrl: './input-duration-formly.component.html',
  styleUrls: ['./input-duration-formly.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InputDurationFormlyComponent extends FieldType {
  @ViewChild(MatInput, {static: true}) formFieldControl: MatInput;
}
