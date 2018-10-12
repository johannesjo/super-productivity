import { Component } from '@angular/core';
import { Input } from '@angular/core';
import { FormlyFieldConfig } from '@ngx-formly/core';
import { FormlyFormOptions } from '@ngx-formly/core';
import { FormGroup } from '@angular/forms';
import { ConfigService } from '../config.service';

@Component({
  selector: 'config-form',
  templateUrl: './config-form.component.html',
  styleUrls: ['./config-form.component.css']
})
export class ConfigFormComponent {

  @Input() cfg;
  @Input() sectionKey;

  // somehow needed for the form to work
  @Input() set formCfg(val_: FormlyFieldConfig[]) {
    this.fields = val_;
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
    this._configService.updateSection(this.sectionKey, this.cfg);
  }
}
