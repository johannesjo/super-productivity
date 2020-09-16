import { ChangeDetectionStrategy, Component, Inject, OnDestroy } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Reminder } from '../../reminder/reminder.model';
import { Note } from '../note.model';
import { NoteService } from '../note.service';
import { Observable, Subscription } from 'rxjs';
import { ReminderService } from '../../reminder/reminder.service';
import { ProjectService } from '../../project/project.service';
import { Project } from '../../project/project.model';
import { T } from '../../../t.const';
import { WorkContextService } from '../../work-context/work-context.service';
import { Tag } from '../../tag/tag.model';
import { WorkContextType } from '../../work-context/work-context.model';
import { TagService } from '../../tag/tag.service';

@Component({
  selector: 'dialog-view-note-reminder',
  templateUrl: './dialog-view-note-reminder.component.html',
  styleUrls: ['./dialog-view-note-reminder.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DialogViewNoteReminderComponent implements OnDestroy {
  T: typeof T = T;
  note$: Observable<Note> = this._noteService.getById$(this.data.reminder.relatedId);
  reminder: Reminder = this.data.reminder;
  isForCurrentContext: boolean = (this.reminder.workContextId === this._workContextService.activeWorkContextId);
  targetContext$: Observable<Tag | Project> = (this.data.reminder.workContextType === WorkContextType.PROJECT)
    ? this._projectService.getByIdOnce$(this.reminder.workContextId)
    : this._tagService.getTagById$(this.reminder.workContextId);

  private _subs: Subscription = new Subscription();

  constructor(
    private _matDialogRef: MatDialogRef<DialogViewNoteReminderComponent>,
    private _noteService: NoteService,
    private _projectService: ProjectService,
    private _tagService: TagService,
    private _workContextService: WorkContextService,
    private _reminderService: ReminderService,
    @Inject(MAT_DIALOG_DATA) public data: { reminder: Reminder },
  ) {
    this._matDialogRef.disableClose = true;
    this._subs.add(this._reminderService.onReloadModel$.subscribe(() => {
      this.close();
    }));

    if (this.reminder.workContextType !== WorkContextType.PROJECT) {
      throw new Error('This should never happen');
    }
  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
  }

  dismiss() {
    const reminder = this.reminder;

    if (this.isForCurrentContext) {
      this._noteService.update(reminder.relatedId, {
        reminderId: null,
      });
      this._reminderService.removeReminder(reminder.id);
      this.close();

    } else {
      this._noteService.updateFromDifferentWorkContext(reminder.workContextId, reminder.relatedId, {
        reminderId: null,
      }).then(() => {
        this._reminderService.removeReminder(reminder.id);
        this.close();
      });
    }
  }

  snooze(snoozeInMinutes: number) {
    this._reminderService.updateReminder(this.reminder.id, {
      remindAt: Date.now() + (snoozeInMinutes * 60 * 1000)
    });
    this.close();
  }

  close() {
    this._matDialogRef.close();
  }
}
