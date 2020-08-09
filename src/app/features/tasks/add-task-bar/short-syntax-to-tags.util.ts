import { shortSyntax } from '../short-syntax.util';
import { msToString } from '../../../ui/duration/ms-to-string.pipe';
import { DEFAULT_TODAY_TAG_COLOR } from '../../work-context/work-context.const';
import { Tag } from '../../tag/tag.model';
import { Project } from '../../project/project.model';
import { getWorklogStr } from '../../../util/get-work-log-str';

export const shortSyntaxToTags = ({val, tags, projects, defaultColor}: {
  val: string,
  tags: Tag[],
  projects: Project[],
  defaultColor: string
}): {
  title: string;
  color: string;
  icon: string;
}[] => {
  const r = shortSyntax({
    title: val,
    tagIds: [],
    projectId: undefined,
  }, tags, projects);
  const shortSyntaxTags: {
    title: string;
    color: string;
    icon: string;
  }[] = [];

  if (!r) {
    return [];
  }

  if (r.projectId) {
    const project = projects.find(p => p.id === r.projectId);
    if (!project) {
      throw new Error('Project not found');
    }
    shortSyntaxTags.push({
      title: project.title,
      color: project.theme.primary,
      icon: 'list'
    });
  }

  if (r.taskChanges.timeEstimate) {
    let time = msToString(r.taskChanges.timeEstimate);

    if (r.taskChanges.timeSpentOnDay && r.taskChanges.timeSpentOnDay[getWorklogStr()]) {
      time = msToString(r.taskChanges.timeSpentOnDay[getWorklogStr()]) + '/' + time;
    }
    console.log(time);

    shortSyntaxTags.push({
      title: time,
      color: defaultColor,
      icon: 'timer'
    });
  }

  // if(due){
  //   shortSyntaxTags.push({
  //     // title: tag.title,
  //     title: 'due:12/12/20 9:00',
  //     color: defaultColor,
  //     icon: 'alarm'
  //   });
  // }

  if (r.taskChanges.tagIds) {
    r.taskChanges.tagIds.forEach(tagId => {
      const tag = tags.find(p => p.id === tagId);
      if (!tag) {
        throw new Error('Tag not found');
      }
      shortSyntaxTags.push({
        title: tag.title,
        color: tag.color || tag.theme.primary,
        icon: tag.icon || 'style'
      });
    });
  }

  if (r.newTagTitles) {
    r.newTagTitles.forEach(tagTitle => {
      shortSyntaxTags.push({
        title: tagTitle,
        color: DEFAULT_TODAY_TAG_COLOR,
        icon: 'style'
      });
    });
  }

  return shortSyntaxTags;
};
