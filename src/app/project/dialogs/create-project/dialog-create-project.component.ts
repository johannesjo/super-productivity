import { Component } from '@angular/core';
import { Inject } from '@angular/core';
import { MatDialogRef } from '@angular/material';
import { MAT_DIALOG_DATA } from '@angular/material';
import { Project } from '../../project';
import { FormGroup } from '@angular/forms';
import { FormlyFormOptions } from '@ngx-formly/core';
import { FormlyFieldConfig } from '@ngx-formly/core';
import { ProjectService } from '../../project.service';

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
export class DialogCreateProjectComponent {
  constructor(
    private _projectService: ProjectService,
    private _matDialogRef: MatDialogRef<DialogCreateProjectComponent>,
    @Inject(MAT_DIALOG_DATA) public project: Project
  ) {
  }

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

  submit() {
    console.log(this.project);

    if (this.project.id) {
      this._projectService.update(this.project.id, this.project);
    } else {
      this._projectService.add(this.project);
    }
    this._matDialogRef.close();
  }

  cancelEdit() {
    this._matDialogRef.close();
  }
}
