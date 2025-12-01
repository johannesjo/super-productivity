import { crossModelMigration4_4 } from './cross-model-4_4';
import { AppDataCompleteNew } from '../pfapi-config';
import { LanguageCode } from '../../core/locale.constants';

describe('crossModelMigration4_4', () => {
  it('should migrate globalConfig correctly', () => {
    const mockData = {
      globalConfig: {
        lang: {
          lng: 'en',
        },
        misc: {
          timeLocale: 'de-DE',
        },
      },
    } as unknown as AppDataCompleteNew;

    const result = crossModelMigration4_4(mockData) as any;

    // Check if lang section was moved to localization
    expect(result.globalConfig.localization).toEqual(
      jasmine.objectContaining({
        lng: 'en',
        dateTimeLocale: 'de-DE',
      }),
    );

    // Check if old properties were removed
    expect(result.globalConfig.lang).toBeUndefined();
    expect(result.globalConfig.misc['timeLocale']).toBeUndefined();
  });

  it('should migrate zh_tw language code', () => {
    const mockData = {
      globalConfig: {
        lang: {
          lng: 'zh_tw',
        },
        misc: {},
      },
    } as unknown as AppDataCompleteNew;

    const result = crossModelMigration4_4(mockData) as any;

    expect(result.globalConfig.localization.lng).toBe(LanguageCode.zh_tw);
  });

  it('should migrate timeLocale even if lang section is missing', () => {
    const mockData = {
      globalConfig: {
        localization: {
          lng: 'en',
        },
        misc: {
          timeLocale: 'de-DE',
        },
      },
    } as unknown as AppDataCompleteNew;

    const result = crossModelMigration4_4(mockData) as any;

    expect(result.globalConfig.localization).toEqual(
      jasmine.objectContaining({
        lng: 'en',
        dateTimeLocale: 'de-DE',
      }),
    );
    expect(result.globalConfig.misc['timeLocale']).toBeUndefined();
  });

  it('should handle missing lang section gracefully', () => {
    const mockData = {
      globalConfig: {
        misc: {},
      },
    } as unknown as AppDataCompleteNew;

    const result = crossModelMigration4_4(mockData) as any;
    expect(result.globalConfig.localization).toBeUndefined();
  });
  it('should initialize appFeatures if missing', () => {
    const mockData = {
      globalConfig: {},
    } as unknown as AppDataCompleteNew;

    const result = crossModelMigration4_4(mockData) as any;

    expect(result.globalConfig.appFeatures).toEqual(
      jasmine.objectContaining({
        isTimeTrackingEnabled: true,
        isFocusModeEnabled: true,
        isSchedulerEnabled: true,
        isPlannerEnabled: true,
        isBoardsEnabled: true,
        isScheduleDayPanelEnabled: true,
        isIssuesPanelEnabled: true,
        isProjectNotesEnabled: true,
        isSyncIconEnabled: true,
        isDonatePageEnabled: true,
      }),
    );
  });

  it('should add isDonatePageEnabled to existing appFeatures', () => {
    const mockData = {
      globalConfig: {
        appFeatures: {
          isSyncIconEnabled: true,
        },
      },
    } as unknown as AppDataCompleteNew;

    const result = crossModelMigration4_4(mockData) as any;

    expect(result.globalConfig.appFeatures.isDonatePageEnabled).toBe(true);
    expect(result.globalConfig.appFeatures.isSyncIconEnabled).toBe(true);
  });

  it('should migrate isEnableUserProfiles from misc to appFeatures', () => {
    const mockData = {
      globalConfig: {
        misc: {
          isEnableUserProfiles: false,
        },
        appFeatures: {
          isSyncIconEnabled: true,
        },
      },
    } as unknown as AppDataCompleteNew;

    const result = crossModelMigration4_4(mockData) as any;

    expect(result.globalConfig.appFeatures.isEnableUserProfiles).toBe(false);
    expect(result.globalConfig.misc.isEnableUserProfiles).toBeUndefined();
  });
});
