import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FieldType, FormlyModule } from '@ngx-formly/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ReactiveFormsModule } from '@angular/forms';
import { ColorPickerDirective } from 'ngx-color-picker';
import { GlobalThemeService } from '../../../../app/core/theme/global-theme.service';

@Component({
  selector: 'color-input',
  standalone: true,
  imports: [
    FormlyModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
    ColorPickerDirective,
  ],
  templateUrl: './color-input.component.html',
  styleUrls: ['./color-input.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ColorInputComponent extends FieldType {
  readonly globalThemeService = inject(GlobalThemeService);
}
