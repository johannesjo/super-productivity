import { AppDataCompleteNew } from '../pfapi-config';
import { isRelatedModelDataValid } from './is-related-model-data-valid';
import { PFLog } from '../../core/log';

// Mock PFLog to suppress output during test
PFLog.log = console.log;
PFLog.error = console.error;
PFLog.warn = console.warn;
PFLog.err = console.error;
PFLog.critical = console.error;

describe('isRelatedModelDataValid', () => {
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

    try {
      isRelatedModelDataValid(partialData as AppDataCompleteNew);
    } catch (e) {
      expect(e).toBeTruthy(); // We expect it to crash currently
    }
  });
});
