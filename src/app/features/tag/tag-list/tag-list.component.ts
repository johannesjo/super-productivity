import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { standardListAnimation } from '../../../ui/animations/standard-list.ani';
import { Tag } from '../tag.model';
import { Task } from '../../tasks/task.model';
import { WorkContextService } from '../../work-context/work-context.service';
import { WorkContextType } from '../../work-context/work-context.model';
import { expandFadeAnimation } from '../../../ui/animations/expand.ani';
import { toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { selectTagFeatureState } from '../store/tag.reducer';
import { selectProjectFeatureState } from '../../project/store/project.selectors';
import { Project } from '../../project/project.model';
import { TagComponent } from '../tag/tag.component';
import { DEFAULT_PROJECT_COLOR } from '../../work-context/work-context.const';

@Component({
  selector: 'tag-list',
  templateUrl: './tag-list.component.html',
  styleUrls: ['./tag-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [standardListAnimation, expandFadeAnimation],
  imports: [TagComponent],
})
export class TagListComponent {
  private readonly _store = inject(Store);
  private readonly _workContextService = inject(WorkContextService);

  task = input.required<Task>();

  tagsToHide = input<string[]>();

  isShowCurrentContextTag = input(false);
  isShowProjectTagAlways = input(false);
  isShowProjectTagNever = input(false);
  workContext = toSignal(this._workContextService.activeWorkContextTypeAndId$);
  // TODO this can be faster if we create a separate selector for just the stuff we need
  tagState = toSignal(this._store.select(selectTagFeatureState));
  // TODO this can be faster if we create a separate selector for just the stuff we need
  projectState = toSignal(this._store.select(selectProjectFeatureState));

  tagIds = computed<string[]>(() => this.task().tagIds || []);
  tags = computed<Tag[]>(() => {
    const tagsToHide = this.tagsToHide();
    const tagIdsFiltered: string[] = !!tagsToHide
      ? tagsToHide.length > 0
        ? this.tagIds().filter((id) => !tagsToHide.includes(id))
        : this.tagIds()
      : this.tagIds().filter((id) => id !== this.workContext()?.activeId);

    const tagsI = tagIdsFiltered.map((id) => this.tagState()?.entities[id]);
    const projectId = this.projectId();
    const project = projectId && (this.projectState()?.entities[projectId] as Project);
    if (project) {
      const projectTag: Tag = {
        ...project,
        color: project.theme.primary || DEFAULT_PROJECT_COLOR,
        created: 0,
        icon: project.icon || 'folder_special',
      };
      return [projectTag, ...(tagsI || [])] as Tag[];
    }
    return (tagsI as Tag[]) || [];
  });

  projectId = computed<string | undefined>(() => {
    if (this.isShowProjectTagNever()) {
      return undefined;
    } else if (
      this.isShowProjectTagAlways() ||
      this.workContext()?.activeType === WorkContextType.TAG
    ) {
      return this.task().projectId;
    }
    return undefined;
  });
}
