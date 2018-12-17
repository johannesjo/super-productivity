import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { GitCfg } from '../git';
import { DEFAULT_JIRA_CFG, JIRA_ADVANCED_FORM_CFG, JIRA_CREDENTIALS_FORM_CFG } from '../git.const';
import { FormlyFieldConfig } from '@ngx-formly/core';
import { GitApiService } from '../git-api.service';
import { GitOriginalUser } from '../git-api-responses';
import { expandAnimation } from '../../../ui/animations/expand.ani';

@Component({
  selector: 'git-cfg-stepper',
  templateUrl: './git-cfg-stepper.component.html',
  styleUrls: ['./git-cfg-stepper.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [expandAnimation]
})
export class GitCfgStepperComponent implements OnInit {
  public credentialsFormGroup: FormGroup = new FormGroup({});
  public credentialsFormConfig: FormlyFieldConfig[] = JIRA_CREDENTIALS_FORM_CFG;

  public advancedSettingsFormGroup: FormGroup = new FormGroup({});
  public advancedSettingsFormConfig: FormlyFieldConfig[] = JIRA_ADVANCED_FORM_CFG;

  public isTestCredentialsSuccess = false;
  public user: GitOriginalUser;
  public gitCfg: GitCfg;
  @Output() onSaveCfg: EventEmitter<GitCfg> = new EventEmitter();

  constructor(
    private _gitApiService: GitApiService,
    private _changeDetectorRef: ChangeDetectorRef,
  ) {
  }

  @Input() set cfg(cfg: GitCfg) {
    if (cfg) {
      this.gitCfg = cfg;
    } else {
      this.gitCfg = Object.assign({}, DEFAULT_JIRA_CFG);
    }
  }

  ngOnInit() {
  }

  saveCfg() {
    this.onSaveCfg.emit(this.gitCfg);
  }

  saveStepForm(cfg: GitCfg) {
    this.gitCfg = cfg;
  }

  testCredentials() {
    this.isTestCredentialsSuccess = false;

    this._gitApiService.getCurrentUser(this.gitCfg)
      .then((user: GitOriginalUser) => {
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
