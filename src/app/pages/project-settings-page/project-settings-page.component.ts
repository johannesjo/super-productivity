import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { T } from '../../t.const';
import { ConfigFormConfig, ConfigFormSection, GlobalConfigSectionKey } from '../../features/config/global-config.model';
import { Project, ProjectCfgFormKey } from '../../features/project/project.model';
import { IssueIntegrationCfg, IssueIntegrationCfgs, IssueProviderKey } from '../../features/issue/issue.model';
import { Subscription } from 'rxjs';
import { ProjectService } from '../../features/project/project.service';
import { BASIC_PROJECT_CONFIG_FORM_CONFIG } from '../../features/project/project-form-cfg.const';
import { ISSUE_PROVIDER_FORM_CFGS } from '../../features/issue/issue.const';
import { GLOBAL_CONFIG_FORM_CONFIG } from '../../features/config/global-config-form-config.const';
import { IS_ELECTRON } from '../../app.constants';
import { DEFAULT_JIRA_CFG } from '../../features/issue/providers/jira/jira.const';
import { DEFAULT_GITHUB_CFG } from '../../features/issue/providers/github/github.const';
import { WorkContextAdvancedCfg, WorkContextThemeCfg } from '../../features/work-context/work-context.model';
import { WORK_CONTEXT_THEME_CONFIG_FORM_CONFIG } from '../../features/work-context/work-context.const';
import { WorkContextService } from '../../features/work-context/work-context.service';
import { DEFAULT_GITLAB_CFG } from 'src/app/features/issue/providers/gitlab/gitlab.const';

@Component({
  selector: 'project-settings',
  templateUrl: './project-settings-page.component.html',
  styleUrls: ['./project-settings-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProjectSettingsPageComponent implements OnInit, OnDestroy {
  T: typeof T = T;
  projectThemeSettingsFormCfg: ConfigFormSection<WorkContextThemeCfg>;
  issueIntegrationFormCfg: ConfigFormConfig;
  globalConfigFormCfg: ConfigFormConfig;
  basicFormCfg: ConfigFormSection<Project>;

  currentProject?: Project | null;
  currentProjectTheme?: WorkContextThemeCfg;
  projectCfg?: WorkContextAdvancedCfg;
  issueIntegrationCfgs?: IssueIntegrationCfgs;

  private _subs: Subscription = new Subscription();

  constructor(
    public readonly workContextService: WorkContextService,
    public readonly projectService: ProjectService,
    private _cd: ChangeDetectorRef,
  ) {
    // somehow they are only unproblematic if assigned here
    this.projectThemeSettingsFormCfg = WORK_CONTEXT_THEME_CONFIG_FORM_CONFIG;
    this.issueIntegrationFormCfg = ISSUE_PROVIDER_FORM_CFGS;
    this.basicFormCfg = BASIC_PROJECT_CONFIG_FORM_CONFIG;
    this.globalConfigFormCfg = GLOBAL_CONFIG_FORM_CONFIG.filter((cfg) => IS_ELECTRON || !cfg.isElectronOnly);
  }

  ngOnInit() {
    this._subs.add(this.projectService.currentProject$.subscribe((project: Project | null) => {
      if (!project) {
        throw new Error();
      }

      this.currentProject = project as Project;
      this.projectCfg = project.advancedCfg;
      this.currentProjectTheme = project.theme;

      // in case there are new ones...
      this.issueIntegrationCfgs = {...project.issueIntegrationCfgs};

      // Unfortunately needed, to make sure we have no empty configs
      // TODO maybe think of a better solution for the defaults
      if (!this.issueIntegrationCfgs.JIRA) {
        this.issueIntegrationCfgs.JIRA = DEFAULT_JIRA_CFG;
      }
      if (!this.issueIntegrationCfgs.GITHUB) {
        this.issueIntegrationCfgs.GITHUB = DEFAULT_GITHUB_CFG;
      }
      if (!this.issueIntegrationCfgs.GITLAB) {
        this.issueIntegrationCfgs.GITLAB = DEFAULT_GITLAB_CFG;
      }
      this._cd.detectChanges();
    }));
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
  }

  trackBySectionKey(i: number, section: ConfigFormSection<{ [key: string]: any }>) {
    return section.key;
  }

  saveProjectThemCfg($event: { sectionKey: GlobalConfigSectionKey | ProjectCfgFormKey, config: WorkContextThemeCfg }) {
    if (!$event.config || !this.currentProject) {
      throw new Error('Not enough data');
    } else {
      this.projectService.update(this.currentProject.id, {
        theme: {
          ...$event.config,
        }
      });
    }
  }

  saveBasicSettings($event: { sectionKey: GlobalConfigSectionKey | ProjectCfgFormKey, config: Project }) {
    if (!$event.config || !this.currentProject) {
      throw new Error('Not enough data');
    } else {
      this.projectService.update(this.currentProject.id, {
        title: $event.config.title,
      });
    }
  }

  saveIssueProviderCfg($event: { sectionKey: GlobalConfigSectionKey | ProjectCfgFormKey, config: IssueIntegrationCfg }) {
    if (!$event.config || !this.currentProject) {
      throw new Error('Not enough data');
    }
    const {sectionKey, config} = $event;
    const sectionKeyIN = sectionKey as IssueProviderKey;
    this.projectService.updateIssueProviderConfig(this.currentProject.id, sectionKeyIN, {
      ...config,
    }, true);
  }

  getIssueIntegrationCfg(key: IssueProviderKey): IssueIntegrationCfg {
    if (!(this.issueIntegrationCfgs as any)[key]) {
      throw new Error('Invalid issue integration cfg');
    }
    return (this.issueIntegrationCfgs as any)[key];
  }
}
