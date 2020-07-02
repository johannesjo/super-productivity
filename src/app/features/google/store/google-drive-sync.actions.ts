import { Action } from '@ngrx/store';

export enum GoogleDriveSyncActionTypes {
  LoadFromGoogleDrive = '[GoogleDriveSync] Load From',
  LoadFromGoogleDriveFlow = '[GoogleDriveSync] Load From Flow',
  LoadFromGoogleDriveSuccess = '[GoogleDriveSync] Load From Success',
  LoadFromGoogleDriveCancel = '[GoogleDriveSync] Load From Cancel',
  SaveToGoogleDriveFlow = '[GoogleDriveSync] Save To Flow',
  SaveToGoogleDrive = '[GoogleDriveSync] Save To',
  SaveToGoogleDriveSuccess = '[GoogleDriveSync] Save To Success',
  SaveToGoogleDriveCancel = '[GoogleDriveSync] Save To Cancel',
  ChangeSyncFileName = '[GoogleDriveSync] Change Sync File Name',
  SaveForSync = '[GoogleDriveSync] Save For Sync',
  CreateSyncFile = '[GoogleDriveSync] Create Sync File',
}

export class LoadFromGoogleDrive implements Action {
  readonly type: string = GoogleDriveSyncActionTypes.LoadFromGoogleDrive;

  constructor(public payload?: { loadResponse?: any }) {
  }
}

export class LoadFromGoogleDriveFlow implements Action {
  readonly type: string = GoogleDriveSyncActionTypes.LoadFromGoogleDriveFlow;
}

export class LoadFromGoogleDriveSuccess implements Action {
  readonly type: string = GoogleDriveSyncActionTypes.LoadFromGoogleDriveSuccess;

  constructor(public payload: { modifiedDate: any }) {
  }
}

export class LoadFromGoogleDriveCancel implements Action {
  readonly type: string = GoogleDriveSyncActionTypes.LoadFromGoogleDriveCancel;
}

export class SaveToGoogleDriveFlow implements Action {
  readonly type: string = GoogleDriveSyncActionTypes.SaveToGoogleDriveFlow;

  constructor(public payload?: { isSkipSnack?: boolean; isSync?: boolean }) {
  }
}

export class SaveToGoogleDrive implements Action {
  readonly type: string = GoogleDriveSyncActionTypes.SaveToGoogleDrive;

  constructor(public payload?: { isSkipSnack?: boolean; }) {
  }
}

export class SaveToGoogleDriveSuccess implements Action {
  readonly type: string = GoogleDriveSyncActionTypes.SaveToGoogleDriveSuccess;

  constructor(public payload: { response: any; isSkipSnack?: boolean; }) {
  }
}

export class SaveToGoogleDriveCancel implements Action {
  readonly type: string = GoogleDriveSyncActionTypes.SaveToGoogleDriveCancel;
}

export class ChangeSyncFileName implements Action {
  readonly type: string = GoogleDriveSyncActionTypes.ChangeSyncFileName;

  constructor(public payload: { newFileName: string }) {
  }
}

export class SaveForSync implements Action {
  readonly type: string = GoogleDriveSyncActionTypes.SaveForSync;
}

export class CreateSyncFile implements Action {
  readonly type: string = GoogleDriveSyncActionTypes.CreateSyncFile;

  constructor(public payload: { newFileName: string }) {
  }
}

export type GoogleDriveSyncActions
  = LoadFromGoogleDrive
  | LoadFromGoogleDriveFlow
  | LoadFromGoogleDriveSuccess
  | LoadFromGoogleDriveCancel
  | SaveToGoogleDrive
  | SaveToGoogleDriveFlow
  | SaveToGoogleDriveSuccess
  | SaveToGoogleDriveCancel
  | ChangeSyncFileName
  | SaveForSync
  | CreateSyncFile
  ;
