import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material';
import { Project } from '../../project.model';
import { FormGroup } from '@angular/forms';
import { FormlyFieldConfig, FormlyFormOptions } from '@ngx-formly/core';
import { ProjectService } from '../../project.service';
import { DEFAULT_PROJECT } from '../../project.const';
import { JiraCfg } from '../../../issue/jira/jira';
import { BASIC_PROJECT_CONFIG_FORM_CONFIG } from '../../project-form-cfg.const';
import { IssueIntegrationCfgs } from '../../../issue/issue';
import { DialogJiraInitialSetupComponent } from '../../../issue/jira/dialog-jira-initial-setup/dialog-jira-initial-setup.component';
import { SS_PROJECT_TMP } from '../../../../core/persistence/ls-keys.const';
import { Subscription } from 'rxjs/Subscription';
import { loadFromSessionStorage, saveToSessionStorage } from '../../../../core/persistence/local-storage';
import { GitCfg } from '../../../issue/git/git';
import { DialogGitInitialSetupComponent } from '../../../issue/git/dialog-git-initial-setup/dialog-git-initial-setup.component';
import { dirtyDeepCopy } from '../../../../util/dirtyDeepCopy';

@Component({
  selector: 'dialog-create-project',
  templateUrl: './dialog-create-project.component.html',
  styleUrls: ['./dialog-create-project.component.scss'],
})
export class DialogCreateProjectComponent implements OnInit, OnDestroy {
  projectData: Project | Partial<Project> = DEFAULT_PROJECT;
  jiraCfg: JiraCfg;
  gitCfg: GitCfg;

  form = new FormGroup({});
  formOptions: FormlyFormOptions = {
    formState: {
      awesomeIsForced: false,
    },
  };
  formCfg: FormlyFieldConfig[] = [];

  private _subs = new Subscription();
  private _isSaveTmpProject: boolean;

  constructor(
    @Inject(MAT_DIALOG_DATA) private _project: Project,
    private _projectService: ProjectService,
    private _matDialog: MatDialog,
    private _matDialogRef: MatDialogRef<DialogCreateProjectComponent>,
  ) {
    // somehow they are only unproblematic if assigned here,
    // not even sure how this is possible. ngrx formly sucks :/
    this.formCfg = dirtyDeepCopy(BASIC_PROJECT_CONFIG_FORM_CONFIG.items);
  }

  ngOnInit() {
    if (this._project) {
      this.projectData = Object.assign({}, this._project);
    } else {
      if (loadFromSessionStorage(SS_PROJECT_TMP)) {
        this.projectData = loadFromSessionStorage(SS_PROJECT_TMP);
      }
      this._isSaveTmpProject = true;

      // save tmp data if adding a new project
      // NOTE won't be properly executed if added to subs
      this._matDialogRef.afterClosed().subscribe(() => {
        const issueIntegrationCfgs: IssueIntegrationCfgs = Object.assign(this.projectData.issueIntegrationCfgs, {
          JIRA: this.jiraCfg,
          GIT: this.gitCfg,
        });
        const projectDataToSave: Project | Partial<Project> = {
          ...this.projectData,
          issueIntegrationCfgs,
        };
        if (this._isSaveTmpProject) {
          saveToSessionStorage(SS_PROJECT_TMP, projectDataToSave);
        }
      });
    }

    if (this.projectData.issueIntegrationCfgs) {
      if (this.projectData.issueIntegrationCfgs.JIRA) {
        this.jiraCfg = this.projectData.issueIntegrationCfgs.JIRA;
      }
      if (this.projectData.issueIntegrationCfgs.GIT) {
        this.gitCfg = this.projectData.issueIntegrationCfgs.GIT;
      }
    }
  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
  }

  submit() {
    const issueIntegrationCfgs: IssueIntegrationCfgs = Object.assign(this.projectData.issueIntegrationCfgs, {
      JIRA: this.jiraCfg,
      GIT: this.gitCfg,
    });

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
    saveToSessionStorage(SS_PROJECT_TMP, null);

    this._matDialogRef.close();
  }

  cancelEdit() {
    this._matDialogRef.close();
  }

  openJiraCfg() {
    this._subs.add(this._matDialog.open(DialogJiraInitialSetupComponent, {
      restoreFocus: true,
      data: {
        jiraCfg: this.projectData.issueIntegrationCfgs.JIRA,
      }
    }).afterClosed().subscribe((jiraCfg: JiraCfg) => {
      console.log('afterClosed', jiraCfg);

      if (jiraCfg) {
        this._saveJiraCfg(jiraCfg);
      }
    }));
  }

  private _saveJiraCfg(jiraCfg: JiraCfg) {
    this.jiraCfg = jiraCfg;

    console.log(this.projectData.id);

    // if we're editing save right away
    if (this.projectData.id) {
      this._projectService.updateIssueProviderConfig(this.projectData.id, 'JIRA', this.jiraCfg);
    }
  }

  openGitCfg() {
    this._subs.add(this._matDialog.open(DialogGitInitialSetupComponent, {
      restoreFocus: true,
      data: {
        gitCfg: this.projectData.issueIntegrationCfgs.JIRA,
      }
    }).afterClosed().subscribe((gitCfg: GitCfg) => {
      console.log('afterClosed', gitCfg);

      if (gitCfg) {
        this._saveGitCfg(gitCfg);
      }
    }));
  }

  private _saveGitCfg(gitCfg: GitCfg) {
    this.gitCfg = gitCfg;

    console.log(this.projectData.id);

    // if we're editing save right away
    if (this.projectData.id) {
      this._projectService.updateIssueProviderConfig(this.projectData.id, 'GIT', this.gitCfg);
    }
  }
}
