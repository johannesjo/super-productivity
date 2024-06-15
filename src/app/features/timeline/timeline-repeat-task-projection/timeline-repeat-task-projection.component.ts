import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { TaskRepeatCfg } from '../../task-repeat-cfg/task-repeat-cfg.model';
import { DialogEditTaskRepeatCfgComponent } from '../../task-repeat-cfg/dialog-edit-task-repeat-cfg/dialog-edit-task-repeat-cfg.component';
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';

@Component({
  selector: 'timeline-task-repeat-projection',
  templateUrl: './timeline-repeat-task-projection.component.html',
  styleUrls: ['./timeline-repeat-task-projection.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimelineRepeatTaskProjectionComponent {
  @Input() repeatCfg?: TaskRepeatCfg;

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
