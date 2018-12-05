import { Component, OnDestroy, OnInit } from '@angular/core';
import { ConfigService } from '../../core/config/config.service';
import { GLOBAL_CONFIG_FORM_CONFIG } from '../../core/config/config-form-config.const';
import { ProjectService } from '../../project/project.service';
import { ConfigSectionKey, GlobalConfig } from '../../core/config/config.model';
import { Subscription } from 'rxjs';
import { Project, ProjectAdvancedCfg, ProjectCfgFormKey } from '../../project/project.model';
import { BASIC_PROJECT_CONFIG_FORM_CONFIG, PROJECT_CONFIG_FORM_CONFIG } from '../../project/project-form-cfg.const';

@Component({
  selector: 'config-page',
  templateUrl: './config-page.component.html',
  styleUrls: ['./config-page.component.scss']
})
export class ConfigPageComponent implements OnInit, OnDestroy {
  basicProjectSettingsFormCfg = BASIC_PROJECT_CONFIG_FORM_CONFIG;
  projectConfigFormCfg = PROJECT_CONFIG_FORM_CONFIG;
  globalConfigFormCfg = GLOBAL_CONFIG_FORM_CONFIG;

  currentProject: Project;
  projectCfg: ProjectAdvancedCfg;
  globalCfg: GlobalConfig;

  private _subs = new Subscription();

  constructor(
    public readonly configService: ConfigService,
    public readonly projectService: ProjectService,
  ) {
  }

  ngOnInit() {
    this._subs.add(this.configService.cfg$.subscribe((cfg) => {
      this.globalCfg = cfg;
    }));
    this._subs.add(this.projectService.currentProject$.subscribe((project) => {
      this.currentProject = project;
      this.projectCfg = project.advancedCfg;
    }));
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
  }

  saveProjectBasicCfg($event: { sectionKey: ConfigSectionKey | ProjectCfgFormKey, config: Partial<Project> }) {
    if (!$event.config) {
      throw new Error('Not enough data');
    } else {
      this.projectService.update(this.currentProject.id, {
        ...$event.config,
      });
    }
  }

  saveGlobalCfg($event: { sectionKey: ConfigSectionKey | ProjectCfgFormKey, config: any }) {
    const config = $event.config;
    const sectionKey = $event.sectionKey as ConfigSectionKey;

    if (!sectionKey || !config) {
      throw new Error('Not enough data');
    } else {
      this.configService.updateSection(sectionKey, config);
    }
  }

}
