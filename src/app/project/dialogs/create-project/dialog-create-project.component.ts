import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material';
import { IssueIntegrationCfgs, Project } from '../../project.model';
import { FormGroup } from '@angular/forms';
import { FormlyFieldConfig, FormlyFormOptions } from '@ngx-formly/core';
import { ProjectService } from '../../project.service';
import { DEFAULT_PROJECT } from '../../project.const';
import { JiraCfg } from '../../../issue/jira/jira';
import { BASIC_PROJECT_CONFIG_FORM_CONFIG } from '../../project-form-cfg.const';

@Component({
  selector: 'dialog-create-project',
  templateUrl: './dialog-create-project.component.html',
  styleUrls: ['./dialog-create-project.component.scss'],
})
export class DialogCreateProjectComponent implements OnInit {
  public projectData: Project | Partial<Project> = DEFAULT_PROJECT;
  public jiraCfg: JiraCfg;

  public openPanelId: string;

  form = new FormGroup({});
  formOptions: FormlyFormOptions = {
    formState: {
      awesomeIsForced: false,
    },
  };
  formCfg: FormlyFieldConfig[] = BASIC_PROJECT_CONFIG_FORM_CONFIG.items;

  constructor(
    @Inject(MAT_DIALOG_DATA) private _project: Project,
    private _projectService: ProjectService,
    private _matDialogRef: MatDialogRef<DialogCreateProjectComponent>,
  ) {
  }

  ngOnInit() {
    if (this._project) {
      this.projectData = Object.assign({}, this._project);
    }
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
