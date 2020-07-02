import { Action, createFeatureSelector, createSelector } from '@ngrx/store';
import { GoogleDriveSyncActionTypes } from './google-drive-sync.actions';

export const GOOGLE_DRIVE_FEATURE_NAME = 'googleDrive';

export interface GoogleDriveState {
  isLoadInProgress: boolean;
  isSaveInProgress: boolean;
}

export const initialGoogleDriveState: GoogleDriveState = {
  isLoadInProgress: false,
  isSaveInProgress: false,
};

export const selectGoogleDriveFeatureState = createFeatureSelector<GoogleDriveState>(GOOGLE_DRIVE_FEATURE_NAME);

export const selectIsGoogleDriveLoadInProgress = createSelector(
  selectGoogleDriveFeatureState,
  (state) => state.isLoadInProgress,
);

export const selectIsGoogleDriveSaveInProgress = createSelector(
  selectGoogleDriveFeatureState,
  (state) => state.isSaveInProgress,
);

export function reducer(state: GoogleDriveState = initialGoogleDriveState, action: Action): GoogleDriveState {
  switch (action.type) {
    // case GoogleDriveSyncActionTypes.SaveForSync:
    //   return {...state, isSaveInProgress: true};
    case GoogleDriveSyncActionTypes.LoadFromGoogleDrive:
    case GoogleDriveSyncActionTypes.LoadFromGoogleDriveFlow:
      return {...state, isLoadInProgress: true};

    case GoogleDriveSyncActionTypes.LoadFromGoogleDriveSuccess:
    case GoogleDriveSyncActionTypes.LoadFromGoogleDriveCancel:
      return {...state, isLoadInProgress: false};

    case GoogleDriveSyncActionTypes.SaveToGoogleDrive:
    case GoogleDriveSyncActionTypes.SaveToGoogleDriveFlow:
      return {...state, isSaveInProgress: true};

    case GoogleDriveSyncActionTypes.SaveToGoogleDriveSuccess:
    case GoogleDriveSyncActionTypes.SaveToGoogleDriveCancel:
      return {...state, isSaveInProgress: false};

    case GoogleDriveSyncActionTypes.ChangeSyncFileName:
      return {...state, isSaveInProgress: false, isLoadInProgress: false};

    default:
      return state;
  }
}
