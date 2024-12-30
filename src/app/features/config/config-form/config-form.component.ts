import { ChangeDetectionStrategy, Component, Input, input, output } from '@angular/core';
import { FormlyFieldConfig, FormlyFormOptions, FormlyModule } from '@ngx-formly/core';
import { FormsModule, ReactiveFormsModule, UntypedFormGroup } from '@angular/forms';
import { GlobalConfigSectionKey } from '../global-config.model';
import { ProjectCfgFormKey } from '../../project/project.model';
import { T } from '../../../t.const';
import { exists } from '../../../util/exists';
import { adjustToLiveFormlyForm } from '../../../util/adjust-to-live-formly-form';

@Component({
  selector: 'config-form',
  templateUrl: './config-form.component.html',
  styleUrls: ['./config-form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, ReactiveFormsModule, FormlyModule],
})
export class ConfigFormComponent {
  T: typeof T = T;
  config?: Record<string, unknown>;
  readonly sectionKey = input<GlobalConfigSectionKey | ProjectCfgFormKey>();
  readonly save = output<{
    sectionKey: GlobalConfigSectionKey | ProjectCfgFormKey;
    config: unknown;
  }>();
  fields?: FormlyFieldConfig[];
  form: UntypedFormGroup = new UntypedFormGroup({});
  options: FormlyFormOptions = {};

  constructor() {}

  // TODO: Skipped for migration because:
  //  Accessor inputs cannot be migrated as they are too complex.
  @Input() set cfg(cfg: Record<string, unknown>) {
    this.config = { ...cfg };
  }

  // NOTE: updating the input before assigning to local var is somehow needed for the form to work
  // NOTE2: since we don't have a save button anymore we need to debounce inputs

  // TODO: Skipped for migration because:
  //  Accessor inputs cannot be migrated as they are too complex.
  @Input() set formCfg(val: FormlyFieldConfig[]) {
    this.fields = adjustToLiveFormlyForm(val);
  }

  updateCfg(cfg: Record<string, unknown>): void {
    if (!cfg) {
      throw new Error('No config for ' + this.sectionKey());
    }
    this.config = cfg;
    if (this.form.valid) {
      this.save.emit({
        sectionKey: exists(this.sectionKey()),
        config: this.config,
      });
    } else {
      this.form.updateValueAndValidity();
    }
  }
}
