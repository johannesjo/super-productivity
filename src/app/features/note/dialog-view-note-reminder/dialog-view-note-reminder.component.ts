import { ChangeDetectionStrategy, Component, Inject, OnDestroy } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Reminder } from '../../reminder/reminder.model';
import { Note } from '../note.model';
import { NoteService } from '../note.service';
import { Observable, Subscription } from 'rxjs';
import { ReminderService } from '../../reminder/reminder.service';
import { ProjectService } from '../../project/project.service';
import { Project } from '../../project/project.model';

@Component({
  selector: 'dialog-view-note-reminder',
  templateUrl: './dialog-view-note-reminder.component.html',
  styleUrls: ['./dialog-view-note-reminder.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DialogViewNoteReminderComponent implements OnDestroy {
  note$: Observable<Note> = this._noteService.getById(this.data.reminder.relatedId);
  reminder: Reminder = this.data.reminder;
  isForCurrentProject = (this.reminder.projectId === this._projectService.currentId);
  targetProject$: Observable<Project> = this._projectService.getById(this.reminder.projectId);

  private _subs = new Subscription();

  constructor(
    private _matDialogRef: MatDialogRef<DialogViewNoteReminderComponent>,
    private _noteService: NoteService,
    private _projectService: ProjectService,
    private _reminderService: ReminderService,
    @Inject(MAT_DIALOG_DATA) public data: { reminder: Reminder },
  ) {
    this._matDialogRef.disableClose = true;
    this._subs.add(this._reminderService.onReloadModel$.subscribe(() => {
      this.close();
    }));
  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
  }

  dismiss() {
    const reminder = this.reminder;
    if (this.isForCurrentProject) {
      this._noteService.update(reminder.relatedId, {
        reminderId: null,
      });
      this._reminderService.removeReminder(reminder.id);
      this.close();

    } else {
      this._noteService.updateFromDifferentProject(reminder.projectId, reminder.relatedId, {
        reminderId: null,
      }).then(() => {
        this._reminderService.removeReminder(reminder.id);
        this.close();
      });
    }
  }

  snooze() {
    this._reminderService.snooze(this.reminder.id, 10 * 60 * 1000);
    this.close();
  }

  close() {
    this._matDialogRef.close();
  }
}
