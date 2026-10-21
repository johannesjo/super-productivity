import { AppFeaturesConfig } from '../../features/config/global-config.model';
import { INBOX_PROJECT } from '../../features/project/project.const';
import { LS } from '../../core/persistence/storage-keys.const';
import { T } from '../../t.const';
import { NAV_SECTION_ICON } from '../magic-side-nav/nav-section-icons.const';

export type BottomNavSlotId = 'planner' | 'inbox' | 'boards' | 'schedule' | 'search';

export interface BottomNavSlotOption {
  id: BottomNavSlotId;
  route: string;
  icon: string;
  labelKey: string;
  // Unset: always available.
  featureKey?: keyof AppFeaturesConfig;
}

export const DEFAULT_BOTTOM_NAV_SLOT: BottomNavSlotId = 'planner';

export const BOTTOM_NAV_SLOT_OPTIONS: readonly BottomNavSlotOption[] = [
  {
    id: 'planner',
    route: '/planner',
    icon: NAV_SECTION_ICON.PLANNER,
    labelKey: T.MH.PLANNER,
    featureKey: 'isPlannerEnabled',
  },
  {
    id: 'inbox',
    route: `/project/${INBOX_PROJECT.id}/tasks`,
    icon: 'inbox',
    labelKey: T.G.INBOX_PROJECT_TITLE,
  },
  {
    id: 'boards',
    route: '/boards',
    icon: NAV_SECTION_ICON.BOARDS,
    labelKey: T.MH.BOARDS,
    featureKey: 'isBoardsEnabled',
  },
  {
    id: 'schedule',
    route: '/schedule',
    icon: NAV_SECTION_ICON.SCHEDULE,
    labelKey: T.MH.SCHEDULE,
    featureKey: 'isSchedulerEnabled',
  },
  {
    id: 'search',
    route: '/search',
    icon: NAV_SECTION_ICON.SEARCH,
    labelKey: T.MH.SEARCH,
    featureKey: 'isSearchEnabled',
  },
];

export const getAvailableBottomNavSlotOptions = (
  features: AppFeaturesConfig,
): BottomNavSlotOption[] =>
  BOTTOM_NAV_SLOT_OPTIONS.filter((o) => !o.featureKey || features[o.featureKey]);

/**
 * The stored choice if it is known and its feature is enabled, else Planner.
 * `null` when Planner is the fallback but disabled: the slot is then hidden,
 * as it was before the slot became configurable.
 */
export const resolveBottomNavSlot = (
  storedId: string | null,
  features: AppFeaturesConfig,
): BottomNavSlotOption | null => {
  const available = getAvailableBottomNavSlotOptions(features);
  return (
    available.find((o) => o.id === storedId) ??
    available.find((o) => o.id === DEFAULT_BOTTOM_NAV_SLOT) ??
    null
  );
};

// Device-local on purpose: the bar only exists on narrow screens, so the
// choice belongs to the device and is never synced.
export const readStoredBottomNavSlot = (): string | null => {
  try {
    return localStorage.getItem(LS.BOTTOM_NAV_SLOT);
  } catch {
    return null;
  }
};

export const writeStoredBottomNavSlot = (id: BottomNavSlotId): void => {
  try {
    localStorage.setItem(LS.BOTTOM_NAV_SLOT, id);
  } catch {
    // Storage unavailable: the choice just lasts for this session.
  }
};
