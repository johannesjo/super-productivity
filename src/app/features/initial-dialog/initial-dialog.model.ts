import {LS_BACKUP} from '../../core/persistence/ls-keys.const';

export interface InitialDialogResponse {
  dialogNr: number;
  isShowToNewUsers: boolean;
  content: string;
  btnUrl?: string;
  btnTxt?: string;
}

