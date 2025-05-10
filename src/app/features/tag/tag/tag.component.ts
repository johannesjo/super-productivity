import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  Signal,
} from '@angular/core';
import { MatIcon } from '@angular/material/icon';

import { INBOX_PROJECT } from '../../project/project.const';

export interface TagComponentTag {
  title: string;
  icon?: string;
  color?: string;
  theme?: {
    primary: string;
  };

  [key: string]: any;
}

@Component({
  selector: 'tag',
  templateUrl: './tag.component.html',
  styleUrls: ['./tag.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIcon],
})
export class TagComponent {
  tag = input.required<TagComponentTag>();
  isHideTitle = input(false);
  isInboxTag = computed(() => (this.tag() as any).id === INBOX_PROJECT.id);

  // @HostBinding('style.background')
  color: Signal<string | undefined> = computed(() => {
    const currentTag = this.tag();
    return currentTag.color || (currentTag.theme && currentTag.theme.primary);
  });
}
