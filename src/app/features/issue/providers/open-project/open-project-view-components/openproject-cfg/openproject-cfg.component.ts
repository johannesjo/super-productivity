import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  Input,
  Output,
  EventEmitter,
  OnDestroy,
} from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { FormlyFieldConfig, FormlyFormOptions } from '@ngx-formly/core';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { catchError, debounceTime, first, switchMap, tap } from 'rxjs/operators';
import { HelperClasses } from 'src/app/app.constants';
import { SnackService } from 'src/app/core/snack/snack.service';
import {
  ConfigFormSection,
  GlobalConfigSectionKey,
} from 'src/app/features/config/global-config.model';
import { OPEN_PROJECT_TYPE } from 'src/app/features/issue/issue.const';
import { SearchResultItem } from 'src/app/features/issue/issue.model';
import { ProjectCfgFormKey } from 'src/app/features/project/project.model';
import { ProjectService } from 'src/app/features/project/project.service';
import { WorkContextType } from 'src/app/features/work-context/work-context.model';
import { WorkContextService } from 'src/app/features/work-context/work-context.service';
import { T } from 'src/app/t.const';
import { expandAnimation } from 'src/app/ui/animations/expand.ani';
import { OpenProjectApiService } from '../../open-project-api.service';
import {
  OpenProjectWorkPackage,
  OpenProjectWorkPackageReduced,
} from '../../open-project-issue/open-project-issue.model';
import { DEFAULT_OPEN_PROJECT_CFG } from '../../open-project.const';
import {
  OpenProjectCfg,
  OpenProjectTransitionConfig,
  OpenProjectTransitionOption,
} from '../../open-project.model';

@Component({
  selector: 'openproject-cfg',
  templateUrl: './openproject-cfg.component.html',
  styleUrls: ['./openproject-cfg.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [expandAnimation],
})
export class OpenprojectCfgComponent implements OnInit, OnDestroy {
  @Input() section?: ConfigFormSection<OpenProjectCfg>;
  @Output() save: EventEmitter<{
    sectionKey: GlobalConfigSectionKey | ProjectCfgFormKey;
    config: any;
  }> = new EventEmitter();
  T: typeof T = T;
  HelperClasses: typeof HelperClasses = HelperClasses;
  issueSuggestionsCtrl: FormControl = new FormControl();
  form: FormGroup = new FormGroup({});
  isLoading$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  fields?: FormlyFieldConfig[];
  options: FormlyFormOptions = {};
  filteredIssueSuggestions$: Observable<SearchResultItem[]> =
    this.issueSuggestionsCtrl.valueChanges.pipe(
      debounceTime(300),
      tap(() => this.isLoading$.next(true)),
      switchMap((searchTerm: string) => {
        return searchTerm && searchTerm.length > 1
          ? this._projectService
              .getOpenProjectCfgForProject$(
                this._workContextService.activeWorkContextId as string,
              )
              .pipe(
                first(),
                switchMap((cfg) =>
                  this._openProjectApiService.searchIssueForRepo$(searchTerm, cfg),
                ),
                catchError(() => {
                  return [];
                }),
              )
          : // Note: the outer array signifies the observable stream the other is the value
            [[]];
        // TODO fix type
      }),
      tap((suggestions) => {
        this.isLoading$.next(false);
      }),
    );
  transitionConfigOpts: {
    key: keyof OpenProjectTransitionConfig;
    val: OpenProjectTransitionOption;
  }[] = [];

  private _subs: Subscription = new Subscription();

  constructor(
    private _openProjectApiService: OpenProjectApiService,
    private _snackService: SnackService,
    private _projectService: ProjectService,
    private _workContextService: WorkContextService,
  ) {}

  private _cfg?: OpenProjectCfg;

  get cfg(): OpenProjectCfg {
    return this._cfg as OpenProjectCfg;
  }

  // NOTE: this is legit because it might be that there is no issue provider cfg yet
  @Input() set cfg(cfg: OpenProjectCfg) {
    const newCfg: OpenProjectCfg = cfg ? { ...cfg } : DEFAULT_OPEN_PROJECT_CFG;
    console.log('SET CHUGUEI', cfg);
    if (!newCfg.transitionConfig) {
      newCfg.transitionConfig = DEFAULT_OPEN_PROJECT_CFG.transitionConfig;
    } else {
      // CLEANUP keys that we're not using
      Object.keys(newCfg.transitionConfig).forEach((key: string) => {
        if (!(key in DEFAULT_OPEN_PROJECT_CFG.transitionConfig)) {
          delete (newCfg.transitionConfig as any)[key];
        }
      });
    }

    if (!Array.isArray(newCfg.availableTransitions)) {
      newCfg.availableTransitions = DEFAULT_OPEN_PROJECT_CFG.availableTransitions;
    }
    console.log('SET CFG', newCfg);
    this._cfg = newCfg;

    this.transitionConfigOpts = Object.keys(newCfg.transitionConfig).map((k: string) => {
      const key = k as keyof OpenProjectTransitionConfig;
      return {
        key,
        val: newCfg.transitionConfig[key],
      };
    });
  }

  ngOnInit(): void {
    this.fields = (this.section as ConfigFormSection<OpenProjectCfg>).items;
  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
  }

  getTransition(key: keyof OpenProjectTransitionConfig): OpenProjectTransitionOption {
    return this.cfg.transitionConfig[key];
  }

  setTransition(
    key: keyof OpenProjectTransitionConfig,
    value: OpenProjectTransitionOption,
  ): OpenProjectTransitionOption {
    const transitionConfig = { ...this.cfg.transitionConfig };
    transitionConfig[key] = value;
    this.cfg.transitionConfig = transitionConfig;
    return value;
  }

  submit(): void {
    if (!this.cfg) {
      throw new Error(
        'No config for ' + (this.section as ConfigFormSection<OpenProjectCfg>).key,
      );
    } else {
      this.save.emit({
        sectionKey: (this.section as ConfigFormSection<OpenProjectCfg>).key,
        config: this.cfg,
      });
    }
  }

  updateTransitionOptions(): void {
    const searchResultItem = this.issueSuggestionsCtrl.value as SearchResultItem;
    if (!searchResultItem || typeof (searchResultItem as any) === 'string') {
      this.issueSuggestionsCtrl.setValue('');
      return;
    } else {
      const issueId = searchResultItem.issueData.id as string;
      const lockVersion = (searchResultItem.issueData as OpenProjectWorkPackageReduced)
        .lockVersion;
      this._subs.add(
        this._openProjectApiService
          .getTransitionsForIssue$(issueId, lockVersion, this.cfg)
          .subscribe((val) => {
            this.cfg.availableTransitions = val;
            this._snackService.open({
              type: 'SUCCESS',
              msg: T.F.OPEN_PROJECT.S.TRANSITIONS_LOADED,
            });
          }),
      );
    }
  }

  toggleEnabled(isEnabled: boolean): void {
    if (this._workContextService.activeWorkContextType !== WorkContextType.PROJECT) {
      throw new Error('Should only be called when in project context');
    }
    const projectId = this._workContextService.activeWorkContextId as string;
    this._projectService.updateIssueProviderConfig(projectId, OPEN_PROJECT_TYPE, {
      isEnabled,
    });
  }

  displayIssueWith(issue?: OpenProjectWorkPackage): string | undefined {
    // NOTE: apparently issue can be undefined for displayWith
    return issue?.subject;
  }

  trackByIssueId(i: number, issue: OpenProjectWorkPackage): number {
    return issue.id;
  }
}
