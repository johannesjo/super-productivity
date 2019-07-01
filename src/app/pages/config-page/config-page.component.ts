import {ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit} from '@angular/core';
import {GlobalConfigService} from '../../features/config/global-config.service';
import {GLOBAL_CONFIG_FORM_CONFIG} from '../../features/config/global-config-form-config.const';
import {ProjectService} from '../../features/project/project.service';
import {
  ConfigFormConfig,
  ConfigFormSection,
  GlobalConfigSectionKey,
  GlobalConfigState
} from '../../features/config/global-config.model';
import {Subscription} from 'rxjs';
import {Project, ProjectAdvancedCfg, ProjectCfgFormKey} from '../../features/project/project.model';
import {
  BASIC_PROJECT_CONFIG_FORM_CONFIG,
  PROJECT_CONFIG_FORM_CONFIG
} from '../../features/project/project-form-cfg.const';
import {IssueIntegrationCfg, IssueIntegrationCfgs, IssueProviderKey} from '../../features/issue/issue';
import {ISSUE_PROVIDER_FORM_CFGS} from '../../features/issue/issue.const';
import {DEFAULT_JIRA_CFG} from '../../features/issue/jira/jira.const';
import {DEFAULT_GITHUB_CFG} from '../../features/issue/github/github.const';
import {IS_ELECTRON} from '../../app.constants';
import {environment} from '../../../environments/environment';

@Component({
  selector: 'config-page',
  templateUrl: './config-page.component.html',
  styleUrls: ['./config-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfigPageComponent implements OnInit, OnDestroy {
  basicProjectSettingsFormCfg: ConfigFormSection;
  projectConfigFormCfg: ConfigFormConfig;
  issueIntegrationFormCfg: ConfigFormConfig;
  globalConfigFormCfg: ConfigFormConfig;

  currentProject: Project;
  projectCfg: ProjectAdvancedCfg;
  issueIntegrationCfgs: IssueIntegrationCfgs;
  globalCfg: GlobalConfigState;

  appVersion: string = environment.version;

  private _subs = new Subscription();

  constructor(
    public readonly configService: GlobalConfigService,
    public readonly projectService: ProjectService,
    private _cd: ChangeDetectorRef,
  ) {
    // somehow they are only unproblematic if assigned here
    this.basicProjectSettingsFormCfg = BASIC_PROJECT_CONFIG_FORM_CONFIG;
    this.projectConfigFormCfg = PROJECT_CONFIG_FORM_CONFIG;
    this.issueIntegrationFormCfg = ISSUE_PROVIDER_FORM_CFGS;
    this.globalConfigFormCfg = GLOBAL_CONFIG_FORM_CONFIG.filter((cfg) => IS_ELECTRON || !cfg.isElectronOnly);
  }

  ngOnInit() {
    this._subs.add(this.configService.cfg$.subscribe((cfg) => {
      this.globalCfg = cfg;
    }));
    this._subs.add(this.projectService.currentProject$.subscribe((project) => {
      this.currentProject = project;
      this.projectCfg = project.advancedCfg;
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

  trackBySectionKey(i: number, section: ConfigFormSection) {
    return section.key;
  }

  saveProjectBasicCfg($event: { sectionKey: GlobalConfigSectionKey | ProjectCfgFormKey, config: Partial<Project> }) {
    if (!$event.config) {
      throw new Error('Not enough data');
    } else {
      this.projectService.update(this.currentProject.id, {
        ...$event.config,
      });
    }
  }

  saveIssueProviderCfg($event: { sectionKey: GlobalConfigSectionKey | ProjectCfgFormKey, config: IssueIntegrationCfg }) {
    const {sectionKey, config} = $event;
    const sectionKey_ = sectionKey as IssueProviderKey;
    this.projectService.updateIssueProviderConfig(this.currentProject.id, sectionKey_, {
      ...config,
    }, true);
  }

  saveGlobalCfg($event: { sectionKey: GlobalConfigSectionKey | ProjectCfgFormKey, config: any }) {
    const config = $event.config;
    const sectionKey = $event.sectionKey as GlobalConfigSectionKey;

    if (!sectionKey || !config) {
      throw new Error('Not enough data');
    } else {
      this.configService.updateSection(sectionKey, config);
    }
  }
}
