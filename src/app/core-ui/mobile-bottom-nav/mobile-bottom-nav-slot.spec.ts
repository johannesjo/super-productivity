import { DEFAULT_GLOBAL_CONFIG } from '../../features/config/default-global-config.const';
import { AppFeaturesConfig } from '../../features/config/global-config.model';
import { LS } from '../../core/persistence/storage-keys.const';
import {
  BOTTOM_NAV_SLOT_OPTIONS,
  getAvailableBottomNavSlotOptions,
  readStoredBottomNavSlot,
  resolveBottomNavSlot,
  writeStoredBottomNavSlot,
} from './mobile-bottom-nav-slot';

describe('mobile bottom nav slot', () => {
  const features = (over: Partial<AppFeaturesConfig> = {}): AppFeaturesConfig => ({
    ...DEFAULT_GLOBAL_CONFIG.appFeatures,
    ...over,
  });

  describe('resolveBottomNavSlot', () => {
    it('defaults to Planner when nothing is stored', () => {
      expect(resolveBottomNavSlot(null, features())?.id).toBe('planner');
    });

    BOTTOM_NAV_SLOT_OPTIONS.forEach((option) => {
      it(`resolves the stored "${option.id}" option`, () => {
        expect(resolveBottomNavSlot(option.id, features())).toBe(option);
      });
    });

    it('falls back to Planner for an unknown stored value', () => {
      expect(resolveBottomNavSlot('nonsense', features())?.id).toBe('planner');
      expect(resolveBottomNavSlot('', features())?.id).toBe('planner');
    });

    it('falls back to Planner when the stored option is disabled', () => {
      expect(
        resolveBottomNavSlot('boards', features({ isBoardsEnabled: false }))?.id,
      ).toBe('planner');
      expect(
        resolveBottomNavSlot('schedule', features({ isSchedulerEnabled: false }))?.id,
      ).toBe('planner');
      expect(
        resolveBottomNavSlot('search', features({ isSearchEnabled: false }))?.id,
      ).toBe('planner');
    });

    it('keeps an enabled choice while Planner is disabled', () => {
      expect(
        resolveBottomNavSlot('inbox', features({ isPlannerEnabled: false }))?.id,
      ).toBe('inbox');
    });

    it('hides the slot when the fallback Planner is disabled too', () => {
      const noPlanner = features({ isPlannerEnabled: false });
      expect(resolveBottomNavSlot(null, noPlanner)).toBeNull();
      expect(resolveBottomNavSlot('planner', noPlanner)).toBeNull();
      expect(
        resolveBottomNavSlot('boards', { ...noPlanner, isBoardsEnabled: false }),
      ).toBeNull();
    });
  });

  describe('getAvailableBottomNavSlotOptions', () => {
    it('offers every option by default', () => {
      expect(getAvailableBottomNavSlotOptions(features()).map((o) => o.id)).toEqual([
        'planner',
        'inbox',
        'boards',
        'schedule',
        'search',
      ]);
    });

    it('leaves out options whose feature is disabled, but always offers Inbox', () => {
      const ids = getAvailableBottomNavSlotOptions(
        features({
          isPlannerEnabled: false,
          isBoardsEnabled: false,
          isSchedulerEnabled: false,
          isSearchEnabled: false,
        }),
      ).map((o) => o.id);
      expect(ids).toEqual(['inbox']);
    });
  });

  describe('persistence', () => {
    afterEach(() => localStorage.removeItem(LS.BOTTOM_NAV_SLOT));

    it('round-trips the choice through localStorage', () => {
      expect(readStoredBottomNavSlot()).toBeNull();
      writeStoredBottomNavSlot('inbox');
      expect(localStorage.getItem(LS.BOTTOM_NAV_SLOT)).toBe('inbox');
      expect(readStoredBottomNavSlot()).toBe('inbox');
    });

    it('survives storage that throws', () => {
      spyOn(Storage.prototype, 'getItem').and.throwError('denied');
      spyOn(Storage.prototype, 'setItem').and.throwError('denied');
      expect(readStoredBottomNavSlot()).toBeNull();
      expect(() => writeStoredBottomNavSlot('inbox')).not.toThrow();
    });
  });
});
