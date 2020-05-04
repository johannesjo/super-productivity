import {ChangeDetectionStrategy, Component, Inject} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {AddTaskReminderInterface} from '../../tasks/dialog-add-task-reminder/add-task-reminder-interface';
import {InitialDialogResponse} from '../initial-dialog.model';

@Component({
  selector: 'dialog-initial',
  templateUrl: './dialog-initial.component.html',
  styleUrls: ['./dialog-initial.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DialogInitialComponent {

  constructor(
    private _matDialogRef: MatDialogRef<DialogInitialComponent>,
    @Inject(MAT_DIALOG_DATA) public data: InitialDialogResponse,
  ) {
  }

  close() {
    this._matDialogRef.close();
  }
}
