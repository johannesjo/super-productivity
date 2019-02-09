import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material';
import { Reminder } from '../../reminder/reminder.model';
import { Note } from '../note.model';
import { NoteService } from '../note.service';
import { Observable } from 'rxjs';
import { ReminderService } from '../../reminder/reminder.service';
import { ProjectService } from '../../project/project.service';
import { Project } from '../../project/project.model';

@Component({
  selector: 'dialog-view-note-reminder',
  templateUrl: './dialog-view-note-reminder.component.html',
  styleUrls: ['./dialog-view-note-reminder.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DialogViewNoteReminderComponent {
  note$: Observable<Note> = this._noteService.getById(this.data.reminder.relatedId);
  reminder: Reminder = this.data.reminder;
  isForCurrentProject = (this.reminder.projectId === this._projectService.currentId);
  targetProject$: Observable<Project> = this._projectService.getById(this.reminder.projectId);

  constructor(
    private _matDialogRef: MatDialogRef<DialogViewNoteReminderComponent>,
    private _noteService: NoteService,
    private _projectService: ProjectService,
    private _reminderService: ReminderService,
    @Inject(MAT_DIALOG_DATA) public data: { reminder: Reminder },
  ) {
    this._matDialogRef.disableClose = true;
    throw new Error('Lorem ipsum dolor sit amet, consectetur adipisicing elit. A ad, aperiam blanditiis dignissimos incidunt iste iusto maxime nobis praesentium quae quibusdam ratione rem rerum sapiente ullam unde ut velit voluptatem? Assumenda id nobis veritatis. Aut itaque molestias nulla porro possimus.');
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
    this._reminderService.updateReminder(this.reminder.id, {
      remindAt: Date.now() + (10 * 60 * 1000)
    });
    this.close();
  }

  close() {
    this._matDialogRef.close();
  }
}
