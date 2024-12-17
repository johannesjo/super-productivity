import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FieldType } from '@ngx-formly/material';
import { ProjectService } from '../../project/project.service';
import { Project } from '../../project/project.model';
import { T } from 'src/app/t.const';
import { FormlyFieldConfig } from '@ngx-formly/core';

@Component({
  selector: 'select-project',
  templateUrl: './select-project.component.html',
  styleUrls: ['./select-project.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class SelectProjectComponent extends FieldType<FormlyFieldConfig> {
  T: typeof T = T;

  constructor(public projectService: ProjectService) {
    super();
  }

  get type(): string {
    return this.to.type || 'text';
  }

  trackById(i: number, item: Project): string {
    return item.id;
  }
}
