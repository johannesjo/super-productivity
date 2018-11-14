import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';

@Component({
  selector: 'bookmark-bar',
  templateUrl: './bookmark-bar.component.html',
  styleUrls: ['./bookmark-bar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BookmarkBarComponent implements OnInit {
  bookmarks = [
    {title: 'asd', icon: 'pause', type: 'LINK'},
    {title: 'Something else', icon: 'pause', type: 'LINK'},
    {title: 'very long', icon: 'pause', type: 'LINK'},
    {title: 'very long', icon: 'pause', type: 'LINK'},
  ];

  constructor() {
  }

  ngOnInit() {
  }

}
