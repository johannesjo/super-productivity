import {createEntityAdapter, EntityAdapter, EntityState} from '@ngrx/entity';
import {AttachmentActions, AttachmentActionTypes} from './attachment.actions';
import {Attachment} from '../attachment.model';
import {createFeatureSelector, createSelector} from '@ngrx/store';
import {DeleteTask, TaskActionTypes, UndoDeleteTask} from '../../tasks/store/task.actions';

export const ATTACHMENT_FEATURE_NAME = 'attachment';

export interface AttachmentState extends EntityState<Attachment> {
}

export const adapter: EntityAdapter<Attachment> = createEntityAdapter<Attachment>();
export const selectAttachmentFeatureState = createFeatureSelector<AttachmentState>(ATTACHMENT_FEATURE_NAME);
export const {selectIds, selectEntities, selectAll, selectTotal} = adapter.getSelectors();
export const selectAllAttachments = createSelector(selectAttachmentFeatureState, selectAll);
export const selectAttachmentByIds = createSelector(
  selectAttachmentFeatureState,
  (state, props: { ids }) => props.ids
    ? props.ids.map(id => state.entities[id])
      // don't display in case of data corruption
      .filter(v => !!v)
    : []
);

export const initialAttachmentState: AttachmentState = adapter.getInitialState({
});

export function attachmentReducer(
  state = initialAttachmentState,
  action: AttachmentActions | DeleteTask | UndoDeleteTask
): AttachmentState {
  switch (action.type) {
    case TaskActionTypes.DeleteTask: {
      const task = action.payload.task;
      const taskIds: string[] = [task.id, ...task.subTaskIds];
      const attachmentIds = state.ids as string[];
      const idsToRemove = attachmentIds.filter(id => taskIds.includes(state.entities[id].taskId));
      return adapter.removeMany(idsToRemove, state);
    }

    case AttachmentActionTypes.AddAttachment: {
      return adapter.addOne(action.payload.attachment, state);
    }

    case AttachmentActionTypes.UpdateAttachment: {
      return adapter.updateOne(action.payload.attachment, state);
    }

    case AttachmentActionTypes.DeleteAttachment: {
      return adapter.removeOne(action.payload.id, state);
    }

    case AttachmentActionTypes.DeleteAttachments: {
      return adapter.removeMany(action.payload.ids, state);
    }

    case AttachmentActionTypes.LoadAttachmentState:
      return {...action.payload.state};


    default: {
      return state;
    }
  }
}


