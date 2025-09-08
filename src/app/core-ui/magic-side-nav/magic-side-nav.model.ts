import {
  WorkContextCommon,
  WorkContextType,
} from '../../features/work-context/work-context.model';

export type NavItem =
  | NavSeparatorItem
  | NavWorkContextItem
  | NavRouteItem
  | NavHrefItem
  | NavActionItem
  | NavGroupItem;

export interface NavBaseItem {
  id: string;
  label?: string;
  icon?: string;
  svgIcon?: string;
}

export interface NavSeparatorItem extends NavBaseItem {
  type: 'separator';
}

export interface NavWorkContextItem extends NavBaseItem {
  type: 'workContext';
  label: string;
  icon: string;
  route: string;
  workContext: WorkContextCommon;
  workContextType: WorkContextType;
  defaultIcon: string;
}

export interface NavRouteItem extends NavBaseItem {
  type: 'route';
  label: string;
  icon: string;
  route: string;
}

export interface NavHrefItem extends NavBaseItem {
  type: 'href';
  label: string;
  icon: string;
  href: string;
}

export interface NavActionItem extends NavBaseItem {
  type: 'action';
  label: string;
  icon: string;
  action: () => void;
}

export interface NavContextItem {
  id: string;
  label: string;
  icon: string;
  svgIcon?: string;
  action?: () => void;
}

export interface NavGroupItem extends NavBaseItem {
  type: 'group';
  label: string;
  icon: string;
  children: NavItem[];
  additionalButtons?: NavAdditionalButton[];
  contextMenuItems?: NavContextItem[];
  action?: () => void; // optional external toggle logic
}

export interface NavAdditionalButton {
  id: string;
  icon: string;
  tooltip?: string;
  action?: () => void;
  hidden?: boolean;
  contextMenu?: NavContextItem[];
}
export interface NavConfig {
  items: NavItem[];
  expandedByDefault?: boolean;
  showLabels?: boolean;
  mobileBreakpoint?: number;
  position?: 'left' | 'right';
  theme?: 'light' | 'dark';
  resizable?: boolean;
  minWidth?: number;
  maxWidth?: number;
  defaultWidth?: number;
  collapseThreshold?: number;
  expandThreshold?: number;
}
