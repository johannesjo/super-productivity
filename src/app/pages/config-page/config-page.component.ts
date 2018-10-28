import { Component, OnInit } from '@angular/core';
import { ConfigService } from '../../core/config/config.service';
import { GLOBAL_CONFIG_FORM_CONFIG } from '../../core/config/config-form-config.const';
import { ProjectService } from '../../project/project.service';
import { GoogleApiService } from '../../core/google/google-api.service';

@Component({
  selector: 'config-page',
  templateUrl: './config-page.component.html',
  styleUrls: ['./config-page.component.scss']
})
export class ConfigPageComponent implements OnInit {
  globalConfigFormCfg = GLOBAL_CONFIG_FORM_CONFIG;
  projectConfigFormCfg = GLOBAL_CONFIG_FORM_CONFIG;

  constructor(
    public readonly configService: ConfigService,
    public readonly projectService: ProjectService,
    public readonly googleApiService: GoogleApiService,
  ) {
  }

  ngOnInit() {
  }

  testLogin() {
    this.googleApiService.login();
  }
}
