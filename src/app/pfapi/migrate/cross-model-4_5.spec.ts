import { crossModelMigration4_5 } from './cross-model-4_5';
import { AppDataCompleteNew } from '../pfapi-config';
import { DateTimeLocales, LanguageCode } from 'src/app/core/locale.constants';

describe('crossModelMigration4_5', () => {
  it('should convert lng and dateTimeLocale to lowercase', () => {
    const mockData = {
      globalConfig: {
        localization: {
          lng: 'pt-BR',
          dateTimeLocale: 'en-US',
        },
      },
    } as unknown as AppDataCompleteNew;

    const result = crossModelMigration4_5(mockData) as any;

    // Check if lang section was moved to localization
    expect(result.globalConfig.localization).toEqual(
      jasmine.objectContaining({
        lng: LanguageCode.pt_br,
        dateTimeLocale: DateTimeLocales.en_us,
      }),
    );
  });
});
