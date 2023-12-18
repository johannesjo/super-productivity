import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { FormlyFieldConfig, FormlyFormOptions } from '@ngx-formly/core';
import { UntypedFormGroup } from '@angular/forms';
import { GlobalConfigSectionKey } from '../global-config.model';
import { ProjectCfgFormKey } from '../../project/project.model';
import { T } from '../../../t.const';
import { exists } from '../../../util/exists';

@Component({
  selector: 'config-form',
  templateUrl: './config-form.component.html',
  styleUrls: ['./config-form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfigFormComponent {
  T: typeof T = T;
  config?: Record<string, unknown>;
  @Input() sectionKey?: GlobalConfigSectionKey | ProjectCfgFormKey;
  @Output() save: EventEmitter<{
    sectionKey: GlobalConfigSectionKey | ProjectCfgFormKey;
    config: unknown;
  }> = new EventEmitter();
  fields?: FormlyFieldConfig[];
  form: UntypedFormGroup = new UntypedFormGroup({});
  options: FormlyFormOptions = {};

  constructor() {}

  @Input() set cfg(cfg: Record<string, unknown>) {
    this.config = { ...cfg };
  }

  // somehow needed for the form to work
  @Input() set formCfg(val: FormlyFieldConfig[]) {
    this.fields = val && [...val];
  }

  updateCfg(cfg: Record<string, unknown>): void {
    if (!cfg) {
      throw new Error('No config for ' + this.sectionKey);
    }
    this.config = cfg;
    if (this.form.valid) {
      this.save.emit({
        sectionKey: exists(this.sectionKey),
        config: this.config,
      });
    } else {
      this.form.updateValueAndValidity();
    }
  }
}
