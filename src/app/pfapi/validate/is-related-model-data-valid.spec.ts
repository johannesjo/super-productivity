import { AppDataCompleteNew } from '../pfapi-config';
import { PFLog } from '../../core/log';

describe('isRelatedModelDataValid', () => {
  let isRelatedModelDataValid: any;

  beforeEach(() => {
    // Suppress PFLog output during tests by spying on the methods
    spyOn(PFLog, 'log');
    spyOn(PFLog, 'error');
    spyOn(PFLog, 'warn');
    spyOn(PFLog, 'err');
    spyOn(PFLog, 'critical');
    /* eslint-disable @typescript-eslint/no-var-requires */
    // Reset modules to allow re-importing with mocks
    // @ts-ignore
    delete require.cache[require.resolve('../../util/dev-error')];
    // @ts-ignore
    delete require.cache[require.resolve('./is-related-model-data-valid')];

    // Mock the devError module
    // @ts-ignore
    require('../../util/dev-error');
    // @ts-ignore
    require.cache[require.resolve('../../util/dev-error')] = {
      exports: {
        devError: jasmine.createSpy('devError'),
      },
    };

    // Import the function under test
    // @ts-ignore
    isRelatedModelDataValid =
      require('./is-related-model-data-valid').isRelatedModelDataValid;
    /* eslint-enable @typescript-eslint/no-var-requires */
  });

  it('should handle null data gracefully', () => {
    // @ts-ignore
    const result = isRelatedModelDataValid(null);
    expect(result).toBe(false);
  });

  it('should handle partial null data gracefully', () => {
    const partialData: any = {
      project: { ids: [], entities: {} },
      tag: { ids: [], entities: {} },
      task: { ids: [], entities: {} },
      // Missing archiveYoung and archiveOld
      note: { ids: [], entities: {} },
      issueProvider: { ids: [], entities: {} },
      reminders: [],
    };

    const result = isRelatedModelDataValid(partialData as AppDataCompleteNew);
    expect(result).toBe(false);
  });
});
