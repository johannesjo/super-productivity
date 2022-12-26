import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Inject,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Project, ProjectCopy } from '../../project.model';
import { UntypedFormGroup } from '@angular/forms';
import { FormlyFieldConfig, FormlyFormOptions } from '@ngx-formly/core';
import { ProjectService } from '../../project.service';
import { DEFAULT_PROJECT } from '../../project.const';
import { JiraCfg } from '../../../issue/providers/jira/jira.model';
import { CREATE_PROJECT_BASIC_CONFIG_FORM_CONFIG } from '../../project-form-cfg.const';
import { IssueIntegrationCfgs } from '../../../issue/issue.model';
import { DialogJiraInitialSetupComponent } from '../../../issue/providers/jira/jira-view-components/dialog-jira-initial-setup/dialog-jira-initial-setup.component';
import { SS } from '../../../../core/persistence/storage-keys.const';
import { Subscription } from 'rxjs';
import {
  loadFromSessionStorage,
  saveToSessionStorage,
} from '../../../../core/persistence/local-storage';
import { GithubCfg } from '../../../issue/providers/github/github.model';
import { AzuredevopsCfg } from '../../../issue/providers/azuredevops/azuredevops.model';
import { GiteaCfg } from '../../../issue/providers/gitea/gitea.model';
import { RedmineCfg } from '../../../issue/providers/redmine/redmine.model';
import { DialogGithubInitialSetupComponent } from '../../../issue/providers/github/github-view-components/dialog-github-initial-setup/dialog-github-initial-setup.component';
import { DialogAzuredevopsInitialSetupComponent } from '../../../issue/providers/azuredevops/azuredevops-view-components/dialog-azuredevops-initial-setup/dialog-azuredevops-initial-setup.component';
import {
  CALDAV_TYPE,
  GITEA_TYPE,
  REDMINE_TYPE,
  GITHUB_TYPE,
  GITLAB_TYPE,
  AZUREDEVOPS_TYPE,
  OPEN_PROJECT_TYPE,
} from '../../../issue/issue.const';
import { T } from '../../../../t.const';
import { DEFAULT_JIRA_CFG } from '../../../issue/providers/jira/jira.const';
import { DEFAULT_GITHUB_CFG } from '../../../issue/providers/github/github.const';
import { DEFAULT_AZUREDEVOPS_CFG } from 'src/app/features/issue/providers/azuredevops/azuredevops.const';
import { WORK_CONTEXT_THEME_CONFIG_FORM_CONFIG } from '../../../work-context/work-context.const';
import { GitlabCfg } from 'src/app/features/issue/providers/gitlab/gitlab';
import { DEFAULT_GITLAB_CFG } from 'src/app/features/issue/providers/gitlab/gitlab.const';
import { DialogGitlabInitialSetupComponent } from 'src/app/features/issue/providers/gitlab/dialog-gitlab-initial-setup/dialog-gitlab-initial-setup.component';
import { CaldavCfg } from 'src/app/features/issue/providers/caldav/caldav.model';
import { DEFAULT_CALDAV_CFG } from 'src/app/features/issue/providers/caldav/caldav.const';
import { DialogCaldavInitialSetupComponent } from 'src/app/features/issue/providers/caldav/dialog-caldav-initial-setup/dialog-caldav-initial-setup.component';
import { DialogOpenProjectInitialSetupComponent } from '../../../issue/providers/open-project/open-project-view-components/dialog-open-project-initial-setup/dialog-open-project-initial-setup.component';
import { OpenProjectCfg } from '../../../issue/providers/open-project/open-project.model';
import { DEFAULT_OPEN_PROJECT_CFG } from '../../../issue/providers/open-project/open-project.const';
import { DEFAULT_GITEA_CFG } from '../../../issue/providers/gitea/gitea.const';
import { DEFAULT_REDMINE_CFG } from '../../../issue/providers/redmine/redmine.const';
import { getRandomWorkContextColor } from '../../../work-context/work-context-color';
import { DialogGiteaInitialSetupComponent } from 'src/app/features/issue/providers/gitea/gitea-view-components/dialog-gitea-initial-setup/dialog-gitea-initial-setup.component';
import { DialogRedmineInitialSetupComponent } from 'src/app/features/issue/providers/redmine/redmine-view-components/redmine-initial-setup/dialog-redmine-initial-setup.component';

