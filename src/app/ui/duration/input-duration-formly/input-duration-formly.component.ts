import {ChangeDetectionStrategy, Component, ViewChild} from '@angular/core';
import {MatInput} from '@angular/material/input';
import {FieldType} from '../../formly-material-components/form-field';

@Component({
  selector: 'input-duration-formly',
  templateUrl: './input-duration-formly.component.html',
  styleUrls: ['./input-duration-formly.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InputDurationFormlyComponent extends FieldType {
  @ViewChild(MatInput, {static: true}) formFieldControl: MatInput;
}
