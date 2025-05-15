import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { TaskRepeatCfg } from '../../task-repeat-cfg/task-repeat-cfg.model';
import { MatDialog } from '@angular/material/dialog';
import { DialogEditTaskRepeatCfgComponent } from '../../task-repeat-cfg/dialog-edit-task-repeat-cfg/dialog-edit-task-repeat-cfg.component';
import { T } from 'src/app/t.const';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MatIcon } from '@angular/material/icon';
import { MsToStringPipe } from '../../../ui/duration/ms-to-string.pipe';

@Component({
  selector: 'planner-repeat-projection',
  templateUrl: './planner-repeat-projection.component.html',
  styleUrl: './planner-repeat-projection.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIcon, MsToStringPipe, TranslatePipe],
})
export class PlannerRepeatProjectionComponent {
  private _matDialog = inject(MatDialog);
  private _translateService = inject(TranslateService);

  repeatCfg = input.required<TaskRepeatCfg>();
  overWriteTimeEstimate = input(0);

  T = T;

  editTaskRepeatCfg(): void {
    this._matDialog.open(DialogEditTaskRepeatCfgComponent, {
      restoreFocus: false,
      data: {
        repeatCfg: this.repeatCfg(),
      },
    });
  }
}
