import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormlyFieldConfig, FormlyModule } from '@ngx-formly/core';
import { FieldType } from '@ngx-formly/material';
import { MatButton } from '@angular/material/button';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'formly-btn',
  templateUrl: './formly-btn.component.html',
  styleUrl: './formly-btn.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormlyModule, MatButton, TranslatePipe],
})
export class FormlyBtnComponent extends FieldType<FormlyFieldConfig> {
  isExpanded = signal(false);

  onClick(): void {
    console.log(this);

    if (this.to.onClick) {
      this.to.onClick(this.field, this.form, this.model);
    }
  }
}
