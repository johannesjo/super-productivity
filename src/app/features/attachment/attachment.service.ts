import { Injectable } from '@angular/core';
import { select, Store } from '@ngrx/store';
import { AttachmentState, initialAttachmentState, selectAllAttachments, selectAttachmentByIds } from './store/attachment.reducer';
import { AddAttachment, DeleteAttachment, DeleteAttachments, LoadAttachmentState, UpdateAttachment } from './store/attachment.actions';
import { Observable } from 'rxjs';
import { Attachment } from './attachment.model';
import shortid from 'shortid';
import { DialogEditAttachmentComponent } from './dialog-edit-attachment/dialog-edit-attachment.component';
import { MatDialog } from '@angular/material';
import { createFromDrop, createFromPaste, DropPasteInput } from '../../core/drop-paste-input/drop-paste-input';
import { PersistenceService } from '../../core/persistence/persistence.service';
import { take } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class AttachmentService {
  attachments$: Observable<Attachment[]> = this._store$.pipe(select(selectAllAttachments));

  constructor(
    private _store$: Store<AttachmentState>,
    private _matDialog: MatDialog,
    private _persistenceService: PersistenceService,
  ) {
  }

  async loadStateForProject(projectId: string) {
    const lsAttachmentState = await this._persistenceService.loadTaskAttachmentsForProject(projectId);
    this.loadState(lsAttachmentState || initialAttachmentState);
  }

  loadState(state: AttachmentState) {
    this._store$.dispatch(new LoadAttachmentState({state}));
  }

  addAttachment(attachment: Attachment) {
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

  updateAttachment(id: string, changes: Partial<Attachment>) {
    this._store$.dispatch(new UpdateAttachment({attachment: {id, changes}}));
  }

  getByIds(ids: string[]): Observable<Attachment[]> {
    return this._store$.pipe(select(selectAttachmentByIds, {ids}), take(1));
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

    this._matDialog.open(DialogEditAttachmentComponent, {
      restoreFocus: true,
      data: {
        attachment: {...attachment, taskId},
      },
    }).afterClosed()
      .subscribe((attachment_) => {
        if (attachment_) {
          if (attachment_.id) {
            this.updateAttachment(attachment_.id, attachment_);
          } else {
            this.addAttachment(attachment_);
          }
        }
      });
  }
}
