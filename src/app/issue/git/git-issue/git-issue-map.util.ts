import { GitAttachment, GitAuthor, GitChangelogEntry, GitComment, GitIssue, } from './git-issue.model';
import {
  GitIssueOriginal,
  GitOriginalAttachment,
  GitOriginalAuthor,
  GitOriginalChangelog,
  GitOriginalComment
} from '../git-api-responses';
import { GitCfg } from '../git';
import { DropPasteIcons, DropPasteInputType } from '../../../core/drop-paste-input/drop-paste-input';

const matchProtocolRegEx = /(^[^:]+):\/\//;

export const mapIssuesResponse = (res, cfg: GitCfg) => res.response.issues.map((issue) => {
  return mapIssue(issue, cfg);
});

export const mapResponse = (res) => res.response;

export const mapIssueResponse = (res, cfg: GitCfg) => mapIssue(res.response, cfg);

export const mapIssue = (issue: GitIssueOriginal, cfg: GitCfg): GitIssue => {
  const issueCopy = Object.assign({}, issue);
  const fields = issueCopy.fields;

  return {
    key: issueCopy.key,
    id: issueCopy.id,
    components: fields.components,
    timeestimate: fields.timeestimate,
    timespent: fields.timespent,
    description: fields.description,
    summary: fields.summary,
    updated: fields.updated,
    status: fields.status,
    attachments: fields.attachment && fields.attachment.map(mapAttachment),
    comments: fields.comment && fields.comment.comments.map(mapComments),
    changelog: mapChangelog(issueCopy.changelog),
    assignee: mapAuthor(fields.assignee),
    url: makeIssueUrl(cfg.host, issueCopy.key)
  };
};


export const makeIssueUrl = (host: string, issueKey: string): string => {
  let fullLink = host + '/browse/' + issueKey;
  if (!fullLink.match(matchProtocolRegEx)) {
    fullLink = 'https://' + fullLink;
  }
  return fullLink;
};


export const mapAuthor = (author: GitOriginalAuthor): GitAuthor => {
  if (author) {
    return Object.assign({}, author, {
      self: undefined,
      avatarUrls: undefined,
      avatarUrl: author.avatarUrls['48x48'],
    });
  } else {
    return null;
  }
};
export const mapAttachment = (attachment: GitOriginalAttachment): GitAttachment => {
  return Object.assign({}, attachment, {
    self: undefined,
    author: undefined
  });
};
export const mapComments = (comment: GitOriginalComment): GitComment => {
  return Object.assign({}, comment, {
    self: undefined,
    updateAuthor: undefined,
    author: mapAuthor(comment.author)
  });
};

export const mapGitAttachmentToAttachment = (gitAttachment: GitAttachment) => {
  const type = mapAttachmentType(gitAttachment.mimeType);
  return {
    title: gitAttachment.filename,
    path: gitAttachment.thumbnail || gitAttachment.content,
    originalImgPath: gitAttachment.content,
    type,
    icon: DropPasteIcons[type]
  };
};

export const mapChangelog = (changelog: GitOriginalChangelog): GitChangelogEntry[] => {
  return [];
};

const mapAttachmentType = (mimeType: string): DropPasteInputType => {
  switch (mimeType) {
    case 'image/gif':
    case 'image/jpeg':
    case 'image/png':
      return 'IMG';

    default:
      return 'LINK';
  }

};
