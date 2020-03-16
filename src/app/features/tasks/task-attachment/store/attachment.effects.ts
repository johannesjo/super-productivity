import {Injectable} from '@angular/core';
import {Actions, Effect, ofType} from '@ngrx/effects';
import {tap, withLatestFrom} from 'rxjs/operators';
import {select, Store} from '@ngrx/store';
import {AttachmentActionTypes} from './attachment.actions';
import {selectAttachmentFeatureState} from './attachment.reducer';
import {PersistenceService} from '../../../../core/persistence/persistence.service';
import {TaskActionTypes} from '../../store/task.actions';

@Injectable()
export class AttachmentEffects {

  @Effect({dispatch: false}) updateAttachments$: any = this._actions$
    .pipe(
      ofType(
        TaskActionTypes.AddTask,
        TaskActionTypes.RestoreTask,
        TaskActionTypes.DeleteTask,
        TaskActionTypes.MoveToArchive,
        AttachmentActionTypes.AddAttachment,
        AttachmentActionTypes.UpdateAttachment,
        AttachmentActionTypes.DeleteAttachment,
      ),
      withLatestFrom(
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

  private _saveToLs([, attachmentState]) {
    this._persistenceService.saveLastActive();
    this._persistenceService.taskAttachment.saveState(attachmentState);
  }
}
