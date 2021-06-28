import { Project } from '../project/project.model';
import { Tag } from '../tag/tag.model';
import { IssueProviderKey } from '../issue/issue.model';
import { TimeSpentOnDay } from '../tasks/task.model';

export interface SearchItem {
  id: string;
  title: string;
  taskNotes: string;

  // for the navigation
  projectId: string | null;
  parentId: string | null;
  timeSpentOnDay: TimeSpentOnDay;
  created: number;
  tagId: string;

  // for the icons
  issueType: IssueProviderKey | null;
  ctx: Tag | Project;
  // jira only
  titleHighlighted?: string;
}

export interface SearchQueryParams {
  focusItem: string;
  dateStr?: string;
  isInBacklog?: boolean;
}