@Component({
  selector: 'dialog-create-project',
  templateUrl: './dialog-create-project.component.html',
  styleUrls: ['./dialog-create-project.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogCreateProjectComponent implements OnInit, OnDestroy {
  T: typeof T = T;
  projectData: ProjectCopy | Partial<ProjectCopy> = {
    ...DEFAULT_PROJECT,
    theme: { ...DEFAULT_PROJECT.theme, primary: getRandomWorkContextColor() },
  };
  jiraCfg?: JiraCfg;
  githubCfg?: GithubCfg;
  gitlabCfg?: GitlabCfg;
  azuredevopsCfg?: AzuredevopsCfg;
  caldavCfg?: CaldavCfg;
  openProjectCfg?: OpenProjectCfg;
  giteaCfg?: GiteaCfg;
  redmineCfg?: RedmineCfg;

  formBasic: UntypedFormGroup = new UntypedFormGroup({});
  formTheme: UntypedFormGroup = new UntypedFormGroup({});
  formOptionsBasic: FormlyFormOptions = {
    formState: {
      awesomeIsForced: false,
    },
  };
  formOptionsTheme: FormlyFormOptions = {
    formState: {
      awesomeIsForced: false,
    },
  };

  basicSettingsFormCfg: FormlyFieldConfig[] = [];
  themeFormCfg: FormlyFieldConfig[] = [];

  private _subs: Subscription = new Subscription();
  private _isSaveTmpProject: boolean = false;

  constructor(
    @Inject(MAT_DIALOG_DATA) private _project: Project,
    private _projectService: ProjectService,
    private _matDialog: MatDialog,
    private _matDialogRef: MatDialogRef<DialogCreateProjectComponent>,
    private _cd: ChangeDetectorRef,
  ) {
    // somehow they are only unproblematic if assigned here,
    this.basicSettingsFormCfg = CREATE_PROJECT_BASIC_CONFIG_FORM_CONFIG.items as any;
    this.themeFormCfg = WORK_CONTEXT_THEME_CONFIG_FORM_CONFIG.items as any;
  }

  ngOnInit(): void {
    if (this._project) {
      this.projectData = { ...this._project };
    } else {
      const ssVal: any = loadFromSessionStorage(SS.PROJECT_TMP);
      if (ssVal) {
        this.projectData = {
          ...DEFAULT_PROJECT,
          ...ssVal,
        };
      }
      this._isSaveTmpProject = true;

      // save tmp data if adding a new project
      // NOTE won't be properly executed if added to _subs
      this._matDialogRef.afterClosed().subscribe(() => {
        const issueIntegrationCfgs: IssueIntegrationCfgs = {
          ...this.projectData.issueIntegrationCfgs,
          JIRA: this.jiraCfg,
          GITHUB: this.githubCfg,
          GITLAB: this.gitlabCfg,
          AZUREDEVOPS: this.azuredevopsCfg,
          CALDAV: this.caldavCfg,
          OPEN_PROJECT: this.openProjectCfg,
          GITEA: this.giteaCfg,
          REDMINE: this.redmineCfg,
        };
        const projectDataToSave: Project | Partial<Project> = {
          ...this.projectData,
          issueIntegrationCfgs,
        };
        if (this._isSaveTmpProject) {
          saveToSessionStorage(SS.PROJECT_TMP, projectDataToSave);
        }
      });
    }

    if (this.projectData.issueIntegrationCfgs) {
      if (this.projectData.issueIntegrationCfgs.JIRA) {
        this.jiraCfg = this.projectData.issueIntegrationCfgs.JIRA;
      }
      if (this.projectData.issueIntegrationCfgs.GITHUB) {
        this.githubCfg = this.projectData.issueIntegrationCfgs.GITHUB;
      }
      if (this.projectData.issueIntegrationCfgs.GITLAB) {
        this.gitlabCfg = this.projectData.issueIntegrationCfgs.GITLAB;
      }
      if (this.projectData.issueIntegrationCfgs.AZUREDEVOPS) {
        this.azuredevopsCfg = this.projectData.issueIntegrationCfgs.AZUREDEVOPS;
      }
      if (this.projectData.issueIntegrationCfgs.CALDAV) {
        this.caldavCfg = this.projectData.issueIntegrationCfgs.CALDAV;
      }
      if (this.projectData.issueIntegrationCfgs.GITEA) {
        this.giteaCfg = this.projectData.issueIntegrationCfgs.GITEA;
      }
      if (this.projectData.issueIntegrationCfgs.REDMINE) {
        this.redmineCfg = this.projectData.issueIntegrationCfgs.REDMINE;
      }
    }
  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
  }

  submit(): void {
    const issueIntegrationCfgs: IssueIntegrationCfgs = {
      ...this.projectData.issueIntegrationCfgs,
      JIRA: this.jiraCfg || DEFAULT_JIRA_CFG,
      GITHUB: this.githubCfg || DEFAULT_GITHUB_CFG,
      GITLAB: this.gitlabCfg || DEFAULT_GITLAB_CFG,
      AZUREDEVOPS: this.azuredevopsCfg || DEFAULT_AZUREDEVOPS_CFG,
      CALDAV: this.caldavCfg || DEFAULT_CALDAV_CFG,
      OPEN_PROJECT: this.openProjectCfg || DEFAULT_OPEN_PROJECT_CFG,
      GITEA: this.giteaCfg || DEFAULT_GITEA_CFG,
      REDMINE: this.redmineCfg || DEFAULT_REDMINE_CFG,
    };

    const projectDataToSave: Project | Partial<Project> = {
      ...this.projectData,
      issueIntegrationCfgs,
    };

    if (projectDataToSave.id) {
      this._projectService.update(projectDataToSave.id, projectDataToSave);
    } else {
      this._projectService.add(projectDataToSave);
    }
    this._isSaveTmpProject = false;
    sessionStorage.removeItem(SS.PROJECT_TMP);

    this._matDialogRef.close();
  }

  cancelEdit(): void {
    this._matDialogRef.close();
  }

  openJiraCfg(): void {
    this._subs.add(
      this._matDialog
        .open(DialogJiraInitialSetupComponent, {
          restoreFocus: true,
          data: {
            jiraCfg: {
              ...this.jiraCfg,
              isEnabled: true,
            },
          },
        })
        .afterClosed()
        .subscribe((jiraCfg: JiraCfg) => {
          if (jiraCfg) {
            this._saveJiraCfg(jiraCfg);
          }
        }),
    );
  }

  openGithubCfg(): void {
    this._subs.add(
      this._matDialog
        .open(DialogGithubInitialSetupComponent, {
          restoreFocus: true,
          data: {
            githubCfg: { ...this.githubCfg, isEnabled: true },
          },
        })
        .afterClosed()
        .subscribe((gitCfg: GithubCfg) => {
          if (gitCfg) {
            this._saveGithubCfg(gitCfg);
          }
        }),
    );
  }

  openAzuredevopsCfg(): void {
    this._subs.add(
      this._matDialog
        .open(DialogAzuredevopsInitialSetupComponent, {
          restoreFocus: true,
          data: {
            azuredevopsCfg: { ...this.azuredevopsCfg, isEnabled: true },
          },
        })
        .afterClosed()
        .subscribe((azuredevopsCfg: AzuredevopsCfg) => {
          if (azuredevopsCfg) {
            this._saveAzuredevopsCfg(azuredevopsCfg);
          }
        }),
    );
  }

  openGitlabCfg(): void {
    this._subs.add(
      this._matDialog
        .open(DialogGitlabInitialSetupComponent, {
          restoreFocus: true,
          data: {
            gitlabCfg: { ...this.gitlabCfg, isEnabled: true },
          },
        })
        .afterClosed()
        .subscribe((gitlabCfg: GitlabCfg) => {
          if (gitlabCfg) {
            this._saveGitlabCfg(gitlabCfg);
          }
        }),
    );
  }

  openCaldavCfg(): void {
    this._subs.add(
      this._matDialog
        .open(DialogCaldavInitialSetupComponent, {
          restoreFocus: true,
          data: {
            caldavCfg: { ...this.caldavCfg, isEnabled: true },
          },
        })
        .afterClosed()
        .subscribe((caldavCfg: CaldavCfg) => {
          if (caldavCfg) {
            this._saveCaldavCfg(caldavCfg);
          }
        }),
    );
  }

  openOpenProjectCfg(): void {
    this._subs.add(
      this._matDialog
        .open(DialogOpenProjectInitialSetupComponent, {
          restoreFocus: true,
          data: {
            openProjectCfg: { ...this.openProjectCfg, isEnabled: true },
          },
        })
        .afterClosed()
        .subscribe((openProjectCfg: OpenProjectCfg) => {
          if (openProjectCfg) {
            this._saveOpenProjectCfg(openProjectCfg);
          }
        }),
    );
  }

  openGiteaCfg(): void {
    this._subs.add(
      this._matDialog
        .open(DialogGiteaInitialSetupComponent, {
          restoreFocus: true,
          data: {
            giteaCfg: { ...this.giteaCfg, isEnabled: true },
          },
        })
        .afterClosed()
        .subscribe((giteaCfg: GiteaCfg) => {
          if (giteaCfg) {
            this._saveGiteaCfg(giteaCfg);
          }
        }),
    );
  }

  openRedmineCfg(): void {
    this._subs.add(
      this._matDialog
        .open(DialogRedmineInitialSetupComponent, {
          restoreFocus: true,
          data: {
            redmineCfg: { ...this.redmineCfg, isEnabled: true },
          },
        })
        .afterClosed()
        .subscribe((redmineCfg: RedmineCfg) => {
          if (redmineCfg) {
            this._saveRedmineCfg(redmineCfg);
          }
        }),
    );
  }

  private _saveRedmineCfg(redmineCfg: RedmineCfg): void {
    this.redmineCfg = redmineCfg;
    this._cd.markForCheck();

    if (this.projectData.id) {
      this._projectService.updateIssueProviderConfig(
        this.projectData.id,
        REDMINE_TYPE,
        this.redmineCfg,
      );
    }
  }

  private _saveJiraCfg(jiraCfg: JiraCfg): void {
    this.jiraCfg = jiraCfg;
    this._cd.markForCheck();

    // if we're editing save right away
    if (this.projectData.id) {
      this._projectService.updateIssueProviderConfig(
        this.projectData.id,
        'JIRA',
        this.jiraCfg,
      );
    }
  }

  private _saveGithubCfg(githubCfg: GithubCfg): void {
    this.githubCfg = githubCfg;
    this._cd.markForCheck();

    // if we're editing save right away
    if (this.projectData.id) {
      this._projectService.updateIssueProviderConfig(
        this.projectData.id,
        GITHUB_TYPE,
        this.githubCfg,
      );
    }
  }

  private _saveAzuredevopsCfg(azuredevopsCfg: AzuredevopsCfg): void {
    this.azuredevopsCfg = azuredevopsCfg;
    this._cd.markForCheck();

    // if we're editing save right away
    if (this.projectData.id) {
      this._projectService.updateIssueProviderConfig(
        this.projectData.id,
        AZUREDEVOPS_TYPE,
        this.azuredevopsCfg,
      );
    }
  }

  private _saveGitlabCfg(gitlabCfg: GitlabCfg): void {
    this.gitlabCfg = gitlabCfg;
    this._cd.markForCheck();

    // if we're editing save right away
    if (this.projectData.id) {
      this._projectService.updateIssueProviderConfig(
        this.projectData.id,
        GITLAB_TYPE,
        this.gitlabCfg,
      );
    }
  }

  private _saveCaldavCfg(caldavCfg: CaldavCfg): void {
    this.caldavCfg = caldavCfg;
    this._cd.markForCheck();

    // if we're editing save right away
    if (this.projectData.id) {
      this._projectService.updateIssueProviderConfig(
        this.projectData.id,
        CALDAV_TYPE,
        this.caldavCfg,
      );
    }
  }

  private _saveOpenProjectCfg(openProjectCfg: OpenProjectCfg): void {
    this.openProjectCfg = openProjectCfg;
    this._cd.markForCheck();

    // if we're editing save right away
    if (this.projectData.id) {
      this._projectService.updateIssueProviderConfig(
        this.projectData.id,
        OPEN_PROJECT_TYPE,
        this.openProjectCfg,
      );
    }
  }

  private _saveGiteaCfg(giteaCfg: GiteaCfg): void {
    this.giteaCfg = giteaCfg;
    this._cd.markForCheck();

    // if we're editing save right away
    if (this.projectData.id) {
      this._projectService.updateIssueProviderConfig(
        this.projectData.id,
        GITEA_TYPE,
        this.giteaCfg,
      );
    }
  }
}
