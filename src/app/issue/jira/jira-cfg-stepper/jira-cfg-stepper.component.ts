import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { FormGroup } from '@angular/forms';
import { Validators } from '@angular/forms';
import { JiraCfg } from '../jira';
import { DEFAULT_JIRA_CFG } from '../jira.const';
import { CREDENTIALS_FORM_CFG } from './jira-cfg-stepper.const';
import { FormlyFieldConfig } from '@ngx-formly/core';

@Component({
  selector: 'jira-cfg-stepper',
  templateUrl: './jira-cfg-stepper.component.html',
  styleUrls: ['./jira-cfg-stepper.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class JiraCfgStepperComponent implements OnInit {
  credentialsFormGroup: FormGroup = this._formBuilder.group({
    credentialsCtrl: ['', Validators.required]
  });
  credentialsFormConfig: FormlyFieldConfig[] = CREDENTIALS_FORM_CFG;

  secondFormGroup: FormGroup = this._formBuilder.group({
    secondCtrl: ['', Validators.required]
  });
  thirdFormGroup: FormGroup = this._formBuilder.group({
    secondCtrl: ['', Validators.required]
  });

  cfg: JiraCfg = Object.assign({}, DEFAULT_JIRA_CFG);

  constructor(private _formBuilder: FormBuilder) {
  }

  ngOnInit() {
  }

}
