import {LS_BACKUP} from '../../core/persistence/ls-keys.const';

export interface InitialDialogResponse {
  dialogNr: number;
  content: string;
  showStartingWithVersion: string;
  isShowToNewUsers?: boolean;
  btnUrl?: string;
  btnTxt?: string;
}

