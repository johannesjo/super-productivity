import { ChangeDetectionStrategy, Component, ViewChild } from '@angular/core';
import { FieldType } from '@ngx-formly/material';
import { MatInput } from '@angular/material';

@Component({
  selector: 'input-duration-formly',
  templateUrl: './input-duration-formly.component.html',
  styleUrls: ['./input-duration-formly.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InputDurationFormlyComponent extends FieldType {
  @ViewChild(MatInput) formFieldControl: MatInput;
}
