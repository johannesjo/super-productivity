export type GitBasedUser = Readonly<{
  id: number
}>;

export type GitBasedIssue = Readonly<{
  readonly id: number;
  readonly number: number;
  readonly html_url: string;
  readonly assignee: GitBasedUser;
  readonly title: string;
  readonly body: string;
  readonly closed_at: string;
  readonly created_at: string;
  readonly updated_at: string;
  readonly _id: number;

}>;
