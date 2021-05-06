import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

export interface TagComponentTag {
  title: string;
  icon?: string;

  [key: string]: any;
}

@Component({
  selector: 'tag',
  templateUrl: './tag.component.html',
  styleUrls: ['./tag.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TagComponent {
  tag?: TagComponentTag;
  // @HostBinding('style.background')
  color?: string;

  constructor() {}

  @Input('tag') set tagIn(v: TagComponentTag) {
    this.tag = v;
    this.color = v.color || (v.theme && v.theme.primary);
  }
}
