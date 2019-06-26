// TODO refactor to enum
export type BannerId =
  'TAKE_A_BREAK'
  | 'FORGOT_TO_FINISH_DAY'
  | 'GOOGLE_LOGIN'
  | 'GLOBAL_ERROR'
  | 'JIRA_UNBLOCK';

export type BannerType = 'ERROR';

export interface BannerAction {
  label: string;
  fn: () => void;
}

export interface Banner {
  id: BannerId;
  msg: string;
  ico?: string;
  svgIco?: string;
  type?: BannerType;
  action?: BannerAction;
  action2?: BannerAction;
  action3?: BannerAction;
}
