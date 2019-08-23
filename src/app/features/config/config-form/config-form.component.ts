import {ChangeDetectionStrategy, Component, EventEmitter, Input, Output} from '@angular/core';
import {FormlyFieldConfig, FormlyFormOptions} from '@ngx-formly/core';
import {FormGroup} from '@angular/forms';
import {GlobalConfigSectionKey} from '../global-config.model';
import {ProjectCfgFormKey} from '../../project/project.model';
import {T} from '../../../t.const';

@Component({
  selector: 'config-form',
  templateUrl: './config-form.component.html',
  styleUrls: ['./config-form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfigFormComponent {

  T = T;
  config: any;
  @Input() sectionKey;
  @Output() save: EventEmitter<{ sectionKey: GlobalConfigSectionKey | ProjectCfgFormKey, config: any }> = new EventEmitter();
  fields: FormlyFieldConfig[];
  form = new FormGroup({});
  options: FormlyFormOptions = {};

  constructor() {
  }

  @Input() set cfg(cfg) {
    this.config = {...cfg};
  }

  // somehow needed for the form to work
  @Input() set formCfg(val: FormlyFieldConfig[]) {
    this.fields = val && [...val];
  }

  submit() {
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
