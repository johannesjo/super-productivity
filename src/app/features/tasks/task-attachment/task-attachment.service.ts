import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { TaskAttachment } from './task-attachment.model';
import { nanoid } from 'nanoid';
import { DialogEditTaskAttachmentComponent } from './dialog-edit-attachment/dialog-edit-task-attachment.component';
import { MatDialog } from '@angular/material/dialog';
import { DropPasteInput } from '../../../core/drop-paste-input/drop-paste.model';
import {
  addTaskAttachment,
  deleteTaskAttachment,
  updateTaskAttachment,
} from './task-attachment.actions';
import { TaskState } from '../task.model';
import { createFromDrop } from 'src/app/core/drop-paste-input/drop-paste-input';

@Injectable({
  providedIn: 'root',
})
export class TaskAttachmentService {
  constructor(
    private _store$: Store<TaskState>,
    private _matDialog: MatDialog,
  ) {}

  addAttachment(taskId: string, taskAttachment: TaskAttachment): void {
    if (!taskAttachment) {
      console.error('No valid attachment passed');
      return;
    }

    this._store$.dispatch(
      addTaskAttachment({
        taskId,
        taskAttachment: {
          ...taskAttachment,
          id: nanoid(),
        },
      }),
    );
  }

  deleteAttachment(taskId: string, id: string): void {
    this._store$.dispatch(deleteTaskAttachment({ taskId, id }));
  }

  updateAttachment(taskId: string, id: string, changes: Partial<TaskAttachment>): void {
    this._store$.dispatch(
      updateTaskAttachment({ taskId, taskAttachment: { id, changes } }),
    );
  }

  // HANDLE INPUT
  // ------------
  createFromDrop(ev: DragEvent, taskId: string): void {
    this._handleInput(createFromDrop(ev) as DropPasteInput, ev, taskId);
  }

  // createFromPaste(ev, taskId: string): void {
  //   this._handleInput(createFromPaste(ev), ev, taskId);
  // }

  private _handleInput(attachment: DropPasteInput, ev: Event, taskId: string): void {
    // properly not intentional so we leave
    if (!attachment || !attachment.path) {
      return;
    }

    // don't intervene with text inputs
    const targetEl = ev.target as HTMLElement;
    if (
      targetEl.tagName === 'INPUT' ||
      (targetEl.tagName === 'TEXTAREA' &&
        targetEl.parentElement?.tagName.toLowerCase() !== 'inline-multiline-input')
    ) {
      return;
    }

    ev.preventDefault();
    ev.stopPropagation();

    this._matDialog
      .open(DialogEditTaskAttachmentComponent, {
        restoreFocus: true,
        data: {
          attachment: { ...attachment, taskId },
        },
      })
      .afterClosed()
      .subscribe((attachmentIN) => {
        if (attachmentIN) {
          if (attachmentIN.id) {
            this.updateAttachment(taskId, attachmentIN.id, attachmentIN);
          } else {
            this.addAttachment(taskId, attachmentIN);
          }
        }
      });
  }
}
