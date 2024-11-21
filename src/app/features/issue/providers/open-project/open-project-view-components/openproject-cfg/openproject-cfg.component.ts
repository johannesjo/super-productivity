import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';
import { FormsModule, UntypedFormControl, UntypedFormGroup } from '@angular/forms';
import { FormlyFieldConfig, FormlyFormOptions } from '@ngx-formly/core';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { HelperClasses } from 'src/app/app.constants';
import { SnackService } from 'src/app/core/snack/snack.service';
import { ConfigFormSection } from 'src/app/features/config/global-config.model';
import {
  IssueProviderOpenProject,
  SearchResultItem,
} from 'src/app/features/issue/issue.model';
import { T } from 'src/app/t.const';
import { expandAnimation } from 'src/app/ui/animations/expand.ani';
import { OpenProjectApiService } from '../../open-project-api.service';
import {
  OpenProjectWorkPackage,
  OpenProjectWorkPackageReduced,
} from '../../open-project-issue/open-project-issue.model';
import { DEFAULT_OPEN_PROJECT_CFG } from '../../open-project.const';
import {
  OpenProjectTransitionConfig,
  OpenProjectTransitionOption,
} from '../../open-project.model';
import { UiModule } from '../../../../../../ui/ui.module';
import { AsyncPipe, NgForOf, NgIf } from '@angular/common';
import { MatSlider } from '@angular/material/slider';
import { debounceTime, switchMap, tap } from 'rxjs/operators';

@Component({
  selector: 'openproject-cfg',
  templateUrl: './openproject-cfg.component.html',
  styleUrls: ['./openproject-cfg.compo' + 'nent.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [UiModule, FormsModule, NgIf, AsyncPipe, MatSlider, NgForOf],
  animations: [expandAnimation],
})
export class OpenprojectCfgComponent implements OnInit, OnDestroy {
  @Input() section?: ConfigFormSection<IssueProviderOpenProject>;
  @Output() modelChange: EventEmitter<IssueProviderOpenProject> = new EventEmitter();
  T: typeof T = T;
  HelperClasses: typeof HelperClasses = HelperClasses;
  issueSuggestionsCtrl: UntypedFormControl = new UntypedFormControl();
  form: UntypedFormGroup = new UntypedFormGroup({});
  isLoading$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  fields?: FormlyFieldConfig[];
  options: FormlyFormOptions = {};

  filteredIssueSuggestions$: Observable<SearchResultItem[]> =
    this.issueSuggestionsCtrl.valueChanges.pipe(
      debounceTime(300),
      tap(() => this.isLoading$.next(true)),
      switchMap((searchTerm: string) => {
        return searchTerm && searchTerm.length > 1
          ? this._openProjectApiService.searchIssueForRepo$(searchTerm, this.cfg)
          : [[]];
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
  ) {}

  private _cfg?: IssueProviderOpenProject;

  get cfg(): IssueProviderOpenProject {
    return this._cfg as IssueProviderOpenProject;
  }

  // NOTE: this is legit because it might be that there is no issue provider cfg yet
  @Input() set cfg(cfg: IssueProviderOpenProject) {
    const newCfg: IssueProviderOpenProject = { ...cfg };

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
    this.fields = (this.section as ConfigFormSection<IssueProviderOpenProject>).items;
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
    if (key === 'DONE') {
      if (value === 'ALWAYS_ASK' || value === 'DO_NOT') {
        this.partialModelChange({ isSetProgressOnTaskDone: false });
      }
    }
    this.partialModelChange({ transitionConfig });

    return value;
  }

  partialModelChange(cfg: Partial<IssueProviderOpenProject>): void {
    this.cfg = {
      ...this.cfg,
      ...cfg,
    };
    this.notifyModelChange();
  }

  notifyModelChange(): void {
    if (!this.cfg) {
      throw new Error(
        'No config for ' +
          (this.section as ConfigFormSection<IssueProviderOpenProject>).key,
      );
    } else {
      this.modelChange.emit(this.cfg);
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
            this.partialModelChange({
              availableTransitions: val,
            });
            this._snackService.open({
              type: 'SUCCESS',
              msg: T.F.OPEN_PROJECT.S.TRANSITIONS_LOADED,
            });
          }),
      );
    }
  }

  displayIssueWith(issue?: OpenProjectWorkPackage): string | undefined {
    // NOTE: apparently issue can be undefined for displayWith
    return issue?.subject;
  }

  trackByIssueId(i: number, issue: OpenProjectWorkPackage): number {
    return issue.id;
  }

  showSetProgressOption(key: any): boolean {
    const transitionOption = this.getTransition(key).valueOf();
    let shouldShow: boolean = false;
    if (key === 'DONE') {
      shouldShow = transitionOption !== 'DO_NOT' && transitionOption !== 'ALWAYS_ASK';
    }
    return shouldShow;
  }

  displayThumbWith(value: number): string {
    return `${value}%`;
  }
}
