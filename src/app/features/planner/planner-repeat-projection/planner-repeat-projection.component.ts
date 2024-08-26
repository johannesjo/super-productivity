import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { TaskRepeatCfg } from '../../task-repeat-cfg/task-repeat-cfg.model';
import { MatDialog } from '@angular/material/dialog';
import { DialogEditTaskRepeatCfgComponent } from '../../task-repeat-cfg/dialog-edit-task-repeat-cfg/dialog-edit-task-repeat-cfg.component';

@Component({
  selector: 'planner-repeat-projection',
  standalone: false,
  templateUrl: './planner-repeat-projection.component.html',
  styleUrl: './planner-repeat-projection.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlannerRepeatProjectionComponent {
  @Input({ required: true }) repeatCfg!: TaskRepeatCfg;
  @Input() overWriteTimeEstimate: number = 0;

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
