import {Injectable} from '@angular/core';
import {select, Store} from '@ngrx/store';
import {
  TaskAttachmentState,
  initialAttachmentState,
  selectAllAttachments,
  selectAttachmentByIds
} from './store/attachment.reducer';
import {
  AddAttachment,
  DeleteAttachment,
  DeleteAttachments,
  LoadAttachmentState,
  UpdateAttachment
} from './store/attachment.actions';
import {Observable} from 'rxjs';
import {TaskAttachment} from './task-attachment.model';
import shortid from 'shortid';
import {DialogEditTaskAttachmentComponent} from './dialog-edit-attachment/dialog-edit-task-attachment.component';
import {MatDialog} from '@angular/material/dialog';
import {createFromDrop, createFromPaste, DropPasteInput} from '../../../core/drop-paste-input/drop-paste-input';
import {PersistenceService} from '../../../core/persistence/persistence.service';

@Injectable({
  providedIn: 'root',
})
export class TaskAttachmentService {

  constructor(
    private _store$: Store<TaskAttachmentState>,
    private _matDialog: MatDialog,
    private _persistenceService: PersistenceService,
  ) {
  }

  async load() {
    const lsAttachmentState = await this._persistenceService.taskAttachment.loadState();
    this.loadState(lsAttachmentState || initialAttachmentState);
  }

  loadState(state: TaskAttachmentState) {
    this._store$.dispatch(new LoadAttachmentState({state}));
  }

  addAttachment(attachment: TaskAttachment) {
    if (!attachment) {
      console.error('No valid attachment passed');
      return;
    }

    this._store$.dispatch(new AddAttachment({
      attachment: {
        ...attachment,
        id: shortid()
      }
    }));
  }

  deleteAttachment(id: string) {
    this._store$.dispatch(new DeleteAttachment({id}));
  }

  deleteAttachments(ids: string[]) {
    this._store$.dispatch(new DeleteAttachments({ids}));
  }

  updateAttachment(id: string, changes: Partial<TaskAttachment>) {
    this._store$.dispatch(new UpdateAttachment({attachment: {id, changes}}));
  }

  getByIds$(ids: string[]): Observable<TaskAttachment[]> {
    return this._store$.pipe(select(selectAttachmentByIds, {ids}));
  }


  // HANDLE INPUT
  // ------------
  createFromDrop(ev, taskId: string) {
    this._handleInput(createFromDrop(ev), ev, taskId);
  }


  createFromPaste(ev, taskId: string) {
    this._handleInput(createFromPaste(ev), ev, taskId);
  }


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
