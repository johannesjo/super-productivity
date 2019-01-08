import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  Output
} from '@angular/core';
import { FormGroup } from '@angular/forms';
import { JiraCfg } from '../jira';
import { DEFAULT_JIRA_CFG, JIRA_ADVANCED_FORM_CFG, JIRA_CREDENTIALS_FORM_CFG } from '../jira.const';
import { FormlyFieldConfig } from '@ngx-formly/core';
import { JiraApiService } from '../jira-api.service';
import { JiraOriginalUser } from '../jira-api-responses';
import { expandAnimation } from '../../../ui/animations/expand.ani';
import { catchError } from 'rxjs/operators';
import { Subscription, throwError } from 'rxjs';
import { dirtyDeepCopy } from '../../../core/util/dirtyDeepCopy';

@Component({
  selector: 'jira-cfg-stepper',
  templateUrl: './jira-cfg-stepper.component.html',
  styleUrls: ['./jira-cfg-stepper.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [expandAnimation]
})
export class JiraCfgStepperComponent implements OnDestroy {
  public credentialsFormGroup: FormGroup = new FormGroup({});
  public credentialsFormConfig: FormlyFieldConfig[] = [];

  public advancedSettingsFormGroup: FormGroup = new FormGroup({});
  public advancedSettingsFormConfig: FormlyFieldConfig[] = [];

  public isTestCredentialsSuccess = false;
  public user: JiraOriginalUser;
  public jiraCfg: JiraCfg;
  @Output() onSaveCfg: EventEmitter<JiraCfg> = new EventEmitter();

  private _subs = new Subscription();

  constructor(
    private _jiraApiService: JiraApiService,
    private _changeDetectorRef: ChangeDetectorRef,
  ) {
    this.credentialsFormConfig = dirtyDeepCopy(JIRA_CREDENTIALS_FORM_CFG);
    this.advancedSettingsFormConfig = dirtyDeepCopy(JIRA_ADVANCED_FORM_CFG);
  }

  @Input() set cfg(cfg: JiraCfg) {
    if (cfg) {
      this.jiraCfg = cfg;
    } else {
      this.jiraCfg = Object.assign({}, DEFAULT_JIRA_CFG);
    }
  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
  }

  saveCfg() {
    this.onSaveCfg.emit(this.jiraCfg);
  }

  saveStepForm(cfg: JiraCfg) {
    this.jiraCfg = cfg;
  }

  testCredentials() {
    this.isTestCredentialsSuccess = false;
    this._subs.add(
      this._jiraApiService.getCurrentUser(this.jiraCfg)
        .pipe(catchError((err) => {
          this.isTestCredentialsSuccess = false;
          this.user = null;
          this._changeDetectorRef.detectChanges();
          return throwError(err);
        }))
        .subscribe((user: JiraOriginalUser) => {
          this.user = user;
          this.isTestCredentialsSuccess = true;
          if (!this.jiraCfg.userAssigneeName) {
            this.jiraCfg.userAssigneeName = user.name;
          }

          this._changeDetectorRef.detectChanges();
        })
    );
  }
}
