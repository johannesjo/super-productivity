import type { ShortSyntaxConfig } from '../../config/global-config.model';
import type { TaskReminderOptionId } from '../task.model';
import type { WorkContextType } from '../../work-context/work-context.model';

export interface QuickAddHudProject {
  id: string;
  title: string;
  icon?: string | null;
  theme?: {
    primary?: string;
  };
  isEnableBacklog?: boolean;
}

export interface QuickAddHudTag {
  id: string;
  title: string;
  icon?: string | null;
  color?: string | null;
  theme?: {
    primary?: string;
  };
}

export interface QuickAddHudWorkContext {
  id: string;
  title: string;
  type: WorkContextType;
  theme?: {
    primary?: string;
  };
}

export interface QuickAddHudSnapshot {
  projects: QuickAddHudProject[];
  tags: QuickAddHudTag[];
  defaultProjectId: string | null;
  defaultTaskRemindOption: TaskReminderOptionId;
  shortSyntax: ShortSyntaxConfig;
  activeWorkContext: QuickAddHudWorkContext | null;
  todayStr: string;
  dateTimeLocale: string;
  /** Locale for spelled-out weekday/month names; see DateTimeFormatService. */
  textLocale: string;
  /** The UI language actually in use, which is not always the configured one. */
  lng: string;
  folderPaths: {
    projects: Record<string, string>;
    tags: Record<string, string>;
  };
  theme: {
    htmlClasses: string[];
    bodyClasses: string[];
    htmlCssVars: Record<string, string>;
    bodyCssVars: Record<string, string>;
  };
}

export type QuickAddSnapshotResult =
  | {
      ok: true;
      snapshot: QuickAddHudSnapshot;
    }
  | {
      ok: false;
      error: string;
    };
