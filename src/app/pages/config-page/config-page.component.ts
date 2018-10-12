import { Component, OnInit } from '@angular/core';
import { ConfigService } from '../../core/config/config.service';
import { ConfigFormConfig } from '../../core/config/config-form-config.const';

@Component({
  selector: 'config-page',
  templateUrl: './config-page.component.html',
  styleUrls: ['./config-page.component.css']
})
export class ConfigPageComponent implements OnInit {
  formCfg = ConfigFormConfig;

  constructor(public readonly configService: ConfigService) {
  }

  ngOnInit() {
  }

}
