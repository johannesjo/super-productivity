import { createEntityAdapter, EntityAdapter, EntityState } from '@ngrx/entity';
import { AttachmentActions, AttachmentActionTypes } from './attachment.actions';
import { Attachment } from '../attachment.model';
import { createFeatureSelector, createSelector } from '@ngrx/store';

export const ATTACHMENT_FEATURE_NAME = 'attachment';

export interface AttachmentState extends EntityState<Attachment> {
}

export const adapter: EntityAdapter<Attachment> = createEntityAdapter<Attachment>();
export const selectAttachmentFeatureState = createFeatureSelector<AttachmentState>(ATTACHMENT_FEATURE_NAME);
export const {selectIds, selectEntities, selectAll, selectTotal} = adapter.getSelectors();
export const selectAllAttachments = createSelector(selectAttachmentFeatureState, selectAll);

export const initialAttachmentState: AttachmentState = adapter.getInitialState({});

export function attachmentReducer(
  state = initialAttachmentState,
  action: AttachmentActions
): AttachmentState {
  switch (action.type) {
    case AttachmentActionTypes.AddAttachment: {
      return adapter.addOne(action.payload.attachment, state);
    }

    case AttachmentActionTypes.UpdateAttachment: {
      return adapter.updateOne(action.payload.attachment, state);
    }

    case AttachmentActionTypes.DeleteAttachment: {
      return adapter.removeOne(action.payload.id, state);
    }

    case AttachmentActionTypes.LoadAttachmentState:
      return {...action.payload.state};


    default: {
      return state;
    }
  }
}


