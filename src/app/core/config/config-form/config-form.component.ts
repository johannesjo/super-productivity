import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormlyFieldConfig, FormlyFormOptions } from '@ngx-formly/core';
import { FormGroup } from '@angular/forms';
import { ConfigService } from '../config.service';

@Component({
  selector: 'config-form',
  templateUrl: './config-form.component.html',
  styleUrls: ['./config-form.component.scss']
})
export class ConfigFormComponent {

  config: any;
  @Input() sectionKey;
  @Output() save: EventEmitter<any> = new EventEmitter<any>();
  fields: FormlyFieldConfig[];
  form = new FormGroup({});
  options: FormlyFormOptions = {
    formState: {
      awesomeIsForced: false,
    },
  };

  constructor(private readonly _configService: ConfigService) {
  }

  @Input() set cfg(cfg) {
    this.config = {...cfg};
  }

  // somehow needed for the form to work
  @Input() set formCfg(val_: FormlyFieldConfig[]) {
    this.fields = val_ && [...val_];
  }

  submit() {
    if (!this.config) {
      throw new Error('No config for ' + this.sectionKey);
    } else {
      this._configService.updateSection(this.sectionKey, this.config);
      this.save.emit();
    }
  }
}
