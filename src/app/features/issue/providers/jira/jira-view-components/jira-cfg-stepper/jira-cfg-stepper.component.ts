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
import { JiraCfg } from '../../jira.model';
import { DEFAULT_JIRA_CFG, JIRA_ADVANCED_FORM_CFG, JIRA_CREDENTIALS_FORM_CFG } from '../../jira.const';
import { FormlyFieldConfig } from '@ngx-formly/core';
import { JiraApiService } from '../../jira-api.service';
import { JiraOriginalUser } from '../../jira-api-responses';
import { expandAnimation } from '../../../../../../ui/animations/expand.ani';
import { catchError } from 'rxjs/operators';
import { Subscription, throwError } from 'rxjs';
import { T } from '../../../../../../t.const';
import { HANDLED_ERROR_PROP_STR, HelperClasses } from '../../../../../../app.constants';

@Component({
  selector: 'jira-cfg-stepper',
  templateUrl: './jira-cfg-stepper.component.html',
  styleUrls: ['./jira-cfg-stepper.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [expandAnimation]
})
export class JiraCfgStepperComponent implements OnDestroy {
  T: typeof T = T;
  HelperClasses: typeof HelperClasses = HelperClasses;
  credentialsFormGroup: FormGroup = new FormGroup({});
  credentialsFormConfig: FormlyFieldConfig[] = [];

  advancedSettingsFormGroup: FormGroup = new FormGroup({});
  advancedSettingsFormConfig: FormlyFieldConfig[] = [];

  isTestCredentialsSuccess: boolean = false;
  user?: JiraOriginalUser;
  jiraCfg: JiraCfg = Object.assign({}, DEFAULT_JIRA_CFG, {isEnabled: true});
  @Output() saveCfg: EventEmitter<JiraCfg> = new EventEmitter();

  private _subs: Subscription = new Subscription();

  constructor(
    private _jiraApiService: JiraApiService,
    private _changeDetectorRef: ChangeDetectorRef,
  ) {
    this.credentialsFormConfig = JIRA_CREDENTIALS_FORM_CFG;
    this.advancedSettingsFormConfig = JIRA_ADVANCED_FORM_CFG;
  }

  @Input() set cfg(cfg: JiraCfg) {
    if (cfg) {
      this.jiraCfg = {...cfg};
    }
  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
  }

  saveConfig() {
    this.saveCfg.emit(this.jiraCfg);
  }

  saveStepForm(cfg: JiraCfg) {
    this.jiraCfg = cfg;
  }

  testCredentials() {
    this.isTestCredentialsSuccess = false;
    this._subs.add(
      this._jiraApiService.getCurrentUser$(this.jiraCfg, true)
        .pipe(catchError((err) => {
          this.isTestCredentialsSuccess = false;
          this.user = undefined;
          this._changeDetectorRef.detectChanges();
          return throwError({[HANDLED_ERROR_PROP_STR]: err});
        }))
        .subscribe((user: JiraOriginalUser) => {
          this.user = user;
          this.isTestCredentialsSuccess = true;

          this._changeDetectorRef.detectChanges();
        })
    );
  }
}
