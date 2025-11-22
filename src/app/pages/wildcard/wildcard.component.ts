import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { GlobalConfigService } from 'src/app/features/config/global-config.service';
import { INBOX_PROJECT } from 'src/app/features/project/project.const';
import { TODAY_TAG } from 'src/app/features/tag/tag.const';

@Component({})
export class WildcardComponent implements OnInit {
  private _globalConfigService = inject(GlobalConfigService);
  private _router = inject(Router);

  ngOnInit(): void {
    const TODAY = 0;
    const INBOX = 1;
    const miscCfg = this._globalConfigService.misc();
    if ((miscCfg?.defaultStartPage ?? TODAY) == INBOX) {
      this._router.navigate([`/project/${INBOX_PROJECT.id}/tasks`]);
    } else {
      this._router.navigate([`/tag/${TODAY_TAG.id}/tasks`]);
    }
  }
}
