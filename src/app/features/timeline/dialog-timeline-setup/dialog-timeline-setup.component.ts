import { ChangeDetectionStrategy, Component, Inject, OnDestroy } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { UntypedFormGroup } from '@angular/forms';
import { FormlyFieldConfig } from '@ngx-formly/core';
import { TIMELINE_FORM_CFG } from '../../config/form-cfgs/timeline-form.const';
import { DEFAULT_GLOBAL_CONFIG } from '../../config/default-global-config.const';
import { TimelineConfig } from '../../config/global-config.model';
import { T } from '../../../t.const';
import { GlobalConfigService } from '../../config/global-config.service';
import { Subscription } from 'rxjs';
import { LS } from '../../../core/persistence/storage-keys.const';
import { Task } from '../../tasks/task.model';
import { TaskRepeatCfg } from '../../task-repeat-cfg/task-repeat-cfg.model';

@Component({
  selector: 'dialog-timeline-setup',
  templateUrl: './dialog-timeline-setup.component.html',
  styleUrls: ['./dialog-timeline-setup.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogTimelineSetupComponent implements OnDestroy {
  T: typeof T = T;
  timelineCfg: TimelineConfig;
  formGroup: UntypedFormGroup = new UntypedFormGroup({});
  formConfig: FormlyFieldConfig[] = TIMELINE_FORM_CFG.items as FormlyFieldConfig[];
  private _subs = new Subscription();

  constructor(
    private _matDialogRef: MatDialogRef<DialogTimelineSetupComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { isInfoShownInitially: boolean },
    private _globalConfigService: GlobalConfigService,
  ) {
    this.timelineCfg = DEFAULT_GLOBAL_CONFIG.timeline;
    this._subs.add(
      this._globalConfigService.timelineCfg$.subscribe((v) => (this.timelineCfg = v)),
    );
  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
  }

  saveAndClose(): void {
    localStorage.setItem(LS.WAS_TIMELINE_INITIAL_DIALOG_SHOWN, 'true');
    this._matDialogRef.close();
    if (this.timelineCfg) {
      this._globalConfigService.updateSection('timeline', this.timelineCfg);
    }
  }

  close(): void {
    this._matDialogRef.close();
  }
}
