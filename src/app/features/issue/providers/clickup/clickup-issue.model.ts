export type ClickUpTaskReduced = Readonly<{
  id: string;
  name: string;
  // ClickUp calls "identifier" custom_id? or just use id?
  // Let's use id for now, display as #id
  custom_id?: string;
  status: {
    status: string;
    type: string;
    color: string;
  };
  date_updated: string; // unix timestamp in ms as string
  url: string;
}>;

export type ClickUpTask = ClickUpTaskReduced &
  Readonly<{
    description?: string;
    markdown_description?: string;
    priority?: {
      id: string;
      priority: string;
      color: string;
      orderindex: string;
    };
    date_created: string; // unix timestamp in ms as string
    date_closed?: string | null; // unix timestamp in ms as string
    date_done?: string | null;
    due_date?: string | null;
    assignees: Array<{
      id: number;
      username: string;
      email: string;
      profilePicture?: string;
    }>;
    creator: {
      id: number;
      username: string;
    };
    tags: Array<{
      name: string;
      tag_fg: string;
      tag_bg: string;
    }>;
    attachments: ClickUpAttachment[];
    time_spent?: number; // accumulated time spent
    subtasks?: ClickUpTaskReduced[]; // nested subtasks
  }>;

export type ClickUpAttachment = Readonly<{
  id: string;
  title: string;
  url: string;
  extension: string;
  thumbnail_small?: string;
  thumbnail_large?: string;
}>;
