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

interface OpenProjectApiLinks {
  [key: string]: {
    href: string;
    title?: string;
    type?: string;
  };
}

export interface OpenProjectFormattable {
  format?: string;
  raw: string;
  html?: string;
}

interface OpenProjectDescription {
  format: string;
  raw: string | null;
  html: string | null;
}

interface OpenProjectUser {
  avatar: string;
  id: number;
  name: 'System';
  _links: OpenProjectApiLinks;
  _type: 'User';
}

export type OpenProjectOriginalStatus = Readonly<{
  _type: 'Status';
  id: number;
  name: string;
  isClosed: boolean;
  color: string;
  isDefault: boolean;
  isReadonly: boolean;
  defaultDoneRatio?: null | number;
  position: number;
  _links: OpenProjectApiLinks;
}>;

// NOTE unknown currently means we haven't evaluated the possible values
export type OpenProjectOriginalWorkPackageReduced = Readonly<{
  createdAt: string;
  derivedDueDate: unknown | null;
  derivedEstimatedTime: unknown | null;
  derivedStartDate: unknown | null;
  description: OpenProjectDescription;
  dueDate: string;
  estimatedTime: string | null | undefined;
  lockVersion: number;
  percentageDone: number;
  position: number;
  remainingTime: unknown | null;
  scheduleManually: boolean;
  startDate: string | null;
  storyPoints: number | null;
  subject: string;
  updatedAt: string;
  // NOTE: there is more data here, which we would need to fetch via extra requests
  _links: OpenProjectApiLinks;
  id: number;
  _type: 'WorkPackage';

  // NOTE: only available if package is activated
  spentTime: string | null | undefined;
}>;

export type OpenProjectWorkPackageSearchResult = Readonly<OpenProjectCollection> &
  Readonly<{
    _embedded: {
      elements: OpenProjectOriginalWorkPackageReduced[];
    };
  }>;

export type OpenProjectOriginalWorkPackageFull =
  Readonly<OpenProjectOriginalWorkPackageReduced> &
    Readonly<{
      _embedded: {
        assignee: OpenProjectUser;
        author: OpenProjectUser;
        attachments: {
          count: number;
          total: number;
          _embedded: {
            elements: [];
            _links: OpenProjectApiLinks;
            _type: 'Collection';
          };
        };
        customActions: unknown[];
        parent: OpenProjectOriginalWorkPackageReduced;
        priority: {
          color: string;
          id: number;
          isActive: boolean;
          isDefault: boolean;
          name: string;
          position: number;
          _links: OpenProjectApiLinks;
          _type: 'Priority';
        };
        project: {
          active: boolean;
          createdAt: string;
          description: OpenProjectDescription;
          id: number;
          identifier: string;
          name: string;
          public: boolean;
          statusExplanation: OpenProjectDescription;
          updatedAt: string;
          _links: OpenProjectApiLinks;
          _type: 'Project';
        };
        relations: {
          count: 0;
          total: 0;
          _embedded: { elements: unknown[] };
          _links: OpenProjectApiLinks;
          _type: 'Collection';
        };
        status: OpenProjectOriginalStatus;
        type: {
          color: string;
          createdAt: string;
          id: number;
          isDefault: boolean;
          isMilestone: boolean;
          name: string;
          position: number;
          updatedAt: string;
          _links: OpenProjectApiLinks;
          _type: 'Type';
        };
        version: {
          createdAt: string;
          description: OpenProjectDescription;
          endDate: string | null;
          id: number;
          name: string;
          sharing: string;
          startDate: string | null;
          status: string;
          updatedAt: string;
          _links: OpenProjectApiLinks;
          _type: 'Version';
        };
        _type: 'WorkPackage';
      };
    }>;
