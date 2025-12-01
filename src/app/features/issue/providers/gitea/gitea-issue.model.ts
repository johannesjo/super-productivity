import { GiteaUser } from './gitea-api-responses';

export enum GiteaIssueStateOptions {
  open = 'open',
  closed = 'closed',
  all = 'all',
}

export type GiteaLabel = Readonly<{
  id: number;
  name: string;
  color: string;
  description: string;
  url: string;
}>;

export type GiteaRepositoryReduced = Readonly<{
  id: number;
  name: string;
  owner: string;
  full_name: string;
}>;

export type GiteaIssue = Readonly<{
  id: number;
  url: string;
  html_url: string;
  number: number;
  user: GiteaUser;
  original_author: string;
  original_author_id: number;
  title: string;
  body: string;
  ref: string;
  labels: GiteaLabel[];
  milestone: unknown | null;
  assignee: GiteaUser;
  assignees: GiteaUser[];
  state: string;
  is_locked: boolean;
  comments: number;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  due_date: string | null;
  repository: GiteaRepositoryReduced;
}>;
