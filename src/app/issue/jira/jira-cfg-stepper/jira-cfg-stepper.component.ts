import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { FormGroup } from '@angular/forms';
import { Validators } from '@angular/forms';
import { JiraCfg } from '../jira';
import { DEFAULT_JIRA_CFG } from '../jira.const';
import { CREDENTIALS_FORM_CFG } from './jira-cfg-stepper.const';
import { FormlyFieldConfig } from '@ngx-formly/core';
import { JiraApiService } from '../jira-api.service';

@Component({
  selector: 'jira-cfg-stepper',
  templateUrl: './jira-cfg-stepper.component.html',
  styleUrls: ['./jira-cfg-stepper.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class JiraCfgStepperComponent implements OnInit {
  credentialsFormGroup: FormGroup = new FormGroup({});
  credentialsFormConfig: FormlyFieldConfig[] = CREDENTIALS_FORM_CFG;

  secondFormGroup: FormGroup = this._formBuilder.group({
    secondCtrl: ['', Validators.required]
  });
  thirdFormGroup: FormGroup = this._formBuilder.group({
    secondCtrl: ['', Validators.required]
  });

  cfg: JiraCfg = Object.assign({}, DEFAULT_JIRA_CFG);
  public isTestCredentialsSuccess = false;

  constructor(
    private _formBuilder: FormBuilder,
    private _jiraApiService: JiraApiService,
  ) {
  }

  ngOnInit() {
  }

  testCredentials() {
    this.isTestCredentialsSuccess = false;

    this._jiraApiService.getSuggestions(this.cfg)
      .then((res) => {
        console.log(res);
        this.isTestCredentialsSuccess = true;
      })
      .catch(() => {
        this.isTestCredentialsSuccess = false;
      });
  }
}
