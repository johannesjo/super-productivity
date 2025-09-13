import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { FieldType, FieldTypeConfig } from '@ngx-formly/core';
import { CommonModule } from '@angular/common';
import { ProjectFolderService } from '../../project-folder.service';

@Component({
  selector: 'formly-field-project-folder-select',
  template: `
    <mat-form-field appearance="outline">
      <mat-label>{{ to.label }}</mat-label>
      <mat-select
        [formControl]="formControl"
        [placeholder]="to.placeholder || 'Select folder'"
      >
        <mat-option [value]="null">No folder (root level)</mat-option>
        @for (folder of projectFolderService.projectFolders$ | async; track folder.id) {
          <mat-option [value]="folder.id">{{ folder.title }}</mat-option>
        }
      </mat-select>
    </mat-form-field>
  `,
  styleUrls: ['./project-folder-select.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
})
export class ProjectFolderSelectComponent extends FieldType<FieldTypeConfig> {
  readonly projectFolderService = inject(ProjectFolderService);
}
