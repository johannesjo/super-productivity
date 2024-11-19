import { SearchResultItem } from '../issue/issue.model';

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace AddTaskPanel {
  export interface IssueItem {
    id: string;
    data: SearchResultItem;
  }
}
