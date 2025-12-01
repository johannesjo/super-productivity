import {
  OpenProjectAttachment,
  OpenProjectWorkPackage,
  OpenProjectWorkPackageReduced,
} from './open-project-issue.model';
import {
  OpenProjectOriginalWorkPackageFull,
  OpenProjectOriginalWorkPackageReduced,
} from './open-project-api-responses';
import { SearchResultItem } from '../../issue.model';
import { OpenProjectCfg } from './open-project.model';
import { OPEN_PROJECT_TYPE } from '../../issue.const';
import {
  TaskAttachment,
  TaskAttachmentCopy,
} from '../../../tasks/task-attachment/task-attachment.model';
import { DropPasteIcons } from '../../../../core/drop-paste-input/drop-paste.model';

export const mapOpenProjectIssueReduced = (
  issue: OpenProjectOriginalWorkPackageReduced,
  cfg: OpenProjectCfg,
): OpenProjectWorkPackageReduced => {
  return {
    ...issue,
    url: `${cfg.host}/projects/${cfg.projectId}/work_packages/${issue.id}`,
  };
};

export const mapOpenProjectIssueFull = (
  issue: OpenProjectOriginalWorkPackageFull,
  cfg: OpenProjectCfg,
): OpenProjectWorkPackage => {
  return mapOpenProjectIssueReduced(
    issue as OpenProjectOriginalWorkPackageReduced,
    cfg,
  ) as OpenProjectWorkPackage;
};

export const mapOpenProjectIssueToSearchResult = (
  issue: OpenProjectWorkPackage,
): SearchResultItem => {
  return {
    title: '#' + issue.id + ' ' + issue.subject,
    issueType: OPEN_PROJECT_TYPE,
    issueData: issue,
  };
};

export const mapOpenProjectAttachmentToTaskAttachment = (
  openProjectAttachment: OpenProjectAttachment,
): TaskAttachment => {
  const type = getOpenProjectAttachmentType(openProjectAttachment.contentType);
  const path = openProjectAttachment._links.downloadLocation.href;

  return {
    id: openProjectAttachment.id.toString(),
    title: openProjectAttachment.fileName,
    path,
    originalImgPath: type === 'IMG' ? path : undefined,
    type,
    icon: DropPasteIcons[type],
  };
};

const getOpenProjectAttachmentType = (
  contentType: string,
): TaskAttachmentCopy['type'] => {
  if (contentType.startsWith('image/')) {
    return 'IMG';
  }

  // TODO improve if other types are needed

  return 'LINK';
};
