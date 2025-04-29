import { ChangeDetectionStrategy, Component } from '@angular/core';
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
  onClick(): void {
    if (this.to.onClick) {
      const r = this.to.onClick(this.field, this.form, this.model);
      if ('then' in r) {
        r.then((v) => {
          console.log('update', v, this);
          this.formControl.setValue(v);
          this.form.markAsDirty();
        });
      } else {
        this.formControl.setValue(r);
      }
    }
  }
}
