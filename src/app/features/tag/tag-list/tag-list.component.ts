import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { standardListAnimation } from '../../../ui/animations/standard-list.ani';
import { Tag } from '../tag.model';
import { MatDialog } from '@angular/material/dialog';
import { Task } from '../../tasks/task.model';
import { WorkContextService } from '../../work-context/work-context.service';
import { WorkContextType } from '../../work-context/work-context.model';
import { expandFadeAnimation } from '../../../ui/animations/expand.ani';
import { NO_LIST_TAG } from '../tag.const';
import { toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { selectTagFeatureState } from '../store/tag.reducer';
import { selectProjectFeatureState } from '../../project/store/project.selectors';
import { Project } from '../../project/project.model';

@Component({
  selector: 'tag-list',
  templateUrl: './tag-list.component.html',
  styleUrls: ['./tag-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [standardListAnimation, expandFadeAnimation],
})
export class TagListComponent {
  task = input.required<Task>();

  isShowProjectTagAlways = input(false);
  isShowProjectTagNever = input(false);
  workContext = toSignal(this._workContextService.activeWorkContextTypeAndId$);
  // TODO this can be faster if we create a separate selector for just the stuff we need
  tagState = toSignal(this._store.select(selectTagFeatureState));
  // TODO this can be faster if we create a separate selector for just the stuff we need
  projectState = toSignal(this._store.select(selectProjectFeatureState));

  tagIds = computed<string[]>(() => this.task().tagIds || []);
  tags = computed<Tag[]>(() => {
    const tagIdsFiltered: string[] = this.tagIds().filter(
      (id) => id !== this.workContext()?.activeId && id !== NO_LIST_TAG.id,
    );
    const tagsI = tagIdsFiltered.map((id) => this.tagState()?.entities[id]);
    const projectId = this.projectId();
    const project = projectId && (this.projectState()?.entities[projectId] as Project);
    if (project) {
      const projectTag: Tag = {
        ...project,
        color: project.theme.primary,
        created: 0,
        icon: project.icon || 'folder_special',
      };
      return [projectTag, ...(tagsI || [])] as Tag[];
    }
    return (tagsI as Tag[]) || [];
  });

  projectId = computed<string | null>(() => {
    if (this.isShowProjectTagNever()) {
      return null;
    } else if (
      this.isShowProjectTagAlways() ||
      this.workContext()?.activeType === WorkContextType.TAG
    ) {
      return this.task().projectId;
    }
    return null;
  });

  constructor(
    private readonly _store: Store,
    private readonly _workContextService: WorkContextService,
    private readonly _matDialog: MatDialog,
  ) {}
}
