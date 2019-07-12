export enum BannerId {
  TakeABreak = 'TakeABreak',
  ForgotToFinishDay = 'ForgotToFinishDay',
  GoogleLogin = 'GoogleLogin',
  GlobalError = 'GlobalError',
  JiraUnblock = 'JiraUnblock',
  InstallWebApp = 'InstallWebApp',
  TimeEstimateExceeded = 'TimeEstimateExceeded',
}

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
