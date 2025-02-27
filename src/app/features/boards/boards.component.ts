import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatTab, MatTabContent, MatTabGroup, MatTabLabel } from '@angular/material/tabs';
import { MatGridList, MatGridTile } from '@angular/material/grid-list';
import { Store } from '@ngrx/store';
import { toSignal } from '@angular/core/rxjs-interop';
import { WorkContextService } from '../work-context/work-context.service';
import { CdkDrag, CdkDropList } from '@angular/cdk/drag-drop';
import { PlannerRepeatProjectionComponent } from '../planner/planner-repeat-projection/planner-repeat-projection.component';
import { PlannerTaskComponent } from '../planner/planner-task/planner-task.component';
import { TranslatePipe } from '@ngx-translate/core';
import { T } from '../../t.const';
import { IssueProviderSetupOverviewComponent } from '../issue-panel/issue-provider-setup-overview/issue-provider-setup-overview.component';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'boards',
  standalone: true,
  imports: [
    MatTabGroup,
    MatTab,
    MatGridList,
    MatGridTile,
    CdkDrag,
    CdkDropList,
    PlannerRepeatProjectionComponent,
    PlannerTaskComponent,
    TranslatePipe,
    IssueProviderSetupOverviewComponent,
    MatIcon,
    MatTabContent,
    MatTabLabel,
  ],
  templateUrl: './boards.component.html',
  styleUrl: './boards.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BoardsComponent {
  store = inject(Store);
  workContextService = inject(WorkContextService);

  // tasks = toSignal(this.store.select(selectTo));
  tasks = toSignal(this.workContextService.todaysTasks$);
  protected readonly T = T;
}
