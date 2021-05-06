export interface InitialDialogResponse {
  dialogNr: number;
  content: string;
  showStartingWithVersion: string;
  isShowToNewUsers?: boolean;
  btnUrl?: string;
  btnTxt?: string;
}

export const instanceOfInitialDialogResponse = (
  object: any,
): object is InitialDialogResponse => {
  return (
    typeof object === 'object' &&
    object !== null &&
    typeof object.dialogNr === 'number' &&
    typeof object.content === 'string' &&
    typeof object.showStartingWithVersion === 'string'
  );
};
