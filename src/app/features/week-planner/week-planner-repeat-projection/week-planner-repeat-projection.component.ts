import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { TaskRepeatCfg } from '../../task-repeat-cfg/task-repeat-cfg.model';
import { MatDialog } from '@angular/material/dialog';
import { DialogEditTaskRepeatCfgComponent } from '../../task-repeat-cfg/dialog-edit-task-repeat-cfg/dialog-edit-task-repeat-cfg.component';

@Component({
  selector: 'week-planner-repeat-projection',
  standalone: false,
  templateUrl: './week-planner-repeat-projection.component.html',
  styleUrl: './week-planner-repeat-projection.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WeekPlannerRepeatProjectionComponent {
  @Input({ required: true }) repeatCfg!: TaskRepeatCfg;

  constructor(private _matDialog: MatDialog) {}

  editTaskRepeatCfg(): void {
    this._matDialog.open(DialogEditTaskRepeatCfgComponent, {
      restoreFocus: false,
      data: {
        repeatCfg: this.repeatCfg,
      },
    });
  }
}
