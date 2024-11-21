import { isLegacyAppData } from './is-legacy-app-data.util';
import { MODEL_VERSION_KEY } from '../../app.constants';
import { MODEL_VERSION } from '../../core/model-version';

describe('isLegacyAppData()', () => {
  it('should detect legacy data', () => {
    expect(
      isLegacyAppData({
        globalConfig: { [MODEL_VERSION_KEY]: MODEL_VERSION.GLOBAL_CONFIG },
        project: { [MODEL_VERSION_KEY]: MODEL_VERSION.PROJECT - 1 },
        tag: { [MODEL_VERSION_KEY]: MODEL_VERSION.TAG },
        simpleCounter: { [MODEL_VERSION_KEY]: MODEL_VERSION.SIMPLE_COUNTER },
        note: { [MODEL_VERSION_KEY]: MODEL_VERSION.NOTE },
        metric: { [MODEL_VERSION_KEY]: MODEL_VERSION.METRIC },
        task: { [MODEL_VERSION_KEY]: MODEL_VERSION.TASK },
        taskArchive: { [MODEL_VERSION_KEY]: MODEL_VERSION.TASK_ARCHIVE },
        taskRepeatCfg: { [MODEL_VERSION_KEY]: MODEL_VERSION.TASK_REPEAT },
      } as any),
    ).toBe(true);
  });

  it('should not detect non-legacy data', () => {
    expect(
      isLegacyAppData({
        globalConfig: { [MODEL_VERSION_KEY]: MODEL_VERSION.GLOBAL_CONFIG },
        project: { [MODEL_VERSION_KEY]: MODEL_VERSION.PROJECT },
        tag: { [MODEL_VERSION_KEY]: MODEL_VERSION.TAG },
        simpleCounter: { [MODEL_VERSION_KEY]: MODEL_VERSION.SIMPLE_COUNTER },
        note: { [MODEL_VERSION_KEY]: MODEL_VERSION.NOTE },
        metric: { [MODEL_VERSION_KEY]: MODEL_VERSION.METRIC },
        task: { [MODEL_VERSION_KEY]: MODEL_VERSION.TASK },
        taskArchive: { [MODEL_VERSION_KEY]: MODEL_VERSION.TASK_ARCHIVE },
        taskRepeatCfg: { [MODEL_VERSION_KEY]: MODEL_VERSION.TASK_REPEAT },
        issueProvider: { [MODEL_VERSION_KEY]: MODEL_VERSION.ISSUE_PROVIDER },
      } as any),
    ).toBe(false);
  });
});
