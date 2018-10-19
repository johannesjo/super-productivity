import { Component } from '@angular/core';
import { Inject } from '@angular/core';
import { OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material';
import { MAT_DIALOG_DATA } from '@angular/material';
import { Project } from '../../project';
import { FormGroup } from '@angular/forms';
import { FormlyFormOptions } from '@ngx-formly/core';
import { FormlyFieldConfig } from '@ngx-formly/core';
import { ProjectService } from '../../project.service';
import { DEFAULT_PROJECT } from '../../project.const';
import { JiraCfg } from '../../../issue/jira/jira';

const ALL_THEMES = [
  'blue',
  'indigo',
  'purple',
  'deep-purple',
  'light-blue',
  'cyan',
  'teal',
  'green',
  'light-green',
  'indigo',
  'lime',
  'yellow',
  'amber',
  'deep-orange',
  'grey',
  'blue-grey',
  'indigo',
  'indigo',
];
const themeOpts = ALL_THEMES.map((theme) => {
  return {label: theme, value: theme};
});

@Component({
  selector: 'dialog-create-project',
  templateUrl: './dialog-create-project.component.html',
  styleUrls: ['./dialog-create-project.component.scss'],
})
export class DialogCreateProjectComponent implements OnInit {
  public projectData: Project | Partial<Project> = DEFAULT_PROJECT;

  form = new FormGroup({});
  formOptions: FormlyFormOptions = {
    formState: {
      awesomeIsForced: false,
    },
  };
  formCfg: FormlyFieldConfig[] = [
    {
      key: 'title',
      type: 'input',
      templateOptions: {
        required: true,
        label: 'Title',
      },
    },
    {
      key: 'themeColor',
      type: 'select',
      templateOptions: {
        label: 'Theme Color',
        options: themeOpts,
        valueProp: 'value',
        labelProp: 'label',
        placeholder: 'Theme Color'
      },
    },
    {
      key: 'isDarkTheme',
      type: 'checkbox',
      templateOptions: {
        label: 'Use Dark Theme',
      },
    },
  ];

  constructor(
    @Inject(MAT_DIALOG_DATA) private _project: Project,
    private _projectService: ProjectService,
    private _matDialogRef: MatDialogRef<DialogCreateProjectComponent>,
  ) {
  }

  ngOnInit() {
    if (this._project) {
      this.projectData = this._project;
    }
  }

  submit() {
    if (this.projectData.id) {
      this._projectService.update(this.projectData.id, this.projectData);
    } else {
      this._projectService.add(this.projectData);
    }
    this._matDialogRef.close();
  }

  saveJiraCfg(jiraCfg: JiraCfg) {
    console.log(this.projectData);

    this.projectData.issueIntegrationCfgs['JIRA'] = jiraCfg;
  }

  cancelEdit() {
    this._matDialogRef.close();
  }
}
