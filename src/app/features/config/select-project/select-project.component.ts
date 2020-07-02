import { ChangeDetectionStrategy, Component, ViewChild } from '@angular/core';
import { FieldType } from '@ngx-formly/material';
import { MatInput } from '@angular/material/input';
import { ProjectService } from '../../project/project.service';
import { Project } from '../../project/project.model';
import { T } from 'src/app/t.const';

@Component({
  selector: 'select-project',
  templateUrl: './select-project.component.html',
  styleUrls: ['./select-project.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SelectProjectComponent extends FieldType {
  @ViewChild(MatInput) formFieldControl: MatInput;

  T: any = T;

  constructor(
    public projectService: ProjectService,
  ) {
    super();
  }

  get type() {
    return this.to.type || 'text';
  }

  trackById(i: number, item: Project) {
    return item.id;
  }
}
