import { Action } from '@ngrx/store';

export enum GoogleDriveSyncActionTypes {
  LoadFromGoogleDrive = '[GoogleDriveSync] Load From',
  LoadFromGoogleDriveSuccess = '[GoogleDriveSync] Load From Success',
  SaveToGoogleDrive = '[GoogleDriveSync] Save To',
  SaveToGoogleDriveSuccess = '[GoogleDriveSync] Save To Success',
  ChangeSyncFileName = '[GoogleDriveSync] Change Sync File Name',
  SaveForSync = '[GoogleDriveSync] Save For Sync',
  SaveForSyncSuccess = '[GoogleDriveSync] Save For Sync Success',
  CreateSyncFile = '[GoogleDriveSync] Create Sync File',
}

export class LoadFromGoogleDrive implements Action {
  readonly type = GoogleDriveSyncActionTypes.LoadFromGoogleDrive;
}

export class LoadFromGoogleDriveSuccess implements Action {
  readonly type = GoogleDriveSyncActionTypes.LoadFromGoogleDriveSuccess;
}

export class SaveToGoogleDrive implements Action {
  readonly type = GoogleDriveSyncActionTypes.SaveToGoogleDrive;
}

export class SaveToGoogleDriveSuccess implements Action {
  readonly type = GoogleDriveSyncActionTypes.SaveToGoogleDriveSuccess;
}

export class ChangeSyncFileName implements Action {
  readonly type = GoogleDriveSyncActionTypes.ChangeSyncFileName;

  constructor(public payload: { newFileName: string }) {
  }
}

export class SaveForSync implements Action {
  readonly type = GoogleDriveSyncActionTypes.SaveForSync;
}

export class SaveForSyncSuccess implements Action {
  readonly type = GoogleDriveSyncActionTypes.SaveForSyncSuccess;
}

export class CreateSyncFile implements Action {
  readonly type = GoogleDriveSyncActionTypes.CreateSyncFile;

  constructor(public payload: { newFileName: string }) {
  }
}


export type GoogleDriveSyncActions
  = LoadFromGoogleDrive
  | LoadFromGoogleDriveSuccess
  | SaveToGoogleDrive
  | SaveToGoogleDriveSuccess
  | ChangeSyncFileName
  | SaveForSync
  | SaveForSyncSuccess
  | CreateSyncFile
  ;
