import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { FieldType } from '@ngx-formly/core';

@Component({
  selector: 'formly-link-widget',
  templateUrl: './formly-link-widget.component.html',
  styleUrls: ['./formly-link-widget.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormlyLinkWidgetComponent extends FieldType {
  constructor() {
    super();
  }
}
