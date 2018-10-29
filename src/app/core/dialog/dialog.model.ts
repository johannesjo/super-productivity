export type DialogTypes
  = 'TIME_ESTIMATE'
  | 'SIMPLE_CONFIRM'
  | 'GOOGLE_CALC_EXPORT';

export type DialogCfg = Readonly<{
  id: DialogTypes;
  title: string;
  data: any | null;
  isFullScreen?: boolean;
  isOpenImmediately?: boolean;
}>;
