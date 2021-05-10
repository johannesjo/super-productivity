import { ChangeDetectionStrategy, Component, OnDestroy } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { FormGroup } from '@angular/forms';
import { FormlyFieldConfig } from '@ngx-formly/core';
import { TIMELINE_FORM_CFG } from '../../config/form-cfgs/timeline-form.const';
import { DEFAULT_GLOBAL_CONFIG } from '../../config/default-global-config.const';
import { TimelineConfig } from '../../config/global-config.model';
import { T } from '../../../t.const';
import { GlobalConfigService } from '../../config/global-config.service';
import { Subscription } from 'rxjs';
import { LS_WAS_TIMELINE_INITIAL_DIALOG_SHOWN } from '../../../core/persistence/ls-keys.const';

@Component({
  selector: 'dialog-timeline-initial-setup',
  templateUrl: './dialog-timeline-initial-setup.component.html',
  styleUrls: ['./dialog-timeline-initial-setup.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogTimelineInitialSetupComponent implements OnDestroy {
  T: typeof T = T;
  timelineCfg: TimelineConfig;
  formGroup: FormGroup = new FormGroup({});
  formConfig: FormlyFieldConfig[] = TIMELINE_FORM_CFG.items as FormlyFieldConfig[];
  private _subs = new Subscription();

  constructor(
    private _matDialogRef: MatDialogRef<DialogTimelineInitialSetupComponent>,
    private _globalConfigService: GlobalConfigService,
  ) {
    this.timelineCfg = DEFAULT_GLOBAL_CONFIG.timeline;
    this._subs.add(
      this._globalConfigService.timelineCfg$.subscribe((v) => (this.timelineCfg = v)),
    );
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
  }

  saveAndClose() {
    localStorage.setItem(LS_WAS_TIMELINE_INITIAL_DIALOG_SHOWN, 'true');
    this._matDialogRef.close();
    if (this.timelineCfg) {
      this._globalConfigService.updateSection('timeline', this.timelineCfg);
    }
  }

  close() {
    this._matDialogRef.close();
  }
}
