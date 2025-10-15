// trello issue model

export type TrelloIssueReduced = Readonly<{
  id: string;
  name: string;
  desc: string;
  due: string;
  closed: boolean;
  url: string;
}>;

// will find additional field later
export type TrelloIssue = TrelloIssueReduced;
