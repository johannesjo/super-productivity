// TODO correct type
import { BaseIssueProviderCfg } from '../../issue.model';

export interface CalendarProviderCfg extends BaseIssueProviderCfg {
  icalUrl: string;
  icon?: string;
  checkUpdatesEvery: number;
  showBannerBeforeThreshold: null | number;
}

export interface CalendarIssue {
  id: string;
}

export interface CalendarIssueReduced {
  id: string;
}
