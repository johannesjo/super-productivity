import { Injectable } from '@angular/core';
import { Actions, Effect, ofType } from '@ngrx/effects';
import { tap, withLatestFrom } from 'rxjs/operators';
import { select, Store } from '@ngrx/store';
import { selectCurrentProjectId } from '../../project/store/project.reducer';
import { AttachmentActionTypes } from './attachment.actions';
import { selectAttachmentFeatureState } from './attachment.reducer';
import { PersistenceService } from '../../core/persistence/persistence.service';

@Injectable()
export class AttachmentEffects {

  @Effect({dispatch: false}) updateAttachments$: any = this._actions$
    .pipe(
      ofType(
        AttachmentActionTypes.AddAttachment,
        AttachmentActionTypes.UpdateAttachment,
        AttachmentActionTypes.DeleteAttachment,
      ),
      withLatestFrom(
        this._store$.pipe(select(selectCurrentProjectId)),
        this._store$.pipe(select(selectAttachmentFeatureState)),
      ),
      tap(this._saveToLs.bind(this))
    );

  constructor(
    private _actions$: Actions,
    private _store$: Store<any>,
    private _persistenceService: PersistenceService
  ) {
  }

  private _saveToLs([action, currentProjectId, attachmentState]) {
    if (currentProjectId) {
      this._persistenceService.saveLastActive();
      this._persistenceService.saveTaskAttachmentsForProject(currentProjectId, attachmentState);
    } else {
      throw new Error('No current project id');
    }
  }

}
