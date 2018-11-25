import { ChangeDetectionStrategy, Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material';
import { Reminder } from '../../reminder/reminder.model';
import { ReminderService } from '../../reminder/reminder.service';

@Component({
  selector: 'dialog-view-note-reminder',
  templateUrl: './dialog-view-note-reminder.component.html',
  styleUrls: ['./dialog-view-note-reminder.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DialogViewNoteReminderComponent implements OnInit {

  constructor(
    private _matDialogRef: MatDialogRef<DialogViewNoteReminderComponent>,
    private _reminderService: ReminderService,
    @Inject(MAT_DIALOG_DATA) public data: { reminder: Reminder },
  ) {
    _matDialogRef.disableClose = true;
  }

  ngOnInit() {
  }
}
