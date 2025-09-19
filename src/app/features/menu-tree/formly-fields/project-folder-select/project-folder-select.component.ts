import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { FieldType, FieldTypeConfig } from '@ngx-formly/core';
import { CommonModule } from '@angular/common';
import { MenuTreeService } from '../../project-folder.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { TranslateModule } from '@ngx-translate/core';
import { T } from '../../../../t.const';

@Component({
  selector: 'formly-field-project-folder-select',
  template: `
    <mat-form-field appearance="outline">
      <mat-label>
        {{ to.label || (T.F.PROJECT_FOLDER.SELECT.LABEL | translate) }}
      </mat-label>
      <mat-select
        [formControl]="formControl"
        [placeholder]="
          to.placeholder ?? (T.F.PROJECT_FOLDER.SELECT.PLACEHOLDER | translate)
        "
      >
        <mat-option [value]="null">
          {{ T.F.PROJECT_FOLDER.SELECT.NO_PARENT | translate }}
        </mat-option>
        @for (folder of projectFolderService.projectFolders$ | async; track folder.id) {
          <mat-option [value]="folder.id">{{ folder.title }}</mat-option>
        }
      </mat-select>
    </mat-form-field>
  `,
  styleUrls: ['./project-folder-select.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatOptionModule,
    TranslateModule,
  ],
})
export class MenuTreeSelectComponent extends FieldType<FieldTypeConfig> {
  readonly projectFolderService = inject(MenuTreeService);
  readonly T = T;
}
