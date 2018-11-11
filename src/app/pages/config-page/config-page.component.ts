import { Component, OnDestroy, OnInit } from '@angular/core';
import { ConfigService } from '../../core/config/config.service';
import { GLOBAL_CONFIG_FORM_CONFIG } from '../../core/config/config-form-config.const';
import { ProjectService } from '../../project/project.service';
import { GoogleApiService } from '../../core/google/google-api.service';
import { GlobalConfig } from '../../core/config/config.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'config-page',
  templateUrl: './config-page.component.html',
  styleUrls: ['./config-page.component.scss']
})
export class ConfigPageComponent implements OnInit, OnDestroy {
  globalConfigFormCfg = GLOBAL_CONFIG_FORM_CONFIG;
  projectConfigFormCfg = GLOBAL_CONFIG_FORM_CONFIG;
  globalCfg: GlobalConfig;
  private _subs = new Subscription();

  constructor(
    public readonly configService: ConfigService,
    public readonly projectService: ProjectService,
    public readonly googleApiService: GoogleApiService,
  ) {
  }

  ngOnInit() {
    this._subs.add(this.configService.cfg$.subscribe((cfg) => {
      this.globalCfg = cfg;
    }));
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
  }

  testLogin() {
    this.googleApiService.login();
  }
}
