export type CaldavIssueReduced = Readonly<{
  id: string;
  completed: boolean;
  item_url: string;
  summary: string;
  due: string;
  start: string;
  labels: string[];
  last_modified: number;
}>;

export type CaldavIssue = CaldavIssueReduced & Readonly<{
  note: string;
}>;
