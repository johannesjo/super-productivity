import { GiteaIssueStateOptions } from './gitea-issue.model';

export type GiteaIssueState =
  | GiteaIssueStateOptions.open
  | GiteaIssueStateOptions.closed
  | GiteaIssueStateOptions.all;

export interface GiteaUser {
  avatar_url: string;
  id: number;
  username: string;
  login: string;
  full_name: string;
}
