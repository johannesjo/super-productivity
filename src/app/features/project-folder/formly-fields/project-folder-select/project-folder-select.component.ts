import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { FieldType, FieldTypeConfig } from '@ngx-formly/core';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

import { ProjectFolderService } from '../../project-folder.service';

@Component({
  selector: 'formly-field-project-folder-select',
  template: `
    <mat-select
      [formControl]="formControl"
      [placeholder]="props.placeholder || 'Select folder'"
    >
      <mat-option [value]="null">No folder (root level)</mat-option>
      @for (folder of projectFolderService.projectFolders$ | async; track folder.id) {
        <mat-option [value]="folder.id">{{ folder.title }}</mat-option>
      }
    </mat-select>
  `,
  styleUrls: ['./project-folder-select.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, MatSelectModule, MatOptionModule],
})
export class ProjectFolderSelectComponent extends FieldType<FieldTypeConfig> {
  readonly projectFolderService = inject(ProjectFolderService);
}
