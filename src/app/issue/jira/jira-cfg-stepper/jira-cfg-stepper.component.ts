import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { JiraCfg } from '../jira';
import { DEFAULT_JIRA_CFG } from '../jira.const';
import { JIRA_CREDENTIALS_FORM_CFG } from '../jira.const';
import { JIRA_ADVANCED_FORM_CFG } from '../jira.const';
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
  credentialsFormConfig: FormlyFieldConfig[] = JIRA_CREDENTIALS_FORM_CFG;

  advancedSettingsFormGroup: FormGroup = new FormGroup({});
  advancedSettingsFormConfig: FormlyFieldConfig[] = JIRA_ADVANCED_FORM_CFG;

  cfg: JiraCfg = Object.assign({}, DEFAULT_JIRA_CFG);

  public isTestCredentialsSuccess = false;

  constructor(
    private _jiraApiService: JiraApiService,
  ) {
  }

  ngOnInit() {
  }

  saveCfg() {

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
