export type OpenProjectOriginalState = 'open' | 'closed' | 'all';

export interface OpenProjectResult {
  _links: any;
  _embedded: any;
  _type: string;
}

export interface OpenProjectCollection extends OpenProjectResult {
  total: number;
  pageSize: number;
  count: number;
  offset: number;
  groups: any;
  totalSums: any;
}

export interface OpenProjectFormattable {
  format?: string;
  raw: string;
  html?: string;
}

// NOTE unknown currently means we haven't evaluated the possible values
export type OpenProjectOriginalWorkPackage = Readonly<{
  createdAt: string;
  derivedDueDate: unknown | null;
  derivedEstimatedTime: unknown | null;
  derivedStartDate: unknown | null;
  description: {
    format: 'markdown';
    html: string;
    raw: null;
  };
  dueDate: string;
  estimatedTime: unknown | null;
  lockVersion: number;
  percentageDone: number;
  position: number;
  remainingTime: unknown | null;
  scheduleManually: boolean;
  startDate: string;
  storyPoints: number | null;
  subject: string;
  updatedAt: string;
  // NOTE: there is more data here, which we would need to fetch via extra requests
  _links: {
    [key: string]: { href: string };
  };
  id: number;
}>;

export type OpenProjectWorkPackageSearchResult = Readonly<OpenProjectCollection> &
  Readonly<{
    _embedded: {
      elements: OpenProjectOriginalWorkPackage[];
    };
  }>;
