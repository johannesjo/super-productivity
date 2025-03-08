import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import {
  MatMenu,
  MatMenuContent,
  MatMenuItem,
  MatMenuTrigger,
} from '@angular/material/menu';
import { TaskCopy } from '../../tasks/task.model';
import { toSignal } from '@angular/core/rxjs-interop';
import { TagService } from '../tag.service';

@Component({
  selector: 'tag-toggle-menu-list',
  standalone: true,
  imports: [MatIcon, MatMenu, MatMenuContent, MatMenuItem, MatMenuTrigger],
  templateUrl: './tag-toggle-menu-list.component.html',
  styleUrl: './tag-toggle-menu-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TagToggleMenuListComponent {
  private _tagService = inject(TagService);

  task = input.required<TaskCopy>();

  toggleTag = output<string>();
  afterClose = output<void>();

  toggleTagList = toSignal(this._tagService.tagsNoMyDayAndNoList$, { initialValue: [] });
  menuEl = viewChild('menuEl', {
    // read: MatMenu,
  });
  tagMenuTriggerEl = viewChild('tagMenuTriggerEl', {
    read: MatMenuTrigger,
  });

  onTagMenuKeydown(ev: KeyboardEvent, tagId: string): void {
    if (ev.code === 'Space') {
      ev.preventDefault();
      ev.stopPropagation();
      this.toggleTag.emit(tagId);
    }
  }

  openMenu(ev?: MouseEvent | KeyboardEvent | TouchEvent): void {
    this.tagMenuTriggerEl()?.openMenu();
  }
}
