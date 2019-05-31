import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { FormlyFieldConfig, FormlyFormOptions } from '@ngx-formly/core';
import { FormGroup } from '@angular/forms';
import { ConfigSectionKey } from '../config.model';
import { ProjectCfgFormKey } from '../../project/project.model';

@Component({
  selector: 'config-form',
  templateUrl: './config-form.component.html',
  styleUrls: ['./config-form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfigFormComponent {

  config: any;
  @Input() sectionKey;
  @Output() save: EventEmitter<{ sectionKey: ConfigSectionKey | ProjectCfgFormKey, config: any }> = new EventEmitter();
  fields: FormlyFieldConfig[];
  form = new FormGroup({});
  options: FormlyFormOptions = {};

  constructor() {
  }

  @Input() set cfg(cfg) {
    this.config = {...cfg};
  }

  // somehow needed for the form to work
  @Input() set formCfg(val_: FormlyFieldConfig[]) {
    this.fields = val_ && [...val_];
  }

  submit() {
    console.log(this.config);

    if (!this.config) {
      throw new Error('No config for ' + this.sectionKey);
    } else {
      this.save.emit({
        sectionKey: this.sectionKey,
        config: this.config,
      });
    }
  }
}
