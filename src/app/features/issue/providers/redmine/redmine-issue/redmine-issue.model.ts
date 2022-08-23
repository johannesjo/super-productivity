export enum RedmineIssueStatusOptions {
  all = '*',
  open = 'open',
  closed = 'closed',
}

export type RedmineProject = Readonly<{
  id: number;
  name: string;
}>;

export type RedmineTracker = Readonly<{
  id: number;
  name: string;
}>;

export type RedmineStatus = Readonly<{
  id: number;
  name: string;
}>;

export type RedminePriority = Readonly<{
  id: number;
  name: string;
}>;

export type RedmineAuthor = Readonly<{
  id: number;
  name: string;
}>;

export type RedmineCategory = Readonly<{
  id: number;
  name: string;
}>;

export type RedmineCustomField = Readonly<{
  id: number;
  name: string;
  value: string;
}>;

export type RedmineIssue = Readonly<{
  id: number;
  project: RedmineProject;
  tracker: RedmineTracker;
  statuts: RedmineStatus;
  priority: RedminePriority;
  author: RedmineAuthor;
  category: RedmineCategory;
  subject: string;
  description: string;
  done_ratio: number;
  custom_fields: RedmineCustomField[];
  created_on: string;
  updated_on: string;
}>;

export type RedmineSearchResult = Readonly<{
  issues: RedmineIssue[];
  limit: number;
  offset: number;
  total_count: number;
}>;
