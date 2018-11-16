import { ChangeDetectionStrategy, Component, Input, OnInit } from '@angular/core';
import { Attachment } from '../attachment.model';

@Component({
  selector: 'attachment-list',
  templateUrl: './attachment-list.component.html',
  styleUrls: ['./attachment-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AttachmentListComponent implements OnInit {
  @Input() attachments: Attachment[];

  constructor() {
  }

  ngOnInit() {
  }

}
