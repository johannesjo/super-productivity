import { Component, Input } from '@angular/core';
import { FormlyFieldConfig, FormlyFormOptions } from '@ngx-formly/core';
import { FormGroup } from '@angular/forms';
import { ConfigService } from '../config.service';

@Component({
  selector: 'config-form',
  templateUrl: './config-form.component.html',
  styleUrls: ['./config-form.component.scss']
})
export class ConfigFormComponent {

  @Input() cfg;
  @Input() sectionKey;

  // somehow needed for the form to work
  @Input() set formCfg(val_: FormlyFieldConfig[]) {
    this.fields =  val_ && [...val_];
  }

  fields: FormlyFieldConfig[];
  form = new FormGroup({});
  options: FormlyFormOptions = {
    formState: {
      awesomeIsForced: false,
    },
  };

  constructor(private readonly _configService: ConfigService) {
  }

  submit() {
    if (!this.cfg) {
      throw new Error('No cfg for ' + this.sectionKey);
    } else {
      this._configService.updateSection(this.sectionKey, this.cfg);
    }
  }
}
