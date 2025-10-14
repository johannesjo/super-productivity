/**
 * Trello is currently a non-functional stub
 * Configuration for setting up trello
 */

import { BaseIssueProviderCfg } from '../../issue.model';

// TODO: currently setting this up for connecting trello first, then figure things out later
export interface TrelloCfg extends BaseIssueProviderCfg {
  isEnabled: boolean;
  token: string | null;
  boardId: string | null;
}
