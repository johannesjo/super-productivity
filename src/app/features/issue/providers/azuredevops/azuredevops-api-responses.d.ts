export type AzuredevopsQueryType = 'flat' | 'oneHop' | 'tree';

export type AzuredevopsCommentVersionRef = Readonly<{
  commentId: number;
  version: string;
  url: string;
}>;

export type AzuredevopsWorkItemFields = Readonly<{
  'System.WorkItemType': string;
  'System.State': string;
  'System.CreatedDate': string;
  'System.ChangedDate': string;
  'System.Title': string;
  'System.Description': string;
}>;

export type AzuredevopsWorkItem = Readonly<{
  id: number;
  rev: number;
  fields: AzuredevopsWorkItemFields;
  url: string;
}>;

export type AzuredevopsGetWorkItemsResponse = Readonly<{
  count: number;
  value: AzuredevopsWorkItem[];
}>;

export type AzuredevopsWorkItemFieldReference = Readonly<{
  referenceName: string;
  name: string;
  url: string;
}>;

export type AzuredevopsWorkItemQuerySortColumn = Readonly<{
  field: AzuredevopsWorkItemFieldReference;
  descending: boolean;
}>;

export type AzuredevopsWorkItemReference = Readonly<{
  id: number;
  url: string;
}>;

export type AzuredevopsWIQLSearchResult = Readonly<{
  queryType: AzuredevopsQueryType;
  asOf: string;
  columns: AzuredevopsWorkItemFieldReference[];
  sortColumns: AzuredevopsWorkItemQuerySortColumn[];
  workItems: AzuredevopsWorkItemReference[];
}>;
