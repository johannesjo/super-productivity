import {Injectable} from '@angular/core';
import {select, Store} from '@ngrx/store';

import {Observable} from 'rxjs';
import {TaskAttachment} from './task-attachment.model';
import shortid from 'shortid';
import {DialogEditTaskAttachmentComponent} from './dialog-edit-attachment/dialog-edit-task-attachment.component';
import {MatDialog} from '@angular/material/dialog';
import {createFromDrop, DropPasteInput} from '../../../core/drop-paste-input/drop-paste-input';
import {PersistenceService} from '../../../core/persistence/persistence.service';
import {AddTaskAttachment, DeleteTaskAttachment, UpdateTaskAttachment} from './task-attachment.actions';
import {TaskState} from '../task.model';

@Injectable({
  providedIn: 'root',
})
export class TaskAttachmentService {

  constructor(
    private _store$: Store<TaskState>,
    private _matDialog: MatDialog,
    private _persistenceService: PersistenceService,
  ) {
  }

  addAttachment(taskAttachment: TaskAttachment) {
    if (!taskAttachment) {
      console.error('No valid attachment passed');
      return;
    }

    this._store$.dispatch(new AddTaskAttachment({
      taskAttachment: {
        ...taskAttachment,
        id: shortid()
      }
    }));
  }

  deleteAttachment(id: string) {
    this._store$.dispatch(new DeleteTaskAttachment({id}));
  }


  updateAttachment(id: string, changes: Partial<TaskAttachment>) {
    this._store$.dispatch(new UpdateTaskAttachment({taskAttachment: {id, changes}}));
  }

  // HANDLE INPUT
  // ------------
  createFromDrop(ev, taskId: string) {
    this._handleInput(createFromDrop(ev), ev, taskId);
  }


  // createFromPaste(ev, taskId: string) {
  //   this._handleInput(createFromPaste(ev), ev, taskId);
  // }


  private _handleInput(attachment: DropPasteInput, ev, taskId) {
    // properly not intentional so we leave
    if (!attachment || !attachment.path) {
      return;
    }

    // don't intervene with text inputs
    if (ev.target.tagName === 'INPUT' || ev.target.tagName === 'TEXTAREA') {
      return;
    }

    ev.preventDefault();
    ev.stopPropagation();

    this._matDialog.open(DialogEditTaskAttachmentComponent, {
      restoreFocus: true,
      data: {
        attachment: {...attachment, taskId},
      },
    }).afterClosed()
      .subscribe((attachmentIN) => {
        if (attachmentIN) {
          if (attachmentIN.id) {
            this.updateAttachment(attachmentIN.id, attachmentIN);
          } else {
            this.addAttachment(attachmentIN);
          }
        }
      });
  }
}
