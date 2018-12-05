import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material';
import { Project } from '../../project.model';
import { FormGroup } from '@angular/forms';
import { FormlyFieldConfig, FormlyFormOptions } from '@ngx-formly/core';
import { ProjectService } from '../../project.service';
import { DEFAULT_PROJECT } from '../../project.const';
import { JiraCfg } from '../../../issue/jira/jira';
import { BASIC_PROJECT_CONFIG_FORM_CONFIG } from '../../project-form-cfg.const';
import { IssueIntegrationCfgs } from '../../../issue/issue';
import { SS_PROJECT_TMP } from '../../../core/persistence/ls-keys.const';
import { Subscription } from 'rxjs/Subscription';
import { loadFromSessionStorage, saveToSessionStorage } from '../../../core/persistence/local-storage';

@Component({
  selector: 'dialog-create-project',
  templateUrl: './dialog-create-project.component.html',
  styleUrls: ['./dialog-create-project.component.scss'],
})
export class DialogCreateProjectComponent implements OnInit, OnDestroy {
  projectData: Project | Partial<Project> = DEFAULT_PROJECT;
  jiraCfg: JiraCfg;

  openPanelId: string;

  form = new FormGroup({});
  formOptions: FormlyFormOptions = {
    formState: {
      awesomeIsForced: false,
    },
  };
  formCfg: FormlyFieldConfig[] = BASIC_PROJECT_CONFIG_FORM_CONFIG.items;

  private _subs = new Subscription();

  constructor(
    @Inject(MAT_DIALOG_DATA) private _project: Project,
    private _projectService: ProjectService,
    private _matDialogRef: MatDialogRef<DialogCreateProjectComponent>,
  ) {
  }

  ngOnInit() {
    if (this._project) {
      this.projectData = Object.assign({}, this._project);
    } else if (loadFromSessionStorage(SS_PROJECT_TMP)) {
      this.projectData = loadFromSessionStorage(SS_PROJECT_TMP);
    }

    this._subs.add(this._matDialogRef.afterClosed().subscribe(() => {
      saveToSessionStorage(SS_PROJECT_TMP, this.projectData);
    }));
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
  }

  submit() {
    const issueIntegrationCfgs: IssueIntegrationCfgs = Object.assign(this.projectData.issueIntegrationCfgs, {
      JIRA: this.jiraCfg,
      GIT: undefined,
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
    this._matDialogRef.close();
  }

  saveJiraCfg(jiraCfg: JiraCfg) {
    this.jiraCfg = jiraCfg;

    if (this.projectData.id) {
      this._projectService.updateIssueProviderConfig(this.projectData.id, 'JIRA', this.jiraCfg);
    }
    this.openPanelId = undefined;
  }

  cancelEdit() {
    this._matDialogRef.close();
  }
}
