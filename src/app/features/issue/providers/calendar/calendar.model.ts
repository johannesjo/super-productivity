// TODO correct type
import { BaseIssueProviderCfg } from '../../issue.model';

export interface CalendarProviderCfg extends BaseIssueProviderCfg {
  icalUrl: string;
  icon?: string;
  checkUpdatesEvery: number;
  showBannerBeforeThreshold: null | number;
}

export type CalendarContextInfoTarget = 'GOOGLE' | 'OUTLOOK365' | 'OTHER';

export interface CalendarIssue {
  id: string;
}

export interface CalendarIssueReduced {
  id: string;
}
