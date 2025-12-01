import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { ReactiveFormsModule, UntypedFormGroup } from '@angular/forms';
import { FormlyFieldConfig, FormlyModule } from '@ngx-formly/core';
import { SCHEDULE_FORM_CFG } from '../../config/form-cfgs/schedule-form.const';
import { DEFAULT_GLOBAL_CONFIG } from '../../config/default-global-config.const';
import { ScheduleConfig } from '../../config/global-config.model';
import { T } from '../../../t.const';
import { GlobalConfigService } from '../../config/global-config.service';
import { LS } from '../../../core/persistence/storage-keys.const';

import { TranslateModule } from '@ngx-translate/core';
import { MatIcon } from '@angular/material/icon';
import { HelpSectionComponent } from '../../../ui/help-section/help-section.component';
import { MatButton } from '@angular/material/button';

@Component({
  selector: 'dialog-schedule-setup',
  templateUrl: './dialog-timeline-setup.component.html',
  styleUrls: ['./dialog-timeline-setup.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslateModule,
    MatDialogTitle,
    MatIcon,
    ReactiveFormsModule,
    MatDialogContent,
    HelpSectionComponent,
    FormlyModule,
    MatDialogActions,
    MatButton,
  ],
})
export class DialogTimelineSetupComponent {
  private _matDialogRef =
    inject<MatDialogRef<DialogTimelineSetupComponent>>(MatDialogRef);
  data = inject<{
    isInfoShownInitially: boolean;
  }>(MAT_DIALOG_DATA);
  readonly globalConfigService = inject(GlobalConfigService);

  T: typeof T = T;

  // Local copy for form editing
  private _localTimelineCfg: ScheduleConfig;

  get timelineCfg(): ScheduleConfig {
    // Return local copy if it exists, otherwise use the signal value or default
    return (
      this._localTimelineCfg ??
      this.globalConfigService.timelineCfg() ??
      DEFAULT_GLOBAL_CONFIG.schedule
    );
  }

  set timelineCfg(value: ScheduleConfig) {
    this._localTimelineCfg = value;
  }

  formGroup: UntypedFormGroup = new UntypedFormGroup({});
  formConfig: FormlyFieldConfig[] = SCHEDULE_FORM_CFG.items as FormlyFieldConfig[];

  constructor() {
    // Initialize local copy with current config value
    this._localTimelineCfg =
      this.globalConfigService.timelineCfg() ?? DEFAULT_GLOBAL_CONFIG.schedule;
  }

  saveAndClose(): void {
    localStorage.setItem(LS.WAS_SCHEDULE_INITIAL_DIALOG_SHOWN, 'true');
    this._matDialogRef.close();
    if (this._localTimelineCfg) {
      this.globalConfigService.updateSection('schedule', this._localTimelineCfg);
    }
  }

  close(): void {
    this._matDialogRef.close();
  }
}
