import { Project } from './project.model';

export const createProject = (
  { id = 'DEFAULT', title = 'DEFAULT', ...rest }: Partial<Project> = {
    id: 'DEFAULT',
    title: 'DEFAULT',
  },
): Project => {
  return {
    id,
    title,
    taskIds: [],
    backlogTaskIds: [],
    noteIds: [],
    isEnableBacklog: false,
    issueIntegrationCfgs: {},
    advancedCfg: {
      isAutoMarkDone: false,
      isNotifyBeforeTimeEstimate: false,
      isNotifyWhenTimeEstimateExceeded: false,
      isRelatedAfterFinish: false,
      isRepeatAfterCompletion: false,
    },
    ...rest,
  } as Project;
};
