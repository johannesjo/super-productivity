import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { JiraCfg } from '../jira';
import { DEFAULT_JIRA_CFG, JIRA_ADVANCED_FORM_CFG, JIRA_CREDENTIALS_FORM_CFG } from '../jira.const';
import { FormlyFieldConfig } from '@ngx-formly/core';
import { JiraApiService } from '../jira-api.service';
import { JiraOriginalUser } from '../jira-api-responses';
import { expandAnimation } from '../../../ui/animations/expand.ani';

@Component({
  selector: 'jira-cfg-stepper',
  templateUrl: './jira-cfg-stepper.component.html',
  styleUrls: ['./jira-cfg-stepper.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [expandAnimation]
})
export class JiraCfgStepperComponent implements OnInit {
  public credentialsFormGroup: FormGroup = new FormGroup({});
  public credentialsFormConfig: FormlyFieldConfig[] = JIRA_CREDENTIALS_FORM_CFG;

  public advancedSettingsFormGroup: FormGroup = new FormGroup({});
  public advancedSettingsFormConfig: FormlyFieldConfig[] = JIRA_ADVANCED_FORM_CFG;

  public isTestCredentialsSuccess = false;
  public user: JiraOriginalUser;

  @Input() cfg: JiraCfg = Object.assign({}, DEFAULT_JIRA_CFG);
  @Output() onSaveCfg: EventEmitter<JiraCfg> = new EventEmitter();

  constructor(
    private _jiraApiService: JiraApiService,
    private _changeDetectorRef: ChangeDetectorRef,
  ) {
  }

  ngOnInit() {
  }

  saveCfg() {
    this.onSaveCfg.emit(this.cfg);
  }

  testCredentials() {
    this.isTestCredentialsSuccess = false;

    this._jiraApiService.getCurrentUser(this.cfg)
      .then((user: JiraOriginalUser) => {
        this.user = user;
        this.isTestCredentialsSuccess = true;
        this._changeDetectorRef.detectChanges();
      })
      .catch(() => {
        this.isTestCredentialsSuccess = false;
        this.user = null;
        this._changeDetectorRef.detectChanges();
      });
  }
}
