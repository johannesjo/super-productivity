import { Project } from '../project/project.model';
import { Tag } from '../tag/tag.model';
import { IssueProviderKey } from '../issue/issue.model';

export interface SearchItem {
  id: string;
  title: string;
  taskNotes: string;

  // for the navigation
  location: string;
  isInBacklog: boolean;

  // for the icons
  issueType: IssueProviderKey | null;
  ctx: Tag | Project;
  // jira only
  titleHighlighted?: string;
}
