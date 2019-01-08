import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { ConfigFormSection, ConfigSectionKey } from '../../../core/config/config.model';
import { ProjectCfgFormKey } from '../../../project/project.model';
import { FormlyFieldConfig, FormlyFormOptions } from '@ngx-formly/core';
import { FormControl, FormGroup } from '@angular/forms';
import { JiraCfg } from '../jira';
import { expandAnimation } from '../../../ui/animations/expand.ani';
import { Subject, Subscription } from 'rxjs';
import { SearchResultItem } from '../../issue';
import { catchError, debounceTime, switchMap, takeUntil } from 'rxjs/operators';
import { JiraApiService } from '../jira-api.service';
import { DEFAULT_JIRA_CFG } from '../jira.const';
import { JiraIssue } from '../jira-issue/jira-issue.model';

@Component({
  selector: 'jira-cfg',
  templateUrl: './jira-cfg.component.html',
  styleUrls: ['./jira-cfg.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [expandAnimation]
})
export class JiraCfgComponent implements OnInit {
  @Input() section: ConfigFormSection;
  // NOTE: this is legit because it might be that there is no issue provider cfg yet
  @Input() cfg: JiraCfg = DEFAULT_JIRA_CFG;

  @Output() save: EventEmitter<{ sectionKey: ConfigSectionKey | ProjectCfgFormKey, config: any }> = new EventEmitter();

  destroy$: Subject<boolean> = new Subject<boolean>();
  issueSuggestionsCtrl: FormControl = new FormControl();
  filteredIssueSuggestions: SearchResultItem[];

  isLoading = false;

  fields: FormlyFieldConfig[];
  form = new FormGroup({});
  options: FormlyFormOptions = {};

  private _subs = new Subscription();

  constructor(private _jiraApiService: JiraApiService) {
  }

  ngOnInit(): void {
    this.fields = this.section.items;
    if (!this.cfg.transitionConfig) {
      this.cfg.transitionConfig = DEFAULT_JIRA_CFG.transitionConfig;
    } else {
      // CLEANUP keys that we're not using
      Object.keys(this.cfg.transitionConfig).forEach((key) => {
        if (!(key in DEFAULT_JIRA_CFG.transitionConfig)) {
          delete this.cfg.transitionConfig[key];
        }
      });
    }

    if (!this.cfg.availableTransitions) {
      this.cfg.availableTransitions = DEFAULT_JIRA_CFG.availableTransitions;
    }

    this.issueSuggestionsCtrl.setValue('');

    this.issueSuggestionsCtrl.valueChanges.pipe(
      debounceTime(400),
      switchMap((searchTerm) => {
        if (searchTerm && searchTerm.length > 1) {
          this.isLoading = true;
          return this._jiraApiService.search(searchTerm).pipe(
            catchError(() => {
              return [];
            })
          );
        } else {
          // Note: the outer array signifies the observable stream the other is the value
          return [[]];
        }
      }),
      takeUntil(this.destroy$)
    )
      .subscribe((val) => {
        console.log('sub', val);

        this.isLoading = false;
        this.filteredIssueSuggestions = val;
      });
  }

  submit() {
    if (!this.cfg) {
      throw new Error('No config for ' + this.section.key);
    } else {
      this.save.emit({
        sectionKey: this.section.key,
        config: this.cfg,
      });
    }
  }

  displayWith(issue: JiraIssue) {
    return issue && issue.summary;
  }

  updateTransitionOptions() {
    const searchResultItem = this.issueSuggestionsCtrl.value as SearchResultItem;
    if (!searchResultItem || typeof searchResultItem === 'string') {
      this.issueSuggestionsCtrl.setValue('');
      return;
    } else {
      const issueId = searchResultItem.issueData.id as string;
      this._subs.add(
        this._jiraApiService.getTransitionsForIssue(issueId)
          .subscribe((val) => {
            this.cfg.availableTransitions = val;
          })
      );
    }
  }
}
