import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import { T } from '../../t.const';
import {
  ConfigFormSection,
  GlobalConfigSectionKey,
} from '../../features/config/global-config.model';
import { Project, ProjectCfgFormKey } from '../../features/project/project.model';
import {
  IssueIntegrationCfg,
  IssueIntegrationCfgs,
  IssueProviderKey,
} from '../../features/issue/issue.model';
import { Subscription } from 'rxjs';
import { ProjectService } from '../../features/project/project.service';
import { BASIC_PROJECT_CONFIG_FORM_CONFIG } from '../../features/project/project-form-cfg.const';
import { DEFAULT_ISSUE_PROVIDER_CFGS } from '../../features/issue/issue.const';
import {
  WorkContextAdvancedCfg,
  WorkContextThemeCfg,
} from '../../features/work-context/work-context.model';
import { WORK_CONTEXT_THEME_CONFIG_FORM_CONFIG } from '../../features/work-context/work-context.const';
import { WorkContextService } from '../../features/work-context/work-context.service';
import { distinctUntilChanged } from 'rxjs/operators';
import { isObject } from '../../util/is-object';
import { MatIcon } from '@angular/material/icon';
import { ConfigSectionComponent } from '../../features/config/config-section/config-section.component';
import { TranslatePipe } from '@ngx-translate/core';
import { DEFAULT_PROJECT_ICON } from '../../features/project/project.const';

@Component({
  selector: 'project-settings',
  templateUrl: './project-settings-page.component.html',
  styleUrls: ['./project-settings-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIcon, ConfigSectionComponent, TranslatePipe],
})
export class ProjectSettingsPageComponent implements OnInit, OnDestroy {
  readonly workContextService = inject(WorkContextService);
  readonly projectService = inject(ProjectService);
  private _cd = inject(ChangeDetectorRef);

  T: typeof T = T;
  projectThemeSettingsFormCfg: ConfigFormSection<WorkContextThemeCfg>;
  basicFormCfg: ConfigFormSection<Project>;

  currentProject?: Project | null;
  currentProjectTheme?: WorkContextThemeCfg;
  projectCfg?: WorkContextAdvancedCfg;
  issueIntegrationCfgs?: IssueIntegrationCfgs;

  private _subs: Subscription = new Subscription();

  constructor() {
    // somehow they are only unproblematic if assigned here
    this.projectThemeSettingsFormCfg = WORK_CONTEXT_THEME_CONFIG_FORM_CONFIG;
    this.basicFormCfg = BASIC_PROJECT_CONFIG_FORM_CONFIG;
  }

  ngOnInit(): void {
    this._subs.add(
      this.projectService.currentProject$
        .pipe(
          distinctUntilChanged((a: Project | null, b: Project | null): boolean => {
            // needed because otherwise this wouldn't work while tracking time; see: #1428
            // NOTE: we don't need to worry about missing model changes since we only update single fields
            // (see save methods below)
            if (isObject(a) && isObject(b) && a !== null && b !== null) {
              return (
                a.title === b.title &&
                JSON.stringify(a.advancedCfg) === JSON.stringify(b.advancedCfg) &&
                JSON.stringify(a.theme) === JSON.stringify(b.theme)
              );
            } else {
              return a === b;
            }
          }),
        )
        .subscribe((project: Project | null) => {
          if (!project) {
            throw new Error();
          }

          this.currentProject = project as Project;
          this.projectCfg = project.advancedCfg;
          this.currentProjectTheme = project.theme;

          // in case there are new ones...

          this._cd.detectChanges();
        }),
    );
  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
  }

  trackBySectionKey(
    i: number,
    section: ConfigFormSection<{ [key: string]: any }>,
  ): string {
    return section.key;
  }

  saveProjectThemCfg($event: {
    sectionKey: GlobalConfigSectionKey | ProjectCfgFormKey;
    config: WorkContextThemeCfg;
  }): void {
    if (!$event.config || !this.currentProject) {
      throw new Error('Not enough data');
    } else {
      this.projectService.update(this.currentProject.id, {
        theme: {
          ...$event.config,
        },
      });
    }
  }

  saveBasicSettings($event: {
    sectionKey: GlobalConfigSectionKey | ProjectCfgFormKey;
    config: Project;
  }): void {
    if (!$event.config || !this.currentProject) {
      throw new Error('Not enough data');
    } else {
      this.projectService.update(this.currentProject.id, {
        title: $event.config.title,
        isHiddenFromMenu: $event.config.isHiddenFromMenu,
        isEnableBacklog: $event.config.isEnableBacklog,
        icon: $event.config.icon,
      });
    }
  }

  getIssueIntegrationCfg(key: IssueProviderKey): IssueIntegrationCfg {
    if (!(this.issueIntegrationCfgs as any)[key]) {
      return DEFAULT_ISSUE_PROVIDER_CFGS[key];
    }
    return (this.issueIntegrationCfgs as any)[key];
  }

  protected readonly DEFAULT_PROJECT_ICON = DEFAULT_PROJECT_ICON;
}
