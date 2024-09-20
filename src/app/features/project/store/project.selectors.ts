import { Project, ProjectState } from '../project.model';
import { createFeatureSelector, createSelector } from '@ngrx/store';
import { JiraCfg } from '../../issue/providers/jira/jira.model';
import { GithubCfg } from '../../issue/providers/github/github.model';
import {
  CALDAV_TYPE,
  GITEA_TYPE,
  GITHUB_TYPE,
  GITLAB_TYPE,
  JIRA_TYPE,
  OPEN_PROJECT_TYPE,
  REDMINE_TYPE,
} from '../../issue/issue.const';
import { GitlabCfg } from '../../issue/providers/gitlab/gitlab';
import { exists } from '../../../util/exists';
import { CaldavCfg } from '../../issue/providers/caldav/caldav.model';
import { PROJECT_FEATURE_NAME, projectAdapter } from './project.reducer';
import { OpenProjectCfg } from '../../issue/providers/open-project/open-project.model';
import { GiteaCfg } from '../../issue/providers/gitea/gitea.model';
import { RedmineCfg } from '../../issue/providers/redmine/redmine.model';

// TODO rename to selectProjectFeatureState
export const selectProjectFeatureState =
  createFeatureSelector<ProjectState>(PROJECT_FEATURE_NAME);
const { selectAll } = projectAdapter.getSelectors();
export const selectAllProjects = createSelector(selectProjectFeatureState, selectAll);
export const selectUnarchivedProjects = createSelector(selectAllProjects, (projects) =>
  projects.filter((p) => !p.isArchived),
);
export const selectUnarchivedVisibleProjects = createSelector(
  selectAllProjects,
  (projects) => projects.filter((p) => !p.isArchived && !p.isHiddenFromMenu),
);
export const selectUnarchivedHiddenProjectIds = createSelector(
  selectAllProjects,
  (projects) =>
    projects.filter((p) => !p.isArchived && p.isHiddenFromMenu).map((p) => p.id),
);

export const selectArchivedProjects = createSelector(selectAllProjects, (projects) =>
  projects.filter((p) => p.isArchived),
);
export const selectAllProjectColors = createSelector(selectAllProjects, (projects) =>
  projects.reduce((prev, cur) => ({ ...prev, [cur.id]: cur.theme.primary }), {}),
);
export const selectAllProjectColorsAndTitles = createSelector(
  selectAllProjects,
  (projects) =>
    projects.reduce(
      (prev, cur) => ({
        ...prev,
        [cur.id]: { color: cur.theme.primary, title: cur.title },
      }),
      {},
    ),
);

// DYNAMIC SELECTORS
// -----------------
export const selectProjectById = createSelector(
  selectProjectFeatureState,
  (state: ProjectState, props: { id: string }): Project => {
    const p = state.entities[props.id];
    if (!props.id) {
      throw new Error('No project id given');
    }
    if (!p) {
      throw new Error(`Project ${props.id} not found`);
    }
    return p;
  },
);

export const selectJiraCfgByProjectId = createSelector(
  selectProjectById,
  (p: Project): JiraCfg => p.issueIntegrationCfgs[JIRA_TYPE] as JiraCfg,
);

export const selectGithubCfgByProjectId = createSelector(
  selectProjectById,
  (p: Project): GithubCfg => p.issueIntegrationCfgs[GITHUB_TYPE] as GithubCfg,
);

export const selectRedmineCfgByProjectId = createSelector(
  selectProjectById,
  (p: Project): RedmineCfg => p.issueIntegrationCfgs[REDMINE_TYPE] as RedmineCfg,
);

export const selectGitlabCfgByProjectId = createSelector(
  selectProjectById,
  (p: Project): GitlabCfg => p.issueIntegrationCfgs[GITLAB_TYPE] as GitlabCfg,
);

export const selectCaldavCfgByProjectId = createSelector(
  selectProjectById,
  (p: Project): CaldavCfg => p.issueIntegrationCfgs[CALDAV_TYPE] as CaldavCfg,
);

export const selectOpenProjectCfgByProjectId = createSelector(
  selectProjectById,
  (p: Project): OpenProjectCfg =>
    p.issueIntegrationCfgs[OPEN_PROJECT_TYPE] as OpenProjectCfg,
);

export const selectGiteaCfgByProjectId = createSelector(
  selectProjectById,
  (p: Project): GiteaCfg => p.issueIntegrationCfgs[GITEA_TYPE] as GiteaCfg,
);

export const selectUnarchivedProjectsWithoutCurrent = createSelector(
  selectProjectFeatureState,
  (s: ProjectState, props: { currentId: string | null }) => {
    const ids = s.ids as string[];
    return ids
      .filter((id) => id !== props.currentId)
      .map((id) => exists(s.entities[id]) as Project)
      .filter((p) => !p.isArchived && !p.isHiddenFromMenu && p.id);
  },
);

export const selectProjectBreakTimeForProject = createSelector(
  selectProjectById,
  (project) => project.breakTime,
);
export const selectProjectBreakNrForProject = createSelector(
  selectProjectById,
  (project) => project.breakNr,
);
