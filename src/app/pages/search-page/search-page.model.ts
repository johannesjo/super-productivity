import { Project } from '../../features/project/project.model';
import { Tag } from '../../features/tag/tag.model';
import { IssueProviderKey } from '../../features/issue/issue.model';
import { TimeSpentOnDay } from '../../features/tasks/task.model';

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
  // NOTE: probably faster this way round
  isArchiveTask: boolean;

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
