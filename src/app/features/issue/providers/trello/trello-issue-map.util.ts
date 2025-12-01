/**
 * Maps data from trello API to internal format for compatibility
 */

import { SearchResultItem } from '../../issue.model';
import {
  TrelloAttachment,
  TrelloAttachmentPreview,
  TrelloIssue,
  TrelloIssueReduced,
  TrelloLabel,
  TrelloMember,
} from './trello-issue.model';
import { dedupeByKey } from '../../../../util/de-dupe-by-key';
import {
  DropPasteIcons,
  DropPasteInputType,
} from '../../../../core/drop-paste-input/drop-paste.model';
import { TaskAttachment } from '../../../tasks/task-attachment/task-attachment.model';

export interface TrelloCardLabelResponse {
  id: string;
  name: string;
  color: string | null;
}

export interface TrelloCardMemberResponse {
  id: string;
  fullName: string;
  username: string;
  avatarUrl?: string | null;
  avatarHash?: string | null;
}

export interface TrelloCardAttachmentPreviewResponse {
  id: string;
  url: string;
  scaled: boolean;
  bytes: number | null;
  height: number | null;
  width: number | null;
}

export interface TrelloCardAttachmentResponse {
  id: string;
  bytes: number | null;
  date: string;
  edgeColor: string | null;
  idMember: string | null;
  isUpload: boolean;
  mimeType: string | null;
  name: string;
  url: string;
  pos: number;
  previews?: TrelloCardAttachmentPreviewResponse[];
}

export interface TrelloCardResponse {
  id: string;
  idShort: number | null;
  shortLink: string;
  name: string;
  desc: string;
  url: string;
  due: string | null;
  dueComplete: boolean;
  closed: boolean;
  idBoard: string;
  idList: string;
  dateLastActivity: string;
  labels?: TrelloCardLabelResponse[];
  members?: TrelloCardMemberResponse[];
  attachments?: TrelloCardAttachmentResponse[];
}

export interface TrelloSearchResponse {
  cards: TrelloCardResponse[];
}

export const mapTrelloCardToIssue = (card: TrelloCardResponse): TrelloIssue => {
  const base = mapTrelloCardReduced(card);
  return {
    ...base,
  };
};

export const mapTrelloCardReduced = (card: TrelloCardResponse): TrelloIssueReduced => {
  const key =
    card.idShort !== null && card.idShort !== undefined
      ? card.idShort.toString()
      : card.shortLink;

  return Object.freeze({
    id: card.shortLink,
    idCard: card.id,
    key,
    shortLink: card.shortLink,
    name: card.name,
    summary: card.name,
    desc: card.desc || null,
    url: card.url,
    due: card.due,
    dueComplete: card.dueComplete,
    closed: card.closed,
    idBoard: card.idBoard,
    idList: card.idList,
    updated: card.dateLastActivity,
    labels: mapTrelloLabels(card.labels),
    members: mapTrelloMembers(card.members),
    attachments: mapTrelloAttachments(card.attachments),
    storyPoints: undefined,
  });
};

export const mapTrelloSearchResults = (
  cards: TrelloCardResponse[] = [],
): SearchResultItem<'TRELLO'>[] => {
  const deduped = dedupeByKey(cards, 'shortLink');
  return deduped.map((card) => {
    const reduced = mapTrelloCardReduced(card);
    return {
      title: `${reduced.key} ${reduced.summary}`.trim(),
      issueType: 'TRELLO',
      issueData: reduced,
    };
  });
};

export const mapTrelloAttachmentToAttachment = (
  attachment: TrelloAttachment,
): TaskAttachment => {
  const type = mapAttachmentType(attachment.mimeType, attachment.url);
  return {
    id: null,
    title: attachment.name,
    path: attachment.url,
    originalImgPath: attachment.url,
    type,
    icon: DropPasteIcons[type],
  };
};

const mapTrelloLabels = (labels?: TrelloCardLabelResponse[]): TrelloLabel[] => {
  if (!labels || !labels.length) {
    return [];
  }
  return labels.map((label) => ({
    id: label.id,
    name: label.name,
    color: label.color ?? null,
  }));
};

const mapTrelloMembers = (members?: TrelloCardMemberResponse[]): TrelloMember[] => {
  if (!members || !members.length) {
    return [];
  }
  return members.map((member) => ({
    id: member.id,
    fullName: member.fullName,
    username: member.username,
    avatarUrl: member.avatarUrl ?? null,
  }));
};

const mapTrelloAttachments = (
  attachments?: TrelloCardAttachmentResponse[],
): TrelloAttachment[] => {
  if (!attachments || !attachments.length) {
    return [];
  }
  return attachments.map((attachment) => ({
    id: attachment.id,
    bytes: attachment.bytes ?? null,
    date: attachment.date,
    edgeColor: attachment.edgeColor ?? null,
    idMember: attachment.idMember ?? null,
    isUpload: attachment.isUpload,
    mimeType: attachment.mimeType ?? null,
    name: attachment.name,
    previews: mapTrelloAttachmentPreviews(attachment.previews),
    url: attachment.url,
    pos: attachment.pos,
  }));
};

const mapTrelloAttachmentPreviews = (
  previews?: TrelloCardAttachmentPreviewResponse[],
): TrelloAttachmentPreview[] => {
  if (!previews || !previews.length) {
    return [];
  }
  return previews.map((preview) => ({
    id: preview.id,
    url: preview.url,
    height: preview.height ?? null,
    width: preview.width ?? null,
    scaled: preview.scaled,
    bytes: preview.bytes ?? null,
  }));
};

const mapAttachmentType = (mimeType: string | null, url: string): DropPasteInputType => {
  if (mimeType) {
    if (mimeType.startsWith('image/')) {
      return 'IMG';
    }
    if (mimeType.startsWith('video/')) {
      return 'FILE';
    }
  }

  const extension = url.split('.').pop()?.toLowerCase();
  if (extension && ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'].includes(extension)) {
    return 'IMG';
  }

  return 'LINK';
};
