import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { ConfigFormSection, GlobalConfigSectionKey } from '../../../../../config/global-config.model';
import { ProjectCfgFormKey } from '../../../../../project/project.model';
import { FormlyFieldConfig, FormlyFormOptions } from '@ngx-formly/core';
import { FormControl, FormGroup } from '@angular/forms';
import { JiraCfg, JiraTransitionConfig, JiraTransitionOption } from '../../jira.model';
import { expandAnimation } from '../../../../../../ui/animations/expand.ani';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { SearchResultItem } from '../../../../issue.model';
import { catchError, concatMap, debounceTime, first, map, switchMap, tap } from 'rxjs/operators';
import { JiraApiService } from '../../jira-api.service';
import { DEFAULT_JIRA_CFG } from '../../jira.const';
import { JiraIssue } from '../../jira-issue/jira-issue.model';
import { SnackService } from '../../../../../../core/snack/snack.service';
import { T } from '../../../../../../t.const';
import { HelperClasses } from '../../../../../../app.constants';
import { ProjectService } from '../../../../../project/project.service';
import { WorkContextService } from '../../../../../work-context/work-context.service';
import { WorkContextType } from '../../../../../work-context/work-context.model';
import { JIRA_TYPE } from '../../../../issue.const';

@Component({
  selector: 'jira-cfg',
  templateUrl: './jira-cfg.component.html',
  styleUrls: ['./jira-cfg.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [expandAnimation]
})
export class JiraCfgComponent implements OnInit, OnDestroy {
  @Input() section?: ConfigFormSection<JiraCfg>;
  @Output() save: EventEmitter<{ sectionKey: GlobalConfigSectionKey | ProjectCfgFormKey, config: any }> = new EventEmitter();
  T: typeof T = T;
  HelperClasses: typeof HelperClasses = HelperClasses;
  issueSuggestionsCtrl: FormControl = new FormControl();
  customFieldSuggestionsCtrl: FormControl = new FormControl();
  customFields: any [] = [];
  customFieldsPromise?: Promise<any>;
  isLoading$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  fields?: FormlyFieldConfig[];
  form: FormGroup = new FormGroup({});
  options: FormlyFormOptions = {};
  filteredIssueSuggestions$: Observable<SearchResultItem[]> = this.issueSuggestionsCtrl.valueChanges.pipe(
    debounceTime(300),
    tap(() => this.isLoading$.next(true)),
    switchMap((searchTerm: string) => {
      return (searchTerm && searchTerm.length > 1)
        ? this._projectService.getJiraCfgForProject$(this._workContextService.activeWorkContextId as string)
          .pipe(
            first(),
            switchMap((cfg) => this._jiraApiService.issuePicker$(searchTerm, cfg)),
            catchError(() => {
              return [];
            })
          )
        // Note: the outer array signifies the observable stream the other is the value
        : [[]];
      // TODO fix type
    }),
    tap((suggestions) => {
      this.isLoading$.next(false);
    }),
  );
  filteredCustomFieldSuggestions$: Observable<any[]> = this.customFieldSuggestionsCtrl.valueChanges.pipe(
    map(value => this._filterCustomFieldSuggestions(value)),
  );
  transitionConfigOpts: { key: keyof JiraTransitionConfig; val: JiraTransitionOption }[] = [];

  private _subs: Subscription = new Subscription();

  constructor(
    private _jiraApiService: JiraApiService,
    private _snackService: SnackService,
    private _projectService: ProjectService,
    private _workContextService: WorkContextService,
  ) {
  }

  private _cfg?: JiraCfg;

  get cfg(): JiraCfg {
    return this._cfg as JiraCfg;
  }

  // NOTE: this is legit because it might be that there is no issue provider cfg yet
  @Input() set cfg(cfg: JiraCfg) {
    const newCfg: JiraCfg = cfg
      ? {...cfg}
      : DEFAULT_JIRA_CFG;

    if (!newCfg.transitionConfig) {
      newCfg.transitionConfig = DEFAULT_JIRA_CFG.transitionConfig;
    } else {
      // CLEANUP keys that we're not using
      Object.keys(newCfg.transitionConfig).forEach((key: string) => {
        if (!(key in DEFAULT_JIRA_CFG.transitionConfig)) {
          delete (newCfg.transitionConfig as any)[key];
        }
      });
    }

    if (!Array.isArray(newCfg.availableTransitions)) {
      newCfg.availableTransitions = DEFAULT_JIRA_CFG.availableTransitions;
    }

    this._cfg = newCfg;

    this.transitionConfigOpts = Object.keys(newCfg.transitionConfig).map((k: string) => {
      const key = k as keyof JiraTransitionConfig;
      return ({
        key,
        val: newCfg.transitionConfig[key]
      });
    });
  }

  ngOnInit(): void {
    this.fields = (this.section as ConfigFormSection<JiraCfg>).items;
  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
  }

  getTransition(key: keyof JiraTransitionConfig): JiraTransitionOption {
    return this.cfg.transitionConfig[key];
  }

  setTransition(key: keyof JiraTransitionConfig, value: JiraTransitionOption) {
    return this.cfg.transitionConfig[key] = value;
  }

  toggleEnabled(isEnabled: boolean) {
    if (this._workContextService.activeWorkContextType !== WorkContextType.PROJECT) {
      throw new Error('Should only be called when in project context');
    }
    const projectId = this._workContextService.activeWorkContextId as string;
    this._projectService.updateIssueProviderConfig(projectId, JIRA_TYPE, {
      isEnabled,
    });
  }

  submit() {
    if (!this.cfg) {
      throw new Error('No config for ' + (this.section as ConfigFormSection<JiraCfg>).key);
    } else {
      this.save.emit({
        sectionKey: (this.section as ConfigFormSection<JiraCfg>).key,
        config: this.cfg,
      });
    }
  }

  trackByCustomFieldId(i: number, field: any) {
    return field.id;
  }

  displayIssueWith(issue: JiraIssue) {
    return issue && issue.summary;
  }

  trackByIssueId(i: number, issue: JiraIssue) {
    return issue.id;
  }

  loadCustomFields() {
    this.customFieldsPromise = this._projectService.getJiraCfgForProject$(this._workContextService.activeWorkContextId as string).pipe(
      first(),
      concatMap((jiraCfg) => this._jiraApiService.listFields$(jiraCfg))
    ).toPromise();
    this.customFieldsPromise.then((v: any) => {
      if (v && Array.isArray(v.response)) {
        this.customFields = v.response;
      }
    });
  }

  updateTransitionOptions() {
    const searchResultItem = this.issueSuggestionsCtrl.value as SearchResultItem;
    if (!searchResultItem || typeof (searchResultItem as any) === 'string') {
      this.issueSuggestionsCtrl.setValue('');
      return;
    } else {
      const issueId = searchResultItem.issueData.id as string;
      this._subs.add(
        this._jiraApiService.getTransitionsForIssue$(issueId, this.cfg)
          .subscribe((val) => {
            this.cfg.availableTransitions = val;
            this._snackService.open({
              type: 'SUCCESS',
              msg: T.F.JIRA.S.TRANSITIONS_LOADED,
            });
          })
      );
    }
  }

  private _filterCustomFieldSuggestions(value: string): string[] {
    const filterValue = value && value.toLowerCase();
    return this.customFields.filter(field => field
      && (
        field.name.toLowerCase().includes(filterValue)
        || field.id.includes(filterValue)
      ));
  }
}
