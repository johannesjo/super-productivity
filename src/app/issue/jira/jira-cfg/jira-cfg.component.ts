import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { ConfigFormSection, ConfigSectionKey } from '../../../core/config/config.model';
import { ProjectCfgFormKey } from '../../../project/project.model';
import { FormlyFieldConfig, FormlyFormOptions } from '@ngx-formly/core';
import { FormControl, FormGroup } from '@angular/forms';
import { JiraCfg } from '../jira';
import { expandAnimation } from '../../../ui/animations/expand.ani';
import { Subject } from 'rxjs';
import { SearchResultItem } from '../../issue';
import { catchError, debounceTime, switchMap, takeUntil } from 'rxjs/operators';
import { JiraApiService } from '../jira-api.service';
import { DEFAULT_JIRA_CFG } from '../jira.const';

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

  constructor(private _jiraApiService: JiraApiService) {
  }

  ngOnInit(): void {
    this.fields = this.section.items;

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

  updateTransitionOptions() {
    const issue = this.issueSuggestionsCtrl.value as SearchResultItem;
    if (!issue || typeof issue === 'string') {
      this.issueSuggestionsCtrl.setValue('');
      return;
    }
  }
}
