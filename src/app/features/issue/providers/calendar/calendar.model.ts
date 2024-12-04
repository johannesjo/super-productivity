// TODO correct type
import { BaseIssueProviderCfg } from '../../issue.model';
import { CalendarIntegrationEvent } from '../../../calendar-integration/calendar-integration.model';

export interface CalendarProviderCfg extends BaseIssueProviderCfg {
  icalUrl: string;
  icon?: string;
  checkUpdatesEvery: number;
  showBannerBeforeThreshold: null | number;
}

export type LegacyCalendarProvider = Readonly<{
  isEnabled: boolean;
  id: string;
  icalUrl: string;
  defaultProjectId: string | null;
  checkUpdatesEvery: number;
  showBannerBeforeThreshold: null | number;
}>;

export type CalendarContextInfoTarget = 'GOOGLE' | 'OUTLOOK365' | 'OTHER';

export interface CalendarIssue extends CalendarIntegrationEvent {
  id: string;
}

export type CalendarIssueReduced = CalendarIssue;
