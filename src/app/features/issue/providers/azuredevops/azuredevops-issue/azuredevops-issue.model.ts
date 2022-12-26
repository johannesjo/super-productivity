export type AzuredevopsIssueReduced = Readonly<{
  id: number;
  url: string;
  title: string;
  state: string;
  updated_at: string;
}>;

export type AzuredevopsIssue = AzuredevopsIssueReduced &
  Readonly<{
    number: number;
    body: string;
    created_at: string;
    state: string;
    type: string;
    title: string;
    updated_at: string;
  }>;
