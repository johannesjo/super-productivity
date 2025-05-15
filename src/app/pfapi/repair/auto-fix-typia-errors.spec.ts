import { autoFixTypiaErrors } from './auto-fix-typia-errors';
import { createAppDataCompleteMock } from '../../util/app-data-mock';
import { createValidate } from 'typia';
import { initialTaskState } from '../../features/tasks/store/task.reducer';
import { DEFAULT_TASK, TaskState } from '../../features/tasks/task.model';

interface TestInterface {
  globalConfig: {
    misc: {
      startOfNextDay: number;
    };
  };
  optionalObj?: {
    optionalProp?: string;
    bool: boolean;
  };
  task?: TaskState;
}

describe('autoFixTypiaErrors', () => {
  const validate = createValidate<TestInterface>();

  let warnSpy: jasmine.Spy;

  beforeEach(() => {
    // Spy on console.warn to prevent test output cluttering
    warnSpy = spyOn(console, 'warn').and.stub();
  });

  afterEach(() => {
    // Reset spies
    warnSpy.calls.reset();
  });

  it('should return data unchanged when no errors', () => {
    const d = createAppDataCompleteMock();
    const result = autoFixTypiaErrors(d, []);
    expect(result).toBe(d);
  });

  it('should work for typia validation errors for strings that should be numbers', () => {
    const d = {
      globalConfig: {
        misc: {
          startOfNextDay: '111',
        },
      },
    } as any;
    const validateResult = validate(d);
    expect(validateResult.success).toBe(false);
    const result = autoFixTypiaErrors(d, (validateResult as any).errors);
    expect(result).toEqual({
      globalConfig: {
        misc: {
          startOfNextDay: 111,
        },
      },
    } as any);
  });

  it('should do nothing for non expected values', () => {
    const d = {
      globalConfig: {
        misc: {
          startOfNextDay: undefined,
        },
      },
    } as any;
    const validateResult = validate(d);
    expect(validateResult.success).toBe(false);
    const result = autoFixTypiaErrors(d, (validateResult as any).errors);
    expect(result.globalConfig.misc.startOfNextDay).not.toEqual(111);
    expect(result.globalConfig.misc.startOfNextDay).toEqual(undefined as any);
  });

  it('should sanitize null to undefined if model requests it', () => {
    const d = {
      globalConfig: {
        misc: {
          startOfNextDay: 111,
        },
      },
      optionalObj: {
        optionalProp: null,
      },
    } as any;
    const validateResult = validate(d);
    expect(validateResult.success).toBe(false);
    const result = autoFixTypiaErrors(d, (validateResult as any).errors);
    expect(result.globalConfig.misc.startOfNextDay).toEqual(111);
    expect((result as any).optionalObj.optionalProp).toEqual(undefined);
  });

  it('should sanitize boolean to false for undefined types', () => {
    const d = {
      globalConfig: {
        misc: {
          startOfNextDay: 111,
        },
      },
      optionalObj: {
        bool: null,
      },
    } as any;
    const validateResult = validate(d);
    expect(validateResult.success).toBe(false);
    const result = autoFixTypiaErrors(d, (validateResult as any).errors);
    expect((result as any).optionalObj.bool).toEqual(false);
  });

  it('should sanitize special id syntax', () => {
    const d = {
      globalConfig: {
        misc: {
          startOfNextDay: 111,
        },
      },
      task: {
        ...initialTaskState,
        entities: {
          // eslint-disable-next-line @typescript-eslint/naming-convention
          'task-1': {
            ...DEFAULT_TASK,
            id: 'task-1',
            timeEstimate: '0',
            timeSpent: '0',
          },
        },
        ids: ['task-1'],
      },
    } as any;
    const validateResult = validate(d);
    expect(validateResult.success).toBe(false);

    const result = autoFixTypiaErrors(d, (validateResult as any).errors);

    expect((result as any).task.entities['task-1'].timeEstimate).toEqual(0);
    expect((result as any).task.entities['task-1'].timeSpent).toEqual(0);
  });
});
