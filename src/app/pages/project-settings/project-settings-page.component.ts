import {ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit} from '@angular/core';
import {T} from '../../t.const';
import {
  ConfigFormConfig,
  ConfigFormSection,
  GlobalConfigSectionKey,
  GlobalConfigState
} from '../../features/config/global-config.model';
import {Project, ProjectCfgFormKey} from '../../features/project/project.model';
import {IssueIntegrationCfg, IssueIntegrationCfgs, IssueProviderKey} from '../../features/issue/issue.model';
import {Subscription} from 'rxjs';
import {GlobalConfigService} from '../../features/config/global-config.service';
import {ProjectService} from '../../features/project/project.service';
import {
  BASIC_PROJECT_CONFIG_FORM_CONFIG,
  PROJECT_THEME_CONFIG_FORM_CONFIG
} from '../../features/project/project-form-cfg.const';
import {ISSUE_PROVIDER_FORM_CFGS} from '../../features/issue/issue.const';
import {GLOBAL_CONFIG_FORM_CONFIG} from '../../features/config/global-config-form-config.const';
import {IS_ELECTRON} from '../../app.constants';
import {DEFAULT_JIRA_CFG} from '../../features/issue/providers/jira/jira.const';
import {DEFAULT_GITHUB_CFG} from '../../features/issue/providers/github/github.const';
import {WorkContextAdvancedCfg, WorkContextThemeCfg} from '../../features/work-context/work-context.model';

@Component({
  selector: 'project-settings',
  templateUrl: './project-settings-page.component.html',
  styleUrls: ['./project-settings-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProjectSettingsPageComponent implements OnInit, OnDestroy {
  T = T;
  projectThemeSettingsFormCfg: ConfigFormSection<WorkContextThemeCfg>;
  issueIntegrationFormCfg: ConfigFormConfig;
  globalConfigFormCfg: ConfigFormConfig;
  basicFormCfg: ConfigFormSection<Project>;

  currentProject: Project;
  currentProjectTheme: WorkContextThemeCfg;
  projectCfg: WorkContextAdvancedCfg;
  issueIntegrationCfgs: IssueIntegrationCfgs;
  globalCfg: GlobalConfigState;

  private _subs = new Subscription();

  constructor(
    public readonly configService: GlobalConfigService,
    public readonly projectService: ProjectService,
    private _cd: ChangeDetectorRef,
  ) {
    // somehow they are only unproblematic if assigned here
    this.projectThemeSettingsFormCfg = PROJECT_THEME_CONFIG_FORM_CONFIG;
    this.issueIntegrationFormCfg = ISSUE_PROVIDER_FORM_CFGS;
    this.basicFormCfg = BASIC_PROJECT_CONFIG_FORM_CONFIG;
    this.globalConfigFormCfg = GLOBAL_CONFIG_FORM_CONFIG.filter((cfg) => IS_ELECTRON || !cfg.isElectronOnly);
  }

  ngOnInit() {
    this._subs.add(this.configService.cfg$.subscribe((cfg) => {
      this.globalCfg = cfg;
    }));
    this._subs.add(this.projectService.currentProject$.subscribe((project) => {
      this.currentProject = project;
      this.projectCfg = project.advancedCfg;
      this.currentProjectTheme = project.theme;
      this.issueIntegrationCfgs = project.issueIntegrationCfgs;

      // Unfortunately needed, to make sure we have no empty configs
      // TODO maybe think of a better solution for the defaults
      if (!this.issueIntegrationCfgs.JIRA) {
        this.issueIntegrationCfgs.JIRA = DEFAULT_JIRA_CFG;
      }
      if (!this.issueIntegrationCfgs.GITHUB) {
        this.issueIntegrationCfgs.GITHUB = DEFAULT_GITHUB_CFG;
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
    if (!$event.config) {
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
    if (!$event.config) {
      throw new Error('Not enough data');
    } else {
      this.projectService.update(this.currentProject.id, {
        title: $event.config.title,
      });
    }
  }

  saveIssueProviderCfg($event: { sectionKey: GlobalConfigSectionKey | ProjectCfgFormKey, config: IssueIntegrationCfg }) {
    const {sectionKey, config} = $event;
    const sectionKeyIN = sectionKey as IssueProviderKey;
    this.projectService.updateIssueProviderConfig(this.currentProject.id, sectionKeyIN, {
      ...config,
    }, true);
  }
}
