export type BannerId = 'TAKE_A_BREAK' | 'GOOGLE_LOGIN' | 'GLOBAL_ERROR';
export type BannerType = 'ERROR';

export interface BannerAction {
  label: string;
  fn: () => void;
}

export interface Banner {
  id: BannerId;
  msg: string;
  ico?: string;
  type?: BannerType;
  action?: BannerAction;
  action2?: BannerAction;
  action3?: BannerAction;
}
