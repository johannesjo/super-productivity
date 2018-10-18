export type JiraIssue = Readonly<{
  id: string;
  key: string;
  url: string;
  summary: string;
  description: string;
  assigneeKey: string;
  updated: string;
  status: string;
  comments: any[];
  attachments: any[];
  estimate: number;
  timeSpent: number;
  components: string[];
}>;

// mapIssue(issue) {
//   return {
//     title: issue.key + ' ' + issue.fields.summary,
//     notes: issue.fields.description,
//     originalType: ISSUE_TYPE,
//     originalKey: issue.key,
//     originalAssigneeKey: issue.fields.assignee && issue.fields.assignee.key.toString(),
//     originalComments: Jira.mapComments(issue),
//     originalId: issue.id,
//     originalUpdated: issue.fields.updated,
//     originalStatus: issue.fields.status,
//     originalAttachment: Jira.mapAttachments(issue),
//     originalLink: this._makeIssueLink(issue.key),
//     originalEstimate: issue.fields.timeestimate && moment.duration({
//       seconds: issue.fields.timeestimate
//     }),
//     originalTimeSpent: issue.fields.timespent && moment.duration({
//       seconds: issue.fields.timespent
//     }),
//     originalComponents: Jira.mapComponents(issue)
//   };
