import { Component, OnInit } from '@angular/core';
import { Input } from '@angular/core';
import { FormlyFieldConfig } from '@ngx-formly/core';
import { FormlyFormOptions } from '@ngx-formly/core';
import { FormGroup } from '@angular/forms';

@Component({
  selector: 'config-form',
  templateUrl: './config-form.component.html',
  styleUrls: ['./config-form.component.css']
})
export class ConfigFormComponent implements OnInit {

  @Input() cfg;

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

  constructor() {
  }

  ngOnInit() {
  }

  submit() {
  }
}
